/** 文件说明：地下钱庄页面展示组件，负责承载地下钱庄业务视图。 */
import { BattlePlazaPage } from './BattlePlazaPage';

export function BattlePlazaPageView() {
  return (
    <section className="w-full max-w-none min-h-full mx-0 grid content-start gap-4 max-lg:gap-3 view-battle-plaza">
      <BattlePlazaPage />
    </section>
  );
}
