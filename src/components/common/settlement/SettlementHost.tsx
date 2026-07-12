/**
 * 文件说明：待结算业务编排（抽屉列表 + 跳转结算详情页）。
 */
import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from '@umijs/renderer-react';
import type { SettlementRecords } from '@/hooks/usePendingSettlements';
import type { SettlementRecordItem } from '@/hooks/settlementTypes';
import { SettlementDrawer } from './SettlementDrawer';
import { settlementRecordToPath } from '@/pages/settlement/settlementNavigation';

interface SettlementHostProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hiddenIds: ReadonlySet<string>;
  records: SettlementRecords;
}

export const SettlementHost: React.FC<SettlementHostProps> = ({
  open,
  onOpenChange,
  hiddenIds,
  records,
}) => {
  const navigate = useNavigate();
  const {
    pendingDarkItems,
    pendingPkItems,
    settledDarkItems,
    settledPkItems,
  } = records;

  const [removingIds] = useState<Set<string>>(() => new Set());

  const goToDetail = useCallback(
    (item: SettlementRecordItem, action: 'settle' | 'view') => {
      onOpenChange(false);
      navigate(settlementRecordToPath(item, action));
    },
    [navigate, onOpenChange],
  );

  const handleSettle = useCallback(
    (item: SettlementRecordItem) => {
      goToDetail(item, 'settle');
    },
    [goToDetail],
  );

  const handleView = useCallback(
    (item: SettlementRecordItem) => {
      goToDetail(item, 'view');
    },
    [goToDetail],
  );

  return (
    <SettlementDrawer
      open={open}
      onClose={() => onOpenChange(false)}
      pendingDarkItems={pendingDarkItems}
      pendingArenaItems={pendingPkItems}
      settledDarkItems={settledDarkItems}
      settledArenaItems={settledPkItems}
      hiddenIds={hiddenIds}
      removingIds={removingIds}
      onSettle={handleSettle}
      onView={handleView}
    />
  );
};

export function useSettlementDrawerState(records: SettlementRecords) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());

  const visibleCount = useMemo(() => {
    return records.pendingItems.filter((item) => !hiddenIds.has(item.id)).length;
  }, [hiddenIds, records.pendingItems]);

  const hideItem = useCallback((itemId: string) => {
    setHiddenIds((prev) => new Set(prev).add(itemId));
  }, []);

  const resetHiddenIds = useCallback(() => {
    setHiddenIds(new Set());
  }, []);

  return {
    drawerOpen,
    setDrawerOpen: setDrawerOpen,
    hiddenIds,
    hideItem,
    resetHiddenIds,
    visibleCount,
  };
}
