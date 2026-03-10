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
