/** First user-perceived character of a string (keeps skin tones, ZWJ sequences like 👨‍🍳, etc.). */
export function firstGrapheme(input: string): string {
  const text = input.trim();
  if (!text) return "";
  try {
    const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    for (const part of seg.segment(text)) return part.segment;
  } catch {
    /* fall through */
  }
  return [...text][0] ?? "";
}

/** Returns a single emoji, or null if the input doesn't contain one. */
export function cleanEmoji(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const g = firstGrapheme(input);
  if (!g || g.length > 16) return null;
  return /\p{Extended_Pictographic}/u.test(g) ? g : null;
}
