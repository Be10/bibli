import { buildTtsCacheKey, createTtsAudioCache } from "./cache.js";

export const createCachedNeuralTtsProvider = ({ adapter, cache = createTtsAudioCache(), rulesVersion = "0" }) => {
  if (!adapter?.id || typeof adapter.synthesize !== "function") {
    throw new TypeError("A neural TTS adapter with id and synthesize(request) is required");
  }
  const modelId = adapter.modelId ?? "default";
  return {
    id: adapter.id,
    kind: "neural",
    modelId,
    supportsAudioCache: true,
    async prepare(request) {
      const cacheKey = await buildTtsCacheKey({
        text: request.text,
        locale: request.locale,
        voiceId: request.voiceId,
        modelId,
        rulesVersion,
        semanticRole: request.semanticRole,
      });
      const cached = await cache.get(cacheKey);
      if (cached) return { blob: cached, cacheKey, fromCache: true };
      const blob = await adapter.synthesize({ ...request, modelId, cacheKey });
      if (!(blob instanceof Blob)) throw new TypeError("Neural TTS adapter must return a Blob");
      await cache.put(cacheKey, blob, { provider: adapter.id, model: modelId, locale: request.locale, voice: request.voiceId });
      return { blob, cacheKey, fromCache: false };
    },
  };
};
