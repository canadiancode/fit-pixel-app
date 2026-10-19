import { useCallback, useRef, type ReactNode } from "react";
import {
  Dimensions,
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedKeyboard,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Lifts its children (message list + composer) above the iOS keyboard, frame
 * by frame with the keyboard animation.
 *
 * KeyboardAvoidingView can't do this here: the thread sits inside the Chat tab
 * above the tab bar, so the keyboard only overlaps part of it and KAV's
 * parent-relative frame math over- or under-shoots. Instead we measure how far
 * our bottom edge is from the bottom of the window (tab bar + home indicator)
 * and pad by whatever part of the keyboard reaches above that.
 *
 * Android resizes the window for the keyboard itself, so this is iOS only.
 */
export function KeyboardAwareView({ children, style }: Props) {
  const ref = useRef<View>(null);
  const keyboard = useAnimatedKeyboard();
  const gapBelow = useSharedValue(0);

  const measure = useCallback(() => {
    ref.current?.measureInWindow((_x, y, _w, height) => {
      const windowHeight = Dimensions.get("window").height;
      gapBelow.value = Math.max(0, windowHeight - (y + height));
    });
  }, [gapBelow]);

  const liftStyle = useAnimatedStyle(() => {
    if (Platform.OS !== "ios") return { paddingBottom: 0 };
    return {
      paddingBottom: Math.max(0, keyboard.height.value - gapBelow.value),
    };
  });

  return (
    <View ref={ref} onLayout={measure} style={[styles.root, style]}>
      <Animated.View style={[styles.fill, liftStyle]}>{children}</Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
  },
  fill: {
    flex: 1,
    minHeight: 0,
  },
});
