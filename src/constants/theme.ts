/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import "@/global.css";

import { Platform } from "react-native";

export const Themes = {
  light: {
    text: "#000000",
    background: "#F2F2F6",
    element: "#FFFFFF",
    backgroundElement: "#D6D6D6",
    backgroundSelected: "#BDBDBD",
    textSecondary: "#60646C",
    primaryBttn: "#25601D",
    primaryBttnText: "#ffffff",
    secondaryBttn: "#cccccc",
    secondaryBttnText: "#000000",
    warnBttn: "#F00C31",
    warnBttnText: "#ffffff",
    yellow: "#66613E",
    blue: "#0167FA",
    purple: "#761BE0"
  },
  dark: {
    text: "#ffffff",
    background: "#000000",
    element: "#181818",
    backgroundElement: "#212225",
    backgroundSelected: "#2E3135",
    textSecondary: "#B0B4BA",
    primaryBttn: "#BBFFB3",
    primaryBttnText: "#000000",
    secondaryBttn: "#444444",
    secondaryBttnText: "#ffffff",
    warnBttn: "#FF9EAE",
    warnBttnText: "#000000",
    yellow: "#FFF197",
    blue: "#96C1FF",
    purple: "#C8A5F0"
  },
} as const;

export type ThemeColor = keyof typeof Themes.light & keyof typeof Themes.dark;

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
