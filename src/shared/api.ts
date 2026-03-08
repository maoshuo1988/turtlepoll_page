import { runtimeConfig } from './config/runtime';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions {
  method?: HttpMethod;
  query?: Record<string, string | number | boolean | null | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export class HttpError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(status: number, message: string, payload: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.payload = payload;
  }
}

function buildUrl(baseUrl: string, path: string, query?: RequestOptions['query']): string {
  const url = new URL(path.startsWith('http') ? path : `${baseUrl}${path}`, window.location.origin);
  if (!query) return url.toString();

  Object.entries(query).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    url.searchParams.set(key, String(value));
  });

  return url.toString();
}

async function parseResponsePayload(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  const text = await response.text();
  return text.length > 0 ? text : null;
}

class HttpClient {
  private readonly baseUrl: string;
  private readonly defaultTimeoutMs: number;

  constructor(baseUrl: string, defaultTimeoutMs: number) {
    this.baseUrl = baseUrl;
    this.defaultTimeoutMs = defaultTimeoutMs;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const {
      method = 'GET',
      query,
      body,
      headers,
      timeoutMs = this.defaultTimeoutMs,
      signal,
    } = options;

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);

    if (signal) {
      signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    try {
      const response = await fetch(buildUrl(this.baseUrl, path, query), {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(headers ?? {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });

      const payload = await parseResponsePayload(response);
      if (!response.ok) {
        const message = response.statusText || 'Request failed';
        throw new HttpError(response.status, message, payload);
      }

      return payload as T;
    } finally {
      window.clearTimeout(timer);
    }
  }

  get<T>(path: string, options: Omit<RequestOptions, 'method' | 'body'> = {}) {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  post<T>(path: string, body?: unknown, options: Omit<RequestOptions, 'method' | 'body'> = {}) {
    return this.request<T>(path, { ...options, method: 'POST', body });
  }

  put<T>(path: string, body?: unknown, options: Omit<RequestOptions, 'method' | 'body'> = {}) {
    return this.request<T>(path, { ...options, method: 'PUT', body });
  }

  patch<T>(path: string, body?: unknown, options: Omit<RequestOptions, 'method' | 'body'> = {}) {
    return this.request<T>(path, { ...options, method: 'PATCH', body });
  }

  delete<T>(path: string, options: Omit<RequestOptions, 'method' | 'body'> = {}) {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }
}

const apiClient = new HttpClient(runtimeConfig.apiBaseUrl, runtimeConfig.apiTimeoutMs);

export interface ApiSuccessResponse {
  success: boolean;
}

export interface ApiBalanceResponse extends ApiSuccessResponse {
  balance: number;
}

export interface PredictionDTO {
  id: string;
  title: string;
  summary?: string;
  category?: string;
  oddsA?: number;
  oddsB?: number;
}

export interface VotePayload {
  option: 'A' | 'B';
  amount?: number;
}

export interface ForumPostDTO {
  id: string;
  content: string;
  tag?: string;
  createdAt: string;
  likes: number;
}

export interface CreateForumPostPayload {
  content: string;
  tag: string;
  images?: string[];
}

export interface BattleDTO {
  id: string;
  topic: string;
  optionA: string;
  optionB: string;
  status: 'waiting' | 'active' | 'resolved';
  wager: number;
}

export interface CreateBattlePayload {
  topic: string;
  optionA: string;
  optionB: string;
  side: 'A' | 'B';
  wager: number;
}

export interface ResolveBattlePayload {
  winner: 'A' | 'B';
}

export interface ShopItemDTO {
  id: string;
  name: string;
  price: number;
  stock?: number;
}

export interface BuyShopItemPayload {
  quantity: number;
}

export interface PetStateDTO {
  id: string;
  stamina: number;
  equippedSkinId?: string;
}

export interface UpdatePetStaminaPayload {
  stamina: number;
}

export interface EquipSkinPayload {
  skinId: string;
}

export const apiServices = {
  predictions: {
    list(category?: string) {
      return apiClient.get<PredictionDTO[]>('/predictions', {
        query: { category },
      });
    },
    detail(id: string) {
      return apiClient.get<PredictionDTO>(`/predictions/${id}`);
    },
    vote(id: string, payload: VotePayload) {
      return apiClient.post<ApiSuccessResponse>(`/predictions/${id}/vote`, payload);
    },
  },
  forum: {
    list() {
      return apiClient.get<ForumPostDTO[]>('/forum/posts');
    },
    create(payload: CreateForumPostPayload) {
      return apiClient.post<ForumPostDTO>('/forum/posts', payload);
    },
    like(postId: string) {
      return apiClient.post<ApiSuccessResponse>(`/forum/posts/${postId}/like`);
    },
  },
  battle: {
    list() {
      return apiClient.get<BattleDTO[]>('/battles');
    },
    create(payload: CreateBattlePayload) {
      return apiClient.post<BattleDTO>('/battles', payload);
    },
    accept(battleId: string) {
      return apiClient.post<ApiSuccessResponse>(`/battles/${battleId}/accept`);
    },
    resolve(battleId: string, winner: 'A' | 'B') {
      const payload: ResolveBattlePayload = { winner };
      return apiClient.post<ApiSuccessResponse>(`/battles/${battleId}/resolve`, payload);
    },
  },
  shop: {
    listItems() {
      return apiClient.get<ShopItemDTO[]>('/shop/items');
    },
    buy(itemId: string, quantity = 1) {
      const payload: BuyShopItemPayload = { quantity };
      return apiClient.post<ApiBalanceResponse>(`/shop/items/${itemId}/buy`, payload);
    },
  },
  pet: {
    state() {
      return apiClient.get<PetStateDTO>('/pet/state');
    },
    updateStamina(stamina: number) {
      const payload: UpdatePetStaminaPayload = { stamina };
      return apiClient.patch<PetStateDTO>('/pet/state', payload);
    },
    equipSkin(skinId: string) {
      const payload: EquipSkinPayload = { skinId };
      return apiClient.post<PetStateDTO>('/pet/equip-skin', payload);
    },
  },
} as const;

export type ApiServices = typeof apiServices;
