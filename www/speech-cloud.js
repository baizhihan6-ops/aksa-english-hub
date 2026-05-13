// Cloud pronunciation recorder for AKSA English Hub.
// Enabled only when AKSA_SPEECH_API_URL or localStorage.aksaSpeechApiUrl is set.

(function() {
  var previousOpenMemoUI = window.openMemoUI;
  var previousFinishMemo = window.finishMemo;
  var previousToggleMemoPause = window.toggleMemoPause;
  var previousCloseAllMemos = window.closeAllMemos;
  var previousUpdateSpeechStatus = window.updateSpeechStatus;

  var cloudMode = false;
  var cloudCtx = null;
  var cloudStream = null;
  var cloudSource = null;
  var cloudProcessor = null;
  var cloudBuffers = [];
  var cloudInputRate = 16000;

  function getSpeechApiUrl() {
    var stored = '';
    try { stored = localStorage.getItem('aksaSpeechApiUrl') || ''; } catch(e) {}
    return (stored || window.AKSA_SPEECH_API_URL || '').trim();
  }

  window.getSpeechApiUrl = getSpeechApiUrl;
  window.shouldUseCloudSpeech = function() {
    return !!getSpeechApiUrl();
  };

  function setStatus(idx, html) {
    var statusEl = document.getElementById('status-' + idx);
    if (statusEl) statusEl.innerHTML = html;
  }

  function stopCloudCapture() {
    if (cloudProcessor) {
      try { cloudProcessor.disconnect(); } catch(e) {}
      cloudProcessor.onaudioprocess = null;
      cloudProcessor = null;
    }
    if (cloudSource) {
      try { cloudSource.disconnect(); } catch(e) {}
      cloudSource = null;
    }
    if (cloudStream) {
      cloudStream.getTracks().forEach(function(track) { track.stop(); });
      cloudStream = null;
    }
    if (cloudCtx) {
      try { cloudCtx.close(); } catch(e) {}
      cloudCtx = null;
    }
  }

  function flattenBuffers(buffers) {
    var length = buffers.reduce(function(total, buffer) { return total + buffer.length; }, 0);
    var result = new Float32Array(length);
    var offset = 0;
    buffers.forEach(function(buffer) {
      result.set(buffer, offset);
      offset += buffer.length;
    });
    return result;
  }

  function downsampleBuffer(input, inputRate, outputRate) {
    if (outputRate === inputRate) return input;
    var ratio = inputRate / outputRate;
    var outputLength = Math.max(1, Math.round(input.length / ratio));
    var output = new Float32Array(outputLength);
    for (var i = 0; i < outputLength; i++) {
      var start = Math.floor(i * ratio);
      var end = Math.min(input.length, Math.floor((i + 1) * ratio));
      var sum = 0;
      var count = 0;
      for (var j = start; j < end; j++) {
        sum += input[j];
        count++;
      }
      output[i] = count ? sum / count : 0;
    }
    return output;
  }

  function encodeWav(samples, sampleRate) {
    var bytesPerSample = 2;
    var blockAlign = bytesPerSample;
    var buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
    var view = new DataView(buffer);

    function writeString(offset, value) {
      for (var i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
    }

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * bytesPerSample, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, samples.length * bytesPerSample, true);

    var offset = 44;
    for (var s = 0; s < samples.length; s++, offset += 2) {
      var sample = Math.max(-1, Math.min(1, samples[s]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    }
    return new Blob([view], { type: 'audio/wav' });
  }

  function blobToDataUrl(blob) {
    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onload = function() { resolve(reader.result); };
      reader.onerror = function() { reject(reader.error || new Error('Failed to read audio.')); };
      reader.readAsDataURL(blob);
    });
  }

  function startTimer(idx) {
    memoTimer = setInterval(function() {
      if (!memoPaused) {
        memoSeconds++;
        var timerEl = document.getElementById('timer-' + idx);
        if (timerEl) timerEl.innerText = formatTime(memoSeconds);
      }
    }, 1000);
  }

  function showCloudError(idx, message) {
    var panel = document.getElementById('memo-' + idx);
    if (panel) {
      panel.style.display = 'none';
      panel.classList.remove('active', 'paused');
    }
    showRecError(idx, 'X Cloud pronunciation failed.<br><br>' + message);
  }

  function beginCloudCapture(idx) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return Promise.reject(new Error('This browser does not support microphone recording.'));
    }

    return navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        channelCount: 1
      }
    }).then(function(stream) {
      cloudStream = stream;
      cloudCtx = new (window.AudioContext || window.webkitAudioContext)();
      cloudInputRate = cloudCtx.sampleRate || 16000;
      cloudSource = cloudCtx.createMediaStreamSource(stream);
      cloudProcessor = cloudCtx.createScriptProcessor(4096, 1, 1);
      cloudBuffers = [];

      cloudProcessor.onaudioprocess = function(event) {
        if (!cloudMode || memoPaused) return;
        var channel = event.inputBuffer.getChannelData(0);
        cloudBuffers.push(new Float32Array(channel));
      };

      cloudSource.connect(cloudProcessor);
      cloudProcessor.connect(cloudCtx.destination);
      setStatus(idx, '<span class="status-dot" style="background:#0f0"></span> CLOUD REC - SPEAK NOW');
    });
  }

  function finishCloudMemo(idx, targetWord) {
    var panel = document.getElementById('memo-' + idx);
    var resDiv = document.getElementById('res-' + idx);
    var recordedSeconds = memoSeconds;
    var apiUrl = getSpeechApiUrl();
    var samples = flattenBuffers(cloudBuffers);
    var downsampled = downsampleBuffer(samples, cloudInputRate, 16000);
    var wavBlob = encodeWav(downsampled, 16000);

    if (memoTimer) { clearInterval(memoTimer); memoTimer = null; }
    stopCloudCapture();
    cloudMode = false;
    activeMemoId = null;
    memoSeconds = 0;
    memoPaused = false;
    cloudBuffers = [];

    if (panel) {
      panel.style.display = 'none';
      panel.classList.remove('active', 'paused');
    }
    if (!resDiv) return;

    resDiv.style.display = 'block';
    resDiv.className = 'eval-result';
    resDiv.innerHTML = 'Uploading pronunciation...';

    if (recordedSeconds < 1 || wavBlob.size < 1200) {
      resDiv.innerHTML = 'X No speech recorded. Please speak closer to the microphone.';
      resDiv.className = 'eval-result error';
      return;
    }

    blobToDataUrl(wavBlob).then(function(audioDataUrl) {
      return fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetText: targetWord,
          audio: audioDataUrl,
          mimeType: 'audio/wav',
          durationSec: recordedSeconds
        })
      });
    }).then(function(response) {
      return response.json().then(function(body) {
        if (!response.ok) {
          throw new Error(body && body.error ? body.error : 'Speech service returned HTTP ' + response.status);
        }
        return body;
      });
    }).then(function(result) {
      var score = Math.round(Number(result.score || 0));
      var text = result.text || result.transcript || targetWord;
      var detail = [];
      if (result.accuracy != null) detail.push('Accuracy ' + Math.round(result.accuracy));
      if (result.fluency != null) detail.push('Fluency ' + Math.round(result.fluency));
      if (result.standard != null) detail.push('Standard ' + Math.round(result.standard));
      var passed = score >= 75;
      recordWordPractice(passed);
      resDiv.className = passed ? 'eval-result success' : 'eval-result error';
      resDiv.innerHTML = (passed ? 'OK ' : 'Try again ') + score + '/100 [' + formatTime(recordedSeconds) + ']' +
        '<br><small>Target: ' + targetWord + '<br>Result: ' + text + (detail.length ? '<br>' + detail.join(' / ') : '') + '</small>';
    }).catch(function(err) {
      resDiv.innerHTML = 'X Cloud pronunciation failed.<br><br>' + (err && err.message ? err.message : String(err));
      resDiv.className = 'eval-result error';
    });
  }

  window.openMemoUI = function(idx, targetWord) {
    if (!window.shouldUseCloudSpeech()) {
      previousOpenMemoUI(idx, targetWord);
      return;
    }

    closeAllMemos();
    cloudMode = true;
    activeMemoId = idx;
    memoSeconds = 0;
    memoPaused = false;
    accumulatedTranscript = '';
    cloudBuffers = [];

    var panel = document.getElementById('memo-' + idx);
    if (!panel) {
      showRecError(idx, 'X Recording panel not found. Please refresh the page.');
      return;
    }
    panel.style.display = 'flex';
    panel.classList.add('active');

    var timerEl = document.getElementById('timer-' + idx);
    var pauseBtn = document.getElementById('btn-pause-' + idx);
    if (timerEl) timerEl.innerText = '00:00';
    if (pauseBtn) pauseBtn.innerText = 'Pause';
    setStatus(idx, '<span class="status-dot"></span> REQUESTING MIC...');
    startTimer(idx);

    beginCloudCapture(idx).catch(function(err) {
      if (memoTimer) { clearInterval(memoTimer); memoTimer = null; }
      stopCloudCapture();
      cloudMode = false;
      showCloudError(idx, err && err.message ? err.message : String(err));
    });
  };

  window.finishMemo = function(idx, targetWord) {
    if (cloudMode) {
      setStatus(idx, '<span class="status-dot"></span> UPLOADING...');
      finishCloudMemo(idx, targetWord);
      return;
    }
    previousFinishMemo(idx, targetWord);
  };

  window.toggleMemoPause = function(idx) {
    if (!cloudMode) {
      previousToggleMemoPause(idx);
      return;
    }

    var panel = document.getElementById('memo-' + idx);
    var pauseBtn = document.getElementById('btn-pause-' + idx);
    if (!panel) return;

    memoPaused = !memoPaused;
    if (memoPaused) {
      panel.classList.remove('active');
      panel.classList.add('paused');
      if (pauseBtn) pauseBtn.innerText = 'Resume';
      setStatus(idx, 'PAUSE');
    } else {
      panel.classList.remove('paused');
      panel.classList.add('active');
      if (pauseBtn) pauseBtn.innerText = 'Pause';
      setStatus(idx, '<span class="status-dot" style="background:#0f0"></span> CLOUD REC');
    }
  };

  window.closeAllMemos = function() {
    if (cloudMode) {
      stopCloudCapture();
      cloudMode = false;
      cloudBuffers = [];
    }
    previousCloseAllMemos();
  };

  if (typeof previousUpdateSpeechStatus === 'function') {
    window.updateSpeechStatus = function() {
      previousUpdateSpeechStatus();
      if (window.shouldUseCloudSpeech()) {
        var rec = document.getElementById('recStatus');
        if (rec) {
          rec.className = 'status-pill ok';
          rec.innerText = 'Cloud pronunciation ready';
        }
      }
    };
  }
})();
