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
    response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
      ...init,
    });
  } catch (err) {
    // Network error, CORS failure, backend unreachable, etc.
    console.error("[API NETWORK ERROR]", {
      url,
      method,
      error: err,
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
  console.log("[createSubmission] called with payload:", payload);

  const result = await apiFetch<CreateSubmissionResponse>("/api/submissions", {
    method: "POST",
    body: JSON.stringify(payload),
  });

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