// ================= CAPACITOR NATIVE SPEECH BRIDGE =================
// Uses Android's native speech recognizer when running as the APK.
// Browser/PWA users stay on the web path defined in index.html.

var isCapacitorApp = false;
var nativeSpeechAvailable = false;
var capRecActive = false;
var capRecListener = null;
var capListeningListener = null;

function getCapSpeechPlugin() {
  try {
    if (typeof Capacitor === 'undefined') return null;
    if (!Capacitor.Plugins || !Capacitor.Plugins.SpeechRecognition) return null;
    return Capacitor.Plugins.SpeechRecognition;
  } catch(e) {
    return null;
  }
}

function setCapStatus(idx, html) {
  var statusEl = document.getElementById('status-' + idx);
  if (statusEl) statusEl.innerHTML = html;
}

function removeCapListener(listener) {
  if (!listener) return;
  Promise.resolve(listener).then(function(handle) {
    if (handle && handle.remove) return handle.remove();
  }).catch(function() {});
}

function cleanupCapListeners() {
  removeCapListener(capRecListener);
  removeCapListener(capListeningListener);
  capRecListener = null;
  capListeningListener = null;
}

function stopCapRecognition() {
  var plugin = getCapSpeechPlugin();
  if (!plugin) return;
  try { plugin.stop(); } catch(e) {}
}

function hideCapPanel(idx) {
  var panel = document.getElementById('memo-' + idx);
  if (panel) {
    panel.style.display = 'none';
    panel.classList.remove('active', 'paused');
  }
  if (memoTimer) {
    clearInterval(memoTimer);
    memoTimer = null;
  }
}

function capFriendlyError(err) {
  var raw = '';
  if (typeof err === 'string') raw = err;
  else if (err && err.message) raw = err.message;
  else if (err && err.errorMessage) raw = err.errorMessage;
  else if (err) raw = String(err);

  if (/missing permission|permission|denied/i.test(raw)) {
    return 'Microphone permission is not enabled. Open Android Settings > Apps > AKSA English Hub > Permissions > Microphone > Allow, then reopen the app.';
  }
  if (/not available|no recognition|no speech/i.test(raw)) {
    return 'Speech recognition is not available on this phone. Install or enable a speech engine such as Google Voice Typing, Samsung Voice Input, Baidu Input or iFlytek.';
  }
  if (/network|server|timeout/i.test(raw)) {
    return 'The phone speech engine reported a network/server error. Try a local/offline speech engine in the keyboard or voice input settings.';
  }
  if (/busy/i.test(raw)) {
    return 'Speech recognition is busy. Close other voice input apps and try again.';
  }
  return raw || 'Speech recognition failed on this device.';
}

function failCapRecording(idx, err) {
  capRecActive = false;
  cleanupCapListeners();
  stopCapRecognition();
  hideCapPanel(idx);
  showRecError(idx, '❌ APK recording failed.<br><br>' + capFriendlyError(err));
}

function ensureCapSpeechReady(plugin) {
  return plugin.available().then(function(result) {
    if (!result || !result.available) {
      throw new Error('Speech recognition service is not available.');
    }
    return plugin.checkPermissions();
  }).then(function(permission) {
    if (permission && permission.speechRecognition === 'granted') return permission;
    if (permission && permission.speechRecognition === 'denied') {
      throw new Error('Microphone permission denied.');
    }
    return plugin.requestPermissions();
  }).then(function(permission) {
    if (!permission || permission.speechRecognition !== 'granted') {
      throw new Error('Microphone permission denied.');
    }
    return true;
  });
}

try {
  if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('SpeechRecognition')) {
    isCapacitorApp = true;
    nativeSpeechAvailable = true;
  }
} catch(e) {
  isCapacitorApp = false;
  nativeSpeechAvailable = false;
}

var _origHasSpeechRecognition = hasSpeechRecognition;
hasSpeechRecognition = function() {
  if (nativeSpeechAvailable) return true;
  return _origHasSpeechRecognition();
};

var _origIsIOS = isIOS;
isIOS = function() {
  if (isCapacitorApp) return false;
  return _origIsIOS();
};

var _origOpenMemoUI = openMemoUI;
openMemoUI = function(idx, targetWord) {
  if (!nativeSpeechAvailable) {
    _origOpenMemoUI(idx, targetWord);
    return;
  }

  closeAllMemos();
  activeMemoId = idx;
  memoSeconds = 0;
  memoPaused = false;
  accumulatedTranscript = '';

  var panel = document.getElementById('memo-' + idx);
  if (!panel) {
    showRecError(idx, '❌ Recording panel not found. Please refresh the app.');
    return;
  }
  panel.style.display = 'flex';
  panel.classList.add('active');

  var timerEl = document.getElementById('timer-' + idx);
  var pauseBtn = document.getElementById('btn-pause-' + idx);
  if (timerEl) timerEl.innerText = '00:00';
  if (pauseBtn) pauseBtn.innerText = '⏸';
  setCapStatus(idx, '<span class="status-dot" style="background:#0f0"></span> REQUESTING MIC...');

  memoTimer = setInterval(function() {
    if (!memoPaused) {
      memoSeconds++;
      var t = document.getElementById('timer-' + idx);
      if (t) t.innerText = formatTime(memoSeconds);
    }
  }, 1000);

  startRecognition(idx);
};

var _origStartRecognition = startRecognition;
startRecognition = function(idx) {
  if (!nativeSpeechAvailable) {
    _origStartRecognition(idx);
    return;
  }

  var plugin = getCapSpeechPlugin();
  var recId = (idx !== undefined) ? idx : activeMemoId;
  if (!plugin) {
    failCapRecording(recId, 'SpeechRecognition plugin not loaded.');
    return;
  }

  capRecActive = true;
  setCapStatus(recId, '<span class="status-dot" style="background:#0f0"></span> CHECKING...');

  ensureCapSpeechReady(plugin).then(function() {
    cleanupCapListeners();

    capRecListener = plugin.addListener('partialResults', function(data) {
      if (!capRecActive) return;
      if (data && data.matches && data.matches.length > 0) {
        accumulatedTranscript = data.matches[0] + ' ';
        setCapStatus(recId, '<span class="status-dot" style="background:#0f0"></span> ' + data.matches[0].substring(0, 28));
      }
    });

    capListeningListener = plugin.addListener('listeningState', function(data) {
      if (!capRecActive || !data) return;
      if (data.status === 'started') {
        setCapStatus(recId, '<span class="status-dot" style="background:#0f0"></span> SPEAK NOW');
      }
      if (data.status === 'stopped' && !memoPaused) {
        setCapStatus(recId, '<span class="status-dot"></span> TAP STOP');
      }
    });

    setCapStatus(recId, '<span class="status-dot" style="background:#0f0"></span> STARTING...');
    return plugin.start({
      language: 'en-US',
      maxResults: 1,
      partialResults: true,
      popup: false
    });
  }).then(function(result) {
    if (result && result.matches && result.matches.length > 0) {
      accumulatedTranscript = result.matches[0] + ' ';
    }
    setCapStatus(recId, '<span class="status-dot" style="background:#0f0"></span> SPEAK NOW');
  }).catch(function(err) {
    failCapRecording(recId, err);
  });
};

var _origToggleMemoPause = toggleMemoPause;
toggleMemoPause = function(idx) {
  if (!nativeSpeechAvailable) {
    _origToggleMemoPause(idx);
    return;
  }

  var panel = document.getElementById('memo-' + idx);
  var pauseBtn = document.getElementById('btn-pause-' + idx);
  if (!panel) return;

  if (!memoPaused) {
    memoPaused = true;
    capRecActive = false;
    panel.classList.remove('active');
    panel.classList.add('paused');
    if (pauseBtn) pauseBtn.innerText = '▶';
    setCapStatus(idx, 'PAUSE');
    stopCapRecognition();
  } else {
    memoPaused = false;
    panel.classList.remove('paused');
    panel.classList.add('active');
    if (pauseBtn) pauseBtn.innerText = '⏸';
    startRecognition(idx);
  }
};

var _origFinishMemo = finishMemo;
finishMemo = function(idx, targetWord) {
  if (nativeSpeechAvailable) {
    stopCapRecognition();
    setCapStatus(idx, '<span class="status-dot"></span> PROCESSING...');
    setTimeout(function() {
      capRecActive = false;
      cleanupCapListeners();
      _origFinishMemo(idx, targetWord);
    }, 450);
    return;
  }
  _origFinishMemo(idx, targetWord);
};

var _origCloseAllMemos = closeAllMemos;
closeAllMemos = function() {
  if (nativeSpeechAvailable) {
    capRecActive = false;
    cleanupCapListeners();
    stopCapRecognition();
  }
  _origCloseAllMemos();
};
