(function(root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AKSAAudio = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  function configureAudioSession(navigatorLike) {
    if (!navigatorLike || !navigatorLike.audioSession) return false;
    try {
      navigatorLike.audioSession.type = 'playback';
      return navigatorLike.audioSession.type === 'playback';
    } catch (error) {
      return false;
    }
  }

  function pickVoice(voices) {
    var list = Array.isArray(voices) ? voices : [];
    return list.find(function(voice) { return String(voice.lang).toLowerCase() === 'en-gb'; }) ||
      list.find(function(voice) { return /^en(?:-|$)/i.test(String(voice.lang)); }) || null;
  }

  function createController(env) {
    var host = env || {};
    var synth = host.speechSynthesis;
    var Utterance = host.SpeechSynthesisUtterance;
    var voices = [];
    var active = null;
    var activeCallbacks = null;

    function refreshVoices() {
      voices = synth && typeof synth.getVoices === 'function' ? synth.getVoices() : [];
      return voices;
    }

    if (synth && typeof synth.addEventListener === 'function') synth.addEventListener('voiceschanged', refreshVoices);
    refreshVoices();

    function release(utterance, type, event) {
      if (active !== utterance) return;
      var callbacks = activeCallbacks || {};
      active = null;
      activeCallbacks = null;
      if (type === 'end' && callbacks.onEnd) callbacks.onEnd(event);
      if (type === 'error' && callbacks.onError) callbacks.onError(event || { error: 'unknown' });
      if (type === 'cancel' && callbacks.onCancel) callbacks.onCancel();
    }

    function cancel() {
      var utterance = active;
      if (synth && typeof synth.cancel === 'function') synth.cancel();
      if (utterance) release(utterance, 'cancel');
    }

    function speak(text, callbacks) {
      var handlers = callbacks || {};
      if (!synth || !Utterance || typeof synth.speak !== 'function') {
        if (handlers.onError) handlers.onError({ error: 'unsupported' });
        return false;
      }
      if (active) cancel();
      configureAudioSession(host.navigator);
      var utterance = new Utterance(String(text));
      utterance.lang = 'en-GB';
      utterance.rate = .88;
      utterance.pitch = 1;
      utterance.volume = 1;
      var voice = pickVoice(voices.length ? voices : refreshVoices());
      if (voice) utterance.voice = voice;
      active = utterance;
      activeCallbacks = handlers;
      utterance.onstart = function(event) { if (active === utterance && handlers.onStart) handlers.onStart(event); };
      utterance.onend = function(event) { release(utterance, 'end', event); };
      utterance.onerror = function(event) { release(utterance, 'error', event); };
      if (synth.paused && typeof synth.resume === 'function') synth.resume();
      synth.speak(utterance);
      return true;
    }

    return {
      speak: speak,
      cancel: cancel,
      refreshVoices: refreshVoices,
      isAvailable: function() { return Boolean(synth && Utterance && typeof synth.speak === 'function'); },
      getActiveUtterance: function() { return active; }
    };
  }

  return {
    configureAudioSession: configureAudioSession,
    pickVoice: pickVoice,
    createController: createController
  };
});
