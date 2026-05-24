/** 文件说明：宠物空间页面展示组件，负责承载宠物详情和操作区。 */
import type { ComponentProps } from 'react';
import { PetPage } from './PetPage';

type PetPageViewProps = ComponentProps<typeof PetPage>;

export function PetPageView(props: PetPageViewProps) {
  return (
    <section className="w-full max-w-none min-h-full mx-0 grid content-start gap-4 max-lg:gap-3 view-pet">
      <PetPage {...props} />
    </section>
  );
}
