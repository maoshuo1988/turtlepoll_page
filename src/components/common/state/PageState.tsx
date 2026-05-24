/**
 * 文件说明：通用页面状态展示，覆盖空数据和未登录两类页面。
 */
import React from 'react';

export type PageStateVariant = 'empty' | 'loginRequired';

interface PageStateProps {
  variant?: PageStateVariant;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  imageSrc?: string;
  imageAlt?: string;
  className?: string;
}

interface TextEmptyStateProps {
  text?: string;
  className?: string;
}

const STATE_DEFAULTS: Record<PageStateVariant, { imageSrc: string; title: string; description: string; imageAlt: string }> = {
  empty: {
    imageSrc: '/legacy/guike.png',
    imageAlt: '暂无数据',
    title: '暂无数据',
    description: '这里暂时没有可展示的内容。',
  },
  loginRequired: {
    imageSrc: '/image/default-header.png',
    imageAlt: '需要登录',
    title: '请先登录',
    description: '登录后即可查看和管理你的专属内容。',
  },
};

export const PageState: React.FC<PageStateProps> = ({
  variant = 'empty',
  title,
  description,
  actionLabel,
  onAction,
  imageSrc,
  imageAlt,
  className = '',
}) => {
  const defaults = STATE_DEFAULTS[variant];

  return (
    <div className={`flex min-h-[280px] flex-col items-center justify-center px-5 py-8 text-center md:min-h-[420px] md:px-6 md:py-10 ${className}`}>
      <div className="relative flex h-[118px] w-[118px] items-center justify-center rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_50%_0%,rgba(34,197,94,0.22),rgba(15,23,42,0.08)_48%,rgba(0,0,0,0.18)_100%)] shadow-[0_20px_48px_rgba(0,0,0,0.26)]">
        <img
          src={imageSrc ?? defaults.imageSrc}
          alt={imageAlt ?? defaults.imageAlt}
          className="max-h-[86px] max-w-[86px] object-contain drop-shadow-[0_10px_22px_rgba(0,0,0,0.28)]"
        />
      </div>
      <h3 className="mt-6 text-[22px] font-black tracking-normal text-white md:mt-7 md:text-[24px]">{title ?? defaults.title}</h3>
      <p className="mt-3 max-w-[560px] text-[13px] leading-6 text-[#7e8790] md:text-[14px] md:leading-7">{description ?? defaults.description}</p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 rounded-full bg-emerald-500 px-5 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-emerald-400"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
};

export const EmptyDataPage: React.FC<Omit<PageStateProps, 'variant'>> = (props) => (
  <PageState {...props} variant="empty" />
);

export const LoginRequiredPage: React.FC<Omit<PageStateProps, 'variant'>> = (props) => (
  <PageState {...props} variant="loginRequired" />
);

export const TextEmptyState: React.FC<TextEmptyStateProps> = ({
  text = '暂无数据',
  className = '',
}) => (
  <div className={`flex min-w-0 items-center justify-center rounded-[18px] border border-white/10 bg-[linear-gradient(135deg,rgba(10,20,48,0.92),rgba(35,31,84,0.9),rgba(16,78,85,0.88))] px-3 py-3 text-[14px] font-bold text-white/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ${className}`}>
    {text}
  </div>
);
