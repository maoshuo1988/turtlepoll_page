/**
 * 文件说明：商城页面展示类型定义。
 */
export interface ShopItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  price: number;
  effect: { type: 'stamina'; value: number };
}
