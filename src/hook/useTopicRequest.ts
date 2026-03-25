import { axiosCustom } from "@/api/axios";
import {
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
} from "@/api/topic_api";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "react-query";
import type { CreateTopicPayload, CursorResult, EditTopicPayload, SimpleTopic, TagTopicsParams, TopicEditDetail, TopicHideContentParams, TopicHideContentResponse, TopicListParams, TopicNodeInfoParams, TopicNodeNav, TopicNodeResponse, TopicResponse, UserInfo, UserTopicsParams } from "./topicType";
import { assertSuccess, getAuthorizationHeaders } from "@/utils/requestUtils";
import { API_Like_Like, API_Like_Unlike } from "@/api/api";

const invalidateTopicQueries = async (queryClient: ReturnType<typeof useQueryClient>) => {
  await Promise.all([
    queryClient.invalidateQueries(["requestTopicTopics"]),
    queryClient.invalidateQueries(["requestTopicRecent"]),
    queryClient.invalidateQueries(["requestTopicUserTopics"]),
    queryClient.invalidateQueries(["requestTopicTagTopics"]),
  ]);
};

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
    // 推荐/关注切换时需要立刻按当前 nodeId 重新拉取，避免 30s staleTime 直接复用旧缓存。
    staleTime: 0,
    refetchOnMount: "always",
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
    enabled:  params?.userId !== "" ,
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
