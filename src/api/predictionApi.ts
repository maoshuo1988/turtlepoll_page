/**
 * 文件说明：prediction Api 接口地址常量，供请求 Hook 统一引用。
 */

/// MARK: 预测事件系统
/// 基础路径: /api/football
//查询预测市场（聚合 market + context）
export const API_Football_Markets = "/api/football/markets";
//修改/创建 PredictContext
export const API_Football_Predict_Context_Update = "/api/football/predict_context/update";
//热度榜
export const API_Football_Predict_Context_Hot = "/api/football/predict_context/hot";
//热门标签 TOP10（按热度累计）
export const API_Football_Predict_Tags_Hot = "/api/football/predict_tags/hot";
//按标签查询预测市场列表（聚合返回 market + context）
export const API_Football_Markets_By_Tag = "/api/football/markets/by_tag";
// 查询用户在某个市场的下注结算结果（betSettleResult）
export const API_Football_Bet_Settle_Result = "/api/football/bet_settle_result";