/**
 * 文件说明：use Pet Requests，封装对应业务域的接口请求和缓存更新逻辑。
 */
import { axiosCustom } from "@/api/httpClient";
import { SERVER_ASSET_ORIGIN } from "@/config";
import { pickValidPetId, pickValidPetRarity } from '@/components/common/pet/petEquip';
import { normalizePetRarityGrade, PetRarityGrade } from "@/components/common/pet/petRarity";
import {
  API_Pet_Defs,
  API_Pet_Gacha_Config,
  API_Pet_Egg_Hatch,
  API_Pet_Equip,
  API_Pet_Owned,
  API_Pet_Status,
  API_Pet_Stamina,
  API_Pet_Stamina_Consume,
  API_Pet_Stamina_Feed,
} from "@/api/petApi";
import { COIN_ME_QUERY_KEY } from "@/hooks/useCoinRequests";
import { getAuthToken } from "@/utils/authStorage";
import { assertSuccess, getAuthorizationHeaders } from "@/utils/requestUtils";
import { useMutation, useQuery, useQueryClient } from "react-query";
import type {
  OwnedPetItem,
  PetAbilityDescription,
  PetEggHatchResponse,
  PetEquipInfo,
  PetEquipMutationResponse,
  PetEquipPayload,
  PetDefNormalized,
  PetDefsListNormalized,
  PetGachaConfigResponse,
  PetGachaProbabilityRow,
  PetOwnedResponse,
  PetStaminaConsumePayload,
  PetStaminaFeedPayload,
  PetStaminaMutationResponse,
  PetStaminaResponse,
  PetStatusResponse,
} from "./petTypes";

export const PET_EQUIP_QUERY_KEY = ["requestPetEquip"] as const;
export const PET_OWNED_QUERY_KEY = ["requestPetOwned"] as const;
export const PET_STAMINA_QUERY_KEY = ["requestPetStamina"] as const;
export const PET_STATUS_QUERY_KEY = ["requestPetStatus"] as const;
export const PET_GACHA_CONFIG_QUERY_KEY = ["requestPetGachaConfig"] as const;
export const PET_DEFS_QUERY_KEY = ["requestPetDefs"] as const;

const RARITY_LABEL_BY_VALUE: Record<string, string> = {
  '1': 'C',
  '2': 'B',
  '3': 'A',
  '4': 'S',
  '5': 'SS',
  '6': 'SSS',
  N: 'C',
  R: 'B',
  SR: 'A',
  SSR: 'S',
  普通: 'C',
  稀有: 'B',
  史诗: 'A',
  传说: 'S',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pickNonEmptyString(...vals: unknown[]): string {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return "";
}

function pickFiniteNumber(...vals: unknown[]): number | undefined {
  for (const v of vals) {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim()) {
      const parsed = Number(v);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

function pickLocalizedPetName(nameField: unknown): string {
  if (typeof nameField === "string" && nameField.trim()) return nameField.trim();
  if (!isRecord(nameField)) return "";

  const preferredKeys = ["zh-CN", "zh_CN", "zh", "en-US", "en_US", "en"];
  for (const key of preferredKeys) {
    const v = nameField[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }

  for (const v of Object.values(nameField)) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }

  return "";
}

function resolveApiAssetUrl(path: string): string {
  const p = path.trim();
  if (!p) return "";
  if (p.startsWith("http://") || p.startsWith("https://")) return p;
  const normalized = p.startsWith("/") ? p : `/${p}`;
  return `${SERVER_ASSET_ORIGIN}${normalized}`;
}

function pickPetDefAvatarUrl(row: Record<string, unknown>): string | undefined {
  const topIcon = pickNonEmptyString(row.icon);
  if (topIcon) {
    return resolveApiAssetUrl(topIcon);
  }

  const display = row.display;
  if (!isRecord(display)) return undefined;

  const rel = pickNonEmptyString(display.thumbnail, display.icon, display.cover);
  return rel ? resolveApiAssetUrl(rel) : undefined;
}

function pickPetRewardAvatarUrl(...rows: Record<string, unknown>[]): string | undefined {
  for (const row of rows) {
    const direct = pickNonEmptyString(
      row.avatarUrl,
      row.avatar_url,
      row.avatar,
      row.icon,
      row.image,
      row.thumbnail,
      row.cover,
      row.skeletonUrl,
      row.skeleton_url,
      row.assetUrl,
      row.asset_url,
    );
    if (direct) {
      return resolveApiAssetUrl(direct);
    }

    const display = row.display;
    if (!isRecord(display)) continue;

    const rel = pickNonEmptyString(
      display.avatarUrl,
      display.avatar_url,
      display.thumbnail,
      display.icon,
      display.image,
      display.cover,
      display.skeletonUrl,
      display.skeleton_url,
      display.assetUrl,
      display.asset_url,
    );
    if (rel) {
      return resolveApiAssetUrl(rel);
    }
  }

  return undefined;
}

function normalizePetDefRows(rows: unknown[]): PetDefNormalized[] {
  const list: PetDefNormalized[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!isRecord(row)) continue;

    const localizedName = pickLocalizedPetName(row.name);
    const petKey = pickNonEmptyString(
      row.petKey,
      row.pet_id,
      row.petId,
      row.key,
      row.code,
      row.slug,
    );
    const displayName = pickNonEmptyString(
      row.name_plain,
      row.petName,
      localizedName,
      row.title,
      row.displayName,
      petKey,
    );
    if (!petKey && !displayName) continue;

    const rarity =
      pickNonEmptyString(row.rarity, row.rarityGrade, row.grade, row.rarityLevel) || undefined;
    const id = pickNonEmptyString(row.id, row.petId) || `${petKey || displayName}-${i}`;
    const avatarUrl = pickPetDefAvatarUrl(row);

    list.push({
      id,
      petKey: petKey || displayName,
      displayName: displayName || petKey,
      rarity,
      ...(avatarUrl ? { avatarUrl } : {}),
    });
  }

  return list;
}

function normalizePetDefsResponse(raw: unknown): PetDefsListNormalized {
  let total: number | undefined;

  const rows = extractPetDefsRows(raw);

  if (isRecord(raw)) {
    total =
      typeof raw.total === "number"
        ? raw.total
        : typeof raw.count === "number"
          ? raw.count
          : typeof raw.totalElements === "number"
            ? raw.totalElements
            : undefined;
  }

  const list = normalizePetDefRows(rows);

  return {
    list,
    total: typeof total === "number" ? total : list.length,
  };
}

function normalizePetEggHatchResponse(raw: unknown): PetEggHatchResponse {
  const source = isRecord(raw) ? raw : {};
  const petRecords = [
    source.pet,
    source.rewardPet,
    source.reward_pet,
    source.petDef,
    source.pet_def,
    source.reward,
    source,
  ].filter(isRecord);
  const petValues = (key: string) => petRecords.map((item) => item[key]);
  const localizedName = pickNonEmptyString(...petRecords.map((item) => pickLocalizedPetName(item.name)));
  const petKey = pickNonEmptyString(
    ...petValues('petKey'),
    ...petValues('pet_key'),
    ...petValues('pet_id'),
    ...petValues('petId'),
    ...petValues('key'),
    ...petValues('code'),
    ...petValues('slug'),
  );
  const name = pickNonEmptyString(
    ...petValues('petName'),
    ...petValues('pet_name'),
    localizedName,
    ...petValues('name_plain'),
    ...petValues('displayName'),
    ...petValues('display_name'),
    ...petValues('title'),
    petKey,
  );
  const petId = pickNonEmptyString(...petValues('petId'), ...petValues('pet_id'), ...petValues('id'), petKey, name);
  const avatarUrl = pickPetRewardAvatarUrl(...petRecords);
  const rarity = pickNonEmptyString(
    ...petValues('rarity'),
    ...petValues('rarityGrade'),
    ...petValues('rarity_grade'),
    ...petValues('grade'),
    ...petValues('rarityLevel'),
    ...petValues('rarity_level'),
  ) || undefined;
  const balanceBefore = pickFiniteNumber(source.balanceBefore, source.balance_before);
  const balanceAfter = pickFiniteNumber(source.balanceAfter, source.balance_after);

  return {
    cost: pickFiniteNumber(source.cost, source.actualCost, source.actual_cost) ?? 0,
    refund: pickFiniteNumber(source.refund, source.refundAmount, source.refund_amount) ?? 0,
    isDuplicate: Boolean(source.isDuplicate ?? source.is_duplicate),
    pet: {
      petId,
      ...(petKey ? { petKey } : {}),
      ...(rarity ? { rarity } : {}),
      ...(name ? { name } : {}),
      ...(avatarUrl ? { avatarUrl } : {}),
    },
    ...(balanceBefore !== undefined ? { balanceBefore } : {}),
    ...(balanceAfter !== undefined ? { balanceAfter } : {}),
  };
}

/** 从分页或嵌套结构中取出最长的数组，避免误选空的 list 而忽略有数据的字段（如 records）。 */
function extractPetDefsRows(raw: unknown): unknown[] {
  const ARRAY_KEYS = [
    "list",
    "records",
    "items",
    "content",
    "results",
    "rows",
    "pets",
    "defs",
    "data",
  ] as const;

  const candidates: unknown[][] = [];

  const pushIfArray = (value: unknown) => {
    if (Array.isArray(value)) candidates.push(value);
  };

  if (Array.isArray(raw)) {
    return raw;
  }

  if (!isRecord(raw)) {
    return [];
  }

  for (const key of ARRAY_KEYS) {
    pushIfArray(raw[key]);
  }

  const dataVal = raw.data;
  if (dataVal !== undefined && dataVal !== raw) {
    if (Array.isArray(dataVal)) {
      pushIfArray(dataVal);
    } else if (isRecord(dataVal)) {
      for (const key of ARRAY_KEYS) {
        pushIfArray(dataVal[key]);
      }
    }
  }

  if (!candidates.length) {
    return [];
  }

  return candidates.reduce((best, cur) => (cur.length > best.length ? cur : best));
}

function normalizeRarityLabel(value: unknown) {
  const raw = String(value ?? "").trim();
  const upper = raw.toUpperCase();
  return RARITY_LABEL_BY_VALUE[upper] ?? RARITY_LABEL_BY_VALUE[raw] ?? raw;
}

function toPercentValue(value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.endsWith("%")) return trimmed;

    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) {
      return `${(parsed <= 1 ? parsed * 100 : parsed).toFixed(2)}%`;
    }
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return `${(value <= 1 ? value * 100 : value).toFixed(2)}%`;
  }

  return "0.00%";
}

const GACHA_PROB_SORT_ORDER: PetRarityGrade[] = [
  PetRarityGrade.SSS,
  PetRarityGrade.SS,
  PetRarityGrade.S,
  PetRarityGrade.A,
  PetRarityGrade.B,
  PetRarityGrade.C,
];

function sortGachaProbabilityRows(rows: PetGachaProbabilityRow[]): PetGachaProbabilityRow[] {
  const rank = new Map(GACHA_PROB_SORT_ORDER.map((grade, index) => [grade, index]));
  return [...rows].sort((a, b) => {
    const ga = normalizePetRarityGrade(a.rarity);
    const gb = normalizePetRarityGrade(b.rarity);
    return (rank.get(ga) ?? 999) - (rank.get(gb) ?? 999);
  });
}

function normalizeGachaProbabilityRows(input: unknown): PetGachaProbabilityRow[] {
  const candidateKeys = [
    "probabilities",
    "probability",
    "rates",
    "rarityRates",
    "rarityProbabilities",
    "rarity_weights",
    "rarityWeights",
    "poolRates",
    "dropRates",
    "items",
    "list",
    "rarities",
  ];
  const source = isRecord(input)
    ? candidateKeys.map((key) => input[key]).find((value) => value !== undefined) ?? input
    : input;

  if (Array.isArray(source)) {
    return source.map((item, index) => {
      if (!isRecord(item)) {
        const rarity = index + 1;
        return {
          rarity,
          label: normalizeRarityLabel(rarity),
          value: toPercentValue(item),
        };
      }

      const rarity = item.rarity ?? item.rarityLevel ?? item.grade ?? item.level ?? item.key ?? item.label ?? item.name ?? index + 1;
      const probability = item.probability ?? item.rate ?? item.percent ?? item.value ?? item.prob;
      const label = item.label ?? item.name ?? normalizeRarityLabel(rarity);

      return {
        rarity: rarity as string | number,
        label: normalizeRarityLabel(label),
        value: toPercentValue(probability),
      };
    });
  }

  if (isRecord(source)) {
    return Object.entries(source).map(([rarity, value]) => {
      const probability = isRecord(value)
        ? value.probability ?? value.rate ?? value.percent ?? value.value ?? value.prob
        : value;

      return {
        rarity,
        label: normalizeRarityLabel(rarity),
        value: toPercentValue(probability),
      };
    });
  }

  return [];
}

function normalizePetGachaConfig(input: unknown): PetGachaConfigResponse {
  if (!isRecord(input)) {
    return { probabilities: [] };
  }

  const cost =
    typeof input.cost === "number"
      ? input.cost
      : typeof input.base_cost === "number"
        ? input.base_cost
        : undefined;

  return {
    cost,
    probabilities: sortGachaProbabilityRows(normalizeGachaProbabilityRows(input)),
  };
}

async function invalidatePetQueries(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries(PET_EQUIP_QUERY_KEY),
    queryClient.invalidateQueries(PET_OWNED_QUERY_KEY),
    queryClient.invalidateQueries(PET_STAMINA_QUERY_KEY),
    queryClient.invalidateQueries(PET_STATUS_QUERY_KEY),
    queryClient.invalidateQueries(COIN_ME_QUERY_KEY),
  ]);
}

function normalizePetEquipInfo(raw: unknown): PetEquipInfo {
  if (!isRecord(raw)) {
    return { petId: '' };
  }

  const nestedPet = isRecord(raw.pet) ? raw.pet : undefined;
  const avatarRaw = pickNonEmptyString(raw.icon, raw.image, nestedPet?.icon, nestedPet?.image);
  const avatarUrl = avatarRaw ? resolveApiAssetUrl(avatarRaw) : undefined;
  const petId = pickValidPetId(raw.petId, nestedPet?.petId, nestedPet?.id);
  const petKey = pickNonEmptyString(raw.petKey, nestedPet?.petKey, nestedPet?.petCode);
  const petName = pickNonEmptyString(raw.petName, nestedPet?.name);
  const rarityRaw = pickValidPetRarity(raw.rarityKey, raw.rarity, nestedPet?.rarityKey, nestedPet?.rarity);
  const levelRaw = raw.level ?? nestedPet?.level;
  const abilityDescriptions = normalizePetAbilityDescriptions(raw.abilityDescriptions) ?? normalizePetAbilityDescriptions(nestedPet?.abilityDescriptions);
  const abilities = normalizePetAbilities(raw.abilities) ?? normalizePetAbilities(nestedPet?.abilities);

  return {
    petId: petId || '',
    petKey: petKey || undefined,
    petName: petName || undefined,
    rarity: rarityRaw ? normalizePetRarityGrade(rarityRaw) : undefined,
    level: typeof levelRaw === 'number' && Number.isFinite(levelRaw) ? levelRaw : undefined,
    equippedAt: typeof raw.equippedAt === 'number' ? raw.equippedAt : undefined,
    equipDayName: typeof raw.equipDayName === 'number' ? raw.equipDayName : undefined,
    ...(abilities ? { abilities } : {}),
    ...(abilityDescriptions ? { abilityDescriptions } : {}),
    icon: avatarUrl,
    image: avatarUrl,
  };
}

function normalizePetAbilityDescriptions(raw: unknown): PetAbilityDescription[] | undefined {
  if (!Array.isArray(raw)) return undefined;

  const rows = raw
    .filter(isRecord)
    .flatMap((item) => {
      const description = pickNonEmptyString(item.description);
      if (!description) return [];

      return [{
        description,
        ...(typeof item.enabled === 'boolean' ? { enabled: item.enabled } : {}),
        ...(pickNonEmptyString(item.featureKey, item.feature_key) ? { featureKey: pickNonEmptyString(item.featureKey, item.feature_key) } : {}),
        ...(pickNonEmptyString(item.name) ? { name: pickNonEmptyString(item.name) } : {}),
      }];
    });

  return rows.length ? rows : undefined;
}

function normalizePetAbilities(raw: unknown): Record<string, unknown> | undefined {
  return isRecord(raw) ? raw : undefined;
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
      return normalizePetEquipInfo(assertSuccess(res));
    },
    enabled: Boolean(token),
  });
}

function normalizeOwnedPetItem(raw: unknown, equippedPetId?: string): OwnedPetItem {
  if (!isRecord(raw)) {
    return { petId: '' };
  }

  const nestedPet = isRecord(raw.pet) ? raw.pet : undefined;
  const avatarRaw = pickNonEmptyString(raw.icon, raw.image, nestedPet?.icon, nestedPet?.image);
  const avatarUrl = avatarRaw ? resolveApiAssetUrl(avatarRaw) : undefined;
  const petId = pickNonEmptyString(raw.petId, nestedPet?.petId, nestedPet?.id, raw.id);
  const petKey = pickNonEmptyString(raw.petKey, nestedPet?.petKey, nestedPet?.petCode, raw.petCode);
  const petName = pickNonEmptyString(raw.petName, nestedPet?.name, nestedPet?.petName);
  const rarityRaw = pickNonEmptyString(raw.rarityKey, raw.rarity, nestedPet?.rarityKey, nestedPet?.rarity);
  const levelRaw = raw.level ?? nestedPet?.level;
  const xpRaw = raw.xp ?? nestedPet?.xp;
  const rawEquipped = raw.isEquipped ?? raw.equipped ?? raw.is_equipped;
  const isEquipped =
    typeof rawEquipped === 'boolean'
      ? rawEquipped
      : equippedPetId && petId
        ? String(petId) === equippedPetId
        : undefined;

  return {
    petId: petId || '',
    petKey: petKey || undefined,
    petName: petName || undefined,
    rarity: rarityRaw ? normalizePetRarityGrade(rarityRaw) : undefined,
    level: typeof levelRaw === 'number' && Number.isFinite(levelRaw) ? levelRaw : undefined,
    xp: typeof xpRaw === 'number' && Number.isFinite(xpRaw) ? xpRaw : undefined,
    isEquipped,
    obtainedAt: typeof raw.obtainedAt === 'number' ? raw.obtainedAt : undefined,
    ...(avatarUrl ? { icon: avatarUrl, image: avatarUrl } : {}),
  };
}

function normalizePetOwnedResponse(raw: unknown): PetOwnedResponse {
  if (!isRecord(raw)) {
    return { list: [] };
  }

  const equippedPetId = pickNonEmptyString(raw.equippedPetId, raw.equipped_pet_id);
  const listRows = Array.isArray(raw.list)
    ? raw.list
    : Array.isArray(raw.items)
      ? raw.items
      : Array.isArray(raw.records)
        ? raw.records
        : [];

  const list = listRows
    .map((item) => normalizeOwnedPetItem(item, equippedPetId || undefined))
    .filter((item) => item.petId);

  if (equippedPetId && !list.some((item) => item.isEquipped)) {
    for (const item of list) {
      if (String(item.petId) === equippedPetId) {
        item.isEquipped = true;
        break;
      }
    }
  }

  return {
    equippedPetId: equippedPetId || undefined,
    list,
  };
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
      return normalizePetOwnedResponse(assertSuccess(res));
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

export function useRequestPetGachaConfig() {
  return useQuery<PetGachaConfigResponse>({
    queryKey: PET_GACHA_CONFIG_QUERY_KEY,
    queryFn: async () => {
      const res = await axiosCustom({
        method: "get",
        cmd: API_Pet_Gacha_Config,
        headers: getAuthorizationHeaders(),
      });
      return normalizePetGachaConfig(assertSuccess<unknown>(res));
    },
  });
}

export function useRequestPetDefs(params: { page?: number; size?: number } = {}) {
  const page = params.page ?? 1;
  const size = params.size ?? 200;

  return useQuery<PetDefsListNormalized>({
    queryKey: [...PET_DEFS_QUERY_KEY, page, size],
    queryFn: async () => {
      const res = await axiosCustom({
        method: "get",
        cmd: API_Pet_Defs,
        params: { page, size },
        headers: getAuthorizationHeaders(),
      });
      return normalizePetDefsResponse(assertSuccess<unknown>(res));
    },
  });
}

export function useRequestPetEquipUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["requestPetEquipUpdate"],
    mutationFn: async (payload: PetEquipPayload) => {
      const data = "petId" in payload
        ? { petId: payload.petId }
        : { petKey: payload.petKey };

      const res = await axiosCustom({
        method: "post",
        cmd: API_Pet_Equip,
        data,
        headers: {
          ...getAuthorizationHeaders(),
          "Content-Type": "application/json",
        },
      });
      const result = assertSuccess<PetEquipMutationResponse>(res);
      const normalizedPet = normalizePetEquipInfo(result);
      return {
        ...result,
        pet: normalizedPet.petId ? normalizedPet : normalizePetEquipInfo(result.pet),
      };
    },
    onSuccess: async (result, payload) => {
      queryClient.setQueryData<PetEquipInfo | undefined>(PET_EQUIP_QUERY_KEY, result.pet);
      queryClient.setQueryData<PetOwnedResponse | undefined>(PET_OWNED_QUERY_KEY, (current) => {
        if (!current?.list?.length) return current;

        const matchedPetId = String(result.pet.petId);
        const matchedPetKey =
          'petKey' in payload ? payload.petKey : result.pet.petKey;

        return {
          ...current,
          equippedPetId: result.pet.petId,
          list: current.list.map((item) => {
            const isTarget =
              String(item.petId) === matchedPetId ||
              (!!matchedPetKey && item.petKey === matchedPetKey);

            return {
              ...item,
              isEquipped: isTarget,
              petKey: isTarget ? (result.pet.petKey ?? item.petKey) : item.petKey,
              petName: isTarget ? (result.pet.petName ?? item.petName) : item.petName,
              rarity: isTarget ? (result.pet.rarity ?? item.rarity) : item.rarity,
              level: isTarget ? (result.pet.level ?? item.level) : item.level,
            };
          }),
        };
      });

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
      return normalizePetEggHatchResponse(assertSuccess<unknown>(res));
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
