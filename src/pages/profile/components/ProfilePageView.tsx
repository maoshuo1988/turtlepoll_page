/** 文件说明：个人主页展示组件，负责承载用户资料、宠物和社区内容。 */
import type { ComponentProps } from 'react';
import { UserRound } from 'lucide-react';
import { ProfilePage } from './ProfilePage';

type ProfilePageViewProps = ComponentProps<typeof ProfilePage>;

export function ProfilePageView(props: ProfilePageViewProps) {
  return (
    <section className="page-frame view-profile">
      <header className="page-header">
        <div className="page-header-row">
          <div>
            <div className="page-eyebrow">
              <UserRound size={14} />
              Profile
            </div>
            <h1 className="page-title">我的主页</h1>
            <p className="page-description">个人资料、资产、宠物状态和社区记录集中管理，避免信息堆积但保留关键操作。</p>
          </div>
        </div>
      </header>
      <ProfilePage {...props} />
    </section>
  );
}
