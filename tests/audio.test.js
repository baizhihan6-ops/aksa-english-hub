const test = require('node:test');
const assert = require('node:assert/strict');

const Audio = require('../audio.js');

test('configures the iPhone audio session for media playback', () => {
  const navigatorLike = { audioSession: { type: 'auto' } };
  assert.equal(Audio.configureAudioSession(navigatorLike), true);
  assert.equal(navigatorLike.audioSession.type, 'playback');
});

test('voice selection prefers British English then any English voice', () => {
  const us = { name: 'US', lang: 'en-US' };
  const gb = { name: 'GB', lang: 'en-GB' };
  assert.equal(Audio.pickVoice([us, gb]), gb);
  assert.equal(Audio.pickVoice([{ lang: 'fr-FR' }, us]), us);
});

test('speech controller retains the utterance and reports its lifecycle', () => {
  const calls = [];
  class FakeUtterance { constructor(text) { this.text = text; } }
  const synth = {
    paused: true,
    getVoices() { return [{ name: 'British', lang: 'en-GB' }]; },
    addEventListener() {},
    resume() { calls.push('resume'); this.paused = false; },
    cancel() { calls.push('cancel'); },
    speak(utterance) { calls.push('speak'); this.last = utterance; utterance.onstart(); }
  };
  const controller = Audio.createController({
    navigator: { audioSession: { type: 'auto' } },
    speechSynthesis: synth,
    SpeechSynthesisUtterance: FakeUtterance
  });
  let ended = false;
  const started = controller.speak('Alternator', { onStart() { calls.push('start'); }, onEnd() { ended = true; } });
  assert.equal(started, true);
  assert.equal(synth.last.lang, 'en-GB');
  assert.equal(synth.last.rate, 0.88);
  assert.equal(synth.last.volume, 1);
  assert.equal(synth.last.voice.name, 'British');
  assert.deepEqual(calls, ['resume', 'speak', 'start']);
  assert.equal(controller.getActiveUtterance(), synth.last);
  synth.last.onend();
  assert.equal(ended, true);
  assert.equal(controller.getActiveUtterance(), null);
});

test('speech errors invoke the error callback and release state', () => {
  class FakeUtterance { constructor(text) { this.text = text; } }
  const synth = { paused: false, getVoices() { return []; }, addEventListener() {}, cancel() {}, speak(utterance) { this.last = utterance; } };
  const controller = Audio.createController({ navigator: {}, speechSynthesis: synth, SpeechSynthesisUtterance: FakeUtterance });
  let errorName = '';
  controller.speak('Test', { onError(error) { errorName = error.error; } });
  synth.last.onerror({ error: 'not-allowed' });
  assert.equal(errorName, 'not-allowed');
  assert.equal(controller.getActiveUtterance(), null);
});
