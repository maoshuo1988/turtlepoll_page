/**
 * 文件说明：消息详情页时间线步骤图标。
 */
import { Check, Flame, Gift, Package, Plus, Wallet } from 'lucide-react';
import type { MessageTimelineItem } from './messageNotifyModel';

interface MessageDetailTimelineIconProps {
  icon: MessageTimelineItem['icon'];
  size?: number;
}

export function MessageDetailTimelineIcon({ icon, size = 14 }: MessageDetailTimelineIconProps) {
  const props = { size, strokeWidth: 2.4, 'aria-hidden': true as const };
  switch (icon) {
    case 'wallet':
      return <Wallet {...props} />;
    case 'box':
      return <Package {...props} />;
    case 'gift':
      return <Gift {...props} />;
    case 'flame':
      return <Flame {...props} />;
    case 'check':
      return <Check {...props} />;
    case 'plus':
    default:
      return <Plus {...props} />;
  }
}
