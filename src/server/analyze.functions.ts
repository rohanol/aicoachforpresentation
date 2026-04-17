import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  // ~20 MB cap on base64 audio (≈15 MB raw, ~5 min of 16kHz mono WAV)
  audioBase64: z.string().min(10).max(20_000_000),
  audioMimeType: z.string().min(3).max(64),
  // Each frame capped at ~500 KB base64 (~375 KB JPEG)
  frames: z.array(z.string().min(10).max(500_000)).min(0).max(8),
  durationSeconds: z.number().min(0.1).max(60 * 30),
  tone: z.enum(["male", "female", "neutral"]),
});

type Analysis = {
  transcript: string;
  wpm: number;
  wordCount: number;
  durationSeconds: number;
  fluencyScore: number;
  grammarScore: number;
  confidenceScore: number;
  vocabularyRichness: number;
  fillerWords: { word: string; count: number }[];
  fillerCount: number;
  paceFeedback: string;
  grammarIssues: string[];
  suggestions: string[];
  postureScore: number;
  eyeContactScore: number;
  faceVisibleRatio: number;
  gestureActivity: "low" | "medium" | "high";
  bodyLanguageSummary: string;
  finalScore: number;
  mentorFeedback: string;
};

const FILLER_WORDS = [
  "um",
  "uh",
  "like",
  "you know",
  "basically",
  "literally",
  "actually",
  "right",
  "so",
  "okay",
];

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

function toneInstruction(tone: "male" | "female" | "neutral"): string {
  if (tone === "male")
    return "Use a direct, data-driven, competitive coaching tone like a sports coach.";
  if (tone === "female")
    return "Use a warm, encouraging, empowering coaching tone.";
  return "Use a neutral, professional, balanced coaching tone.";
}

async function callGateway(body: unknown): Promise<any> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (res.status === 429)
    throw new Error("RATE_LIMIT: Too many requests. Please wait a moment and try again.");
  if (res.status === 402)
    throw new Error(
      "PAYMENT_REQUIRED: Your Lovable AI workspace is out of credits. Add funds in Settings → Workspace → Usage.",
    );
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI gateway error ${res.status}: ${t.slice(0, 300)}`);
  }
  return res.json();
}

function clamp(n: number, min = 0, max = 100): number {
  if (Number.isNaN(n) || !Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function countFillers(transcript: string): { word: string; count: number }[] {
  const lower = " " + transcript.toLowerCase().replace(/[^\w\s']/g, " ") + " ";
  return FILLER_WORDS.map((w) => {
    const re = new RegExp(`\\s${w.replace(/ /g, "\\s+")}\\s`, "g");
    const matches = lower.match(re);
    return { word: w, count: matches ? matches.length : 0 };
  }).filter((f) => f.count > 0);
}

function calculateFluency(fillerCount: number, wpm: number): number {
  const fillerPenalty = Math.min(fillerCount * 3, 40);
  let pacePenalty = 10;
  if (wpm >= 120 && wpm <= 160) pacePenalty = 0;
  else if (wpm < 80 || wpm > 200) pacePenalty = 20;
  return clamp(100 - fillerPenalty - pacePenalty);
}

export const analyzePresentation = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<Analysis> => {
    // ---- 1. Transcribe audio with Gemini ----
    const transcribeBody = {
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content:
            "You are a precise speech transcription engine. Output ONLY the verbatim spoken words with normal punctuation. No commentary, no timestamps, no speaker labels.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Transcribe this audio verbatim." },
            {
              type: "input_audio",
              input_audio: {
                data: data.audioBase64,
                format: data.audioMimeType.includes("wav")
                  ? "wav"
                  : data.audioMimeType.includes("mp3")
                    ? "mp3"
                    : "webm",
              },
            },
          ],
        },
      ],
    };

    const transcribeJson = await callGateway(transcribeBody);
    const transcript: string = (
      transcribeJson?.choices?.[0]?.message?.content ?? ""
    )
      .toString()
      .trim();

    const wordCount = transcript.split(/\s+/).filter(Boolean).length;
    const wpm =
      data.durationSeconds > 0
        ? round1((wordCount / data.durationSeconds) * 60)
        : 0;

    const fillerWords = countFillers(transcript);
    const fillerCount = fillerWords.reduce((s, f) => s + f.count, 0);

    const wordsLower = transcript.toLowerCase().split(/\s+/).filter(Boolean);
    const vocabularyRichness =
      wordsLower.length > 0
        ? round1(new Set(wordsLower).size / wordsLower.length)
        : 0;

    // ---- 2. Speech analysis (structured output via tool call) ----
    const tone = toneInstruction(data.tone);
    const speechBody = {
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content: `You are an expert presentation coach analyzing a speech transcript. ${tone}`,
        },
        {
          role: "user",
          content: `Analyze this transcript.

Transcript: "${transcript || "(no speech detected)"}"
Speaking pace: ${wpm} WPM (ideal 120-160 WPM)
Word count: ${wordCount}

Score grammar (0-100), confidence (0-100 based on word choice, structure, hedging), list up to 3 grammar issues, give one-sentence pace feedback, and exactly 3 actionable improvement tips.`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "speech_analysis",
            description: "Return structured speech analysis.",
            parameters: {
              type: "object",
              properties: {
                grammar_score: { type: "number" },
                confidence_score: { type: "number" },
                grammar_issues: {
                  type: "array",
                  items: { type: "string" },
                },
                pace_feedback: { type: "string" },
                suggestions: {
                  type: "array",
                  items: { type: "string" },
                },
              },
              required: [
                "grammar_score",
                "confidence_score",
                "grammar_issues",
                "pace_feedback",
                "suggestions",
              ],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "speech_analysis" } },
    };

    const speechJson = await callGateway(speechBody);
    const speechToolCall =
      speechJson?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    let speechParsed: any = {};
    try {
      speechParsed = JSON.parse(speechToolCall ?? "{}");
    } catch {
      speechParsed = {};
    }

    const grammarScore = round1(clamp(Number(speechParsed.grammar_score ?? 70)));
    const confidenceScore = round1(
      clamp(Number(speechParsed.confidence_score ?? 70)),
    );
    const grammarIssues: string[] = Array.isArray(speechParsed.grammar_issues)
      ? speechParsed.grammar_issues.slice(0, 3)
      : [];
    const paceFeedback: string =
      speechParsed.pace_feedback ?? "Pace data unavailable.";
    const suggestions: string[] = Array.isArray(speechParsed.suggestions)
      ? speechParsed.suggestions.slice(0, 3)
      : [];

    // ---- 3. Body-language analysis from frames ----
    let postureScore = 60;
    let eyeContactScore = 60;
    let faceVisibleRatio = 0;
    let gestureActivity: "low" | "medium" | "high" = "medium";
    let bodyLanguageSummary = "No frames available for analysis.";

    if (data.frames.length > 0) {
      const visionContent: any[] = [
        {
          type: "text",
          text: `You are an expert presentation body-language analyst. You are given ${data.frames.length} frames sampled from a presentation video. Analyze posture, eye contact (face orientation toward camera), facial visibility, and gesture activity. Return scores 0-100 and a one-paragraph summary.`,
        },
        ...data.frames.map((b64) => ({
          type: "image_url",
          image_url: { url: `data:image/jpeg;base64,${b64}` },
        })),
      ];

      const visionBody = {
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: visionContent }],
        tools: [
          {
            type: "function",
            function: {
              name: "body_language_analysis",
              description: "Return body language scores from the sampled frames.",
              parameters: {
                type: "object",
                properties: {
                  posture_score: { type: "number" },
                  eye_contact_score: { type: "number" },
                  face_visible_ratio: { type: "number" },
                  gesture_activity: {
                    type: "string",
                    enum: ["low", "medium", "high"],
                  },
                  summary: { type: "string" },
                },
                required: [
                  "posture_score",
                  "eye_contact_score",
                  "face_visible_ratio",
                  "gesture_activity",
                  "summary",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: {
          type: "function",
          function: { name: "body_language_analysis" },
        },
      };

      const visionJson = await callGateway(visionBody);
      const visionArgs =
        visionJson?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      let visionParsed: any = {};
      try {
        visionParsed = JSON.parse(visionArgs ?? "{}");
      } catch {
        visionParsed = {};
      }
      postureScore = round1(clamp(Number(visionParsed.posture_score ?? 60)));
      eyeContactScore = round1(
        clamp(Number(visionParsed.eye_contact_score ?? 60)),
      );
      const fvr = Number(visionParsed.face_visible_ratio ?? 0);
      faceVisibleRatio = clamp(fvr > 1 ? fvr / 100 : fvr, 0, 1);
      faceVisibleRatio = Math.round(faceVisibleRatio * 100) / 100;
      gestureActivity =
        (["low", "medium", "high"] as const).find(
          (g) => g === visionParsed.gesture_activity,
        ) ?? "medium";
      bodyLanguageSummary =
        visionParsed.summary ?? "Body language analysis unavailable.";
    }

    // ---- 4. Final scoring ----
    const fluencyScore = calculateFluency(fillerCount, wpm);
    const finalScore = round1(
      fluencyScore * 0.25 +
        grammarScore * 0.25 +
        postureScore * 0.25 +
        confidenceScore * 0.25,
    );

    // ---- 5. Mentor feedback ----
    const feedbackBody = {
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content: `You are an expert AI presentation coach giving personal feedback. ${tone}`,
        },
        {
          role: "user",
          content: `Write exactly 3 short paragraphs of mentor feedback for this presenter:
Paragraph 1: Overall performance summary.
Paragraph 2: Top 2 strengths observed.
Paragraph 3: Top 2 specific areas to improve with actionable advice.

Scores:
- Fluency: ${fluencyScore}/100
- Grammar: ${grammarScore}/100
- Body Language: ${postureScore}/100
- Confidence: ${confidenceScore}/100
- Final Score: ${finalScore}/100

Body language notes: ${bodyLanguageSummary}

Transcript excerpt: "${transcript.slice(0, 600)}"

Be personal, specific, motivating. Plain text, no markdown headers.`,
        },
      ],
    };

    const feedbackJson = await callGateway(feedbackBody);
    const mentorFeedback: string = (
      feedbackJson?.choices?.[0]?.message?.content ?? ""
    )
      .toString()
      .trim();

    return {
      transcript,
      wpm,
      wordCount,
      durationSeconds: round1(data.durationSeconds),
      fluencyScore,
      grammarScore,
      confidenceScore,
      vocabularyRichness,
      fillerWords,
      fillerCount,
      paceFeedback,
      grammarIssues,
      suggestions,
      postureScore,
      eyeContactScore,
      faceVisibleRatio,
      gestureActivity,
      bodyLanguageSummary,
      finalScore,
      mentorFeedback,
    };
  });

export type { Analysis };
