/**
 * 文件说明：index 页面路由入口，负责组装当前页面的业务组件和页面级状态。
 */
import { BattlePlazaPage as BattlePlaza } from '@/components/shared/battle-plaza';

export default function BattlePlazaPage() {
  return (
    <section className="view-shell view-rhythm view-battle-plaza mx-0 grid w-full max-w-none gap-4">
      <BattlePlaza />
    </section>
  );
}
