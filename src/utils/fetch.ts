import { CacheStorage } from './CacheStorage';

export interface onProgressCallback {
  (loaded: number, total: number, progress: number): void;
}

export interface fetchOptions {
  cache?: CacheStorage;
  onProgress?: onProgressCallback;
}

function getContentLength(response: Response) {
  if (!response.headers) return 0;
  return +(response.headers.get('Content-Length') || 0);
}

function calculateProgress(loaded: number, total: number, done: boolean, t0: number, estimatedDuration = 5) {
  if (done) return 1;
  if (total) return loaded / total;
  if (t0) return 1 - Math.exp((-1 * (Date.now() - t0)) / 1000 / estimatedDuration);
  return 0;
}

export async function fetch(url: string, options?: fetchOptions) {
  // shall we directly fetch from network or check cache first?
  const response = await (options?.cache ? options.cache.fetch(url) : window.fetch(url));

  // is the response valid?
  if (!response || !response.ok || !response.body) {
    return undefined;
  }
  // do we need to report download progress?
  else if (!options?.onProgress) {
    return response.blob();
  } else {
    const reader = response.body.getReader();
    const total = getContentLength(response);
    const t0 = total ? 0 : Date.now();
    let loaded = 0;

    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();

      if (value) {
        chunks.push(value);
        loaded += value.length;
      }

      options.onProgress(loaded, total, calculateProgress(loaded, total, done, t0));

      if (done) break;
    }

    const type = response.headers.get('Content-Type') || '';
    return new Blob(chunks, { type });
  }
}
