/** 文件说明：跳跃小游戏页面展示组件，负责承载独立小游戏画布。 */
import { TurtleJumpPixel } from './TurtleJumpPixel';

interface JumpPageViewProps {
  isMobileMode: boolean;
  onBack: () => void;
}

export function JumpPageView({ isMobileMode, onBack }: JumpPageViewProps) {
  return (
    <div className="h-screen overflow-hidden bg-[#05070b]">
      <TurtleJumpPixel
        mobileMode={isMobileMode}
        onBack={onBack}
      />
    </div>
  );
}
