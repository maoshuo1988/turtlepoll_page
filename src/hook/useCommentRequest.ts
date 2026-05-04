/**
 * 文件说明：use Comment Request，封装对应业务域的接口请求和缓存更新逻辑。
 */
import { axiosCustom } from "@/api/axios";
import { API_Comment_Comments, API_Comment_Create, API_Comment_Replies } from "@/api/comment_api";
import { assertSuccess, getAuthorizationHeaders } from "@/utils/requestUtils";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "react-query";
import type { CursorResult } from "./topicType";

export type CommentImage = {
  url: string;
  preview?: string;
};

export type CommentUser = {
  id?: string | number;
  nickname?: string;
  username?: string;
  avatar?: string;
  smallAvatar?: string;
};

export type CommentQuote = {
  id: string | number;
  content?: string;
  text?: string;
  body?: string;
  commentContent?: string;
  user?: CommentUser | null;
};

export type CommentResponse = {
  id: string | number;
  entityType?: string;
  entityId?: string | number;
  content?: string;
  text?: string;
  body?: string;
  message?: string;
  commentContent?: string;
  contentText?: string;
  comment?: CommentResponse | null;
  imageList?: CommentImage[];
  likeCount?: number;
  likes?: number;
  liked?: boolean;
  replyCount?: number;
  replies?: number;
  createTime?: number;
  createdAt?: number | string;
  createAt?: number | string;
  updateTime?: number;
  ipLocation?: string;
  user?: CommentUser | null;
  quote?: CommentQuote | null;
};

export type CommentListParams = {
  cursor?: number | string;
  entityType: string;
  entityId: number | string;
  enabled?: boolean;
};

export type CommentRepliesParams = {
  cursor?: number | string;
  commentId: number | string;
  enabled?: boolean;
};

export type CreateCommentPayload = {
  entityType: string;
  entityId: number | string;
  content: string;
  imageList?: CommentImage[];
  quoteId?: number | string;
};

const invalidateCommentQueries = async (queryClient: ReturnType<typeof useQueryClient>) => {
  await Promise.all([
    queryClient.invalidateQueries(["requestCommentComments"]),
    queryClient.invalidateQueries(["requestCommentReplies"]),
  ]);
};

const hasValue = (value: unknown) => value !== undefined && value !== null && value !== "";

const normalizeCursorResult = <T>(raw: unknown): CursorResult<T> => {
  const data = raw as {
    results?: T[];
    data?: T[];
    list?: T[];
    comments?: T[];
    records?: T[];
    cursor?: number | string;
    hasMore?: boolean;
  };

  return {
    results: data.results ?? data.data ?? data.list ?? data.comments ?? data.records ?? [],
    cursor: data.cursor ?? 0,
    hasMore: Boolean(data.hasMore),
  };
};

const buildCreateCommentForm = (payload: CreateCommentPayload) => {
  const data = new URLSearchParams();
  data.append("entityType", payload.entityType);
  data.append("entityId", String(payload.entityId));
  data.append("content", payload.content.trim());

  if (Array.isArray(payload.imageList) && payload.imageList.length > 0) {
    data.append("imageList", JSON.stringify(payload.imageList.map((item) => ({ url: item.url }))));
  }

  if (hasValue(payload.quoteId) && Number(payload.quoteId) > 0) {
    data.append("quoteId", String(payload.quoteId));
  }

  return data;
};

/// MARK: 内容域 - 评论
/// 基础路径: /api/comment

// 评论列表（cursor 分页）
export function useRequestCommentComments(params: CommentListParams) {
  const { enabled = true, ...queryParams } = params;

  return useQuery<CursorResult<CommentResponse>>({
    queryKey: ["requestCommentComments", params],
    queryFn: async () => {
      const res = await axiosCustom({
        method: "get",
        cmd: API_Comment_Comments,
        params: queryParams,
        headers: getAuthorizationHeaders(),
      });
      return normalizeCursorResult<CommentResponse>(assertSuccess(res));
    },
    enabled: enabled && Boolean(params?.entityType) && hasValue(params?.entityId),
  });
}

export function useInfiniteRequestCommentComments(params: Omit<CommentListParams, "cursor">) {
  return useInfiniteQuery<CursorResult<CommentResponse>>({
    queryKey: ["requestCommentComments", params],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await axiosCustom({
        method: "get",
        cmd: API_Comment_Comments,
        params: { ...params, cursor: pageParam },
        headers: getAuthorizationHeaders(),
      });
      return normalizeCursorResult<CommentResponse>(assertSuccess(res));
    },
    getNextPageParam: (lastPage) => (lastPage?.hasMore ? lastPage.cursor : undefined),
    enabled: Boolean(params?.entityType) && hasValue(params?.entityId),
  });
}

// 回复列表（cursor 分页）
export function useRequestCommentReplies(params: CommentRepliesParams) {
  const { enabled = true, ...queryParams } = params;

  return useQuery<CursorResult<CommentResponse>>({
    queryKey: ["requestCommentReplies", params],
    queryFn: async () => {
      const res = await axiosCustom({
        method: "get",
        cmd: API_Comment_Replies,
        params: queryParams,
        headers: getAuthorizationHeaders(),
      });
      return normalizeCursorResult<CommentResponse>(assertSuccess(res));
    },
    enabled: enabled && hasValue(params?.commentId),
  });
}

export function useInfiniteRequestCommentReplies(commentId?: number | string) {
  return useInfiniteQuery<CursorResult<CommentResponse>>({
    queryKey: ["requestCommentReplies", commentId],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await axiosCustom({
        method: "get",
        cmd: API_Comment_Replies,
        params: { commentId, cursor: pageParam },
        headers: getAuthorizationHeaders(),
      });
      return normalizeCursorResult<CommentResponse>(assertSuccess(res));
    },
    getNextPageParam: (lastPage) => (lastPage?.hasMore ? lastPage.cursor : undefined),
    enabled: hasValue(commentId),
  });
}

// 发布评论（表单提交，imageList 需传 JSON 字符串）
export function useRequestCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["requestCreateComment"],
    mutationFn: async (payload: CreateCommentPayload) => {
      const data = buildCreateCommentForm(payload);
      const res = await axiosCustom({
        method: "post",
        cmd: API_Comment_Create,
        data,
        headers: {
          ...getAuthorizationHeaders(),
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
      });
      return assertSuccess(res) as CommentResponse;
    },
    onSuccess: async () => {
      await invalidateCommentQueries(queryClient);
    },
  });
}
