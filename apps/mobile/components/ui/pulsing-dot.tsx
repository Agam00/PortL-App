import { useEffect, useRef } from "react";
import { Animated, Easing, AccessibilityInfo } from "react-native";

/** A small status dot that gently pulses to draw the eye to something live/urgent. Respects Reduce Motion. */
export function PulsingDot({ className = "h-1.5 w-1.5 rounded-full bg-status-amber" }: { className?: string }) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;

    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (reduceMotion) return;
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.35, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]),
      );
      loop.start();
    });

    return () => loop?.stop();
  }, [opacity]);

  return <Animated.View className={className} style={{ opacity }} />;
}
