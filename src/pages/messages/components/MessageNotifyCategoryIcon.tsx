/** 文件说明：消息中心业务分类图标。 */
import { DollarSign, FileText, Flame, Gift, Megaphone, Wallet } from 'lucide-react';
import type { MessageNotifyBusinessCode } from '@/hooks/messageNotifyTypes';

interface MessageNotifyCategoryIconProps {
  businessCode?: string;
  size?: number;
}

export function MessageNotifyCategoryIcon({ businessCode, size = 16 }: MessageNotifyCategoryIconProps) {
  const code = businessCode as MessageNotifyBusinessCode;
  const props = { size, strokeWidth: 2.2, 'aria-hidden': true as const };

  switch (code) {
    case 'dark_market':
      return <DollarSign {...props} />;
    case 'intel':
      return <FileText {...props} />;
    case 'tear_square':
      return <Flame {...props} />;
    case 'system':
      return <Megaphone {...props} />;
    case 'reward':
      return <Gift {...props} />;
    case 'underground_bank':
      return <Wallet {...props} />;
    default:
      return <Megaphone {...props} />;
  }
}
