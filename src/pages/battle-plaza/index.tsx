/**
 * 文件说明：index 页面路由入口，负责组装当前页面的业务组件和页面级状态。
 */
import { BattlePlazaPageView } from './components/BattlePlazaPageView';

export default function BattlePlazaPage() {
  return (
    <div className="pt-0 lg:pt-[10px]">
      <BattlePlazaPageView />
    </div>
  );
}
