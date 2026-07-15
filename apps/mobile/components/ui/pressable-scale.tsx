import { useEffect, useRef } from "react";
import { Animated, Pressable, Easing, AccessibilityInfo } from "react-native";
import type { PressableProps, StyleProp, ViewStyle } from "react-native";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PressableScaleProps extends Omit<PressableProps, "style"> {
  /** How far to scale down on press. Defaults to a subtle 0.96 — noticeable, not bouncy. */
  scaleTo?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Drop-in Pressable with satisfying press feedback (quick scale down, spring back on release).
 * Respects the system's Reduce Motion setting — becomes a no-op scale of 1 when enabled.
 */
export function PressableScale({ scaleTo = 0.96, style, onPressIn, onPressOut, ...props }: PressableScaleProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const reduceMotionRef = useRef(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      reduceMotionRef.current = value;
    });
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", (value) => {
      reduceMotionRef.current = value;
    });
    return () => subscription.remove();
  }, []);

  function animateTo(toValue: number) {
    if (reduceMotionRef.current) return;
    Animated.timing(scale, {
      toValue,
      duration: 100,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }

  return (
    <AnimatedPressable
      style={[{ transform: [{ scale }] }, style]}
      onPressIn={(e) => {
        animateTo(scaleTo);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        animateTo(1);
        onPressOut?.(e);
      }}
      {...props}
    />
  );
}
