import type { ReactNode } from 'react';
import { ArrowLeft, Bell, ChevronRight, LogOut, MoonStar, Smartphone, Sparkles } from 'lucide-react';
import { MobileSettingsSwitch } from '../shared';
import { getAuthToken } from '@/utils/authStorage';

interface MobileProfileSettingsPageProps {
  darkMode: boolean;
  pushEnabled: boolean;
  motionEnabled: boolean;
  onBack: () => void;
  onToggleTheme: () => void;
  onTogglePush: () => void;
  onToggleMotion: () => void;
  onOpenAuth: () => void;
  onSignOut: () => void;
}

function MobileSettingsRow({
  title,
  description,
  icon,
  trailing,
  onClick,
  rowClassName,
  iconClassName,
  titleClassName,
  descriptionClassName,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  trailing: ReactNode;
  onClick?: () => void;
  rowClassName: string;
  iconClassName: string;
  titleClassName: string;
  descriptionClassName: string;
}) {
  const content = (
    <>
      <div className="flex min-w-0 items-center gap-3">
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border ${iconClassName}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <div className={`truncate text-[15px] font-bold ${titleClassName}`}>{title}</div>
          <div className={`mt-1 text-[12px] leading-5 ${descriptionClassName}`}>{description}</div>
        </div>
      </div>
      <div className="ml-3 shrink-0">{trailing}</div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`flex w-full items-center justify-between rounded-[22px] border px-4 py-4 text-left ${rowClassName}`}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={`flex w-full items-center justify-between rounded-[22px] border px-4 py-4 text-left ${rowClassName}`}>
      {content}
    </div>
  );
}

export function MobileProfileSettingsPage({
  darkMode,
  pushEnabled,
  motionEnabled,
  onBack,
  onToggleTheme,
  onTogglePush,
  onToggleMotion,
  onOpenAuth,
  onSignOut,
}: MobileProfileSettingsPageProps) {
  const isAuthenticated = Boolean(getAuthToken());
  const surfaceClass = darkMode ? 'border-white/8 bg-[#0f1113]' : 'border-slate-200 bg-white';
  const rowClass = darkMode ? 'border-white/8 bg-[#111315]' : 'border-slate-200 bg-white';
  const iconClass = darkMode ? 'border-white/8 bg-[#171a1d] text-[#9bf58b]' : 'border-slate-200 bg-slate-50 text-emerald-600';
  const titleClass = darkMode ? 'text-white' : 'text-slate-900';
  const textClass = darkMode ? 'text-[#8b949e]' : 'text-slate-600';
  const mutedClass = darkMode ? 'text-[#7f8993]' : 'text-slate-500';

  return (
    <section className="space-y-3">
      {/*
        MobileProfileSettingsPage:
        手机端“设置”独立页面。
        这里把原来散落在“我的”里的亮暗模式、登录相关入口和偏好开关收口到一个地方。
        如果以后继续补通知、隐私、缓存等设置，直接在这个页面往下扩展。
      */}
      <div className={`flex items-center gap-3 rounded-[24px] border px-4 py-4 ${surfaceClass}`}>
        <button
          type="button"
          onClick={onBack}
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border ${darkMode ? 'border-white/10 bg-black/30 text-[#c5ced6]' : 'border-slate-200 bg-slate-50 text-slate-600'}`}
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0">
          <div className={`text-[18px] font-black ${titleClass}`}>设置</div>
          <div className={`mt-1 text-[12px] ${mutedClass}`}>把移动端相关偏好单独收进设置页，避免继续堆在“我的”首页。</div>
        </div>
      </div>

      <div className={`rounded-[26px] border p-4 ${surfaceClass}`}>
        <div className={`mb-3 text-[13px] font-bold ${mutedClass}`}>显示与体验</div>
        <div className="space-y-2">
          <MobileSettingsRow
            title="亮暗模式"
            description={`当前使用${darkMode ? '深色模式' : '浅色模式'}，这里单独负责主题切换。`}
            icon={<MoonStar size={18} />}
            trailing={<MobileSettingsSwitch checked={darkMode} label="切换亮暗模式" onCheckedChange={() => onToggleTheme()} />}
            rowClassName={rowClass}
            iconClassName={iconClass}
            titleClassName={titleClass}
            descriptionClassName={textClass}
          />
          <MobileSettingsRow
            title="动效开关"
            description="控制移动端页面过渡和细微动画，方便后面统一管理交互动效。"
            icon={<Sparkles size={18} />}
            trailing={<MobileSettingsSwitch checked={motionEnabled} label="切换动效开关" onCheckedChange={() => onToggleMotion()} />}
            rowClassName={rowClass}
            iconClassName={iconClass}
            titleClassName={titleClass}
            descriptionClassName={textClass}
          />
          <MobileSettingsRow
            title="消息提醒"
            description="先放移动端通知偏好入口，后面接真实推送时可以继续沿用。"
            icon={<Bell size={18} />}
            trailing={<MobileSettingsSwitch checked={pushEnabled} label="切换消息提醒" onCheckedChange={() => onTogglePush()} />}
            rowClassName={rowClass}
            iconClassName={iconClass}
            titleClassName={titleClass}
            descriptionClassName={textClass}
          />
        </div>
      </div>

      <div className={`rounded-[26px] border p-4 ${surfaceClass}`}>
        <div className={`mb-3 text-[13px] font-bold ${mutedClass}`}>账号与设备</div>
        <div className="space-y-2">
          <MobileSettingsRow
            title="账号管理"
            description={isAuthenticated ? '查看当前登录账号，或者重新管理登录状态。' : '当前未登录，进入手机端登录模块完成登录或注册。'}
            icon={<Smartphone size={18} />}
            trailing={<ChevronRight size={18} className="text-[#6f7881]" />}
            onClick={onOpenAuth}
            rowClassName={rowClass}
            iconClassName={iconClass}
            titleClassName={titleClass}
            descriptionClassName={textClass}
          />
          {isAuthenticated ? (
            <button
              type="button"
              onClick={onSignOut}
              className="flex w-full items-center justify-between rounded-[22px] border border-rose-500/18 bg-rose-500/10 px-4 py-4 text-left"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-full border border-rose-500/18 bg-black/20 text-rose-300">
                  <LogOut size={18} />
                </div>
                <div>
                  <div className="text-[15px] font-bold text-white">退出登录</div>
                  <div className="mt-1 text-[12px] text-rose-200/70">退出后会回到未登录状态，但不会影响 PC 端布局。</div>
                </div>
              </div>
              <ChevronRight size={18} className="text-rose-200/70" />
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
