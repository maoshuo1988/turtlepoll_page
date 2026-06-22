/**
 * 文件说明：结算抽屉布局上下文，供结算详情页返回时重新打开抽屉。
 */
import { createContext, useContext } from 'react';
import type React from 'react';

type SettlementLayoutContextValue = {
  openSettlementDrawer: () => void;
  hideSettlementItem: (itemId: string) => void;
};

const SettlementLayoutContext = createContext<SettlementLayoutContextValue | null>(null);

export function SettlementLayoutProvider({
  value,
  children,
}: {
  value: SettlementLayoutContextValue;
  children: React.ReactNode;
}) {
  return <SettlementLayoutContext.Provider value={value}>{children}</SettlementLayoutContext.Provider>;
}

export function useSettlementLayout() {
  const context = useContext(SettlementLayoutContext);
  if (!context) {
    return {
      openSettlementDrawer: () => {},
      hideSettlementItem: (_itemId: string) => {},
    };
  }
  return context;
}
