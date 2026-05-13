// ================= CAPACITOR NATIVE SPEECH BRIDGE =================
// Uses Android's built-in offline speech recognition when running as APK.
// Falls back to Web Speech API when opened in a browser.

var isCapacitorApp = false;
var nativeSpeechAvailable = false;

// Detect if running inside Capacitor WebView
try {
  if (typeof Capacitor !== 'undefined' && Capacitor.isPluginAvailable('SpeechRecognition')) {
    isCapacitorApp = true;
    nativeSpeechAvailable = true;
  }
} catch(e) {
  isCapacitorApp = false;
}

// Override the hasSpeechRecognition check for Capacitor
var _origHasSpeechRecognition = hasSpeechRecognition;
hasSpeechRecognition = function() {
  if (nativeSpeechAvailable) return true;
  return _origHasSpeechRecognition();
};

// Override isIOS to return false in Capacitor (Android APK)
var _origIsIOS = isIOS;
isIOS = function() {
  if (isCapacitorApp) return false;
  return _origIsIOS();
};

// Capacitor-native recording state
var capRecActive = false;
var capRecListener = null;

// Override openMemoUI for Capacitor — skip getUserMedia, go straight to native
var _origOpenMemoUI = openMemoUI;
openMemoUI = function(idx, targetWord) {
  if (!nativeSpeechAvailable) {
    _origOpenMemoUI(idx, targetWord);
    return;
  }
  // Capacitor native path: skip getUserMedia (handled by Android permissions)
  if (!hasSpeechRecognition()) {
    _origOpenMemoUI(idx, targetWord);
    return;
  }
  _origCloseAllMemos();
  activeMemoId = idx;
  memoSeconds = 0;
  memoPaused = false;
  accumulatedTranscript = "";
  var panel = document.getElementById('memo-' + idx);
  if (!panel) { showRecError(idx, '❌ Recording panel not found. Please refresh the page.'); return; }
  panel.style.display = 'flex';
  panel.classList.add('active');
  var timerEl = document.getElementById('timer-' + idx);
  var statusEl = document.getElementById('status-' + idx);
  var pauseBtn = document.getElementById('btn-pause-' + idx);
  if (timerEl) timerEl.innerText = "00:00";
  if (statusEl) statusEl.innerHTML = '<span class="status-dot" style="background:#0f0"></span> REQUESTING MIC...';
  if (pauseBtn) pauseBtn.innerText = '⏸';
  // Skip getUserMedia — native plugin handles permissions via Android
  memoTimer = setInterval(function() {
    if (!memoPaused) {
      memoSeconds++;
      var t = document.getElementById('timer-' + idx);
      if (t) t.innerText = formatTime(memoSeconds);
    }
  }, 1000);
  startRecognition(idx);
};

// Override startRecognition for Capacitor
var _origStartRecognition = startRecognition;
startRecognition = function(idx) {
  if (!nativeSpeechAvailable) {
    _origStartRecognition(idx);
    return;
  }
  // Use native Android speech recognition (offline, no Google servers needed)
  var recId = (idx !== undefined) ? idx : activeMemoId;
  var capturedId = recId;
  var hasStarted = false;
  capRecActive = true;

  // Update UI
  var statusEl = document.getElementById('status-' + capturedId);
  if (statusEl) statusEl.innerHTML = '<span class="status-dot" style="background:#0f0"></span> NATIVE REC ●';

  try {
    Capacitor.Plugins.SpeechRecognition.start({
      language: 'en-US',
      maxResults: 1,
      partialResults: true,
      popup: false  // No Google popup — uses system engine
    }).then(function() {
      // Started successfully
      hasStarted = true;
      if (statusEl) statusEl.innerHTML = '<span class="status-dot" style="background:#0f0"></span> SPEAK NOW';
    }).catch(function(err) {
      // Failed — fall back to Web Speech API
      nativeSpeechAvailable = false;
      _origStartRecognition(idx);
    });

    // Listen for partial results
    capRecListener = Capacitor.Plugins.SpeechRecognition.addListener('partialResults', function(data) {
      if (!capRecActive) return;
      if (data && data.matches && data.matches.length > 0) {
        accumulatedTranscript += data.matches[0] + ' ';
        if (statusEl) statusEl.innerHTML = '<span class="status-dot" style="background:#0f0"></span> ' + data.matches[0].substring(0, 28);
      }
    });

  } catch(e) {
    nativeSpeechAvailable = false;
    _origStartRecognition(idx);
  }
};

// Override stopAll for Capacitor
var _origStopAll = stopAll;
var _capOrigStopAll = function() {
  if (capRecActive && nativeSpeechAvailable) {
    capRecActive = false;
    if (capRecListener) { capRecListener.remove(); capRecListener = null; }
    try { Capacitor.Plugins.SpeechRecognition.stop(); } catch(e) {}
  }
};

// Override toggleMemoPause for Capacitor
var _origToggleMemoPause = toggleMemoPause;
toggleMemoPause = function(idx) {
  if (!nativeSpeechAvailable || !capRecActive) {
    _origToggleMemoPause(idx);
    return;
  }
  var panel = document.getElementById('memo-' + idx);
  var pauseBtn = document.getElementById('btn-pause-' + idx);
  var statusTxt = document.getElementById('status-' + idx);
  if (!panel) return;
  if (!memoPaused) {
    memoPaused = true;
    capRecActive = false;
    panel.classList.remove('active');
    panel.classList.add('paused');
    if (pauseBtn) pauseBtn.innerText = '▶';
    if (statusTxt) statusTxt.innerHTML = 'PAUSE';
    try { Capacitor.Plugins.SpeechRecognition.stop(); } catch(e) {}
  } else {
    memoPaused = false;
    capRecActive = true;
    panel.classList.remove('paused');
    panel.classList.add('active');
    if (pauseBtn) pauseBtn.innerText = '⏸';
    if (statusTxt) statusTxt.innerHTML = '<span class="status-dot" style="background:#0f0"></span> NATIVE REC ●';
    startRecognition(idx);
  }
};

// Override finishMemo for Capacitor
var _origFinishMemo = finishMemo;
finishMemo = function(idx, targetWord) {
  if (nativeSpeechAvailable && capRecActive) {
    capRecActive = false;
    if (capRecListener) { capRecListener.remove(); capRecListener = null; }
    try { Capacitor.Plugins.SpeechRecognition.stop(); } catch(e) {}
  }
  _origFinishMemo(idx, targetWord);
};

// Override closeAllMemos for Capacitor
var _origCloseAllMemos = closeAllMemos;
closeAllMemos = function() {
  if (capRecActive) {
    capRecActive = false;
    if (capRecListener) { capRecListener.remove(); capRecListener = null; }
    try { Capacitor.Plugins.SpeechRecognition.stop(); } catch(e) {}
  }
  _origCloseAllMemos();
};
