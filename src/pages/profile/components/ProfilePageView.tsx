/** 文件说明：个人主页展示组件，负责承载用户资料、宠物和社区内容。 */
import type { ComponentProps } from 'react';
import { ProfilePage } from './ProfilePage';

type ProfilePageViewProps = ComponentProps<typeof ProfilePage>;

export function ProfilePageView(props: ProfilePageViewProps) {
  return (
    <section className="page-frame view-profile">
      <ProfilePage {...props} />
    </section>
  );
}
