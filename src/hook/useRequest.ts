import {
  API_Badge_Badges,
  API_Captcha_Request_Angle,
  API_Config_Configs,
  API_Login_Signin,
  API_Login_Signout,
  API_Login_Signup,
  API_Topic_List,
  API_Topic_Node,
  API_Topic_Node_Navs,
  API_Topic_Topics,
  API_User_Current,
  API_User_Msg_recent,
} from "@/api/api";
import { axiosCustom } from "@/api/axios";
import { getAuthToken, saveUserInfo } from "@/utils/authStorage";
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
export function useRequestSignIn() {
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
export function useRequestSignout() {
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

//获取用户信息
export function useRequestUserCurrent() {
  async function fetchData() {
    const res = (await axiosCustom({
      method: "get",
      cmd: API_User_Current,
      headers: {
        "Authorization": `Bearer ${getAuthToken()}`,
      },
    }));

    if (res.success !== true) {
      throw new Error(String(res.msg ?? ""));
    }
   saveUserInfo(res.data)
    return res.data;
  }
  return useQuery({
    queryKey: ["requestUserCurrent"],
    queryFn: fetchData,
  });
}

//顶部站点信息/公告
export function useRequestConfigConfigs() {
  async function fetchData() {
    const res = (await axiosCustom({
      method: "get",
      cmd: API_Config_Configs,
    }));

    if (res.success !== true) {
      throw new Error(String(res.msg ?? ""));
    }
    return res.data;
  }
  return useQuery({
    queryKey: ["requestConfigConfigs"],
    queryFn: fetchData,
  });
}

//顶部未读消息摘要
export function useRequestUserMsgRecent() {
  async function fetchData() {
    const res = (await axiosCustom({
      method: "get",
      cmd: API_User_Msg_recent,
      headers: {
        "Authorization": `Bearer ${getAuthToken()}`,
      },
    }));

    if (res.success !== true) {
      throw new Error(String(res.msg ?? ""));
    }
    return res.data;
  }
  return useQuery({
    queryKey: ["requestUserMsgRecent"],
    queryFn: fetchData,
  });
}

//获取用户勋章列表 
export function useRequestBadgeBadges() {
  async function fetchData() {
    const res = (await axiosCustom({
      method: "get",
      cmd: API_Badge_Badges,
      headers: {
        "Authorization": `Bearer ${getAuthToken()}`,
      },
    }));

    if (res.success !== true) {
      throw new Error(String(res.msg ?? ""));
    }
    return res.data;
  }
  return useQuery({
    queryKey: ["requestBadgeBadges"],
    queryFn: fetchData,
  });
}

/// MARK: 内容域 - 话题/帖子
/// 基础路径: /api/topic

//获取节点导航
export function useRequestTopicNodeNavs(){
  async function fetchData() {
    const res = (await axiosCustom({
      method: "get",
      cmd: API_Topic_Node_Navs,
      headers: {
        "Authorization": `Bearer ${getAuthToken()}`,
      },
    }));

    if (res.success !== true) {
      throw new Error(String(res.msg ?? ""));
    }
    return res.data;
  }
  return useQuery({
    queryKey: ["requestTopicNodeNavs"],
    queryFn: fetchData,
  });
}
//获取所有节点
export function useRequestTopicNode(){
  async function fetchData() {
    const res = (await axiosCustom({
      method: "get",
      cmd: API_Topic_Node,
      headers: {
        "Authorization": `Bearer ${getAuthToken()}`,
      },
    }));

    if (res.success !== true) {
      throw new Error(String(res.msg ?? ""));
    }
    return res.data;
  }
  return useQuery({
    queryKey: ["requestTopicNode"],
    queryFn: fetchData,
  });
}
//获取话题列表
export function useRequestTopicList(params: any) {
  async function fetchData() {
    const res = (await axiosCustom({
      method: "get",
      cmd: API_Topic_List,
      params,
      headers: {
        "Authorization": `Bearer ${getAuthToken()}`,
      },
    }));

    if (res.success !== true) {
      throw new Error(String(res.msg ?? ""));
    }
    return res.data;
  }
  return useQuery({
    queryKey: ["requestTopicList"],
    queryFn: fetchData,
  });
}
// 话题列表（首页主流）
// nodeId	number	否	节点 ID：0 最新，-1 推荐，-2 关注，>0 普通节点。
// odeId=-2 关注流时需要登录
export function useRequestTopicTopics(params: any) {
  async function fetchData() {
    const res = (await axiosCustom({
      method: "get",
      cmd: API_Topic_Topics,
      params,
      headers: {
        "Authorization": `Bearer ${getAuthToken()}`,
      },
    }));

    if (res.success !== true) {
      throw new Error(String(res.msg ?? ""));
    }
    return res.data;
  }
  return useQuery({
    queryKey: ["requestTopicTopics"],
    queryFn: fetchData,
  });
}