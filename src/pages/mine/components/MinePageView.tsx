/** 文件说明：我的页面展示组件（移动端 Tab 一级页）。 */
import { MineMobilePage } from './MineMobilePage';

export function MinePageView() {
  return (
    <section className="view-mine w-full min-h-full lg:hidden">
      <MineMobilePage />
    </section>
  );
}
