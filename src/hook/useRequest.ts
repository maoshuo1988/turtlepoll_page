import { API_CRYPTO_LEFT_LIST } from "@/api/api";
import { axiosCustom } from "@/api/axios";
import { useQuery } from "react-query";

export function useCryptoLeftList() {
  async function fetchData() {
    const res = await axiosCustom({
      method: "get",
      cmd: API_CRYPTO_LEFT_LIST,
    });
    return res;
  }
  return useQuery({ queryKey: ["cryptoLeftList"], queryFn: fetchData });
}