/**
 * 文件说明：ai Api 接口地址常量，供 AI 聊天请求 Hook 统一引用。
 */
/// MARK: AI 聊天
/// 基础路径: /api/ai

// POST /api/ai/chat：用户主动向小龟发送聊天内容，成功后返回用户消息、AI 回复、体力和每日额度信息。
export const API_AI_Chat = "/api/ai/chat";
// GET /api/ai/stamina：查询当前登录用户的 AI 体力、上限、下次恢复时间和每日聊天额度。
export const API_AI_Stamina = "/api/ai/stamina";
// POST /api/ai/stamina/apple：消耗龟币购买苹果补给，用于恢复 AI 聊天体力。
export const API_AI_Stamina_Apple = "/api/ai/stamina/apple";
// GET /api/ai/pushes/unread：拉取离线、断线或尚未展示的 AI 主动推送消息。
export const API_AI_Pushes_Unread = "/api/ai/pushes/unread";
// POST /api/ai/pushes/read：将当前用户自己的未读 AI 推送标记为已读。
export const API_AI_Pushes_Read = "/api/ai/pushes/read";
// POST /api/ai/presence：上报当前用户在线页面和活跃状态，供后端判断闲置推送。
export const API_AI_Presence = "/api/ai/presence";
// GET /api/ai/pushes/stream：建立 SSE 长连接，在线接收 ai_push 事件。
export const API_AI_Pushes_Stream = "/api/ai/pushes/stream";
