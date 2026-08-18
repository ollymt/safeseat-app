// ─────────────────────────────────────────────────────────────────────────
// Skeuomorphic primitives — the "physical materials" this app is built
// from: stitched leather, brushed chrome, brass rivets and cream paper.
// Every screen composes itself out of these instead of flat native views,
// which is what gives the app its iOS 6 dashboard look.
// ─────────────────────────────────────────────────────────────────────────
import { Gradients, Materials, Shadows, Themes } from "@/constants/theme";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, View, ViewProps, useColorScheme } from "react-native";

function useSafeTheme() {
    const scheme = useColorScheme();
    const active = scheme === "dark" ? "dark" : "light";
    return { active, theme: Themes[active] };
}

/** Warm linen/parchment page background with a soft vignette, like the
 * paper stock behind iOS 6's Notes or Reminders apps. */
export function LinenBackground({ style, children }: ViewProps) {
    const { active } = useSafeTheme();
    return (
        <LinearGradient
            colors={active === "dark" ? Gradients.linenDark : Gradients.linen}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={[{ flex: 1 }, style]}
        >
            {children}
        </LinearGradient>
    );
}

/** A row of dashed "thread" — the stitched seam that outlines almost every
 * panel in the app. */
export function Stitching({ color, style }: { color?: string; style?: any }) {
    return (
        <View
            style={[
                {
                    borderStyle: "dashed",
                    borderWidth: 1,
                    borderColor: color ?? Materials.stitch,
                    opacity: 0.8,
                },
                style,
            ]}
        />
    );
}

/** Dark, riveted leather panel used for nav bars, tab bars, and headers. */
export function LeatherPanel({
    style,
    children,
    inset = 6,
}: ViewProps & { inset?: number }) {
    return (
        <LinearGradient
            colors={Gradients.leather}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={[styles.leatherPanel, style]}
        >
            <View style={[styles.stitchFrame, { margin: inset }]} pointerEvents="none">
                <Stitching />
            </View>
            {children}
        </LinearGradient>
    );
}

/** Small round brass rivet, purely decorative — sits at the corners of
 * leather panels the way real upholstery is tacked down. */
export function BrassRivet({ size = 6, style }: { size?: number; style?: any }) {
    return (
        <LinearGradient
            colors={Gradients.brass}
            start={{ x: 0.3, y: 0 }}
            end={{ x: 0.7, y: 1 }}
            style={[
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    borderWidth: 0.5,
                    borderColor: Materials.brassDark,
                },
                style,
            ]}
        />
    );
}

/** Cream index-card surface with a glossy top highlight — the default
 * "content card" material (contact cards, seat cards, list rows...). */
export function PaperCard({ style, children }: ViewProps) {
    return (
        <LinearGradient
            colors={Gradients.paper}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={[styles.paperCard, style]}
        >
            {children}
        </LinearGradient>
    );
}

/** Glossy, beveled plastic/leather surface for buttons and badges. Pass a
 * `tone` gradient (e.g. Gradients.glossGreen) to recolor it. */
export function GlossSurface({
    tone,
    style,
    children,
}: ViewProps & { tone: readonly string[] }) {
    return (
        <LinearGradient
            colors={tone as any}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={[styles.glossBase, style]}
        >
            {/* specular highlight streak across the top third */}
            <LinearGradient
                colors={["rgba(255,255,255,0.55)", "rgba(255,255,255,0)"]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 0.7 }}
                style={StyleSheet.absoluteFillObject}
                pointerEvents="none"
            />
            {children}
        </LinearGradient>
    );
}

/** Brushed-chrome capsule — used for search fields, chip badges, toggle
 * tracks; anything meant to look like polished metal trim. */
export function ChromeSurface({ style, children }: ViewProps) {
    return (
        <LinearGradient
            colors={Gradients.chromeSubtle}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={[styles.chromeBase, style]}
        >
            {children}
        </LinearGradient>
    );
}

/** Engraved-brass style section/page title, the way iOS 6 apps like
 * Contacts stamped their headers into the leather binding. */
export function EngravedTitle({
    children,
    size = 30,
    color,
    style,
}: {
    children: React.ReactNode;
    size?: number;
    color?: string;
    style?: any;
}) {
    return (
        <View style={style}>
            <Text
                style={{
                    fontSize: size,
                    fontWeight: "800",
                    letterSpacing: 0.3,
                    color: color ?? Materials.brassLight,
                    textShadowColor: "rgba(0,0,0,0.65)",
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 1,
                }}
            >
                {children}
            </Text>
        </View>
    );
}

export const SkeuoShadows = Shadows;
export const SkeuoGradients = Gradients;
export const SkeuoMaterials = Materials;

const styles = StyleSheet.create({
    leatherPanel: {
        ...Shadows.raised,
        borderBottomWidth: 2,
        borderBottomColor: "#160C04",
    },
    stitchFrame: {
        ...StyleSheet.absoluteFillObject,
    },
    paperCard: {
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "rgba(120,90,50,0.35)",
        ...Shadows.card,
    },
    glossBase: {
        borderRadius: 100,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.35)",
        overflow: "hidden",
        ...Shadows.raised,
    },
    chromeBase: {
        borderRadius: 100,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.6)",
        overflow: "hidden",
        ...Shadows.inset,
    },
});