/**
 * 文件说明：topic api 接口地址常量，供请求 Hook 统一引用。
 */

/// MARK: 内容域 - 话题/帖子
/// 基础路径: /api/topic
//节点导航
export const API_Topic_Node_Navs = "/api/topic/node_navs";
//获取所有节点
export const API_Topic_Nodes = "/api/topic/nodes";
//获取节点信息
export const API_Topic_Node = "/api/topic/node";
//发表话题
export const API_Topic_Create = "/api/topic/create";
//获取编辑话题详情 / 编辑话题 /{topicId}
export const API_Topic_Edit = "/api/topic/edit";
//删除话题 /${topicId}
export const API_Topic_Delete = "/api/topic/delete";
//设置推荐 /{topicId}
export const API_Topic_Recommend = "/api/topic/recommend";
//设置置顶 /{topicId}
export const API_Topic_Sticky = "/api/topic/sticky";
//获取话题详情 /{topicId}
export const API_Topic = "/api/topic";
//最近点赞用户 /{topicId}
export const API_Topic_RecentLikes = "/api/topic/recentlikes";
//用户帖子列表
export const API_Topic_User_Topics = "/api/topic/user_topics";
//标签帖子列表
export const API_Topic_Tag_Topics = "/api/topic/tag_topics";
//收藏话题 /{topicId}
export const API_Topic_Favorite = "/api/topic/favorite";
//话题列表（首页主流）
export const API_Topic_Topics = "/api/topic/topics";
//最新帖子（可用于“最新热点”）
export const API_Topic_Recent = "/api/topic/recent";
//获取隐藏内容
export const API_Topic_Hide_Content = "/api/topic/hide_content";
