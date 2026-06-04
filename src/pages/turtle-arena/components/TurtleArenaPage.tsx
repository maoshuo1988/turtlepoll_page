/**
 * 文件说明：龟战 Arena 全屏页面，直接挂载新的 turtle-battle-poc 游戏。
 */
import { TurtleBattleGameHost } from '@/components/common/game/TurtleBattleGameHost';

export function TurtleArenaPage() {
  return (
    <main className="h-screen w-screen overflow-hidden bg-black">
      <TurtleBattleGameHost isImmersive />
    </main>
  );
}
