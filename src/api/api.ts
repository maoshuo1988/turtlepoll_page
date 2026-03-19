//获取站点配置
export const API_Config_Configs = "/api/config/configs";
//获取当前登录用户
export const API_User_Current = "/api/user/current";
//获取用户勋章列表
export const API_Badge_Badges = "/api/badge/badges";
//GET 签到状态. POST 执行签到
export const API_Checkin_Checkin = "/api/checkin/checkin";
//今日签到排行
export const API_Checkin_Rank = "/api/checkin/rank";
//点赞
export const API_Like_Like = "/api/like/like";
//取消点赞
export const API_Like_Unlike= "/api/like/unlike";
//投票提交
export const API_Vote_Cast= "/api/vote/cast";
//积分排行榜
export const API_User_Score_Rank= "/api/user/score/rank";
//友链（首页右侧）
export const API_Link_Top_Links= "/api/link/top_links";
//顶部未读消息摘要
export const API_User_Msg_recent= "/api/user/msg_recent";
//搜索结果
export const API_Search_Topic= "/api/search/topic";
//滑块验证码（推荐登录/注册使用）
export const API_Captcha_Request_Angle= "/api/captcha/request_angle";
//图片验证码（兼容）
export const API_Captcha_Request= "/api/captcha/request";
//图片验证码校验（兼容）
export const API_Captcha_Verify= "/api/captcha/verify";
//用户注册
export const API_Login_Signup= "/api/login/signup";
//用户名/邮箱 + 密码登录
export const API_Login_Signin= "/api/login/signin";
//请求短信验证码（短信登录）
export const API_Login_Login_Sms_Code= "/api/login/login_sms_code";
//短信登录
export const API_Login_Login_Sms= "/api/login/login_sms";
//退出登录
export const API_Login_Signout= "/api/login/signout";
//发送找回密码邮件
export const API_Login_Send_Reset_Password_Email= "/api/login/send_reset_password_email";
//重置密码
export const API_Login_Reset_Password= "/api/login/reset_password";
//微信登录配置
export const API_Login_Wx_Login_Config= "/api/login/wx_login_config";
//微信登录回调提交
export const API_Login_Wx_Login_Submit= "/api/login/wx_login_submit";
//Google 登录配置
export const API_Login_Google_Login_Config= "/api/login/google_login_config";
//Google 登录回调提交
export const API_Login_Google_Login_Submit= "/api/login/google_login_submit";
//Google One Tap 登录
export const API_Login_Google_One_Tap= "/api/login/google_one_tap";


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
//获取话题详情 /{topicId}
export const API_Topic = "/api/topic";
//获取话题列表
export const API_Topic_List = "/api/topic/list";
//获取话题收藏列表
export const API_Topic_Favorites = "/api/topic/favorites";
//收藏话题 /{topicId}
export const API_Topic_Favorite = "/api/topic/favorite";
//取消收藏话题 /{topicId}
export const API_Topic_Unfavorite = "/api/topic/unfavorite";
//获取话题标签 /{topicId}
export const API_Topic_Tags= "/api/topic/tags";
//设置话题标签 /{topicId}
export const API_Topic_Set_Tags= "/api/topic/set_tags";
//隐藏话题 /{topicId}
export const API_Topic_Hide= "/api/topic/hide";
//显示话题 /{topicId}
export const API_Topic_Show= "/api/topic/show";
//推荐话题 /{topicId}
export const API_Topic_Recommend= "/api/topic/recommend";
//取消推荐话题 /{topicId}
export const API_Topic_Unrecommend= "/api/topic/unrecommend";
//删除话题（物理删除） /{topicId}
export const API_Topic_Permanent_Delete= "/api/topic/permanent_delete";
//获取话题跳转链接 /{topicId}
export const API_Topic_Redirect= "/api/topic/redirect";
//首页焦点卡片（建议）
export const API_Topic_Focus_Topics= "/api/topic/focus_topics";
//话题列表（首页主流）
export const API_Topic_Topics = "/api/topic/topics";
//最新帖子（可用于“最新热点”）
export const API_Topic_Recent = "/api/topic/recent";
//热点榜（建议）
export const API_Topic_Hot_Topics= "/api/topic/hot_topics";
