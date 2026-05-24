/** 文件说明：商城页面展示组件，负责承载商城商品和宠物状态展示。 */
import type { ComponentProps } from 'react';
import { Shop } from './Shop';

type ShopPageViewProps = ComponentProps<typeof Shop>;

export function ShopPageView(props: ShopPageViewProps) {
  return (
    <section className="w-full max-w-none min-h-full mx-0 grid content-start gap-4 max-lg:gap-3 view-shop">
      <Shop {...props} />
    </section>
  );
}
