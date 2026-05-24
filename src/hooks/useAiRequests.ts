/**
 * 文件说明：use Ai Requests，封装 AI 聊天、体力和推送接口请求。
 */
import { axiosCustom } from "@/api/httpClient";
import {
  API_AI_Chat,
  API_AI_Presence,
  API_AI_Pushes_Read,
  API_AI_Pushes_Stream,
  API_AI_Pushes_Unread,
  API_AI_Stamina,
  API_AI_Stamina_Apple,
} from "@/api/aiApi";
import { SERVER_API } from "@/config";
import { COIN_ME_QUERY_KEY } from "@/hooks/useCoinRequests";
import { getAuthToken } from "@/utils/authStorage";
import { assertSuccess, getAuthorizationHeaders } from "@/utils/requestUtils";
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "react-query";
import type {
  AiChatPayload,
  AiChatResponse,
  AiPresencePayload,
  AiPresenceResponse,
  AiPushesReadPayload,
  AiPushesReadResponse,
  AiPushStreamOptions,
  AiStaminaApplePayload,
  AiStaminaAppleResponse,
  AiStaminaResponse,
  AiUnreadPushesResponse,
} from "./aiTypes";

export const AI_STAMINA_QUERY_KEY = ["requestAiStamina"] as const;
export const AI_UNREAD_PUSHES_QUERY_KEY = ["requestAiUnreadPushes"] as const;

// GET /api/ai/stamina：查询 AI 聊天体力。未登录时不发请求，避免触发认证错误。
export function useRequestAiStamina() {
  const token = getAuthToken();

  return useQuery<AiStaminaResponse>({
    queryKey: AI_STAMINA_QUERY_KEY,
    queryFn: async () => {
      const res = await axiosCustom({
        method: "get",
        cmd: API_AI_Stamina,
        headers: getAuthorizationHeaders(),
      });
      return assertSuccess<AiStaminaResponse>(res);
    },
    enabled: Boolean(token),
  });
}

// GET /api/ai/pushes/unread：拉取未读 AI 主动推送，limit 最大值由后端限制。
export function useRequestAiUnreadPushes(limit = 20, enabled = true) {
  const token = getAuthToken();

  return useQuery<AiUnreadPushesResponse>({
    queryKey: [...AI_UNREAD_PUSHES_QUERY_KEY, limit],
    queryFn: async () => {
      const res = await axiosCustom({
        method: "get",
        cmd: API_AI_Pushes_Unread,
        params: { limit },
        headers: getAuthorizationHeaders(),
      });
      return assertSuccess<AiUnreadPushesResponse>(res);
    },
    enabled: Boolean(token) && enabled,
  });
}

// POST /api/ai/pushes/read：将已展示的推送标记为已读，并刷新未读推送缓存。
export function useRequestAiPushesRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["requestAiPushesRead"],
    mutationFn: async (payload: AiPushesReadPayload) => {
      const res = await axiosCustom({
        method: "post",
        cmd: API_AI_Pushes_Read,
        data: payload,
        headers: {
          ...getAuthorizationHeaders(),
          "Content-Type": "application/json",
        },
      });
      return assertSuccess<AiPushesReadResponse>(res);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries(AI_UNREAD_PUSHES_QUERY_KEY);
    },
  });
}

// POST /api/ai/presence：上报用户所在页面和活跃状态，用于后端判断是否触发闲置推送。
export function useRequestAiPresence() {
  return useMutation({
    mutationKey: ["requestAiPresence"],
    mutationFn: async (payload: AiPresencePayload) => {
      const res = await axiosCustom({
        method: "post",
        cmd: API_AI_Presence,
        data: payload,
        headers: {
          ...getAuthorizationHeaders(),
          "Content-Type": "application/json",
        },
      });
      return assertSuccess<AiPresenceResponse>(res);
    },
  });
}

// GET /api/ai/pushes/stream：建立 SSE 连接，实时接收 ai_push 事件；断线补偿仍由 unread 接口兜底。
export function useAiPushStream({ enabled = true, onPush, onError }: AiPushStreamOptions) {
  const token = getAuthToken();

  useEffect(() => {
    if (!enabled || !token) return undefined;

    // EventSource 不支持自定义 Authorization header，这里依赖后端 cookie/session 认证。
    const eventSource = new EventSource(`${SERVER_API}${API_AI_Pushes_Stream}`, {
      withCredentials: true,
    });

    const handlePush = (event: MessageEvent<string>) => {
      try {
        const message = JSON.parse(event.data) as Parameters<typeof onPush>[0];
        onPush(message);
      } catch (error) {
        console.warn("Failed to parse ai_push event", error);
      }
    };

    const handleError = (event: Event) => {
      onError?.(event);
    };

    eventSource.addEventListener("ai_push", handlePush as EventListener);
    eventSource.addEventListener("error", handleError);

    return () => {
      eventSource.removeEventListener("ai_push", handlePush as EventListener);
      eventSource.removeEventListener("error", handleError);
      eventSource.close();
    };
  }, [enabled, onError, onPush, token]);
}

// POST /api/ai/chat：发送用户聊天内容，并在成功后同步 AI 体力缓存。
export function useRequestAiChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["requestAiChat"],
    mutationFn: async (payload: AiChatPayload) => {
      // scene 默认使用 chat；页面若传入更具体场景，可覆盖这个默认值。
      const res = await axiosCustom({
        method: "post",
        cmd: API_AI_Chat,
        data: {
          scene: "chat",
          ...payload,
        },
        headers: {
          ...getAuthorizationHeaders(),
          "Content-Type": "application/json",
        },
      });
      return assertSuccess<AiChatResponse>(res);
    },
    onSuccess: async (result) => {
      // 聊天接口会返回最新体力和每日额度，这里先乐观写入缓存，再触发一次刷新对齐后端懒恢复结果。
      queryClient.setQueryData<AiStaminaResponse | undefined>(AI_STAMINA_QUERY_KEY, (current) => {
        if (typeof result.staminaLeft !== "number" && typeof result.maxStamina !== "number") {
          return current;
        }

        return {
          userId: current?.userId,
          stamina: result.staminaLeft ?? current?.stamina ?? 0,
          maxStamina: result.maxStamina ?? current?.maxStamina ?? 0,
          nextRecoverAt: result.nextRecoverAt ?? current?.nextRecoverAt,
          dailyUsedCount: current?.dailyUsedCount,
          dailyLimit: result.dailyMessageLimit ?? current?.dailyLimit,
          recoverMinutes: current?.recoverMinutes,
          appleCoinCost: current?.appleCoinCost,
          lastRecoverAt: current?.lastRecoverAt,
          dailyRemaining: result.dailyRemaining ?? current?.dailyRemaining,
        };
      });
      await queryClient.invalidateQueries(AI_STAMINA_QUERY_KEY);
    },
  });
}

// POST /api/ai/stamina/apple：消耗龟币恢复 AI 体力，成功后刷新 AI 体力和金币余额。
export function useRequestAiStaminaApple() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["requestAiStaminaApple"],
    mutationFn: async (payload: AiStaminaApplePayload) => {
      const res = await axiosCustom({
        method: "post",
        cmd: API_AI_Stamina_Apple,
        data: payload,
        headers: {
          ...getAuthorizationHeaders(),
          "Content-Type": "application/json",
        },
      });
      return assertSuccess<AiStaminaAppleResponse>(res);
    },
    onSuccess: async (result) => {
      queryClient.setQueryData<AiStaminaResponse | undefined>(AI_STAMINA_QUERY_KEY, result);
      await Promise.all([
        queryClient.invalidateQueries(AI_STAMINA_QUERY_KEY),
        queryClient.invalidateQueries(COIN_ME_QUERY_KEY),
      ]);
    },
  });
}
