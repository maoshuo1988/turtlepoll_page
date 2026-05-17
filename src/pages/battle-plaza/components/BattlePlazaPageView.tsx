/** 文件说明：开撕台页面展示组件，负责承载开撕台共享业务视图。 */
import { Landmark } from 'lucide-react';
import { BattlePlazaPage } from './BattlePlazaPage';

export function BattlePlazaPageView() {
  return (
    <section className="page-frame view-battle-plaza">
      {/* 手机端底部 Tab 已标明「钱庄」，此处仅 PC 保留标题区 */}
      <header className="page-header hidden lg:block">
        <div className="page-header-row">
          <div>
            <div className="page-eyebrow">
              <Landmark size={14} />
              Battle Plaza
            </div>
            <h1 className="page-title">地下钱庄</h1>
            <p className="page-description">
              创建对局、接单、追加保证金和处理争议都集中在这里，PC 端更适合扫描状态，手机端保持单列操作。
            </p>
          </div>
        </div>
      </header>
      <BattlePlazaPage />
    </section>
  );
}
