/**
 * 文件说明：待结算抽屉右侧滑出面板（暗盘 / 开撕台 Tab、待结算与已结算列表）。
 */
import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { SettlementRecordItem, SettlementSourceTab } from '@/hooks/settlementTypes';
import { SETTLEMENT_TAB_DOT_COLORS, resolveSettlementChipColor } from '../settlementCampColors';
import styles from './index.module.scss';

function css(...classNames: Array<string | false | null | undefined>) {
  return classNames
    .filter(Boolean)
    .flatMap((className) => String(className).split(/\s+/))
    .filter(Boolean)
    .map((className) => styles[className] ?? className)
    .join(' ');
}

interface SettlementDrawerProps {
  open: boolean;
  onClose: () => void;
  pendingDarkItems: SettlementRecordItem[];
  pendingArenaItems: SettlementRecordItem[];
  settledDarkItems: SettlementRecordItem[];
  settledArenaItems: SettlementRecordItem[];
  hiddenIds: ReadonlySet<string>;
  removingIds: ReadonlySet<string>;
  onSettle: (item: SettlementRecordItem) => void;
  onView: (item: SettlementRecordItem) => void;
  settlingId?: string | null;
}

const TAB_OPTIONS: Array<{ id: SettlementSourceTab; label: string }> = [
  { id: 'dark', label: '暗盘' },
  { id: 'arena', label: '开撕台' },
];

function SettlementRow({
  item,
  isRemoving,
  isSettling,
  onSettle,
  onView,
}: {
  item: SettlementRecordItem;
  isRemoving: boolean;
  isSettling: boolean;
  onSettle: (item: SettlementRecordItem) => void;
  onView: (item: SettlementRecordItem) => void;
}) {
  const isPending = item.status === 'pending';

  return (
    <motion.li
      className={css('card')}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: isRemoving ? 0 : 1, y: isRemoving ? -6 : 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
      transition={{ duration: 0.28 }}
    >
      <div className={css('card-main')}>
        <p className={css('card-title')}>{item.title}</p>
        <div className={css('card-meta')}>
          <span className={css('card-subtitle')}>{item.subtitle}</span>
          <span
            className={css('chip')}
            style={{ backgroundColor: resolveSettlementChipColor(item.campSide) }}
            aria-hidden
          />
        </div>
      </div>
      {isPending ? (
        <button
          type="button"
          className={css('settle-btn')}
          disabled={isSettling || isRemoving}
          onClick={() => onSettle(item)}
        >
          {isSettling ? '结算中' : '结算'}
        </button>
      ) : (
        <button
          type="button"
          className={css('view-btn')}
          disabled={isRemoving}
          onClick={() => onView(item)}
        >
          查看
        </button>
      )}
    </motion.li>
  );
}

export const SettlementDrawer: React.FC<SettlementDrawerProps> = ({
  open,
  onClose,
  pendingDarkItems,
  pendingArenaItems,
  settledDarkItems,
  settledArenaItems,
  hiddenIds,
  removingIds,
  onSettle,
  onView,
  settlingId,
}) => {
  const [activeTab, setActiveTab] = useState<SettlementSourceTab>('dark');

  const visiblePendingDark = useMemo(
    () => pendingDarkItems.filter((item) => !hiddenIds.has(item.id)),
    [hiddenIds, pendingDarkItems],
  );
  const visiblePendingArena = useMemo(
    () => pendingArenaItems.filter((item) => !hiddenIds.has(item.id)),
    [hiddenIds, pendingArenaItems],
  );
  const visibleSettledDark = settledDarkItems;
  const visibleSettledArena = settledArenaItems;

  const pendingItems = activeTab === 'dark' ? visiblePendingDark : visiblePendingArena;
  const settledItems = activeTab === 'dark' ? visibleSettledDark : visibleSettledArena;
  const pendingCount = visiblePendingDark.length + visiblePendingArena.length;
  const tabPendingCount = activeTab === 'dark' ? visiblePendingDark.length : visiblePendingArena.length;
  const tabSettledCount = activeTab === 'dark' ? visibleSettledDark.length : visibleSettledArena.length;
  const isEmpty = pendingItems.length === 0 && settledItems.length === 0;

  useEffect(() => {
    if (!open) return;
    if (visiblePendingDark.length > 0 || visibleSettledDark.length > 0) {
      setActiveTab('dark');
      return;
    }
    if (visiblePendingArena.length > 0 || visibleSettledArena.length > 0) {
      setActiveTab('arena');
    }
  }, [
    open,
    visiblePendingArena.length,
    visiblePendingDark.length,
    visibleSettledArena.length,
    visibleSettledDark.length,
  ]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, open]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className={css('root')} aria-hidden={!open}>
          <motion.button
            type="button"
            className={css('backdrop')}
            aria-label="关闭待结算抽屉"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.aside
            className={css('panel')}
            role="dialog"
            aria-modal="true"
            aria-label="待结算"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
          >
            <header className={css('header')}>
              <div className={css('header-title-row')}>
                <h2 className={css('title')}>待结算</h2>
                {pendingCount > 0 ? (
                  <span className={css('title-badge')} aria-label={`${pendingCount} 条待结算`}>
                    {pendingCount}
                  </span>
                ) : null}
              </div>
              <button type="button" className={css('close-btn')} onClick={onClose} aria-label="关闭">
                <X size={18} strokeWidth={2} />
              </button>
            </header>

            <div className={css('divider')} />

            <div className={css('tabs')}>
              {TAB_OPTIONS.map((tab) => {
                const isActive = activeTab === tab.id;
                const count =
                  tab.id === 'dark'
                    ? visiblePendingDark.length + visibleSettledDark.length
                    : visiblePendingArena.length + visibleSettledArena.length;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    className={css('tab', isActive && 'tab-active')}
                    onClick={() => setActiveTab(tab.id)}
                    aria-pressed={isActive}
                  >
                    <span
                      className={css('tab-dot')}
                      style={{ backgroundColor: SETTLEMENT_TAB_DOT_COLORS[tab.id] }}
                      aria-hidden
                    />
                    <span>{tab.label}</span>
                    {count > 0 ? <span className={css('tab-count')}>{count}</span> : null}
                  </button>
                );
              })}
            </div>

            <div className={css('body')}>
              {isEmpty ? (
                <div className={css('empty')}>
                  <img src="/image/no-settlement.png" alt="" className={css('empty-icon')} />
                  <p className={css('empty-title')}>暂无待结算事件</p>
                  <p className={css('empty-desc')}>
                    结算完成后，事件会从这里消失。新的赛果出来时再回来看看。
                  </p>
                </div>
              ) : (
                <div className={css('sections')}>
                  {pendingItems.length > 0 ? (
                    <section className={css('section')}>
                      <h3 className={css('section-title')}>
                        待领取
                        <span className={css('section-count')}>{tabPendingCount}</span>
                      </h3>
                      <ul className={css('list')}>
                        <AnimatePresence initial={false}>
                          {pendingItems.map((item) => (
                            <SettlementRow
                              key={item.id}
                              item={item}
                              isRemoving={removingIds.has(item.id)}
                              isSettling={settlingId === item.id}
                              onSettle={onSettle}
                              onView={onView}
                            />
                          ))}
                        </AnimatePresence>
                      </ul>
                    </section>
                  ) : null}

                  {settledItems.length > 0 ? (
                    <section className={css('section')}>
                      <h3 className={css('section-title')}>
                        已结算
                        <span className={css('section-count', 'section-count-muted')}>{tabSettledCount}</span>
                      </h3>
                      <ul className={css('list')}>
                        {settledItems.map((item) => (
                          <SettlementRow
                            key={item.id}
                            item={item}
                            isRemoving={false}
                            isSettling={false}
                            onSettle={onSettle}
                            onView={onView}
                          />
                        ))}
                      </ul>
                    </section>
                  ) : null}
                </div>
              )}
            </div>
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
};
