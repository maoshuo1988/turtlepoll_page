/**
 * 文件说明：pet Api 接口地址常量，供请求 Hook 统一引用。
 */
/// MARK: 用户侧宠物（user_pet）
/// 基础路径: /api/pet

// 当前装备龟种
export const API_Pet_Equip = "/api/pet/equip";
// 用户龟种资产
export const API_Pet_Owned = "/api/pet/owned";
// 体力查询
export const API_Pet_Stamina = "/api/pet/stamina";
// 体力消耗
export const API_Pet_Stamina_Consume = "/api/pet/stamina/consume";
// 体力恢复 / 喂食
export const API_Pet_Stamina_Feed = "/api/pet/stamina/feed";
// 开蛋
export const API_Pet_Egg_Hatch = "/api/pet/egg/hatch";
// 状态页聚合
export const API_Pet_Status = "/api/pet/status";
// 抽奖配置
export const API_Admin_Pet_Gacha_Config = "/api/admin/pet/gacha/config";
// 宠物定义列表（奖池预览等）
export const API_Admin_Pet_Defs = "/api/admin/pet/defs";
