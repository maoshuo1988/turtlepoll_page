import { SERVER_API } from "@/constant";
import axios from "axios";

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
      });
      const resData = res.data;
      console.log("resData --- ", resData);
      console.log({
        cmd: cmd,
        method: method,
        data: resData,
      });

      resolve({
        code: resData.code,
        cmd: cmd,
        method: method,
        msg: resData.msg,
        data: resData?.data ?? {},
      });
    } catch (e: any) {
      console.log(e.response?.status, "eeeee");
      //twitter user me 如果用户账号异常 也会返回403 但不能重新授权
      if (
        (e.response?.status === 403 && successCode !== 312454645) ||
        e.response?.status === 411
      ) {
        localStorage.setItem("url_token", "{}");
      }

      console.log({
        cmd: cmd,
        method: method,
        data: e,
      });
      resolve({
        cmd: cmd,
        method: method,
        code: -1, //失败的code
        msg: e,
      });
    }
  });
}
