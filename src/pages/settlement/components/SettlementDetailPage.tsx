/**
 * 文件说明：结算详情独立页面展示（热度对决 / 派奖 / 榜单）。
 */
import React from 'react';
import { ChevronLeft } from 'lucide-react';
import type { SettlementDetailViewModel } from '@/hooks/settlementTypes';
import { SettlementDetailView } from '@/components/common/settlement/SettlementDetailView';
import styles from './SettlementDetailPage.module.scss';

function css(...classNames: Array<string | false | null | undefined>) {
  return classNames
    .filter(Boolean)
    .flatMap((className) => String(className).split(/\s+/))
    .filter(Boolean)
    .map((className) => styles[className] ?? className)
    .join(' ');
}

interface SettlementDetailPageProps {
  model: SettlementDetailViewModel | null;
  loading?: boolean;
  errorText?: string;
  onBack: () => void;
}

export const SettlementDetailPage: React.FC<SettlementDetailPageProps> = ({
  model,
  loading = false,
  errorText,
  onBack,
}) => {
  return (
    <div className={css('page')}>
      <header className={css('page-header')}>
        <button type="button" className={css('back-link')} onClick={onBack}>
          <ChevronLeft size={18} strokeWidth={2.2} />
          返回结算区
        </button>
        <h1 className={css('page-title')}>结算详情</h1>
      </header>

      <div className={css('page-body')}>
        {model ? (
          <div className={css('page-content')}>
            <SettlementDetailView
              model={model}
              loading={loading}
              errorText={errorText}
              onBack={onBack}
            />
          </div>
        ) : (
          <div className={css('fallback')}>
            {loading ? '正在加载结算详情…' : errorText || '暂无结算数据'}
          </div>
        )}
      </div>
    </div>
  );
};
