import { Themes as themes } from "@/constants/theme";
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

type Props = {
  active?: boolean;
  label?: string;
  borderRadius?: number;
  inset?: number;
  beaconPosition?: "top" | "bottom";
};

/**
 * A non-blocking animated guide marker that sits on top of a real control.
 * It never intercepts touches, so the highlighted control remains usable.
 */
export default function GuidePulseOverlay({
  active = false,
  label = "TAP HERE",
  borderRadius = 16,
  inset = -4,
  beaconPosition = "top",
}: Props) {
  const pulse = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    pulse.stopAnimation();
    bob.stopAnimation();
    pulse.setValue(0);
    bob.setValue(0);
    if (!active) return;

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 820,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 820,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    const bobLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: 1,
          duration: 520,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: 520,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    pulseLoop.start();
    bobLoop.start();
    return () => {
      pulseLoop.stop();
      bobLoop.stop();
    };
  }, [active, bob, pulse]);

  if (!active) return null;

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.045] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.95, 0.35] });
  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.20, 0.06] });
  const bobY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, beaconPosition === "top" ? -5 : 5] });

  return (
    <View
      pointerEvents="none"
      style={[
        styles.root,
        { top: inset, right: inset, bottom: inset, left: inset },
      ]}
    >
      <Animated.View
        style={[
          styles.glow,
          {
            borderRadius,
            opacity: glowOpacity,
            transform: [{ scale: ringScale }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.ring,
          {
            borderRadius,
            opacity: ringOpacity,
            transform: [{ scale: ringScale }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.beacon,
          beaconPosition === "top" ? styles.beaconTop : styles.beaconBottom,
          { transform: [{ translateY: bobY }] },
        ]}
      >
        <View style={styles.beaconDot} />
        <Text style={styles.beaconText}>{label}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    zIndex: 999,
    overflow: "visible",
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: themes.primaryBttn,
  },
  ring: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2.5,
    borderColor: themes.primaryBttn,
    shadowColor: themes.primaryBttn,
    shadowOpacity: 0.8,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 14,
  },
  beacon: {
    position: "absolute",
    alignSelf: "center",
    left: "50%",
    marginLeft: -38,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#09251E",
    borderWidth: 1,
    borderColor: themes.primaryBttn,
    shadowColor: "#000",
    shadowOpacity: 0.32,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 16,
  },
  beaconTop: { top: -27 },
  beaconBottom: { bottom: -27 },
  beaconDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: themes.primaryBttn,
  },
  beaconText: {
    color: themes.primaryBttn,
    fontSize: 8.5,
    letterSpacing: 0.65,
    fontFamily: "Body-Bold",
  },
});
