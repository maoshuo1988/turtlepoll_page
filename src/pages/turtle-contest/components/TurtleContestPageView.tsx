/** 文件说明：龟龟争霸入口页面展示组件，挂载新的龟战 Arena 游戏。 */
import { TurtleBattleGameHost } from '@/components/common/game/TurtleBattleGameHost';

interface TurtleContestPageViewProps {
  isMobileMode: boolean;
  onBack: () => void;
}

export function TurtleContestPageView({ isMobileMode, onBack }: TurtleContestPageViewProps) {
  return (
    <div className="relative h-[calc(100vh-56px)] min-h-[520px] overflow-hidden bg-[#0a0e18] lg:h-[calc(100vh-56px)]">
      <button
        type="button"
        onClick={onBack}
        className={`absolute z-20 rounded-md border border-[#ffd93d]/35 bg-black/55 px-3 py-1.5 text-[13px] font-bold text-[#ffd93d] shadow-[0_4px_16px_rgba(0,0,0,0.35)] backdrop-blur transition hover:border-[#fff3a0]/55 hover:bg-black/70 hover:text-[#fff3a0] ${
          isMobileMode ? 'left-3 top-3' : 'left-4 top-4'
        }`}
      >
        关闭游戏
      </button>
      <TurtleBattleGameHost mobileMode={isMobileMode} />
    </div>
  );
}
