/**
 * src/lib/api.ts
 *
 * The ONLY frontend API helper for assessment submission persistence.
 * All calls to the backend for creating, reading, and updating a
 * `assessment_submissions` row must go through the functions exported here.
 *
 * Do NOT call https://tmi-backend.onrender.com or any other backend
 * directly from a component — add a function here instead.
 */

// -----------------------------------------------------------------------
// Config
// -----------------------------------------------------------------------

// TODO: swap for the production URL when deploying.
const API_BASE_URL = "https://dodilligence-backend.onrender.com";

// -----------------------------------------------------------------------
// Cold-start / retry configuration
// -----------------------------------------------------------------------
// Render's free tier spins the backend down after inactivity, so the
// first request after a while can take a long time to come back while
// the instance wakes up. These constants tune how patient we are, and
// are only used by the health-check + submission-retry logic below.

/** Timeout for a single health-check GET (the backend should answer
 *  quickly once it's actually awake). */
const HEALTH_CHECK_TIMEOUT_MS = 10_000;
/** Total time we're willing to spend waiting for the backend to wake up
 *  before giving up on the whole submission attempt. */
const HEALTH_CHECK_MAX_WAIT_MS = 90_000;
/** Delay between health-check attempts while waiting for a cold start. */
const HEALTH_CHECK_RETRY_DELAY_MS = 3_000;

/** Timeout for a single submission POST, generous enough to survive a
 *  cold start if the health check above raced past it. */
const SUBMIT_TIMEOUT_MS = 90_000;
/** Max number of POST attempts (the first attempt + retries). */
const SUBMIT_MAX_ATTEMPTS = 4;
/** Base delay for exponential backoff between submission retries. */
const SUBMIT_BASE_DELAY_MS = 2_000;

/** Timeout applied to plain GET/PATCH requests (getSubmission /
 *  updateSubmission), so a hung request doesn't stall forever. */
const DEFAULT_REQUEST_TIMEOUT_MS = 90_000;

// -----------------------------------------------------------------------
// Domain types
// -----------------------------------------------------------------------

/** "yes" / "no" answer keyed by document id, as used across the assessment. */
export type AnswerStatus = "yes" | "no";
export type AssessmentAnswers = Record<string, AnswerStatus>;

/** Per-parameter score breakdown produced on the Results page. */
export interface ParameterScore {
  parameterId: string;
  parameterName: string;
  score: number;
  maxScore: number;
  status?: string;
}

/** A single flagged risk item surfaced in results. */
export interface RedFlag {
  id: string;
  parameterId: string;
  documentId?: string;
  label: string;
  severity?: "low" | "medium" | "high";
}

export type OrgTier = "green" | "yellow" | "red" | string;

/**
 * Full shape of a row in the `assessment_submissions` table, as returned
 * by the backend. Every column is optional except `id`, since a row can
 * be partially filled in as the user progresses through the flow.
 */
export interface Submission {
  id: string;

  // Profile
  org_name?: string | null;
  registration_type?: string | null;
  primary_role?: string | null;
  state?: string | null;
  city?: string | null;
  year_established?: number | null;
  email?: string | null;
  contact_details?: string | null;
  foreign_funds?: boolean | null;
  confidentiality_accepted?: boolean | null;

  // Assessment
  answers?: AssessmentAnswers | null;
  current_section_index?: number | null;
  completed_sections?: string[] | null;

  // Results
  overall_score?: number | null;
  tier?: OrgTier | null;
  parameter_scores?: ParameterScore[] | null;
  red_flags?: RedFlag[] | null;
  csr_ineligible?: boolean | null;

  // Gift
  gift_email?: string | null;
  gift_role?: string | null;

  // Connect
  connect_slot?: string | null;
  connect_agenda?: string | null;
  connect_share_report?: boolean | null;

  // Share
  shared_with_email?: string | null;

  // Bookkeeping columns commonly present on this kind of table.
  created_at?: string;
  updated_at?: string;
}

/**
 * Shape actually returned by POST /api/submissions today: just the new
 * row's id. Kept separate from `Submission` so the type reflects what the
 * backend really sends, rather than what it might send in the future.
 */
export interface CreateSubmissionResponse {
  id: string;
}

/**
 * Internal wire shape for POST /api/submissions: the caller-facing
 * `CreateSubmissionPayload` plus the client-generated idempotency id.
 * Not exported — callers of `createSubmission` never need to think
 * about the id, it's generated and attached internally so the same id
 * can be reused across cold-start retries without creating duplicate
 * rows.
 */
type CreateSubmissionRequestBody = CreateSubmissionPayload & { id: string };

/**
 * Payload for creating a new submission. Used by Profile.tsx when the
 * user first submits their organisation details. All fields are optional
 * so the caller can create a row with as little or as much info as is
 * available at that point.
 */
export type CreateSubmissionPayload = Partial<
  Pick<
    Submission,
    | "org_name"
    | "registration_type"
    | "primary_role"
    | "state"
    | "city"
    | "year_established"
    | "email"
    | "contact_details"
    | "foreign_funds"
    | "confidentiality_accepted"
  >
>;

/**
 * Payload for updating an existing submission. Used by Assessment,
 * Results, Gift, Connect, and Share. Every field is optional since each
 * page only patches the columns it owns.
 */
export type UpdateSubmissionPayload = Partial<
  Pick<
    Submission,
    // Profile
    | "org_name"
    | "registration_type"
    | "primary_role"
    | "state"
    | "city"
    | "year_established"
    | "email"
    | "contact_details"
    | "foreign_funds"
    | "confidentiality_accepted"
    // Assessment
    | "answers"
    | "current_section_index"
    | "completed_sections"
    // Results
    | "overall_score"
    | "tier"
    | "parameter_scores"
    | "red_flags"
    | "csr_ineligible"
    // Gift
    | "gift_email"
    | "gift_role"
    // Connect
    | "connect_slot"
    | "connect_agenda"
    | "connect_share_report"
    // Share
    | "shared_with_email"
  >
>;

// -----------------------------------------------------------------------
// Internal helpers
// -----------------------------------------------------------------------

/**
 * Attempts to parse a Response body as JSON. Returns `null` if the body
 * is empty or isn't valid JSON, rather than throwing — callers decide
 * whether the absence of a body is an error.
 *
 * Also logs the raw body text before attempting to parse, and logs
 * clearly if parsing fails, so failures are easy to diagnose from the
 * browser console.
 */
async function safeParseJson(response: Response): Promise<unknown> {
  const text = await response.text();

  console.log("[API RAW BODY]", {
    url: response.url,
    status: response.status,
    rawBody: text,
  });

  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    console.warn("[API RESPONSE NOT VALID JSON]", {
      url: response.url,
      status: response.status,
      rawBody: text,
    });
    return null;
  }
}

/**
 * Extracts a human-readable message from a failed response body, without
 * leaking anything sensitive (e.g. stack traces, internal paths). Falls
 * back to a generic message tied to the HTTP status.
 */
function extractErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object") {
    const maybeMessage = (body as Record<string, unknown>).message;
    const maybeError = (body as Record<string, unknown>).error;
    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      return maybeMessage;
    }
    if (typeof maybeError === "string" && maybeError.trim()) {
      return maybeError;
    }
  }
  return fallback;
}

/**
 * Thrown for failures that should NOT be retried (e.g. 4xx validation
 * errors). Distinguishes "the server told us the request was bad" from
 * "we couldn't reach the server / it errored transiently", so retry
 * loops know when to stop early instead of hammering a request that
 * will never succeed.
 */
class NonRetryableApiError extends Error {}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * fetch() with an AbortController-based timeout. Render cold starts can
 * take a while to respond, so callers pass a generous timeout — this
 * just guarantees we never hang forever on a dropped connection.
 */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Generates a UUID to use as the submission's idempotency key. Prefers
 * `crypto.randomUUID()`, falling back to a manual UUIDv4 for older
 * browsers that don't support it.
 */
function generateClientSubmissionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Polls GET /api/health until the backend responds successfully, or
 * gives up after `HEALTH_CHECK_MAX_WAIT_MS`. This is what absorbs a
 * Render free-tier cold start: the first ping(s) may fail or time out
 * while the instance spins up, and we just keep trying on a fixed
 * interval within a bounded total budget.
 */
async function waitForBackendReady(): Promise<void> {
  const startedAt = Date.now();
  let attempt = 0;

  while (true) {
    attempt += 1;
    console.log("[API HEALTH CHECK]", {
      url: `${API_BASE_URL}/api/health`,
      attempt,
      elapsedMs: Date.now() - startedAt,
    });

    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/health`,
        { method: "GET" },
        HEALTH_CHECK_TIMEOUT_MS
      );
      if (response.ok) {
        console.log("[API HEALTH CHECK] backend is awake", { attempt });
        return;
      }
      console.warn("[API HEALTH CHECK] non-OK status, will retry", {
        attempt,
        status: response.status,
      });
    } catch (err) {
      console.warn("[API HEALTH CHECK] request failed, will retry", {
        attempt,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    if (Date.now() - startedAt >= HEALTH_CHECK_MAX_WAIT_MS) {
      throw new Error(
        "The server is taking too long to wake up. Please try again in a moment."
      );
    }

    console.log("[API RETRY]", {
      context: "health-check",
      nextAttempt: attempt + 1,
      delayMs: HEALTH_CHECK_RETRY_DELAY_MS,
    });
    await sleep(HEALTH_CHECK_RETRY_DELAY_MS);
  }
}

/**
 * Submits a new submission with a fixed, caller-provided idempotency id,
 * retrying transient failures (network errors, timeouts, 5xx) with
 * exponential backoff while reusing the SAME id on every attempt. If the
 * first attempt actually succeeded server-side but the response was
 * lost, the retry's identical id lets the backend recognize it (via
 * `ON CONFLICT (id)`) and return the existing row instead of creating a
 * duplicate.
 *
 * 4xx responses are treated as non-retryable: they mean the request
 * itself is invalid, so retrying it would never help.
 */
async function submitSubmissionWithRetry(
  body: CreateSubmissionRequestBody
): Promise<CreateSubmissionResponse> {
  let attempt = 0;
  let delay = SUBMIT_BASE_DELAY_MS;

  while (true) {
    attempt += 1;
    console.log("[API REQUEST]", {
      url: `${API_BASE_URL}/api/submissions`,
      method: "POST",
      attempt,
      payload: body,
      timestamp: new Date().toISOString(),
    });

    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/submissions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
        SUBMIT_TIMEOUT_MS
      );

      console.log("[API RESPONSE]", {
        status: response.status,
        ok: response.ok,
        attempt,
      });

      const parsedBody = await safeParseJson(response);

      if (response.ok) {
        if (parsedBody === null) {
          throw new Error("The server returned an empty or invalid response.");
        }
        return parsedBody as CreateSubmissionResponse;
      }

      if (response.status >= 400 && response.status < 500) {
        const message = extractErrorMessage(
          parsedBody,
          `Request failed with status ${response.status}.`
        );
        console.error("[API ERROR]", {
          attempt,
          status: response.status,
          message,
          retryable: false,
        });
        throw new NonRetryableApiError(message);
      }

      // 5xx: fall through to the retry logic below.
      console.warn("[API ERROR]", {
        attempt,
        status: response.status,
        retryable: true,
      });
    } catch (err) {
      if (err instanceof NonRetryableApiError) {
        throw err;
      }
      console.warn("[API ERROR]", {
        attempt,
        error: err instanceof Error ? err.message : String(err),
        retryable: true,
      });
    }

    if (attempt >= SUBMIT_MAX_ATTEMPTS) {
      throw new Error(
        "We couldn't confirm your submission was saved after several attempts. Please check your connection and try again — the details you entered have been kept."
      );
    }

    console.log("[API RETRY]", {
      context: "submit-submission",
      nextAttempt: attempt + 1,
      delayMs: delay,
    });
    await sleep(delay);
    delay *= 2;
  }
}

/**
 * Performs a fetch against the backend, handling network failures and
 * non-OK responses consistently. Throws an `Error` with a safe, useful
 * message in all failure cases.
 *
 * Logs the full lifecycle of the request — the outgoing request, the raw
 * response, and any failure — to the browser console so it's easy to see
 * whether the frontend is reaching the backend, what was sent, and what
 * came back. Never logs DATABASE_URL, secrets, tokens, or credentials.
 */
async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const method = init?.method || "GET";

  console.log("[API REQUEST]", {
    url,
    method,
    payload: init?.body ? safeParseForLog(init.body) : undefined,
    timestamp: new Date().toISOString(),
  });

  let response: Response;

  try {
    response = await fetchWithTimeout(
      url,
      {
        headers: {
          "Content-Type": "application/json",
          ...(init?.headers || {}),
        },
        ...init,
      },
      DEFAULT_REQUEST_TIMEOUT_MS
    );
  } catch (err) {
    // Network error, timeout/abort, CORS failure, backend unreachable, etc.
    console.error("[API ERROR]", {
      url,
      method,
      error: err instanceof Error ? err.message : String(err),
    });
    throw new Error(
      `Unable to reach the server. Please check your connection and try again.`
    );
  }

  console.log("[API RESPONSE]", {
    url: response.url || url,
    status: response.status,
    statusText: response.statusText,
    ok: response.ok,
    headers: headersToLoggableObject(response.headers),
  });

  const body = await safeParseJson(response);

  if (!response.ok) {
    const fallback = `Request failed with status ${response.status}.`;
    console.error("[API ERROR RESPONSE]", {
      url,
      method,
      status: response.status,
      body,
    });
    throw new Error(extractErrorMessage(body, fallback));
  }

  if (body === null) {
    console.error("[API EMPTY OR INVALID RESPONSE]", {
      url,
      method,
      status: response.status,
    });
    throw new Error("The server returned an empty or invalid response.");
  }

  return body as T;
}

/**
 * Best-effort parse of an outgoing request body (a JSON string) purely
 * for console logging, so [API REQUEST] logs show a readable object
 * instead of a raw string. Falls back to the raw value if it isn't
 * parseable JSON.
 */
function safeParseForLog(body: BodyInit): unknown {
  if (typeof body !== "string") return body;
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

/**
 * Converts a Headers object into a plain object for logging. Never
 * includes Authorization or other credential-bearing headers.
 */
function headersToLoggableObject(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    if (key.toLowerCase() === "authorization") return;
    result[key] = value;
  });
  return result;
}

// -----------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------

/**
 * Creates a new assessment submission.
 * POST ${API_BASE_URL}/api/submissions
 *
 * The backend currently responds with just `{ id: string }`, not a full
 * Submission row — so that's what this resolves to. Used by Profile.tsx,
 * which is responsible for persisting the returned `id` (e.g. to
 * localStorage under the `orgId` key) and fetching/updating the full
 * submission afterwards via `getSubmission` / `updateSubmission`.
 */
export async function createSubmission(
  payload: CreateSubmissionPayload
): Promise<CreateSubmissionResponse> {
  // One idempotency id per logical submission attempt, reused across
  // every health-check/retry cycle below. If a POST actually reaches
  // the DB but the response is lost, retrying with this same id lets
  // the backend recognize it and hand back the existing row instead of
  // inserting a duplicate.
  const clientId = generateClientSubmissionId();

  console.log("[createSubmission] called with payload:", payload, {
    clientId,
  });

  // Give the backend a chance to wake up (Render free-tier cold start)
  // before we attempt the actual write.
  await waitForBackendReady();

  const result = await submitSubmissionWithRetry({ ...payload, id: clientId });

  console.log("[createSubmission] resolved with:", result);

  return result;
}

/**
 * Updates an existing assessment submission with a partial set of fields.
 * PATCH ${API_BASE_URL}/api/submissions/:id
 *
 * Used by Assessment.tsx, Results.tsx, Gift.tsx, Connect.tsx, and
 * Share.tsx to persist just the fields each page owns.
 */
export async function updateSubmission(
  id: string,
  partialPayload: UpdateSubmissionPayload
): Promise<Submission> {
  console.log("[updateSubmission] called with:", { id, partialPayload });

  if (!id) {
    console.error("[updateSubmission] missing submission id");
    throw new Error("A submission id is required to update a submission.");
  }

  const result = await apiFetch<Submission>(
    `/api/submissions/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(partialPayload),
    }
  );

  console.log("[updateSubmission] resolved with:", result);

  return result;
}

/**
 * Fetches an existing assessment submission by id.
 * GET ${API_BASE_URL}/api/submissions/:id
 */
export async function getSubmission(id: string): Promise<Submission> {
  console.log("[getSubmission] called with id:", id);

  if (!id) {
    console.error("[getSubmission] missing submission id");
    throw new Error("A submission id is required to fetch a submission.");
  }

  const result = await apiFetch<Submission>(
    `/api/submissions/${encodeURIComponent(id)}`,
    {
      method: "GET",
    }
  );

  console.log("[getSubmission] resolved with:", result);

  return result;
}
