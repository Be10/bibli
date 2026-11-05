export const TTS_AUDIO_CACHE_NAME = "bibli-tts-audio-v1";

const fallbackHash = (value) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
};

const toHex = (buffer) => Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");

export const createTtsCacheMaterial = ({ text, locale, voiceId, modelId, rulesVersion, semanticRole }) =>
  JSON.stringify({
    text: String(text ?? ""),
    locale: String(locale ?? ""),
    voice_id: String(voiceId ?? "default"),
    model_id: String(modelId ?? "default"),
    rules_version: String(rulesVersion ?? "0"),
    semantic_role: String(semanticRole ?? "explanation"),
  });

export const buildTtsCacheKey = async (input) => {
  const material = createTtsCacheMaterial(input);
  try {
    if (globalThis.crypto?.subtle && typeof TextEncoder !== "undefined") {
      const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(material));
      return `tts-${toHex(digest)}`;
    }
  } catch {}
  return `tts-fnv-${fallbackHash(material)}`;
};

export const createTtsAudioCache = ({ cacheName = TTS_AUDIO_CACHE_NAME } = {}) => {
  const supported = () => typeof caches !== "undefined" && typeof location !== "undefined";
  const requestFor = (key) => new Request(new URL(`/__bibli_tts_cache__/${encodeURIComponent(key)}`, location.origin).toString());
  return {
    cacheName,
    supported,
    async get(key) {
      if (!supported()) return null;
      const cache = await caches.open(cacheName);
      const response = await cache.match(requestFor(key));
      return response ? response.blob() : null;
    },
    async put(key, blob, metadata = {}) {
      if (!supported() || !(blob instanceof Blob)) return false;
      const cache = await caches.open(cacheName);
      const headers = new Headers({
        "content-type": blob.type || "audio/mpeg",
        "x-bibli-tts-cache": "1",
        "x-bibli-tts-metadata": encodeURIComponent(JSON.stringify(metadata)),
      });
      await cache.put(requestFor(key), new Response(blob, { headers }));
      return true;
    },
    async delete(key) {
      if (!supported()) return false;
      const cache = await caches.open(cacheName);
      return cache.delete(requestFor(key));
    },
  };
};
