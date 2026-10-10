/**
 * The bottom sheet every "sheet" in the design shares: a scrim, a white panel
 * with 28 pt top corners, and a grab handle. README § Radius / Elevation.
 *
 * The scrim is tappable and closes the sheet; the panel swallows the tap so a
 * press inside it does not. Two shades of scrim are in use (.35 behind the add
 * sheet, .32 behind the reminder sheet), so it is a prop rather than a token.
 */
import type { ReactNode } from 'react';
import { Modal, Pressable, View, type ViewStyle } from 'react-native';

import { surface } from '@/design/tokens';
import { useLanguage } from '@/i18n/LanguageProvider';

export function Sheet({
  open,
  onClose,
  scrimOpacity = 0.35,
  handleColour = surface.line,
  padding,
  gap,
  children,
  testID,
}: {
  open: boolean;
  onClose: () => void;
  scrimOpacity?: number;
  handleColour?: string;
  padding: ViewStyle;
  gap: number;
  children: ReactNode;
  testID?: string;
}) {
  const { dir } = useLanguage();
  if (!open) return null;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', direction: dir }}>
        <Pressable
          testID={testID ? `${testID}-scrim` : undefined}
          accessibilityRole="button"
          onPress={onClose}
          style={{ flex: 1, backgroundColor: `rgba(0,0,0,${scrimOpacity})` }}
        />
        <View
          testID={testID}
          style={{
            backgroundColor: surface.white,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            gap,
            ...padding,
          }}
        >
          <View
            style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: handleColour, alignSelf: 'center' }}
          />
          {children}
        </View>
      </View>
    </Modal>
  );
}
