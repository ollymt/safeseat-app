/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import "@/global.css";

import { Platform } from "react-native";

export const Themes = {
    text: "#FAFAFA",
    textSecondary: "#94A0BC",
    background: "#101322",
    backgroundElement: "#1C2037",
    primaryBttn: "#F78B1F",
    primaryBttnText: "#FAFAFA",
    secondaryBttn: "#4D618C",
    secondaryBttnText: "#FAFAFA",
    textInputPlaceholder: "#FAFAFA80",
    warnBttn: "#FF8F8F",
    warnBttnText: "#452626",
    lightOrange: "#FDCC9B",
    green: "#B4F5D1"
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
}

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
