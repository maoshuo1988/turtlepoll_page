/** 文件说明：商城页面展示组件，负责承载商城商品和宠物状态展示。 */
import type { ComponentProps } from 'react';
import { Store } from 'lucide-react';
import { Shop } from './Shop';

type ShopPageViewProps = ComponentProps<typeof Shop>;

export function ShopPageView(props: ShopPageViewProps) {
  return (
    <section className="page-frame view-shop">
      <header className="page-header">
        <div className="page-header-row">
          <div>
            <div className="page-eyebrow">
              <Store size={14} />
              Market
            </div>
            <h1 className="page-title">黑市</h1>
            <p className="page-description">抽取龟种、购买补给和查看当前宠物状态，操作区保持明确，避免直接误触消费。</p>
          </div>
        </div>
      </header>
      <Shop {...props} />
    </section>
  );
}
