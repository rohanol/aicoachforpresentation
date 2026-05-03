import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Analysis = Database["public"]["Tables"]["analyses"]["Row"];

export type AnalysisScores = {
  final_score?: number | null;
  fluency_score?: number | null;
  grammar_score?: number | null;
  confidence_score?: number | null;
  posture_score?: number | null;
};

/** Fetch the current user's profile row, creating a free one if missing. */
export async function getUserProfile(userId: string): Promise<Profile> {
  // Upsert acts as a defensive fallback for users created before the
  // on_auth_user_created trigger existed. ignoreDuplicates leaves existing
  // rows untouched so we don't reset plan/usage on every read.
  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      { id: userId, plan: "free", analyses_used: 0 },
      { onConflict: "id", ignoreDuplicates: true },
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Bump the analyses_used counter by 1 for the given user. */
export async function incrementAnalysisCount(userId: string): Promise<void> {
  const profile = await getUserProfile(userId);
  const { error } = await supabase
    .from("profiles")
    .update({ analyses_used: (profile.analyses_used ?? 0) + 1 })
    .eq("id", userId);

  if (error) throw error;
}

/** Persist a new analysis row with score breakdown. */
export async function saveAnalysis(
  userId: string,
  scores: AnalysisScores,
): Promise<void> {
  const { error } = await supabase.from("analyses").insert({
    user_id: userId,
    final_score: scores.final_score ?? null,
    fluency_score: scores.fluency_score ?? null,
    grammar_score: scores.grammar_score ?? null,
    confidence_score: scores.confidence_score ?? null,
    posture_score: scores.posture_score ?? null,
  });

  if (error) throw error;
}

/** Return the user's analyses, most recent first. */
export async function getAnalysisHistory(userId: string): Promise<Analysis[]> {
  const { data, error } = await supabase
    .from("analyses")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}
