export type RequestResult<T> = {
  code: number;
  cmd: string;
  method: string;
  msg?: unknown;
  data: T;
};

export type CaptchaChallenge = {
  id: string;
  imageBase64: string;
  thumbBase64: string;
  thumbSize?: number;
};

export type CaptchaVerification = {
  captchaId: string;
  captchaCode: string;
  captchaProtocol: number;
};

export type SignInPayload = {
  username: string;
  password: string;
} & CaptchaVerification;

export type SignUpPayload = {
  email: string;
  username: string;
  nickname: string;
  password: string;
  rePassword: string;
} & CaptchaVerification;

export type CursorResult<T> = {
  results: T[];
  cursor: number | string;
  hasMore: boolean;
};

export type TopicNodeNav = {
  id: number;
  name: string;
  logo?: string;
  description?: string;
};

export type TopicTag = {
  id: number;
  name: string;
};

export type TopicImage = {
  url: string;
  preview?: string;
};

export type TopicUser = {
  id?: string;
  nickname?: string;
  username?: string;
  avatar?: string;
  smallAvatar?: string;
  score?: number;
};

export type TopicResponse = {
  id: string;
  type: number;
  user?: TopicUser | null;
  node?: TopicNodeNav | null;
  tags?: TopicTag[] | null;
  title?: string;
  summary?: string;
  content?: string;
  imageList?: TopicImage[];
  viewCount?: number;
  commentCount?: number;
  likeCount?: number;
  liked?: boolean;
  createTime?: number;
  recommend?: boolean;
  sticky?: boolean;
  favorited?: boolean;
  ipLocation?: string;
};

export type CreateTopicPayload = {
  type: number;
  nodeId: number;
  title: string;
  content: string;
  contentType: string;
  hideContent?: string;
  tags: string[];
  imageList: Array<{ url: string }>;
  vote: null;
  captchaId: string;
  captchaCode: string;
  captchaProtocol: number;
};
