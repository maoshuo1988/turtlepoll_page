/**
 * 文件说明：coin Api 接口地址常量，供请求 Hook 统一引用。
 */
/// MARK: 金币 / 预测下注
/// 基础路径: /api/coin
//
import { API_Predict_Coin_Bet, API_Predict_Coin_Settle } from '@/api/predictApi';

export const API_Coin_Settle = API_Predict_Coin_Settle;
//我的金币账户
export const API_Coin_Me = "/api/coin/me";
//预测下注
export const API_Coin_Bet = API_Predict_Coin_Bet;
//账户余额排行榜
export const API_Coin_Leaderboard = "/api/coin/leaderboard";