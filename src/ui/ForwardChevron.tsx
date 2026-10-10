import { View } from 'react-native';

import { Icon } from './Icon';
import { ink } from '@/design/tokens';
import { useDirection } from '@/i18n/LanguageProvider';

/**
 * A forward chevron: points right in English and left in Arabic.
 *
 * The prototype asks for its *back* icon in Arabic here, and its icon helper
 * then mirrors every back icon in Arabic a second time, so its Arabic
 * chevrons point right. The handoff's own Arabic screenshot
 * (28-ar-settings.png) shows them pointing left, which is the intent — see
 * BUILD-REVIEW.md §2.19. Compose's "Last time" row has the same fault.
 */
export function ForwardChevron({ color = ink.disabledBtn }: { color?: string }) {
  const { isRTL } = useDirection();
  return (
    <View style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}>
      <Icon name="chevR" size={18} color={color} strokeWidth={2} />
    </View>
  );
}
