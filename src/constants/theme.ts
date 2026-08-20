/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import "@/global.css";

import { Platform } from "react-native";

// ─────────────────────────────────────────────────────────────────────────
// SafeSeat "Dashboard Leather" theme — an iOS 6-style skeuomorphic system.
// Think: stitched leather car interior, brushed chrome trim, brass rivets,
// and cream index-card paper. Every surface is meant to look "physical."
// ─────────────────────────────────────────────────────────────────────────

export const Themes = {
  light: {
    text: "#2C1B0F",
    background: "#E7D9B8",
    element: "#F8EFDA",
    backgroundElement: "#DCC89C",
    backgroundSelected: "#C9AF7C",
    textSecondary: "#7C5A38",
    border: "#B4936259",
    primaryBttn: "#3E6B22",
    primaryBttnText: "#F4ECD8",
    secondaryBttn: "#8B7052",
    secondaryBttnText: "#FBF3E1",
    warnBttn: "#8A2015",
    warnBttnText: "#F6E9D8",
    yellow: "#A6791F",
    blue: "#2C5C82",
    purple: "#5B3B78",
    pitch: "#F8EFDA",
  },
  dark: {
    text: "#F1E3C6",
    background: "#241609",
    element: "#331F10",
    border: "#5C40234D",
    backgroundElement: "#3D2814",
    backgroundSelected: "#4E341A",
    textSecondary: "#C9AC7C",
    primaryBttn: "#6FAE3D",
    primaryBttnText: "#132408",
    secondaryBttn: "#5C4023",
    secondaryBttnText: "#F1E3C6",
    warnBttn: "#D8543F",
    warnBttnText: "#2A0805",
    yellow: "#E0AB4A",
    blue: "#5A9FD4",
    purple: "#A682D1",
    pitch: "#331F10",
  },
} as const;

export type ThemeColor = keyof typeof Themes.light & keyof typeof Themes.dark;

// Extra "material" tones that don't flip with light/dark — leather and
// chrome look like leather and chrome regardless of appearance mode,
// the same way a real dashboard doesn't swap its upholstery at night.
export const Materials = {
  leatherDark: "#241609",
  leatherMid: "#3B2415",
  leatherLight: "#54331C",
  stitch: "#D8B478",
  stitchDim: "#8A6A3F",
  brassLight: "#F0D889",
  brassMid: "#C9A227",
  brassDark: "#7A5C12",
  chromeLight: "#FDFDFB",
  chromeMid: "#DCDEE2",
  chromeDark: "#9296A0",
  chromeShadow: "#4A4D54",
  glassHighlight: "rgba(255,255,255,0.55)",
} as const;

// Gradient stop arrays for expo-linear-gradient, tuned to fake glossy
// plastic / polished metal / worn leather highlights.
export const Gradients = {
  chrome: ["#FDFDFB", "#E4E6EA", "#B9BDC4", "#8B8F98"] as const,
  chromeSubtle: ["#F4F5F7", "#DEE0E4", "#C4C7CD"] as const,
  brass: ["#F3E3A8", "#D8B84A", "#A9821F", "#7A5C12"] as const,
  leather: ["#54331C", "#3B2415", "#26160B"] as const,
  leatherLight: ["#6B4626", "#4C2E18", "#301C0E"] as const,
  glossGreen: ["#8FCB57", "#4F8B29", "#2C5416"] as const,
  glossGreenDark: ["#9FDD63", "#5EA331", "#356017"] as const,
  glossRed: ["#E36A54", "#A32A1B", "#5E140C"] as const,
  glossBlue: ["#6FB3E0", "#2C5C82", "#173650"] as const,
  glossTan: ["#C7A97C", "#8B7052", "#5E4A34"] as const,
  linen: ["#F3E7C9", "#E7D9B8", "#D9C599"] as const,
  linenDark: ["#3D2814", "#2A1A0C", "#1A0F06"] as const,
  paper: ["#FBF4E2", "#F8EFDA", "#EDE0BE"] as const,
} as const;

// Layered shadow presets. RN can't do true multi-layer box-shadows on
// native, so these are meant to be combined with a 1px highlight border
// on the opposite edge from whatever component uses them.
export const Shadows = {
  raised: {
    shadowColor: "#1A0F06",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
  },
  card: {
    shadowColor: "#1A0F06",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  inset: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
    elevation: 1,
  },
} as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
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
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;