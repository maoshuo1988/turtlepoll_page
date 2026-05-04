/**
 * 文件说明：auth Types，定义对应业务域的接口数据类型。
 */
export type RequestResult<T> = {
  code: number;
  cmd: string;
  method: string;
  msg?: unknown;
  data: T;
};

export type DailySettleItem = {
  type: string;
  amount: number;
  desc: string;
  meta?: Record<string, unknown>;
};

export type DailySettleSummary = {
  date: string;
  alreadySettled: boolean;
  balanceBefore?: number;
  balanceAfter?: number;
  items?: DailySettleItem[];
  streak?: {
    loginStreak?: number;
  };
  pet?: {
    petId?: number | string;
    petKey?: string;
    level?: number;
  };
  errorCode?: string;
  errorMsg?: string;
};

export type AuthUser = {
  id?: string;
  username?: string;
  nickname?: string;
  email?: string;
  avatar?: string;
  [key: string]: unknown;
};

export type UserCoinLog = {
  id: number;
  userId: number;
  bizType: string;
  bizId: number;
  amount: number;
  balanceAfter: number;
  remark?: string;
  createTime: number;
};

export type CaptchaChallenge = {
  id: string;
  imageBase64: string;
  thumbBase64: string;
  thumbSize?: number;
};

export type ImageCaptchaChallenge = {
  captchaId: string;
  captchaBase64: string;
};

export type CaptchaVerification = {
  captchaId: string;
  captchaCode: string;
  captchaProtocol: number;
};

export type SignInPayload = {
  username: string;
  password: string;
  redirect?: string;
} & CaptchaVerification;

export type SignInResponse = {
  token?: string;
  user?: AuthUser;
  dailySettle?: DailySettleSummary;
  [key: string]: unknown;
};

export type SignUpPayload = {
  email: string;
  username: string;
  nickname: string;
  password: string;
  rePassword: string;
  redirect?: string;
} & CaptchaVerification;

export type SignUpResponse = {
  token?: string;
  user?: AuthUser;
  dailySettle?: DailySettleSummary;
  [key: string]: unknown;
};

export type UploadImageResponse = {
  url: string;
  width?: number;
  height?: number;
};

export type UploadFileResponse = {
  url: string;
  name?: string;
  size?: number;
  mimeType?: string;
};
