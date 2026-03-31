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
}: {
  title: string;
  description: string;
  icon: ReactNode;
  onClick: () => void;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-[22px] border border-white/8 bg-[#111315] px-4 py-4 text-left transition-transform duration-200 active:scale-[0.985]"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/8 bg-[#171a1d] text-[#9bf58b]">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="truncate text-[15px] font-bold text-white">{title}</div>
          <div className="mt-1 truncate text-[12px] text-[#8b949e]">{description}</div>
        </div>
      </div>
      <div className="ml-3 flex shrink-0 items-center gap-2">
        {badge ? (
          <div className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
            {badge}
          </div>
        ) : null}
        <ChevronRight size={18} className="text-[#6f7881]" />
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

  return (
    <section className="space-y-3">
      {/*
        MobileProfileHome:
        手机端“我的”首页。
        这里只负责展示账号概况、常用入口和设置跳转，不承载登录表单和设置详情。
        后面要改移动端“我的”首页布局时，优先从这个文件开始找。
      */}
      <div className="overflow-hidden rounded-[28px] border border-white/8 bg-[radial-gradient(circle_at_top,#1c231d_0%,#121416_36%,#0b0c0d_100%)] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-[68px] w-[68px] shrink-0 place-items-center rounded-full border border-white/10 bg-[#171a1d] text-[22px] font-black text-white shadow-[0_10px_28px_rgba(0,0,0,0.28)]">
              {isAuthenticated ? String(displayName).slice(0, 1).toUpperCase() : 'G'}
            </div>
            <div className="min-w-0 pt-1">
              <div className="truncate text-[22px] font-black tracking-[-0.03em] text-white">{displayName}</div>
              <div className="mt-1 text-[12px] font-medium text-[#97a0a8]">
                {isAuthenticated ? 'Turtle Pass 已登录' : '点击进入登录模块'}
              </div>
              <div className="mt-2 text-[12px] leading-5 text-[#7f8993]">{accountText}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenSettings}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-black/30 text-[#c5ced6]"
          >
            <Settings2 size={18} />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-[20px] bg-black/25 px-3 py-3">
            <div className="text-[11px] text-[#7f8993]">龟币余额</div>
            <div className="mt-2 text-[20px] font-black text-white">{balance.toLocaleString()}</div>
          </div>
          <div className="rounded-[20px] bg-black/25 px-3 py-3">
            <div className="text-[11px] text-[#7f8993]">宠物体力</div>
            <div className="mt-2 text-[20px] font-black text-white">{pet.stamina}/{pet.maxStamina}</div>
          </div>
        </div>
      </div>

      <div className="rounded-[26px] border border-white/8 bg-[#0f1113] p-4">
        <div className="mb-3 text-[13px] font-bold text-[#7f8993]">账号与常用入口</div>
        <div className="space-y-2">
          <MobileProfileRow
            title={isAuthenticated ? '账号中心' : '登录 / 注册'}
            description={isAuthenticated ? '查看账号信息、退出登录、重新管理登录状态。' : '把登录注册流程单独放到手机端独立页面。'}
            icon={<LogIn size={18} />}
            onClick={onOpenAuth}
            badge={isAuthenticated ? '已登录' : '未登录'}
          />
          <MobileProfileRow
            title="移动端设置"
            description={`亮暗模式、通知偏好和动效开关统一放到设置页里，当前为${darkMode ? '深色' : '浅色'}模式。`}
            icon={<MoonStar size={18} />}
            onClick={onOpenSettings}
          />
          <MobileProfileRow
            title="宠物中心"
            description="进入宠物页查看体力、皮肤和养成状态。"
            icon={<Sparkles size={18} />}
            onClick={onOpenPet}
          />
          <MobileProfileRow
            title="去发帖"
            description="快速回到社区页继续发帖和参与讨论。"
            icon={<ShieldCheck size={18} />}
            onClick={onOpenForum}
          />
        </div>
      </div>
    </section>
  );
}
