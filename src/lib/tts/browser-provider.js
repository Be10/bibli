export const BROWSER_TTS_PROVIDER_ID = "browser-web-speech";

export const createBrowserSpeechProvider = (win = globalThis.window) => {
  const synth = win?.speechSynthesis ?? null;
  const Utterance = win?.SpeechSynthesisUtterance ?? null;
  return {
    id: BROWSER_TTS_PROVIDER_ID,
    kind: "browser",
    modelId: "web-speech-native",
    supportsAudioCache: false,
    get available() { return Boolean(synth && Utterance); },
    get paused() { return Boolean(synth?.paused); },
    get speaking() { return Boolean(synth?.speaking); },
    get pending() { return Boolean(synth?.pending); },
    getVoices() { return synth?.getVoices?.() ?? []; },
    cancel() { synth?.cancel?.(); },
    pause() { synth?.pause?.(); },
    resume() { synth?.resume?.(); },
    setVoicesChangedHandler(handler) {
      if (!synth) return () => {};
      synth.addEventListener?.("voiceschanged", handler);
      if ("onvoiceschanged" in synth) synth.onvoiceschanged = handler;
      return () => {
        synth.removeEventListener?.("voiceschanged", handler);
        if (synth.onvoiceschanged === handler) synth.onvoiceschanged = null;
      };
    },
    speak(request) {
      if (!synth || !Utterance) throw new Error("Browser speech provider is unavailable");
      const utterance = new Utterance(request.text);
      utterance.lang = request.language;
      utterance.rate = request.rate;
      utterance.pitch = request.pitch ?? 1;
      utterance.volume = request.volume ?? 1;
      if (request.voice) utterance.voice = request.voice;
      if (request.onStart) utterance.onstart = request.onStart;
      if (request.onEnd) utterance.onend = request.onEnd;
      if (request.onError) utterance.onerror = request.onError;
      synth.speak(utterance);
      return utterance;
    },
  };
};
