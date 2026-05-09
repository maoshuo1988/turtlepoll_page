/** 文件说明：宠物空间页面展示组件，负责承载宠物详情和操作区。 */
import type { ComponentProps } from 'react';
import { Sparkles } from 'lucide-react';
import { PetPage } from './PetPage';

type PetPageViewProps = ComponentProps<typeof PetPage>;

export function PetPageView(props: PetPageViewProps) {
  return (
    <section className="page-frame view-pet">
      <header className="page-header">
        <div className="page-header-row">
          <div>
            <div className="page-eyebrow">
              <Sparkles size={14} />
              Pet Space
            </div>
            <h1 className="page-title">宠物空间</h1>
            <p className="page-description">查看当前装备龟、体力、心情、龟种能力和养成状态，所有操作都保持在同一个宠物工作台里。</p>
          </div>
        </div>
      </header>
      <PetPage {...props} />
    </section>
  );
}
