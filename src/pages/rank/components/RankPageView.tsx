/** 文件说明：排行榜页面展示组件，负责承载排行榜共享视图。 */
import { Trophy } from 'lucide-react';
import { RankPage } from './RankPage';

export function RankPageView() {
  return (
    <section className="page-frame view-rank lg:pt-[10px]">
      <header className="page-header">
        <div className="page-header-row">
          <div>
            <div className="page-eyebrow">
              <Trophy size={14} />
              Ranking
            </div>
            <h1 className="page-title">排行榜</h1>
            <p className="page-description">按总龟币与胜率综合排序，重点突出名次、连胜和当前用户位置。</p>
          </div>
        </div>
      </header>
      <RankPage />
    </section>
  );
}
