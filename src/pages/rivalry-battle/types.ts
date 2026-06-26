/** 文件说明：开撕台撕裂带直播页数据类型（独立于开撕台列表页）。 */
export type RivalryBattleNewsItem = {
  id: string;
  marketId: number;
  title: string;
  summary: string;
  image: string;
  coverImage?: string;
  listImage?: string;
  sideABgImage?: string;
  sideBBgImage?: string;
  sideABgColor?: string;
  sideBBgColor?: string;
  type: 'rivalry';
  votes: { A: number; B: number };
  optionA: string;
  optionB: string;
  oddsA: number;
  oddsB: number;
  status: 'open' | 'closed';
};
