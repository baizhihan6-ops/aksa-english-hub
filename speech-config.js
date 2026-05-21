// Public frontend config. Do not put provider secrets in this file.
// Set this after deploying the backend, for example:
// window.AKSA_SPEECH_API_URL = 'https://your-domain.example.com/api/pronunciation';
(function() {
  var renderApi = 'https://aksa-speech.onrender.com/api/pronunciation/';
  var host = window.location.hostname;
  var isLocal = !host || host === 'localhost' || host === '127.0.0.1';
  var isGithubPages = host.endsWith('.github.io');
  var defaultApi = (!isLocal && !isGithubPages) ? '/api/pronunciation/' : renderApi;
  window.AKSA_SPEECH_API_URL = window.AKSA_SPEECH_API_URL || defaultApi;
})();
