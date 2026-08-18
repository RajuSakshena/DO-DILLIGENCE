// src/store/assessment-context.tsx

import React, { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect, type ReactNode } from "react";
import { AnswerStatus, PARAMETERS, SECTION_ORDER } from "@/lib/assessment-data";
import { getFilteredParameters } from "@/lib/documents";
import { computeScores, type ScoringResult } from "@/lib/scoring";
import { getSubmission, updateSubmission, type Submission } from "@/lib/api";

export type RegistrationType = "trust" | "society" | "section8" | "";

export interface OrgProfile {
  name: string;
  registrationType: RegistrationType;
  state: string;
  city: string;
  yearEstablished: string;
  foreignFunds: boolean;
}

/**
 * Result of an attempt to persist assessment progress to Neon. Kept as a
 * single flat shape (rather than a discriminated union) so `reason` and
 * `error` are always valid to read at the call site regardless of how the
 * caller narrows on `success`.
 */
export interface SaveProgressResult {
  success: boolean;
  reason?: "missing-org" | "request-failed";
  error?: string;
}

/** Fields from the submission row that this step is responsible for. */
type AssessmentPersistedFields = Pick<
  Submission,
  "answers" | "current_section_index" | "completed_sections"
>;

const LOCAL_DRAFT_KEY = "dodiligence-assessment-draft";

interface AssessmentState {
  orgProfile: OrgProfile;
  answers: Record<string, AnswerStatus>;
  currentSectionIndex: number;
  completedSections: string[];
  confidentialityAccepted: boolean;
  setOrgProfile: (p: OrgProfile) => void;
  setAnswer: (docId: string, status: AnswerStatus) => void;
  setCurrentSectionIndex: (i: number) => void;
  setConfidentialityAccepted: (v: boolean) => void;
  scoring: ScoringResult;
  resetAll: () => void;
  isProfileComplete: boolean;
  getSectionProgress: (sectionId: string) => { answered: number; total: number };
  getOverallProgress: () => number;
  isSectionComplete: (sectionId: string) => boolean;
  isSectionUnlocked: (sectionId: string) => boolean;
  markSectionComplete: (sectionId: string) => void;
  getFilteredParams: () => ReturnType<typeof getFilteredParameters>;
  /**
   * Persists the current (or overridden) answers / current_section_index /
   * completed_sections to the existing `assessment_submissions` row via
   * PATCH /api/submissions/:id. Uses `localStorage.getItem("orgId")` as the
   * row id. Never creates a new row. Resolves to a result object rather
   * than throwing, so callers can show UI feedback without try/catch.
   */
  saveProgress: (overrides?: Partial<AssessmentPersistedFields>) => Promise<SaveProgressResult>;
}

const defaultProfile: OrgProfile = { name: "", registrationType: "", state: "", city: "", yearEstablished: "", foreignFunds: false };

const AssessmentContext = createContext<AssessmentState | null>(null);

export function AssessmentProvider({ children }: { children: ReactNode }) {
  const [orgProfile, setOrgProfile] = useState<OrgProfile>(defaultProfile);
  const [answers, setAnswers] = useState<Record<string, AnswerStatus>>({});
  const [currentSectionIndex, setCurrentSectionIndex] = useState<number>(0);
  const [completedSections, setCompletedSections] = useState<string[]>([]);
  const [confidentialityAccepted, setConfidentialityAccepted] = useState(false);

  // Refs mirroring the latest state, so async persistence (fired from
  // callbacks/effects) always sends the freshest values rather than a
  // value captured in a stale closure.
  const answersRef = useRef(answers);
  const currentSectionIndexRef = useRef<number>(currentSectionIndex);
  const completedSectionsRef = useRef(completedSections);

  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { currentSectionIndexRef.current = currentSectionIndex; }, [currentSectionIndex]);
  useEffect(() => { completedSectionsRef.current = completedSections; }, [completedSections]);

  const setAnswer = useCallback((docId: string, status: AnswerStatus) => {
    setAnswers((prev) => ({ ...prev, [docId]: status }));
  }, []);

  /**
   * Persists progress to the existing submission row. Never calls
   * createSubmission — only updateSubmission against the orgId already
   * created by Profile.tsx. Safe to call from render-adjacent code since
   * it never throws.
   */
  const saveProgress = useCallback(
    async (overrides?: Partial<AssessmentPersistedFields>): Promise<SaveProgressResult> => {
      const orgId = localStorage.getItem("orgId");
      if (!orgId) {
        return { success: false, reason: "missing-org" };
      }

      try {
        await updateSubmission(orgId, {
          answers: overrides?.answers ?? answersRef.current,
          current_section_index: overrides?.current_section_index ?? currentSectionIndexRef.current,
          completed_sections: overrides?.completed_sections ?? completedSectionsRef.current,
        });
        return { success: true };
      } catch (err) {
        console.error("Failed to save assessment progress:", err);
        return {
          success: false,
          reason: "request-failed",
          error: err instanceof Error ? err.message : "Unknown error",
        };
      }
    },
    []
  );

  // ---------------------------------------------------------------------
  // Initial hydration from Neon + one-time local-draft migration.
  //
  // Runs once on mount. Only overwrites in-memory state if there is no
  // conflicting in-memory state yet (i.e. this really is the initial
  // load), and only after a successful GET — a failed GET leaves whatever
  // is already in memory untouched.
  // ---------------------------------------------------------------------
  const hasHydratedRef = useRef(false);

  useEffect(() => {
    if (hasHydratedRef.current) return;
    hasHydratedRef.current = true;

    const orgId = localStorage.getItem("orgId");
    if (!orgId) return;

    const hasInMemoryState =
      Object.keys(answersRef.current).length > 0 ||
      completedSectionsRef.current.length > 0 ||
      currentSectionIndexRef.current > 0;

    if (hasInMemoryState) return;

    (async () => {
      let submission: Submission;
      try {
        submission = await getSubmission(orgId);
      } catch (err) {
        // Don't destroy in-memory state on a failed load.
        console.error("Failed to load existing assessment progress:", err);
        return;
      }

      // Normalise the nullable numeric column to a definite number up
      // front, so nothing downstream has to deal with `number | null`.
      const remoteSectionIndex: number = submission.current_section_index ?? 0;
      const remoteAnswers: Record<string, AnswerStatus> | null =
        submission.answers && Object.keys(submission.answers).length > 0
          ? (submission.answers as Record<string, AnswerStatus>)
          : null;
      const remoteCompletedSections: string[] | null =
        submission.completed_sections && submission.completed_sections.length > 0
          ? submission.completed_sections
          : null;

      const hasRemoteAssessmentData =
        remoteAnswers !== null || remoteCompletedSections !== null || remoteSectionIndex > 0;

      if (hasRemoteAssessmentData) {
        if (remoteAnswers) setAnswers(remoteAnswers);
        setCurrentSectionIndex(remoteSectionIndex);
        if (remoteCompletedSections) setCompletedSections(remoteCompletedSections);
        return;
      }

      // Neon has no assessment data yet for this row — fall back to a
      // one-time migration of any legacy local draft, then retire it.
      try {
        const saved = localStorage.getItem(LOCAL_DRAFT_KEY);
        if (!saved) return;

        const draft = JSON.parse(saved);
        const draftAnswers =
          draft?.answers && typeof draft.answers === "object" ? (draft.answers as Record<string, AnswerStatus>) : null;

        if (!draftAnswers || Object.keys(draftAnswers).length === 0) return;

        // Re-check nothing changed in memory while the GET was in flight.
        if (Object.keys(answersRef.current).length > 0 || completedSectionsRef.current.length > 0) return;

        setAnswers(draftAnswers);

        const migrateResult = await saveProgress({ answers: draftAnswers });
        if (migrateResult.success) {
          localStorage.removeItem(LOCAL_DRAFT_KEY);
        }
        // If migration failed, leave the local draft in place so it isn't lost.
      } catch (err) {
        console.error("Failed to migrate local assessment draft:", err);
      }
    })();
  }, [saveProgress]);

  const getFilteredParams = useCallback(() => {
    return getFilteredParameters(orgProfile.registrationType as any, orgProfile.foreignFunds);
  }, [orgProfile.registrationType, orgProfile.foreignFunds]);

  const scoring = useMemo(() => {
    const filteredParams = getFilteredParams();
    return computeScores(answers, orgProfile.foreignFunds, filteredParams);
  }, [answers, orgProfile.foreignFunds, getFilteredParams]);

  const isProfileComplete = orgProfile.name.trim() !== "" && orgProfile.registrationType !== "" && orgProfile.state !== "" && orgProfile.yearEstablished.length === 4;

  const getSectionProgress = useCallback((sectionId: string): { answered: number; total: number } => {
    const filteredParams = getFilteredParameters(orgProfile.registrationType as any, orgProfile.foreignFunds);
    const param = filteredParams.find((p) => p.id === sectionId);
    if (!param) return { answered: 0, total: 0 };
    const answered: number = param.documents.filter((d) => answers[d.id] != null).length;
    const total: number = param.documents.length;
    return { answered, total };
  }, [answers, orgProfile.registrationType, orgProfile.foreignFunds]);

  const isSectionComplete = useCallback((sectionId: string) => {
    const filteredParams = getFilteredParameters(orgProfile.registrationType as any, orgProfile.foreignFunds);
    const param = filteredParams.find((p) => p.id === sectionId);
    if (!param) return false;
    return param.documents.every((d) => answers[d.id] != null);
  }, [answers, orgProfile.registrationType, orgProfile.foreignFunds]);

  const isSectionUnlocked = useCallback((sectionId: string) => {
    const idx: number = SECTION_ORDER.indexOf(sectionId);
    if (idx <= 0) return true;
    const prevSection = SECTION_ORDER[idx - 1];
    return isSectionComplete(prevSection);
  }, [isSectionComplete]);

  const markSectionComplete = useCallback((sectionId: string) => {
    setCompletedSections((prev) => {
      if (prev.includes(sectionId)) return prev;
      const updated = [...prev, sectionId];
      completedSectionsRef.current = updated;
      // Fire-and-forget persistence; saveProgress never throws.
      void saveProgress({ completed_sections: updated });
      return updated;
    });
  }, [saveProgress]);

  const getOverallProgress = useCallback((): number => {
    let total = 0;
    let answered = 0;
    const filteredParams = getFilteredParameters(orgProfile.registrationType as any, orgProfile.foreignFunds);
    filteredParams.forEach((p) => {
      const prog: { answered: number; total: number } = getSectionProgress(p.id);
      total += prog.total;
      answered += prog.answered;
    });
    return total === 0 ? 0 : Math.round((answered / total) * 100);
  }, [getSectionProgress, orgProfile.registrationType, orgProfile.foreignFunds]);

  const resetAll = useCallback(() => {
    setOrgProfile(defaultProfile);
    setAnswers({});
    setCurrentSectionIndex(0);
    setCompletedSections([]);
    setConfidentialityAccepted(false);
  }, []);

  return (
    <AssessmentContext.Provider value={{
      orgProfile, answers, currentSectionIndex, completedSections, confidentialityAccepted,
      setOrgProfile, setAnswer, setCurrentSectionIndex, setConfidentialityAccepted,
      scoring, resetAll, isProfileComplete, getSectionProgress, getOverallProgress,
      isSectionComplete, isSectionUnlocked, markSectionComplete, getFilteredParams,
      saveProgress,
    }}>
      {children}
    </AssessmentContext.Provider>
  );
}

export function useAssessment() {
  const ctx = useContext(AssessmentContext);
  if (!ctx) throw new Error("useAssessment must be used within AssessmentProvider");
  return ctx;
}