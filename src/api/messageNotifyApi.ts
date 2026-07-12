/**
 * 文件说明：message-notify Api 接口地址常量，供请求 Hook 统一引用。
 */
/// MARK: 主站消息通知
/// 基础路径: /api/message-notify

/** 消息列表（cursor 分页） */
export const API_MessageNotify_List = '/api/message-notify/list';

/** 未读数量（总数 + 按业务分类） */
export const API_MessageNotify_UnreadCount = '/api/message-notify/unread-count';

/** 消息详情 /{id} */
export const API_MessageNotify_ById = '/api/message-notify/by';

/** 标记单条已读 */
export const API_MessageNotify_Read = '/api/message-notify/read';
