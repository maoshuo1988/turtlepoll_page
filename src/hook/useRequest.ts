import {
  API_Admin_Coin_Mint,
  API_Badge_Badges,
  API_Captcha_Request_Angle,
  API_Coin_Bet,
  API_Coin_Me,
  API_Config_Configs,
  API_Football_Markets,
  API_Football_Predict_Context_Hot,
  API_Football_Predict_Context_Update,
  API_Login_Signin,
  API_Login_Signout,
  API_Login_Signup,
  API_Like_Like,
  API_Like_Unlike,
  API_Topic,
  API_Topic_Create,
  API_Topic_Delete,
  API_Topic_Edit,
  API_Topic_Favorite,
  API_Topic_Hide_Content,
  API_Topic_Node,
  API_Topic_Node_Navs,
  API_Topic_Nodes,
  API_Topic_Recent,
  API_Topic_RecentLikes,
  API_Topic_Recommend,
  API_Topic_Sticky,
  API_Topic_Tag_Topics,
  API_Topic_Topics,
  API_Topic_User_Topics,
  API_User_Current,
  API_User_Msg_recent,
} from "@/api/api";
import { axiosCustom } from "@/api/axios";
import {
  type AdminCoinMintPayload,
  type CreateTopicPayload,
  type CursorResult,
  type EditTopicPayload,
  type FootballMarketsParams,
  type FootballMarketsResponse,
  type FootballPredictContextHotParams,
  type FootballPredictContextHotResponse,
  type PlaceBetPayload,
  type PlaceBetResult,
  type PredictContext,
  type PredictContextUpsertPayload,
  type SimpleTopic,
  type TagTopicsParams,
  type TopicEditDetail,
  type TopicHideContentParams,
  type TopicHideContentResponse,
  type TopicListParams,
  type TopicNodeInfoParams,
  type TopicNodeNav,
  type TopicNodeResponse,
  type TopicResponse,
  type UserCoin,
  type UserInfo,
  type UserTopicsParams,
} from "@/hook/types";
import { getAuthToken, saveUserInfo } from "@/utils/authStorage";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "react-query";

const getAuthorizationHeaders = () => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const assertSuccess = (res: any) => {
  if (res.success !== true) {
    throw new Error(String(res.msg ?? ""));
  }
  return res.data;
};

const invalidateTopicQueries = async (queryClient: ReturnType<typeof useQueryClient>) => {
  await Promise.all([
    queryClient.invalidateQueries(["requestTopicTopics"]),
    queryClient.invalidateQueries(["requestTopicRecent"]),
    queryClient.invalidateQueries(["requestTopicUserTopics"]),
    queryClient.invalidateQueries(["requestTopicTagTopics"]),
  ]);
};

///获取图形
export function useRequestRotateCaptcha() {
  return useMutation({
    mutationKey: ["requestRotateCaptcha"],
    mutationFn: async () => {
      const res = await axiosCustom({
        method: "get",
        cmd: API_Captcha_Request_Angle,
      });
      return assertSuccess(res);
    },
  });
}

///注册
export function useRequestSignUp() {
  return useMutation({
    mutationKey: ["requestSignUp"],
    mutationFn: async (data: any) => {
      const res = await axiosCustom({
        method: "post",
        cmd: API_Login_Signup,
        data,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
      });
      return assertSuccess(res);
    },
  });
}

///登录
export function useRequestSignIn() {
  return useMutation({
    mutationKey: ["requestSignIn"],
    mutationFn: async (data: any) => {
      const res = await axiosCustom({
        method: "post",
        cmd: API_Login_Signin,
        data,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
      });
      return assertSuccess(res);
    },
  });
}

///退出登录
export function useRequestSignout() {
  return useMutation({
    mutationKey: ["requestSignout"],
    mutationFn: async () => {
      const res = await axiosCustom({
        method: "get",
        cmd: API_Login_Signout,
      });
      return assertSuccess(res);
    },
  });
}

//获取用户信息
export function useRequestUserCurrent() {
  return useQuery({
    queryKey: ["requestUserCurrent"],
    queryFn: async () => {
      const res = await axiosCustom({
        method: "get",
        cmd: API_User_Current,
        headers: getAuthorizationHeaders(),
      });

      const data = assertSuccess(res);
      saveUserInfo(data);
      return data;
    },
  });
}

//顶部站点信息/公告
export function useRequestConfigConfigs() {
  return useQuery({
    queryKey: ["requestConfigConfigs"],
    queryFn: async () => {
      const res = await axiosCustom({
        method: "get",
        cmd: API_Config_Configs,
      });
      return assertSuccess(res);
    },
  });
}

//顶部未读消息摘要
export function useRequestUserMsgRecent() {
  return useQuery({
    queryKey: ["requestUserMsgRecent"],
    queryFn: async () => {
      const res = await axiosCustom({
        method: "get",
        cmd: API_User_Msg_recent,
        headers: getAuthorizationHeaders(),
      });
      return assertSuccess(res);
    },
  });
}

//获取用户勋章列表
export function useRequestBadgeBadges() {
  return useQuery({
    queryKey: ["requestBadgeBadges"],
    queryFn: async () => {
      const res = await axiosCustom({
        method: "get",
        cmd: API_Badge_Badges,
        headers: getAuthorizationHeaders(),
      });
      return assertSuccess(res);
    },
  });
}

/// MARK: 金币 / 预测下注
/// 基础路径: /api/coin

//查询我的金币账户
export function useRequestCoinMe() {
  const token = getAuthToken();

  return useQuery<UserCoin>({
    queryKey: ["requestCoinMe"],
    queryFn: async () => {
      const res = await axiosCustom({
        method: "get",
        cmd: API_Coin_Me,
        headers: getAuthorizationHeaders(),
      });
      return assertSuccess(res);
    },
    enabled: Boolean(token),
  });
}

//预测下注
export function useRequestCoinBet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["requestCoinBet"],
    mutationFn: async (payload: PlaceBetPayload) => {
      const data = new URLSearchParams();
      data.append("marketId", String(payload.marketId));
      data.append("option", payload.option);
      data.append("amount", String(payload.amount));

      const res = await axiosCustom({
        method: "post",
        cmd: API_Coin_Bet,
        data,
        headers: {
          ...getAuthorizationHeaders(),
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
      });
      return assertSuccess(res) as PlaceBetResult;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries(["requestCoinMe"]);
    },
  });
}

/// MARK: 管理后台 - 金币
/// 基础路径: /api/admin/coin

//管理员铸币
export function useRequestAdminCoinMint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["requestAdminCoinMint"],
    mutationFn: async (payload: AdminCoinMintPayload) => {
      const data = new URLSearchParams();
      data.append("userId", String(payload.userId));
      data.append("amount", String(payload.amount));
      if (payload.remark) {
        data.append("remark", payload.remark);
      }

      const res = await axiosCustom({
        method: "post",
        cmd: API_Admin_Coin_Mint,
        data,
        headers: {
          ...getAuthorizationHeaders(),
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
      });
      return assertSuccess(res) as UserCoin;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries(["requestCoinMe"]);
    },
  });
}

/// MARK: 预测事件系统
/// 基础路径: /api/football

// 查询预测市场（聚合 market + context）
export function useRequestFootballMarkets(params: FootballMarketsParams = {}) {
  const token = getAuthToken();

  return useQuery<FootballMarketsResponse>({
    queryKey: ["requestFootballMarkets", params],
    queryFn: async () => {
      const res = await axiosCustom({
        method: "get",
        cmd: API_Football_Markets,
        params: {
          page: params.page ?? 1,
          limit: params.limit ?? 20,
          sourceModel: params.sourceModel,
          sourceModelId: params.sourceModelId,
        },
        headers: getAuthorizationHeaders(),
      });
      return assertSuccess(res);
    },
    enabled: Boolean(token),
  });
}

// 热度榜（heat 前 N）
export function useRequestFootballPredictContextHot(params: FootballPredictContextHotParams = {}) {
  const token = getAuthToken();

  return useQuery<FootballPredictContextHotResponse>({
    queryKey: ["requestFootballPredictContextHot", params],
    queryFn: async () => {
      const res = await axiosCustom({
        method: "get",
        cmd: API_Football_Predict_Context_Hot,
        params: {
          limit: params.limit ?? 10,
        },
        headers: getAuthorizationHeaders(),
      });
      return assertSuccess(res);
    },
    enabled: Boolean(token),
  });
}

// 修改/创建 PredictContext（按 marketId upsert）
export function useRequestFootballPredictContextUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["requestFootballPredictContextUpdate"],
    mutationFn: async (payload: PredictContextUpsertPayload) => {
      const data = new URLSearchParams();
      data.append("marketId", String(payload.marketId));
      data.append("eventName", payload.eventName);
      if (payload.imageUrl) data.append("imageUrl", payload.imageUrl);
      if (typeof payload.participantCount === "number") data.append("participantCount", String(payload.participantCount));
      if (payload.proText) data.append("proText", payload.proText);
      if (typeof payload.proVoteCount === "number") data.append("proVoteCount", String(payload.proVoteCount));
      if (payload.conText) data.append("conText", payload.conText);
      if (typeof payload.conVoteCount === "number") data.append("conVoteCount", String(payload.conVoteCount));
      if (typeof payload.heat === "number") data.append("heat", String(payload.heat));
      if (payload.detail) data.append("detail", payload.detail);
      if (payload.tags) data.append("tags", payload.tags);

      const res = await axiosCustom({
        method: "post",
        cmd: API_Football_Predict_Context_Update,
        data,
        headers: {
          ...getAuthorizationHeaders(),
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
      });
      return assertSuccess(res) as PredictContext;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries(["requestFootballMarkets"]),
        queryClient.invalidateQueries(["requestFootballPredictContextHot"]),
      ]);
    },
  });
}

/// MARK: 内容域 - 话题/帖子
/// 基础路径: /api/topic

//获取节点导航
export function useRequestTopicNodeNavs() {
  return useQuery<TopicNodeNav[]>({
    queryKey: ["requestTopicNodeNavs"],
    queryFn: async () => {
      const res = await axiosCustom({
        method: "get",
        cmd: API_Topic_Node_Navs,
        headers: getAuthorizationHeaders(),
      });
      return assertSuccess(res);
    },
  });
}

//获取所有节点
export function useRequestTopicNodes() {
  return useQuery<TopicNodeResponse[]>({
    queryKey: ["requestTopicNodes"],
    queryFn: async () => {
      const res = await axiosCustom({
        method: "get",
        cmd: API_Topic_Nodes,
        headers: getAuthorizationHeaders(),
      });
      return assertSuccess(res);
    },
  });
}

// 兼容旧命名
export const useRequestTopicNode = useRequestTopicNodes;

//获取单个节点信息
export function useRequestTopicInfo(params: TopicNodeInfoParams) {
  return useQuery<TopicNodeResponse>({
    queryKey: ["requestTopicInfo", params],
    queryFn: async () => {
      const res = await axiosCustom({
        method: "get",
        cmd: API_Topic_Node,
        params,
        headers: getAuthorizationHeaders(),
      });
      return assertSuccess(res);
    },
    enabled: typeof params?.nodeId === "number",
  });
}

//帖子详情
export function useRequestTopicDetail(topicId?: string) {
  return useQuery<TopicResponse>({
    queryKey: ["requestTopicDetail", topicId],
    queryFn: async () => {
      const res = await axiosCustom({
        method: "get",
        cmd: `${API_Topic}/${topicId}`,
        headers: getAuthorizationHeaders(),
      });
      return assertSuccess(res);
    },
    enabled: Boolean(topicId),
  });
}

//编辑前获取详情
export function useRequestTopicEditDetail(topicId?: string) {
  return useQuery<TopicEditDetail>({
    queryKey: ["requestTopicEditDetail", topicId],
    queryFn: async () => {
      const res = await axiosCustom({
        method: "get",
        cmd: `${API_Topic_Edit}/${topicId}`,
        headers: getAuthorizationHeaders(),
      });
      return assertSuccess(res);
    },
    enabled: Boolean(topicId),
  });
}

//帖子列表（cursor 分页）
export function useRequestTopicTopics(params: TopicListParams) {
  return useQuery<CursorResult<TopicResponse>>({
    queryKey: ["requestTopicTopics", params],
    queryFn: async () => {
      const res = await axiosCustom({
        method: "get",
        cmd: API_Topic_Topics,
        params,
        headers: getAuthorizationHeaders(),
      });
      return assertSuccess(res);
    },
  });
}

export function useInfiniteRequestTopicTopics(nodeId: number) {
  return useInfiniteQuery<CursorResult<TopicResponse>>({
    queryKey: ["requestTopicTopics", nodeId],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await axiosCustom({
        method: "get",
        cmd: API_Topic_Topics,
        params: { nodeId, cursor: pageParam },
        headers: getAuthorizationHeaders(),
      });
      return assertSuccess(res);
    },
    getNextPageParam: (lastPage) => (lastPage?.hasMore ? lastPage.cursor : undefined),
    enabled: typeof nodeId === "number",
  });
}

//最新帖子
export function useRequestTopicRecent() {
  return useQuery<SimpleTopic[]>({
    queryKey: ["requestTopicRecent"],
    queryFn: async () => {
      const res = await axiosCustom({
        method: "get",
        cmd: API_Topic_Recent,
        headers: getAuthorizationHeaders(),
      });
      return assertSuccess(res);
    },
  });
}

//最近点赞用户
export function useRequestTopicRecentLikes(topicId?: string) {
  return useQuery<UserInfo[]>({
    queryKey: ["requestTopicRecentLikes", topicId],
    queryFn: async () => {
      const res = await axiosCustom({
        method: "get",
        cmd: `${API_Topic_RecentLikes}/${topicId}`,
        headers: getAuthorizationHeaders(),
      });
      return assertSuccess(res);
    },
    enabled: Boolean(topicId),
  });
}

//用户帖子列表
export function useInfiniteRequestTopicUserTopics(params: UserTopicsParams) {
  return useInfiniteQuery<CursorResult<SimpleTopic>>({
    queryKey: ["requestTopicUserTopics", params.userId],
    queryFn: async ({ pageParam = params.cursor ?? 0 }) => {
      const res = await axiosCustom({
        method: "get",
        cmd: API_Topic_User_Topics,
        params: { userId: params.userId, cursor: pageParam },
        headers: getAuthorizationHeaders(),
      });
      return assertSuccess(res);
    },
    getNextPageParam: (lastPage) => (lastPage?.hasMore ? lastPage.cursor : undefined),
    enabled: typeof params?.userId === "number",
  });
}

//标签帖子列表
export function useInfiniteRequestTopicTagTopics(params: TagTopicsParams) {
  return useInfiniteQuery<CursorResult<SimpleTopic>>({
    queryKey: ["requestTopicTagTopics", params.tagId],
    queryFn: async ({ pageParam = params.cursor ?? 0 }) => {
      const res = await axiosCustom({
        method: "get",
        cmd: API_Topic_Tag_Topics,
        params: { tagId: params.tagId, cursor: pageParam },
        headers: getAuthorizationHeaders(),
      });
      return assertSuccess(res);
    },
    getNextPageParam: (lastPage) => (lastPage?.hasMore ? lastPage.cursor : undefined),
    enabled: typeof params?.tagId === "number",
  });
}

//获取隐藏内容
export function useRequestTopicHideContent(params: TopicHideContentParams) {
  return useQuery<TopicHideContentResponse>({
    queryKey: ["requestTopicHideContent", params],
    queryFn: async () => {
      const res = await axiosCustom({
        method: "get",
        cmd: API_Topic_Hide_Content,
        params,
        headers: getAuthorizationHeaders(),
      });
      return assertSuccess(res);
    },
    enabled: typeof params?.topicId === "number",
  });
}

//发表帖子
export function useRequestCreateTopic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["requestCreateTopic"],
    mutationFn: async (data: CreateTopicPayload) => {
      const res = await axiosCustom({
        method: "post",
        cmd: API_Topic_Create,
        data,
        headers: {
          ...getAuthorizationHeaders(),
          "Content-Type": "application/json",
        },
      });
      return assertSuccess(res);
    },
    onSuccess: async () => {
      await invalidateTopicQueries(queryClient);
    },
  });
}

//编辑帖子
export function useRequestEditTopic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["requestEditTopic"],
    mutationFn: async ({ topicId, data }: { topicId: string; data: EditTopicPayload }) => {
      const res = await axiosCustom({
        method: "post",
        cmd: `${API_Topic_Edit}/${topicId}`,
        data,
        headers: {
          ...getAuthorizationHeaders(),
          "Content-Type": "application/json",
        },
      });
      return assertSuccess(res);
    },
    onSuccess: async (_, variables) => {
      await invalidateTopicQueries(queryClient);
      await Promise.all([
        queryClient.invalidateQueries(["requestTopicDetail", variables.topicId]),
        queryClient.invalidateQueries(["requestTopicEditDetail", variables.topicId]),
      ]);
    },
  });
}

//删除帖子
export function useRequestDeleteTopic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["requestDeleteTopic"],
    mutationFn: async (topicId: string) => {
      const res = await axiosCustom({
        method: "post",
        cmd: `${API_Topic_Delete}/${topicId}`,
        headers: getAuthorizationHeaders(),
      });
      return assertSuccess(res);
    },
    onSuccess: async (_, topicId) => {
      await invalidateTopicQueries(queryClient);
      await Promise.all([
        queryClient.invalidateQueries(["requestTopicDetail", topicId]),
        queryClient.invalidateQueries(["requestTopicEditDetail", topicId]),
      ]);
    },
  });
}

//收藏帖子
export function useRequestFavoriteTopic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["requestFavoriteTopic"],
    mutationFn: async (topicId: string) => {
      const res = await axiosCustom({
        method: "get",
        cmd: `${API_Topic_Favorite}/${topicId}`,
        headers: getAuthorizationHeaders(),
      });
      return assertSuccess(res);
    },
    onSuccess: async (_, topicId) => {
      await invalidateTopicQueries(queryClient);
      await queryClient.invalidateQueries(["requestTopicDetail", topicId]);
    },
  });
}

// 兼容旧调用，后端当前由同一路径处理收藏切换
export const useRequestUnfavoriteTopic = useRequestFavoriteTopic;

//设置推荐（管理员）
export function useRequestRecommendTopic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["requestRecommendTopic"],
    mutationFn: async ({ topicId, recommend }: { topicId: string; recommend: boolean }) => {
      const data = new URLSearchParams();
      data.append("recommend", String(recommend));
      const res = await axiosCustom({
        method: "post",
        cmd: `${API_Topic_Recommend}/${topicId}`,
        data,
        headers: {
          ...getAuthorizationHeaders(),
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
      });
      return assertSuccess(res);
    },
    onSuccess: async (_, variables) => {
      await invalidateTopicQueries(queryClient);
      await queryClient.invalidateQueries(["requestTopicDetail", variables.topicId]);
    },
  });
}

//设置置顶（管理员）
export function useRequestStickyTopic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["requestStickyTopic"],
    mutationFn: async ({ topicId, sticky }: { topicId: string; sticky: boolean }) => {
      const data = new URLSearchParams();
      data.append("sticky", String(sticky));
      const res = await axiosCustom({
        method: "post",
        cmd: `${API_Topic_Sticky}/${topicId}`,
        data,
        headers: {
          ...getAuthorizationHeaders(),
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
      });
      return assertSuccess(res);
    },
    onSuccess: async (_, variables) => {
      await invalidateTopicQueries(queryClient);
      await queryClient.invalidateQueries(["requestTopicDetail", variables.topicId]);
    },
  });
}

export function useRequestLikeEntity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["requestLikeEntity"],
    mutationFn: async (payload: { entityType: string; entityId: string | number }) => {
      const res = await axiosCustom({
        method: "post",
        cmd: API_Like_Like,
        params: payload,
        headers: getAuthorizationHeaders(),
      });
      return assertSuccess(res);
    },
    onSuccess: async () => {
      await invalidateTopicQueries(queryClient);
    },
  });
}

export function useRequestUnlikeEntity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["requestUnlikeEntity"],
    mutationFn: async (payload: { entityType: string; entityId: string | number }) => {
      const res = await axiosCustom({
        method: "post",
        cmd: API_Like_Unlike,
        params: payload,
        headers: getAuthorizationHeaders(),
      });
      return assertSuccess(res);
    },
    onSuccess: async () => {
      await invalidateTopicQueries(queryClient);
    },
  });
}
