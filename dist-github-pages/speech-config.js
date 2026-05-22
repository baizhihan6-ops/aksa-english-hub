// GitHub Pages frontend config. API routes to Aliyun Function Compute.
// Override: window.AKSA_SPEECH_API_URL = 'https://your-backend.example.com/api/pronunciation';
(function() {
  var aliyunFcHost = 'aksa-enlish-hub-qbhjtlrfvv.cn-hangzhou.fcapp.run';
  var host = window.location.hostname;
  var isLocal = !host || host === 'localhost' || host === '127.0.0.1';
  var isGithubPages = host.endsWith('.github.io');
  var defaultApi;

  if (isLocal || isGithubPages) {
    defaultApi = 'https://' + aliyunFcHost + '/api/pronunciation/';
  } else {
    defaultApi = '/api/pronunciation/';
  }

  window.AKSA_SPEECH_API_URL = window.AKSA_SPEECH_API_URL || defaultApi;
})();
