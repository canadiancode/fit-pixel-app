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
 * Lifts its children (message list + composer) above the keyboard, frame by
 * frame with the keyboard animation.
 *
 * KeyboardAvoidingView can't do this here: the thread sits inside the Chat tab
 * above the tab bar, so the keyboard only overlaps part of it and KAV's
 * parent-relative frame math over- or under-shoots. Instead we measure how far
 * our bottom edge is from the bottom of the window (tab bar + home indicator)
 * and pad by whatever part of the keyboard reaches above that.
 *
 * Android needs this too: with edge-to-edge (always on since Expo SDK 54) the
 * window no longer resizes for the keyboard, so `adjustResize` does nothing.
 */
export function KeyboardAwareView({ children, style }: Props) {
  const ref = useRef<View>(null);
  const keyboard = useAnimatedKeyboard();
  const gapBelow = useSharedValue(0);

  const measure = useCallback(() => {
    const setGap = (top: number, height: number) => {
      const windowHeight = Dimensions.get("window").height;
      gapBelow.value = Math.max(0, windowHeight - (top + height));
    };
    if (Platform.OS === "android") {
      // Android's measureInWindow leaves out the status bar under edge-to-edge,
      // so take the position relative to the full-screen root view instead.
      ref.current?.measure((_x, _y, _w, height, _pageX, pageY) =>
        setGap(pageY, height),
      );
    } else {
      ref.current?.measureInWindow((_x, y, _w, height) => setGap(y, height));
    }
  }, [gapBelow]);

  const liftStyle = useAnimatedStyle(() => {
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
