/** 文件说明：商城页面展示组件，负责承载商城商品和宠物状态展示。 */
import type { ComponentProps } from 'react';
import { Shop } from '../Shop';
import styles from './index.module.scss';

type ShopPageViewProps = ComponentProps<typeof Shop>;

export function ShopPageView(props: ShopPageViewProps) {
  return (
    <section className={`view-shop w-full min-h-full ${styles.root}`}>
      <Shop {...props} />
    </section>
  );
}
