/**
 * Toasts: bottom, pill-shaped, ink background. Every action is confirmed by
 * one, and destructive or bulk actions carry an Undo for about 4 s
 * (README § Global behaviour).
 *
 * Backed by a module store rather than context so any screen can raise one
 * without being wrapped — toasts outlive the screen that triggered them.
 */
import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';

import { Text } from './Text';
import { ink, motion, radius, surface } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';

type ToastState = { message: string; undo?: () => void; id: number } | null;

let current: ToastState = null;
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return current;
}

/** Raises a toast, replacing any toast already on screen. */
export function showToast(message: string, options: { undo?: () => void } = {}) {
  if (timer) clearTimeout(timer);
  current = { message, undo: options.undo, id: Date.now() };
  emit();
  timer = setTimeout(() => {
    current = null;
    emit();
  }, motion.toastDismiss);
}

export function dismissToast() {
  if (timer) clearTimeout(timer);
  current = null;
  emit();
}

export function useToast() {
  return {
    show: useCallback((message: string, options: { undo?: false | (() => void) } = {}) => {
      showToast(message, { undo: options.undo || undefined });
    }, []),
    dismiss: dismissToast,
  };
}

/** Renders the active toast. Mount once per screen that can raise one. */
export function Toast() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const { t, dir: writingDirection } = useLanguage();
  const dir = useDirection();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: state ? 1 : 0,
      duration: 200,
      easing: Easing.bezier(...motion.easing),
      useNativeDriver: true,
    }).start();
  }, [state, anim]);

  if (!state) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 20,
        right: 20,
        bottom: 110,
        alignItems: 'center',
        // Outside <Screen>, so it carries the writing direction itself.
        direction: writingDirection,
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
      }}
    >
      <View
        testID="toast"
        style={{
          flexDirection: dir.row,
          alignItems: 'center',
          gap: 16,
          maxWidth: '100%',
          backgroundColor: ink.card,
          borderRadius: radius.pill,
          paddingVertical: 13,
          paddingHorizontal: 20,
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 8 },
          elevation: 8,
        }}
      >
        <Text token="caption" color={surface.onCard} style={{ flexShrink: 1 }}>
          {state.message}
        </Text>
        {state.undo ? (
          <Pressable
            testID="toast-undo"
            onPress={() => {
              state.undo?.();
              dismissToast();
            }}
            accessibilityRole="button"
            hitSlop={10}
          >
            <Text token="caption" weight="600" color={surface.onCard} style={{ textDecorationLine: 'underline' }}>
              {t.undo}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}
