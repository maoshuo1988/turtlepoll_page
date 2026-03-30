import React from 'react';

/**
 * MobilePredictionTopTabs:
 * 手机端预测首页顶部滑动导航。
 *
 * 这个组件只服务 mobile 端首页，不参与 PC 端布局。
 * 作用是把手机端首页拆成固定的五个首页频道：
 * 1. 排行榜
 * 2. 推荐
 * 3. 最新
 * 4. 关注
 * 5. 预测市场
 *
 * 这里的频道只服务“首页”。
 * 底部中间的发布按钮不参与频道切换，只负责打开发布帖子面板。
 *
 * 视觉风格参考虎扑移动端顶部频道条：
 * - 横向可滑动
 * - 激活项用更重的字重和绿色下划线强调，和项目主色统一
 * - 非激活项保持弱化，方便以后继续加频道
 */
export type MobilePredictionTopTabKey =
  | 'rank_board'
  | 'recommend_feed'
  | 'latest_feed'
  | 'following_feed'
  | 'prediction_market';

interface MobilePredictionTopTabsProps {
  activeTab: MobilePredictionTopTabKey;
  onChange: (tab: MobilePredictionTopTabKey) => void;
}

const MOBILE_PREDICTION_TABS: Array<{ key: MobilePredictionTopTabKey; label: string }> = [
  { key: 'rank_board', label: '排行榜' },
  { key: 'recommend_feed', label: '推荐' },
  { key: 'latest_feed', label: '最新' },
  { key: 'following_feed', label: '关注' },
  { key: 'prediction_market', label: '预测市场' },
];

export const MobilePredictionTopTabs: React.FC<MobilePredictionTopTabsProps> = ({
  activeTab,
  onChange,
}) => {
  return (
    <div className="overflow-x-auto overflow-y-hidden border-b border-white/8 bg-[#080808] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex min-w-max items-center px-3">
        {MOBILE_PREDICTION_TABS.map((tab) => {
          const isActive = tab.key === activeTab;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              className={`relative mr-6 shrink-0 pb-3 pt-2 text-[16px] transition-colors ${
                isActive ? 'font-black text-emerald-300' : 'font-semibold text-zinc-500'
              }`}
            >
              {tab.label}
              <span
                className={`absolute inset-x-0 bottom-0 h-[3px] rounded-full transition-colors ${
                  isActive ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.45)]' : 'bg-transparent'
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
};
