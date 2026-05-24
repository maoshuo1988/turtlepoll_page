/**
 * 文件说明：HTTP 客户端封装，统一拼接服务地址、透传参数并归一化响应。
 */
import { SERVER_API } from "@/config";
import axios from "axios";
import { handleUnauthorizedSession } from "@/utils/authStorage";

export function axiosCustom({
  cmd = "",
  headers = {},
  params = {},
  method = "get",
  data = {},
  successCode = 0,
}): Promise<any> {
  return new Promise(async (resolve) => {
    try {
      const res = await axios({
        url: SERVER_API + cmd,
        method: method,
        headers,
        params,
        data,
        withCredentials: true,
      });
      const resData = res.data;
      console.log({
        cmd: cmd,
        method: method,
        data: resData,
      });

      resolve({
        code: resData.errorCode,
        cmd: cmd,
        method: method,
        msg: resData.message,
        data: resData?.data ?? {},
        success:resData?.success ?? false
      });
    } catch (e: any) {
      const status = e.response?.status;
      const responseMessage = e.response?.data?.message ?? e.response?.data?.msg;

      console.log(status, "eeeee");
      //twitter user me 如果用户账号异常 也会返回403 但不能重新授权
      if (
        (status === 403 && successCode !== 312454645) ||
        status === 411
      ) {
        localStorage.setItem("url_token", "{}");
      }

      if (status === 401) {
        handleUnauthorizedSession();
      }

      console.log({
        cmd: cmd,
        method: method,
        data: e,
      });
      resolve({
        cmd: cmd,
        method: method,
        code: status ?? 0,
        msg: responseMessage ?? e.message ?? "Request failed",
        success: false,
      });
    }
  });
}
