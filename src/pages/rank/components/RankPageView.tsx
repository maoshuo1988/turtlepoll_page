/** 文件说明：排行榜页面展示组件，负责承载排行榜共享视图。 */
import { RankPage } from './RankPage';

export function RankPageView() {
  return (
    <section className="w-full max-w-none min-h-full mx-0 grid content-start gap-4 pt-[10px] max-lg:gap-3 view-rank">
      <RankPage />
    </section>
  );
}
