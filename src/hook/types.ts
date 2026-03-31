export type RequestResult<T> = {
  code: number;
  cmd: string;
  method: string;
  msg?: unknown;
  data: T;
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
} & CaptchaVerification;

export type SignUpPayload = {
  email: string;
  username: string;
  nickname: string;
  password: string;
  rePassword: string;
} & CaptchaVerification;

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
