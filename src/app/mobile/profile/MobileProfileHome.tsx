import type { ReactNode } from 'react';
import { ChevronRight, LogIn, MoonStar, Settings2, ShieldCheck, Sparkles } from 'lucide-react';
import { getAuthToken, getStoredUserInfo } from '@/utils/authStorage';
import type { PetInfo } from '@/data/mock_data';

interface MobileProfileHomeProps {
  balance: number;
  pet: PetInfo;
  darkMode: boolean;
  onOpenAuth: () => void;
  onOpenSettings: () => void;
  onOpenPet: () => void;
  onOpenForum: () => void;
}

function MobileProfileRow({
  title,
  description,
  icon,
  onClick,
  badge,
  darkMode,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  onClick: () => void;
  badge?: string;
  darkMode: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-[22px] border px-4 py-4 text-left transition-transform duration-200 active:scale-[0.985] ${
        darkMode ? 'border-white/8 bg-[#111315]' : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border ${darkMode ? 'border-white/8 bg-[#171a1d] text-[#9bf58b]' : 'border-slate-200 bg-slate-50 text-emerald-600'}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <div className={`truncate text-[15px] font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{title}</div>
          <div className={`mt-1 truncate text-[12px] ${darkMode ? 'text-[#8b949e]' : 'text-slate-600'}`}>{description}</div>
        </div>
      </div>
      <div className="ml-3 flex shrink-0 items-center gap-2">
        {badge ? (
          <div className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${darkMode ? 'border border-emerald-400/20 bg-emerald-500/10 text-emerald-300' : 'border border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
            {badge}
          </div>
        ) : null}
        <ChevronRight size={18} className={darkMode ? 'text-[#6f7881]' : 'text-slate-400'} />
      </div>
    </button>
  );
}

export function MobileProfileHome({
  balance,
  pet,
  darkMode,
  onOpenAuth,
  onOpenSettings,
  onOpenPet,
  onOpenForum,
}: MobileProfileHomeProps) {
  const isAuthenticated = Boolean(getAuthToken());
  const storedUser = getStoredUserInfo();
  const displayName = storedUser?.nickname || storedUser?.username || '未登录用户';
  const accountText = isAuthenticated ? '账号已连接，可以管理登录信息和安全设置。' : '登录后可以同步发帖、下注和个人资料。';
  const pageTone = darkMode
    ? {
        surface: 'border-white/8 bg-[#0f1113]',
        hero: 'border-white/8 bg-[radial-gradient(circle_at_top,#1c231d_0%,#121416_36%,#0b0c0d_100%)]',
        card: 'bg-[#111315] border-white/8',
        subCard: 'bg-black/25',
        title: 'text-white',
        text: 'text-[#8b949e]',
        muted: 'text-[#7f8993]',
        iconBox: 'border-white/8 bg-[#171a1d]',
      }
    : {
        surface: 'border-slate-200 bg-white',
        hero: 'border-emerald-200/70 bg-[radial-gradient(circle_at_top,#e8fff1_0%,#f7faf8_38%,#eef3f0_100%)]',
        card: 'bg-white border-slate-200',
        subCard: 'bg-slate-100/80',
        title: 'text-slate-900',
        text: 'text-slate-600',
        muted: 'text-slate-500',
        iconBox: 'border-slate-200 bg-slate-50',
      };

  return (
    <section className="space-y-3">
      {/*
        MobileProfileHome:
        手机端“我的”首页。
        这里只负责展示账号概况、常用入口和设置跳转，不承载登录表单和设置详情。
        后面要改移动端“我的”首页布局时，优先从这个文件开始找。
      */}
      <div className={`overflow-hidden rounded-[28px] border p-4 ${pageTone.hero}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className={`grid h-[68px] w-[68px] shrink-0 place-items-center rounded-full border text-[22px] font-black shadow-[0_10px_28px_rgba(0,0,0,0.18)] ${pageTone.iconBox} ${pageTone.title}`}>
              {isAuthenticated ? String(displayName).slice(0, 1).toUpperCase() : 'G'}
            </div>
            <div className="min-w-0 pt-1">
              <div className={`truncate text-[22px] font-black tracking-[-0.03em] ${pageTone.title}`}>{displayName}</div>
              <div className={`mt-1 text-[12px] font-medium ${pageTone.text}`}>
                {isAuthenticated ? 'Turtle Pass 已登录' : '点击进入登录模块'}
              </div>
              <div className={`mt-2 text-[12px] leading-5 ${pageTone.muted}`}>{accountText}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenSettings}
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border ${darkMode ? 'border-white/10 bg-black/30 text-[#c5ced6]' : 'border-slate-200 bg-white/90 text-slate-600'}`}
          >
            <Settings2 size={18} />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className={`rounded-[20px] px-3 py-3 ${pageTone.subCard}`}>
            <div className={`text-[11px] ${pageTone.muted}`}>龟币余额</div>
            <div className={`mt-2 text-[20px] font-black ${pageTone.title}`}>{balance.toLocaleString()}</div>
          </div>
          <div className={`rounded-[20px] px-3 py-3 ${pageTone.subCard}`}>
            <div className={`text-[11px] ${pageTone.muted}`}>宠物体力</div>
            <div className={`mt-2 text-[20px] font-black ${pageTone.title}`}>{pet.stamina}/{pet.maxStamina}</div>
          </div>
        </div>
      </div>

      <div className={`rounded-[26px] border p-4 ${pageTone.surface}`}>
        <div className={`mb-3 text-[13px] font-bold ${pageTone.muted}`}>账号与常用入口</div>
        <div className="space-y-2">
          <MobileProfileRow
            title={isAuthenticated ? '账号中心' : '登录 / 注册'}
            description={isAuthenticated ? '查看账号信息、退出登录、重新管理登录状态。' : '把登录注册流程单独放到手机端独立页面。'}
            icon={<LogIn size={18} />}
            onClick={onOpenAuth}
            badge={isAuthenticated ? '已登录' : '未登录'}
            darkMode={darkMode}
          />
          <MobileProfileRow
            title="移动端设置"
            description={`亮暗模式、通知偏好和动效开关统一放到设置页里，当前为${darkMode ? '深色' : '浅色'}模式。`}
            icon={<MoonStar size={18} />}
            onClick={onOpenSettings}
            darkMode={darkMode}
          />
          <MobileProfileRow
            title="宠物中心"
            description="进入宠物页查看体力、皮肤和养成状态。"
            icon={<Sparkles size={18} />}
            onClick={onOpenPet}
            darkMode={darkMode}
          />
          <MobileProfileRow
            title="去发帖"
            description="快速回到社区页继续发帖和参与讨论。"
            icon={<ShieldCheck size={18} />}
            onClick={onOpenForum}
            darkMode={darkMode}
          />
        </div>
      </div>
    </section>
  );
}
