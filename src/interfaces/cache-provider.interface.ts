export interface CachedResponse {
  response: Record<string, unknown>;
  timestamp: number;
  status: number;
}

export interface CacheProvider {
  get(key: string): Promise<CachedResponse | undefined>;
  set(key: string, value: CachedResponse, ttl: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  size(): Promise<number>;
  keys(): Promise<string[]>;
}
