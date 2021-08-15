export class CacheStorage {
  #cacheName: string;
  #cache?: Cache;

  constructor(cacheName: string) {
    this.#cacheName = cacheName;
  }

  private async getCache() {
    if (!this.#cache) {
      this.#cache = await caches.open(this.#cacheName);
    }
    return this.#cache;
  }

  async fetch(url: string) {
    const cache = await this.getCache();
    const cachedResponse = await cache.match(url);
    if (cachedResponse) return cachedResponse;

    const response = await fetch(url);
    if (response && response.ok) {
      cache.put(url, response.clone());
    }
    return response;
  }
}
