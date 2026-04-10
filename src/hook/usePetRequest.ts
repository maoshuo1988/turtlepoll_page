import { axiosCustom } from "@/api/axios";
import {
  API_Pet_Egg_Hatch,
  API_Pet_Equip,
  API_Pet_Owned,
  API_Pet_Status,
  API_Pet_Stamina,
  API_Pet_Stamina_Consume,
  API_Pet_Stamina_Feed,
} from "@/api/pet_api";
import { COIN_ME_QUERY_KEY } from "@/hook/useCoinRequest";
import { getAuthToken } from "@/utils/authStorage";
import { assertSuccess, getAuthorizationHeaders } from "@/utils/requestUtils";
import { useMutation, useQuery, useQueryClient } from "react-query";
import type {
  OwnedPetItem,
  PetEggHatchResponse,
  PetEquipInfo,
  PetEquipMutationResponse,
  PetEquipPayload,
  PetOwnedResponse,
  PetStaminaConsumePayload,
  PetStaminaFeedPayload,
  PetStaminaMutationResponse,
  PetStaminaResponse,
  PetStatusResponse,
} from "./petType";

export const PET_EQUIP_QUERY_KEY = ["requestPetEquip"] as const;
export const PET_OWNED_QUERY_KEY = ["requestPetOwned"] as const;
export const PET_STAMINA_QUERY_KEY = ["requestPetStamina"] as const;
export const PET_STATUS_QUERY_KEY = ["requestPetStatus"] as const;

async function invalidatePetQueries(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries(PET_EQUIP_QUERY_KEY),
    queryClient.invalidateQueries(PET_OWNED_QUERY_KEY),
    queryClient.invalidateQueries(PET_STAMINA_QUERY_KEY),
    queryClient.invalidateQueries(PET_STATUS_QUERY_KEY),
    queryClient.invalidateQueries(COIN_ME_QUERY_KEY),
  ]);
}

export function useRequestPetEquip() {
  const token = getAuthToken();

  return useQuery<PetEquipInfo>({
    queryKey: PET_EQUIP_QUERY_KEY,
    queryFn: async () => {
      const res = await axiosCustom({
        method: "get",
        cmd: API_Pet_Equip,
        headers: getAuthorizationHeaders(),
      });
      return assertSuccess<PetEquipInfo>(res);
    },
    enabled: Boolean(token),
  });
}

export function useRequestPetOwned() {
  const token = getAuthToken();

  return useQuery<PetOwnedResponse>({
    queryKey: PET_OWNED_QUERY_KEY,
    queryFn: async () => {
      const res = await axiosCustom({
        method: "get",
        cmd: API_Pet_Owned,
        headers: getAuthorizationHeaders(),
      });
      return assertSuccess<PetOwnedResponse>(res);
    },
    enabled: Boolean(token),
  });
}

export function useRequestPetStamina() {
  const token = getAuthToken();

  return useQuery<PetStaminaResponse>({
    queryKey: PET_STAMINA_QUERY_KEY,
    queryFn: async () => {
      const res = await axiosCustom({
        method: "get",
        cmd: API_Pet_Stamina,
        headers: getAuthorizationHeaders(),
      });
      return assertSuccess<PetStaminaResponse>(res);
    },
    enabled: Boolean(token),
    staleTime: 30 * 1000,
  });
}

export function useRequestPetStatus() {
  const token = getAuthToken();

  return useQuery<PetStatusResponse>({
    queryKey: PET_STATUS_QUERY_KEY,
    queryFn: async () => {
      const res = await axiosCustom({
        method: "get",
        cmd: API_Pet_Status,
        headers: getAuthorizationHeaders(),
      });
      return assertSuccess<PetStatusResponse>(res);
    },
    enabled: Boolean(token),
  });
}

export function useRequestPetEquipUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["requestPetEquipUpdate"],
    mutationFn: async (payload: PetEquipPayload) => {
      const data = new URLSearchParams();
      if ("petId" in payload) {
        data.append("petId", String(payload.petId));
      } else {
        data.append("petKey", payload.petKey);
      }

      const res = await axiosCustom({
        method: "post",
        cmd: API_Pet_Equip,
        data,
        headers: {
          ...getAuthorizationHeaders(),
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
      });
      return assertSuccess<PetEquipMutationResponse>(res);
    },
    onSuccess: async () => {
      await invalidatePetQueries(queryClient);
    },
  });
}

export function useRequestPetStaminaConsume() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["requestPetStaminaConsume"],
    mutationFn: async (payload: PetStaminaConsumePayload) => {
      const data = new URLSearchParams();
      data.append("amount", String(payload.amount));

      const res = await axiosCustom({
        method: "post",
        cmd: API_Pet_Stamina_Consume,
        data,
        headers: {
          ...getAuthorizationHeaders(),
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
      });
      return assertSuccess<PetStaminaMutationResponse>(res);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries(PET_STAMINA_QUERY_KEY);
    },
  });
}

export function useRequestPetStaminaFeed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["requestPetStaminaFeed"],
    mutationFn: async (payload: PetStaminaFeedPayload) => {
      const data = new URLSearchParams();
      data.append("count", String(payload.count));

      const res = await axiosCustom({
        method: "post",
        cmd: API_Pet_Stamina_Feed,
        data,
        headers: {
          ...getAuthorizationHeaders(),
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
      });
      return assertSuccess<PetStaminaMutationResponse>(res);
    },
    onSuccess: async () => {
      await invalidatePetQueries(queryClient);
    },
  });
}

export function useRequestPetEggHatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["requestPetEggHatch"],
    mutationFn: async () => {
      const res = await axiosCustom({
        method: "post",
        cmd: API_Pet_Egg_Hatch,
        headers: {
          ...getAuthorizationHeaders(),
        },
      });
      return assertSuccess<PetEggHatchResponse>(res);
    },
    onSuccess: async () => {
      await invalidatePetQueries(queryClient);
    },
  });
}

export function findEquippedOwnedPet(data?: PetOwnedResponse | null): OwnedPetItem | null {
  if (!data?.list?.length) return null;
  return data.list.find((item) => item.isEquipped) ?? null;
}
