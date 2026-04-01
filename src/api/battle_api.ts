/// MARK: 开战广场 / Battle Square
/// 基础路径: /api/battle

// 用户侧 battle 接口常量统一放在这里，页面和 hooks 都只引用这一层。
// 赌局列表：支持分页、按状态筛选、只看我参与的 battle。
export const API_Battle_List = "/api/battle/list";
// 赌局详情：返回 battle 基础信息、我的动作状态、我的结算明细。
export const API_Battle_By = "/api/battle/by";
// 创建赌局：庄家发起一场新的开战广场 battle。
export const API_Battle_Create = "/api/battle/create";
// 加入/追加下注：挑战者加入 battle，公开场会收 5% 入场费。
export const API_Battle_Join = "/api/battle/join";
// 庄家加注：仅庄家可追加自己的押注额度。
export const API_Battle_Banker_Add_Stake = "/api/battle/banker_add_stake";
// 庄家宣布结果：在 pending 阶段提交 banker_wins / banker_loses。
export const API_Battle_Declare = "/api/battle/declare";
// 挑战者确认：对庄家的宣判结果表示同意。
export const API_Battle_Challenger_Confirm = "/api/battle/challenger_confirm";
// 挑战者异议：对庄家的宣判结果提出 dispute，进入管理员仲裁。
export const API_Battle_Challenger_Dispute = "/api/battle/challenger_dispute";
// 提取奖励：battle settled 后，一次性提取我的结算金额。
export const API_Battle_Withdraw = "/api/battle/withdraw";

// 管理端裁决接口目前前台页面没直接使用，但类型层和 hook 已预留。
export const API_Admin_Battle_Resolve = "/api/admin/battle/resolve";
