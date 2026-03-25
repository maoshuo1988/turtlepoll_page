import {
  API_Badge_Badges,
  API_Captcha_Request_Angle,
  API_Config_Configs,
  API_Login_Signin,
  API_Login_Signout,
  API_Login_Signup,
  API_Upload_File,
  API_Upload_Image,
  API_User_Current,
  API_User_Msg_recent,
} from "@/api/api";
import { axiosCustom } from "@/api/axios";
import { saveUserInfo } from "@/utils/authStorage";
import { assertSuccess, getAuthorizationHeaders } from "@/utils/requestUtils";
import { useMutation, useQuery } from "react-query";
import type { UploadFileResponse, UploadImageResponse } from "./types";

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

//上传图片
export function useRequestUploadImage() {
  return useMutation<UploadImageResponse, Error, File>({
    mutationKey: ["requestUploadImage"],
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const res = await axiosCustom({
        method: "post",
        cmd: API_Upload_Image,
        data: formData,
        headers: {
          ...getAuthorizationHeaders(),
          "Content-Type": "multipart/form-data",
        },
      });
      return assertSuccess(res);
    },
  });
}

//上传文件
export function useRequestUploadFile() {
  return useMutation<UploadFileResponse, Error, File>({
    mutationKey: ["requestUploadFile"],
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const res = await axiosCustom({
        method: "post",
        cmd: API_Upload_File,
        data: formData,
        headers: {
          ...getAuthorizationHeaders(),
          "Content-Type": "multipart/form-data",
        },
      });
      return assertSuccess(res);
    },
  });
}
