/**
 * SafeSeat visual system.
 *
 * Dark navy keeps the in-vehicle UI low-glare. Green + white are the brand
 * palette. Amber/red are reserved strictly for Warning/Emergency semantics.
 */

import "@/global.css";

import { Platform } from "react-native";

export const Themes = {
  text: "#F8FAFC",
  textSecondary: "#9EADBF",
  textMuted: "#6F8197",

  background: "#0B1220",
  backgroundElement: "#111C2D",
  backgroundElevated: "#172437",
  backgroundSelected: "#123827",
  surfaceSoft: "#0E1828",
  divider: "#26364C",

  // SafeSeat brand accent
  primaryBttn: "#34D17F",
  primaryBttnText: "#05160E",
  primarySoft: "#123827",
  primaryBorder: "#2A8F5E",

  // Neutral secondary action
  secondaryBttn: "#213148",
  secondaryBttnText: "#F8FAFC",

  textInputPlaceholder: "#F8FAFC70",

  // Safety semantics only.
  warnBttn: "#FF676F",
  warnBttnText: "#2A090C",
  lightOrange: "#F5C451",
  green: "#66E3A0",

  // Non-safety informational state.
  info: "#75B8FF",
} as const;

export type ThemeColor = keyof typeof Themes;

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
  title: 30,
  pageHeader: 34,
  header: 22,
  body: 16,
  caption: 12,
  button: 15,
  giant: 60,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
