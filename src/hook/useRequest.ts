import {
  API_Captcha_Request_Angle,
  API_Config_Configs,
  API_Login_Signin,
  API_Login_Signout,
  API_Login_Signup,
  API_User_Current,
} from "@/api/api";
import { axiosCustom } from "@/api/axios";
import type {
  RequestResult,
} from "@/hook/types";
import { useMutation, useQuery } from "react-query";

///获取图形
export function useRequestRotateCaptcha() {
  async function fetchData() {
    const res = (await axiosCustom({
      method: "get",
      cmd: API_Captcha_Request_Angle,
    }));

    if (res.success !== true) {
      throw new Error(String(res.msg ?? ""));
    }
    return res.data;
  }

  return useMutation({
    mutationKey: ["requestRotateCaptcha"],
    mutationFn: fetchData,
  });
}

///注册
export function useRequestSignUp() {
  async function fetchData(data: any) {
    const res = (await axiosCustom({
      method: "post",
      cmd: API_Login_Signup,
      data: data,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
    }));

    if (res.success !== true) {
      throw new Error(String(res.msg ?? ""));
    }
    return res.data;
  }
  return useMutation({
    mutationKey: ["requestSignUp"],
    mutationFn: fetchData,
  });
}

///登录
export function useRequestSignIn(){
  async function fetchData(data: any) {
    const res = (await axiosCustom({
      method: "post",
      cmd: API_Login_Signin,
      data: data,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
    }));

    if (res.success !== true) {
      throw new Error(String(res.msg ?? ""));
    }
    return res.data;
  }
  return useMutation({
    mutationKey: ["requestSignIn"],
    mutationFn: fetchData,
  });
}

///退出登录
export function useRequestSignout(){
  async function fetchData() {
    const res = (await axiosCustom({
      method: "get",
      cmd: API_Login_Signout,
    }));

    if (res.success !== true) {
      throw new Error(String(res.msg ?? ""));
    }
    return res.data;
  }
  return useMutation({
    mutationKey: ["requestSignout"],
    mutationFn: fetchData,
  });
}









// export function useConfigConfigs() {
//   async function fetchData() {
//     const res = await axiosCustom({
//       method: "get",
//       cmd: API_Config_Configs,
//     });
//     return res;
//   }
//   return useQuery({ queryKey: ["configConfigs"], queryFn: fetchData });
// }





export async function requestCurrentUser<T>(token?: string) {
  const res = await axiosCustom({
    method: "get",
    cmd: API_User_Current,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return res as RequestResult<T>;
}

// export async function fetchCurrentUser(token?: string) {
//   const response = await requestCurrentUser<AuthUser>(token);
//   return unwrapRequestResult(response);
// }

