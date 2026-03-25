import { useRequestCoinMe } from "@/hook/useCoinRequest";
import { useRequestUserCurrent } from "@/hook/useRequest";

// 组合当前登录态相关数据：用户信息 + 金币账户
// 注意：这里只做使用层聚合，底层 query 仍然独立，方便金币单独刷新
export function useAppSession() {
  // 当前登录用户资料
  const userInfo = useRequestUserCurrent();

  // 当前用户金币账户
  const coinMe = useRequestCoinMe();

  return {
    userInfo,
    coinMe,
    user: userInfo.data ?? null,
    coin: coinMe.data ?? null,
    isLoading: userInfo.isLoading || coinMe.isLoading,
    isFetching: userInfo.isFetching || coinMe.isFetching,
  };
}
