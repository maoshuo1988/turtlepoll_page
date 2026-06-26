/**
 * 文件说明：PK 接口响应归一化（评论嵌套、时间戳、回复/点赞回包）。
 */
import type { CommentResponse } from './useCommentRequests';
import type { PKCommentResponse, PKSide } from './pkTypes';

export function toUnixMs(value?: number | null) {
  if (!value) return undefined;
  return value < 1e12 ? value * 1000 : value;
}

export function normalizePKCommentItem(item: unknown): PKCommentResponse {
  const raw = item as PKCommentResponse & {
    comment?: CommentResponse;
    option?: PKSide | string;
    side?: PKSide | string;
  };

  if (raw.comment) {
    return {
      ...raw.comment,
      liked: raw.liked ?? raw.comment.liked,
      side: (raw.side ?? raw.option) as PKSide | undefined,
      heatScore: raw.heatScore,
      downvoteCount: raw.downvoteCount,
      downvoted: raw.downvoted,
      comment: raw.comment,
    };
  }

  return {
    ...raw,
    side: (raw.side ?? raw.option) as PKSide | undefined,
  };
}

export function unwrapPKCommentPayload(raw: unknown): PKCommentResponse {
  const data = raw as { comment?: CommentResponse };
  if (data.comment) return normalizePKCommentItem(raw);
  return normalizePKCommentItem(raw);
}

export function unwrapPKReplyPayload(raw: unknown): PKCommentResponse {
  const data = raw as { comment?: CommentResponse };
  if (data.comment) return normalizePKCommentItem(data.comment);
  return unwrapPKCommentPayload(raw);
}
