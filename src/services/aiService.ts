/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TeamMember, Process, ExtractedUpdates, SuggestedActivity, MemberDraft } from "../types";

export async function analyzeTranscript(
  transcript: string,
  members: TeamMember[],
  processes: Process[]
): Promise<ExtractedUpdates> {
  const response = await fetch("/api/ai/analyze-transcript", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript, members, processes })
  });
  
  if (!response.ok) throw new Error("Failed to analyze transcript");
  return await response.json();
}

export async function processMemberInput(
  input: string,
  members: TeamMember[],
  processes: Process[]
): Promise<MemberDraft | null> {
  const response = await fetch("/api/ai/process-member-input", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input, members, processes })
  });

  if (!response.ok) return null;
  return await response.json();
}

export async function getPlanningSuggestions(
  input: string,
  members: TeamMember[],
  processes: Process[]
): Promise<SuggestedActivity[]> {
  const response = await fetch("/api/ai/planning-suggestions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input, members, processes })
  });

  if (!response.ok) return [];
  const data = await response.json();
  return data.activities || [];
}
