import { API_Config_Configs } from "@/api/api";
import { axiosCustom } from "@/api/axios";
import { useQuery } from "react-query";

export function useConfigConfigs() {
  async function fetchData() {
    const res = await axiosCustom({
      method: "get",
      cmd: API_Config_Configs,
    });
    return res;
  }
  return useQuery({ queryKey: ["configConfigs"], queryFn: fetchData });
}