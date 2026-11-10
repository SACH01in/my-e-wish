import type { Mood } from "./types";

export const moodThemes: Record<Mood, { color: string; wash: string }> = {
  Heartfelt: { color: "#b86f69", wash: "#f0e2dc" },
  Playful: { color: "#d59035", wash: "#f4ead5" },
  Elegant: { color: "#687b68", wash: "#e5e9dd" },
  Dreamy: { color: "#8d78aa", wash: "#ebe5f1" },
  Encouraging: { color: "#cb744d", wash: "#f3e5da" },
};
