/**
 * SafeSeat visual system.
 *
 * The app intentionally keeps the deep navy base from the redesign while
 * using green + white as the brand palette. Amber and red are reserved for
 * warning/emergency semantics so safety states are never confused with brand
 * accents.
 */

import "@/global.css";

import { Platform } from "react-native";

export const Themes = {
  text: "#F8FBFA",
  textSecondary: "#A6B4C3",
  background: "#101322",
  backgroundElement: "#1A2033",
  backgroundElevated: "#222A40",
  backgroundSelected: "#173A2A",
  divider: "#34405C",

  // SafeSeat brand accent
  primaryBttn: "#42D889",
  primaryBttnText: "#071A11",
  primarySoft: "#173A2A",

  // Neutral secondary action
  secondaryBttn: "#344563",
  secondaryBttnText: "#F8FBFA",

  textInputPlaceholder: "#F8FBFA80",

  // Safety state colors: not part of the orange/green brand swap.
  warnBttn: "#FF7A7A",
  warnBttnText: "#331313",
  lightOrange: "#F4C65D",
  green: "#7BE7AD",
} as const;

export type ThemeColor = keyof typeof Themes;

// Compatibility for a few retained Expo starter components. SafeSeat itself
// uses one deliberate dark visual system, so both scheme entries resolve to
// the same palette instead of silently reintroducing a separate light theme.
export const Colors = {
  light: Themes,
  dark: Themes,
} as const;

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "var(--font-display)",
    serif: "var(--font-serif)",
    rounded: "var(--font-rounded)",
    mono: "var(--font-mono)",
  },
});

export const Spacing = {
  none: 0,
  quarter: 2,
  half: 4,
  one: 8,
  two: 16,
  three: 24,
  four: 32,
  five: 40,
  six: 48,
  seven: 56,
  eight: 64,
  nine: 72,
  ten: 80,
  edge: 12,
} as const;

export const FontSize = {
  title: 32,
  pageHeader: 40,
  header: 24,
  body: 16,
  caption: 12,
  button: 16,
  giant: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
