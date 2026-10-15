/**
 * The pill input with a round send button — Quick capture's "or type it" and
 * the Assistant's message bar, which the prototype draws identically.
 *
 * The prototype's input has no `min-width: 0`, so it overflows its row and
 * squeezes the 50 × 50 button into a 30-wide oval. The button is drawn at the
 * 50 its own style asks for, and the input takes what is left —
 * BUILD-REVIEW.md §2.34. The input is 52 tall: 50 plus its 1 pt border, which
 * the prototype's content-box adds.
 *
 * Return starts a new line, as in WhatsApp; only the button sends. The box
 * grows with the text up to about five lines, and the buttons stay at the
 * bottom beside the last one.
 *
 * The Assistant also gets a paperclip, for a business card or a file of
 * people. Quick capture does not: it takes one sentence, and a file of
 * contacts is not one.
 */
import { forwardRef } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Icon } from '@/ui/Icon';
import { fontFamily, ink, surface } from '@/design/tokens';
import { useDirection } from '@/i18n/LanguageProvider';

export const SendRow = forwardRef<
  TextInput,
  {
    value: string;
    onChange: (text: string) => void;
    onSend: () => void;
    placeholder: string;
    sendLabel: string;
    testID: string;
    /** A microphone beside Send: tap to talk, long-press to talk in the other language. */
    mic?: { onPress: () => void; onLongPress?: () => void; listening: boolean; label: string };
    /** A paperclip before the microphone: a business card, or a file of people. */
    clip?: { onPress: () => void; label: string };
  }
>(function SendRow({ value, onChange, onSend, placeholder, sendLabel, testID, mic, clip }, ref) {
  const dir = useDirection();
  return (
    <View style={{ flexDirection: dir.row, gap: 8, alignItems: 'flex-end' }}>
      <TextInput
        ref={ref}
        testID={`${testID}-input`}
        value={value}
        onChangeText={onChange}
        multiline
        placeholder={placeholder}
        placeholderTextColor={ink.s5}
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 52,
          maxHeight: 132,
          paddingTop: 15,
          paddingBottom: 15,
          textAlignVertical: 'top',
          borderWidth: 1,
          borderColor: surface.line,
          borderRadius: 25,
          paddingHorizontal: 18,
          fontFamily: `${fontFamily}_400Regular`,
          fontSize: 15,
          color: ink.base,
          writingDirection: dir.isRTL ? 'rtl' : 'ltr',
          textAlign: dir.textAlign,
        }}
      />
      {clip ? (
        <Pressable
          testID={`${testID}-clip`}
          onPress={clip.onPress}
          accessibilityRole="button"
          accessibilityLabel={clip.label}
          style={({ pressed }) => ({
            width: 50,
            height: 50,
            borderRadius: 25,
            borderWidth: 1,
            borderColor: surface.line,
            backgroundColor: pressed ? surface.fill : surface.white,
            alignItems: 'center',
            justifyContent: 'center',
          })}
        >
          <Icon name="clip" size={18} strokeWidth={1.7} />
        </Pressable>
      ) : null}
      {mic ? (
        <Pressable
          testID={`${testID}-mic`}
          onPress={mic.onPress}
          onLongPress={mic.onLongPress}
          accessibilityRole="button"
          accessibilityLabel={mic.label}
          accessibilityState={{ selected: mic.listening }}
          style={{
            width: 50,
            height: 50,
            borderRadius: 25,
            borderWidth: 1,
            borderColor: mic.listening ? ink.solid : surface.line,
            backgroundColor: mic.listening ? ink.solid : surface.white,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="mic" size={18} color={mic.listening ? surface.white : ink.base} strokeWidth={1.7} />
        </Pressable>
      ) : null}
      <Pressable
        testID={`${testID}-send`}
        onPress={onSend}
        accessibilityRole="button"
        accessibilityLabel={sendLabel}
        style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: ink.solid, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon name="send" size={18} color={surface.white} strokeWidth={1.7} />
      </Pressable>
    </View>
  );
});
