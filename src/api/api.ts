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

/// MARK: 金币 / 预测下注
/// 基础路径: /api/coin
//我的金币账户
export const API_Coin_Me = "/api/coin/me";
//预测下注
export const API_Coin_Bet = "/api/coin/bet";

/// MARK: 管理后台 - 金币
/// 基础路径: /api/admin/coin
//管理员铸币
export const API_Admin_Coin_Mint = "/api/admin/coin/mint";

/// MARK: 预测事件系统
/// 基础路径: /api/football
//查询预测市场（聚合 market + context）
export const API_Football_Markets = "/api/football/markets";
//修改/创建 PredictContext
export const API_Football_Predict_Context_Update = "/api/football/predict_context/update";
//热度榜
export const API_Football_Predict_Context_Hot = "/api/football/predict_context/hot";


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
