// Preset accent colors for the generated (initials) avatar — deliberately a
// closed set matching the design system's tokens, not a free color picker.
export const AVATAR_COLORS = [
  "gold",
  "steel",
  "green",
  "purple",
  "khaki",
  "orange",
  "red",
] as const;

export type AvatarColor = (typeof AVATAR_COLORS)[number];

export function isAvatarColor(value: string): value is AvatarColor {
  return (AVATAR_COLORS as readonly string[]).includes(value);
}

export function initials(name: string) {
  return name.trim().slice(0, 2).toUpperCase() || "?";
}
