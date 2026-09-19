(function() {
  'use strict';

  var WORDS = window.AKSA_WORDS || [];
  var PHRASES = window.AKSA_PHRASES || [];
  var LESSONS = window.AKSA_LESSONS || [];
  var TOPIC_BOOTSTRAP = window.AKSA_TOPICS_BOOTSTRAP || { archive: [], days: {}, index: { days: [] } };
  var TOPICS = window.AKSATopics ? window.AKSATopics.flattenBootstrap(TOPIC_BOOTSTRAP) : [];
  var Challenge = window.AKSAChallenge;
  var Profile = window.AKSAProfile;
  var STORE_KEY = 'aksa-english-corner-v2';
  var toastTimer = null;
  var profileReturnRoute = 'home';

  function loadStore() {
    try {
      return Profile.migrate(localStorage.getItem(STORE_KEY), localStorage.getItem('aksa_user_data'));
    } catch (error) {
      setTimeout(function() { showToast('This browser could not open the saved learning record.'); }, 200);
      return Profile.emptyStore();
    }
  }

  var store = loadStore();

  function saveStore() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(store));
      return true;
    } catch (error) {
      showToast('Progress works for this session, but this browser cannot save it permanently.');
      return false;
    }
  }

  function profileInitials(name) {
    return String(name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(function(part) { return part.charAt(0).toUpperCase(); }).join('') || '--';
  }

  function renderProfile() {
    var profile = Profile.normaliseProfile(store.profile);
    var initials = profileInitials(profile && profile.name);
    document.getElementById('headerProfileInitials').textContent = initials;
    document.getElementById('headerProfileText').textContent = profile ? profile.name : 'Profile';
    document.getElementById('dashboardProfileName').textContent = profile ? profile.name : '—';
    document.getElementById('dashboardProfileDepartment').textContent = profile ? profile.department : '—';
  }

  function openProfileGate(mode) {
    profileReturnRoute = mode === 'edit' ? (location.hash.slice(1) || 'home') : 'home';
    var profile = Profile.normaliseProfile(store.profile);
    var gate = document.getElementById('profileGate');
    document.getElementById('profileName').value = profile ? profile.name : '';
    document.getElementById('profileDepartment').value = profile ? profile.department : '';
    document.getElementById('profileFormError').textContent = '';
    gate.hidden = false;
    document.body.classList.add('profile-locked');
    document.getElementById('main').inert = true;
    setTimeout(function() { document.getElementById('profileName').focus(); }, 40);
  }

  function closeProfileGate() {
    document.getElementById('profileGate').hidden = true;
    document.body.classList.remove('profile-locked');
    document.getElementById('main').inert = false;
  }

  function saveProfile(event) {
    event.preventDefault();
    var profile = Profile.normaliseProfile({
      name: document.getElementById('profileName').value,
      department: document.getElementById('profileDepartment').value
    });
    if (!profile) {
      document.getElementById('profileFormError').textContent = 'Please enter both your name and department / position.';
      return;
    }
    store.profile = profile;
    saveStore();
    try { localStorage.removeItem('aksa_user_data'); } catch (ignored) {}
    renderProfile();
    closeProfileGate();
    navigate(profileReturnRoute, true);
    showToast('Profile saved on this device.');
  }

  function setupProfile() {
    document.getElementById('profileForm').addEventListener('submit', saveProfile);
    document.getElementById('headerProfile').addEventListener('click', function() { openProfileGate('edit'); });
    document.getElementById('editProfile').addEventListener('click', function() { openProfileGate('edit'); });
    renderProfile();
    if (Profile.normaliseProfile(store.profile)) closeProfileGate();
    else openProfileGate('initial');
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, function(char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char];
    });
  }

  function showToast(message) {
    var toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function() { toast.classList.remove('show'); }, 3200);
  }

  function formatNumber(value) {
    return new Intl.NumberFormat('en-US').format(value);
  }

  function formatDate(value) {
    if (!value) return '—';
    var date = new Date(value.length === 10 ? value + 'T00:00:00' : value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
  }

  function ttsAvailable() {
    return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  }

  function preferredVoice() {
    if (!ttsAvailable()) return null;
    var voices = window.speechSynthesis.getVoices();
    return voices.find(function(voice) { return voice.lang === 'en-GB'; }) || voices.find(function(voice) { return /^en/i.test(voice.lang); }) || null;
  }

  function speak(text, button, onEnd) {
    if (!ttsAvailable()) {
      showToast('Speech playback is not available in this browser.');
      if (onEnd) onEnd();
      return false;
    }
    window.speechSynthesis.cancel();
    var utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-GB';
    utterance.rate = .88;
    var voice = preferredVoice();
    if (voice) utterance.voice = voice;
    var original = button ? button.textContent : '';
    if (button) {
      button.classList.add('playing');
      button.textContent = '■';
    }
    function finish() {
      if (button) {
        button.classList.remove('playing');
        button.textContent = original;
      }
      if (onEnd) onEnd();
    }
    utterance.onend = finish;
    utterance.onerror = finish;
    window.speechSynthesis.speak(utterance);
    return true;
  }

  function bindRouteButtons(scope) {
    (scope || document).querySelectorAll('[data-route]').forEach(function(button) {
      if (button.dataset.routeBound) return;
      button.dataset.routeBound = 'true';
      button.addEventListener('click', function() { navigate(button.dataset.route); });
    });
  }

  var validRoutes = ['home', 'dialogue', 'vocabulary', 'challenge', 'grammar', 'topics', 'dashboard'];

  function navigate(route, replace) {
    var next = validRoutes.includes(route) ? route : 'home';
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    document.querySelectorAll('.view').forEach(function(view) { view.classList.toggle('active', view.dataset.view === next); });
    document.querySelectorAll('.main-nav [data-route]').forEach(function(button) { button.classList.toggle('active', button.dataset.route === next); });
    document.getElementById('mainNav').classList.remove('open');
    document.getElementById('menuToggle').setAttribute('aria-expanded', 'false');
    if (replace) history.replaceState(null, '', '#' + next);
    else if (location.hash !== '#' + next) history.pushState(null, '', '#' + next);
    if (next === 'dashboard') renderDashboard();
    if (next === 'topics') renderTopics();
    if (next === 'vocabulary') renderVocabulary();
    window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  function setupNavigation() {
    bindRouteButtons(document);
    var toggle = document.getElementById('menuToggle');
    toggle.addEventListener('click', function() {
      var open = document.getElementById('mainNav').classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    window.addEventListener('popstate', function() { navigate(location.hash.slice(1) || 'home', true); });
  }

  function setupHero() {
    var hero = document.getElementById('homeHero');
    var image = document.getElementById('heroImage');
    var lens = document.getElementById('heroLens');
    var coordinates = document.getElementById('heroCoordinates');
    if (!hero || matchMedia('(pointer: coarse)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var pending = false;
    var point = { x: .5, y: .5 };
    function paint() {
      pending = false;
      var rect = hero.getBoundingClientRect();
      var x = point.x * rect.width;
      var y = point.y * rect.height;
      lens.style.left = x + 'px';
      lens.style.top = y + 'px';
      lens.style.backgroundPosition = (point.x * 100) + '% ' + (point.y * 100) + '%';
      image.style.transform = 'translate3d(' + ((point.x - .5) * -16) + 'px,' + ((point.y - .5) * -10) + 'px,0) scale(1.03)';
      coordinates.textContent = 'X ' + Math.round(point.x * 100) + ' / Y ' + Math.round(point.y * 100);
    }
    hero.addEventListener('pointerenter', function() { hero.classList.add('pointer-active'); });
    hero.addEventListener('pointerleave', function() { hero.classList.remove('pointer-active'); image.style.transform = 'translate3d(0,0,0) scale(1.01)'; });
    hero.addEventListener('pointermove', function(event) {
      var rect = hero.getBoundingClientRect();
      point.x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      point.y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
      if (!pending) { pending = true; requestAnimationFrame(paint); }
    });
  }

  function setupReveal() {
    var elements = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      elements.forEach(function(item) { item.classList.add('visible'); });
      return;
    }
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
      });
    }, { threshold: .12 });
    elements.forEach(function(item) { observer.observe(item); });
  }

  var activeLesson = 0;
  var lessonPlayback = false;

  function renderLesson(index) {
    activeLesson = Math.max(0, Math.min(LESSONS.length - 1, index));
    var lesson = LESSONS[activeLesson];
    document.querySelectorAll('.lesson-tab').forEach(function(button, i) { button.classList.toggle('active', i === activeLesson); });
    document.getElementById('lessonTag').textContent = 'Lesson ' + String(activeLesson + 1).padStart(2, '0') + ' / ' + lesson.tag;
    document.getElementById('lessonTitle').textContent = lesson.title;
    document.getElementById('lessonSummary').textContent = lesson.summary;
    document.getElementById('lessonFocus').innerHTML = lesson.focus.map(function(item) { return '<span>' + escapeHtml(item) + '</span>'; }).join('');
    var lines = document.getElementById('dialogueLines');
    lines.innerHTML = lesson.lines.map(function(line, i) {
      return '<div class="dialogue-line"><span class="speaker">' + escapeHtml(line.speaker) + '</span><div><div class="en">' + escapeHtml(line.en) + '</div><div class="zh">' + escapeHtml(line.zh) + '</div></div><button class="listen-button" type="button" data-line="' + i + '" aria-label="Listen to this line">▶</button></div>';
    }).join('');
    lines.querySelectorAll('[data-line]').forEach(function(button) {
      button.addEventListener('click', function() { speak(lesson.lines[Number(button.dataset.line)].en, button); });
    });
  }

  function setupDialogue() {
    var menu = document.getElementById('lessonMenu');
    menu.innerHTML = LESSONS.map(function(lesson, index) {
      return '<button class="lesson-tab' + (index === 0 ? ' active' : '') + '" type="button" data-lesson="' + index + '"><span>' + String(index + 1).padStart(2, '0') + '</span><span><strong>' + escapeHtml(lesson.title) + '</strong><small>' + escapeHtml(lesson.tag) + '</small></span></button>';
    }).join('');
    menu.querySelectorAll('[data-lesson]').forEach(function(button) { button.addEventListener('click', function() { renderLesson(Number(button.dataset.lesson)); }); });
    document.getElementById('playLesson').addEventListener('click', function() {
      lessonPlayback = true;
      var lesson = LESSONS[activeLesson];
      var index = 0;
      function next() {
        if (!lessonPlayback || index >= lesson.lines.length) { lessonPlayback = false; return; }
        speak(lesson.lines[index].en, null, function() { index += 1; setTimeout(next, 250); });
      }
      next();
    });
    document.getElementById('stopLesson').addEventListener('click', function() { lessonPlayback = false; if (window.speechSynthesis) window.speechSynthesis.cancel(); });
    renderLesson(0);
  }

  var vocabState = { type: 'words', category: 'all', query: '', page: 1 };
  var VOCAB_PAGE_SIZE = 20;

  function isFavorite(id) { return store.favorites.includes(id); }
  function toggleFavorite(id) {
    var index = store.favorites.indexOf(id);
    if (index >= 0) store.favorites.splice(index, 1); else store.favorites.push(id);
    saveStore();
    renderVocabulary();
  }

  function filteredVocabulary() {
    var query = vocabState.query.toLowerCase();
    if (vocabState.type === 'phrases') {
      return PHRASES.filter(function(item) { return !query || (item.en + ' ' + item.zh + ' ' + item.scenario).toLowerCase().includes(query); });
    }
    return WORDS.filter(function(item) {
      if (vocabState.category !== 'all' && item.category !== vocabState.category) return false;
      return !query || (item.term + ' ' + item.zh + ' ' + item.example.en + ' ' + item.example.zh).toLowerCase().includes(query);
    });
  }

  function renderVocabulary() {
    var items = filteredVocabulary();
    var pages = Math.max(1, Math.ceil(items.length / VOCAB_PAGE_SIZE));
    vocabState.page = Math.min(vocabState.page, pages);
    var start = (vocabState.page - 1) * VOCAB_PAGE_SIZE;
    var current = items.slice(start, start + VOCAB_PAGE_SIZE);
    document.getElementById('vocabularyCount').textContent = formatNumber(items.length) + ' results';
    document.getElementById('wordsTabCount').textContent = formatNumber(WORDS.length);
    document.getElementById('phrasesTabCount').textContent = formatNumber(PHRASES.length);
    document.getElementById('wordsTab').classList.toggle('active', vocabState.type === 'words');
    document.getElementById('phrasesTab').classList.toggle('active', vocabState.type === 'phrases');
    document.getElementById('wordsTab').setAttribute('aria-selected', String(vocabState.type === 'words'));
    document.getElementById('phrasesTab').setAttribute('aria-selected', String(vocabState.type === 'phrases'));
    document.querySelector('#wordFilters .segmented').style.display = vocabState.type === 'words' ? '' : 'none';
    var list = document.getElementById('vocabularyList');
    if (vocabState.type === 'words') {
      list.innerHTML = current.map(function(word) {
        return '<article class="word-row"><div class="word-term"><h3>' + escapeHtml(word.term) + '</h3><p>' + escapeHtml(word.ipa) + '</p></div><div class="word-details"><p class="translation">' + escapeHtml(word.zh) + '</p><p class="example-en">' + escapeHtml(word.example.en) + '</p><p class="example-zh">' + escapeHtml(word.example.zh) + '</p></div><div class="word-actions"><button class="listen-button" type="button" data-speak="' + escapeHtml(word.id) + '" aria-label="Listen to ' + escapeHtml(word.term) + '">▶</button><button class="favorite-button' + (isFavorite(word.id) ? ' active' : '') + '" type="button" data-favorite="' + escapeHtml(word.id) + '" aria-label="' + (isFavorite(word.id) ? 'Remove from review' : 'Add to review') + '">☆</button></div></article>';
      }).join('');
    } else {
      list.innerHTML = current.map(function(item) {
        return '<article class="phrase-row"><span class="scenario">' + escapeHtml(item.scenario) + '</span><div><h3>' + escapeHtml(item.en) + '</h3><p class="example-zh">' + escapeHtml(item.zh) + '</p></div><button class="listen-button" type="button" data-phrase="' + escapeHtml(item.id) + '" aria-label="Listen to phrase">▶</button></article>';
      }).join('');
    }
    list.querySelectorAll('[data-speak]').forEach(function(button) {
      button.addEventListener('click', function() { var word = WORDS.find(function(item) { return item.id === button.dataset.speak; }); if (word) speak(word.term, button); });
    });
    list.querySelectorAll('[data-favorite]').forEach(function(button) { button.addEventListener('click', function() { toggleFavorite(button.dataset.favorite); }); });
    list.querySelectorAll('[data-phrase]').forEach(function(button) {
      button.addEventListener('click', function() { var item = PHRASES.find(function(entry) { return entry.id === button.dataset.phrase; }); if (item) speak(item.en, button); });
    });
    document.getElementById('vocabularyPagination').innerHTML = '<button type="button" data-page="prev"' + (vocabState.page === 1 ? ' disabled' : '') + '>← Previous</button><span>Page ' + vocabState.page + ' of ' + pages + '</span><button type="button" data-page="next"' + (vocabState.page === pages ? ' disabled' : '') + '>Next →</button>';
    document.querySelectorAll('#vocabularyPagination [data-page]').forEach(function(button) {
      button.addEventListener('click', function() { vocabState.page += button.dataset.page === 'next' ? 1 : -1; renderVocabulary(); document.querySelector('.tab-bar').scrollIntoView(); });
    });
  }

  function setupVocabulary() {
    document.getElementById('wordsTab').addEventListener('click', function() { vocabState.type = 'words'; vocabState.page = 1; renderVocabulary(); });
    document.getElementById('phrasesTab').addEventListener('click', function() { vocabState.type = 'phrases'; vocabState.page = 1; renderVocabulary(); });
    document.querySelectorAll('[data-word-category]').forEach(function(button) {
      button.addEventListener('click', function() {
        vocabState.category = button.dataset.wordCategory;
        vocabState.page = 1;
        document.querySelectorAll('[data-word-category]').forEach(function(item) { item.classList.toggle('active', item === button); });
        renderVocabulary();
      });
    });
    document.getElementById('wordSearch').addEventListener('input', function(event) { vocabState.query = event.target.value.trim(); vocabState.page = 1; renderVocabulary(); });
    renderVocabulary();
  }

  var grammarData = [
    ['01', 'Past Simple vs Present Perfect', 'Use past simple for a finished time. Use present perfect when the result matters now.', ['We shipped the generator yesterday.', 'We have shipped the generator, so tracking is now available.']],
    ['02', 'Polite requests', 'Use could, would, and please to make direct actions sound cooperative.', ['Could you confirm the serial number?', 'Would you please send the revised drawing?']],
    ['03', 'Active vs Passive Voice', 'Use active voice for ownership and passive voice when the process or result is central.', ['Our team tested the generator.', 'The generator was tested at full load.']],
    ['04', 'Conditionals for troubleshooting', 'Use if-clauses to connect a condition with a safe response or likely result.', ['If the alarm returns, stop the unit.', 'If the pressure is stable, we can continue the test.']],
    ['05', 'Modals for obligation', 'Need to describes practical necessity; must is stronger; should gives advice.', ['We need to check the fuel level.', 'Technicians must follow the lockout procedure.']],
    ['06', 'Comparatives for proposals', 'Use comparative forms to explain why one option fits the customer better.', ['The larger tank gives a longer running time.', 'This canopy is quieter than the standard enclosure.']],
    ['07', 'Future forms for schedules', 'Use will for decisions, going to for plans, and present continuous for arrangements.', ['We will send the report today.', 'The forwarder is collecting the unit on Friday.']],
    ['08', 'Reported speech', 'Use reported speech to pass on customer requests without changing the meaning.', ['The customer said the site was ready.', 'They asked whether the ATS was included.']]
  ];

  function renderGrammar() {
    document.getElementById('grammarList').innerHTML = grammarData.map(function(item) {
      return '<article class="grammar-item"><span class="grammar-number">' + item[0] + '</span><div><h2>' + escapeHtml(item[1]) + '</h2><p class="grammar-rule">' + escapeHtml(item[2]) + '</p></div><div class="grammar-examples">' + item[3].map(function(example) { return '<div class="grammar-example"><span>' + escapeHtml(example) + '</span><button class="listen-button" type="button" data-example="' + escapeHtml(example) + '" aria-label="Listen to example">▶</button></div>'; }).join('') + '</div></article>';
    }).join('');
    document.querySelectorAll('[data-example]').forEach(function(button) { button.addEventListener('click', function() { speak(button.dataset.example, button); }); });
  }

  var challengeSettings = { category: 'all', mode: 'mixed', count: 10 };
  var session = null;

  function setupChallengeOptions() {
    document.querySelectorAll('[data-setting] button').forEach(function(button) {
      button.addEventListener('click', function() {
        var group = button.closest('[data-setting]');
        group.querySelectorAll('button').forEach(function(item) { item.classList.toggle('active', item === button); });
        challengeSettings[group.dataset.setting] = group.dataset.setting === 'count' ? Number(button.dataset.value) : button.dataset.value;
      });
    });
    document.getElementById('startChallenge').addEventListener('click', startChallenge);
    document.getElementById('exitChallenge').addEventListener('click', exitChallenge);
    document.addEventListener('keydown', handleChallengeKeys);
  }

  function startChallenge() {
    var words = Challenge.selectSessionWords(WORDS, store.progress, challengeSettings.count, challengeSettings.category);
    if (!words.length) { showToast('No words are available for this category.'); return; }
    session = { startedAt: new Date().toISOString(), settings: Object.assign({}, challengeSettings), words: words, index: -1, correct: 0, results: [], current: null, answered: false, attempt: 0, selectedTiles: [] };
    store.incomplete = { startedAt: session.startedAt, settings: session.settings };
    saveStore();
    document.getElementById('challengeSetup').hidden = true;
    document.getElementById('challengeResults').hidden = true;
    document.getElementById('challengeStage').hidden = false;
    nextQuestion();
  }

  function nextQuestion() {
    session.index += 1;
    if (session.index >= session.words.length) { finishChallenge(); return; }
    var word = session.words[session.index];
    var progress = store.progress[word.id] || { mastery: 0 };
    session.current = word;
    session.answered = false;
    session.attempt = 0;
    session.selectedTiles = [];
    session.type = Challenge.resolveQuestionType(session.settings.mode, progress.mastery || 0, ttsAvailable());
    renderQuestion();
  }

  function renderQuestion(hint) {
    var word = session.current;
    var panel = document.getElementById('questionPanel');
    document.getElementById('challengeFeedback').hidden = true;
    document.getElementById('challengeProgressText').textContent = (session.index + 1) + ' / ' + session.words.length;
    document.getElementById('challengeScore').textContent = session.correct + ' correct';
    document.getElementById('challengeProgressBar').style.width = ((session.index / session.words.length) * 100) + '%';
    if (session.type === 'listening') {
      var choices = Challenge.buildChoices(word, WORDS);
      session.choices = choices;
      panel.innerHTML = '<p class="question-type">Listening / Choose the word</p><h2 class="question-prompt">Listen carefully.</h2><button class="listen-main" id="challengeListen" type="button">Play</button><div class="choice-grid">' + choices.map(function(item, index) { return '<button class="choice-button" type="button" data-choice="' + escapeHtml(item.id) + '"><span>' + (index + 1) + '</span> ' + escapeHtml(item.term) + '</button>'; }).join('') + '</div>';
      document.getElementById('challengeListen').addEventListener('click', function() { speak(word.term, document.getElementById('challengeListen')); });
      panel.querySelectorAll('[data-choice]').forEach(function(button) { button.addEventListener('click', function() { completeAnswer(button.dataset.choice === word.id); }); });
      setTimeout(function() { if (session && !session.answered) speak(word.term); }, 180);
      return;
    }
    if (session.type === 'typed') {
      panel.innerHTML = '<p class="question-type">Spelling / Type the complete answer</p><h2 class="question-prompt">' + escapeHtml(word.zh) + '</h2><p class="question-sub">' + escapeHtml(word.example.zh) + '</p>' + (hint ? '<p class="question-sub">Hint: starts with “' + escapeHtml(word.term.charAt(0)) + '”</p>' : '') + '<form class="typed-form" id="typedForm"><label class="sr-only" for="typedAnswer">Your answer</label><input class="typed-input" id="typedAnswer" type="text" autocomplete="off" autocapitalize="none" spellcheck="false"><button class="button button-dark" type="submit">Check</button></form>';
      document.getElementById('typedForm').addEventListener('submit', function(event) { event.preventDefault(); checkSpelling(document.getElementById('typedAnswer').value); });
      document.getElementById('typedAnswer').focus();
      return;
    }
    var letters = word.term.toLowerCase().replace(/[^a-z0-9]/g, '').split('');
    session.tileLetters = Challenge.shuffled(letters.map(function(letter, index) { return { letter: letter, index: index }; }));
    panel.innerHTML = '<p class="question-type">Spelling / Build the word</p><h2 class="question-prompt">' + escapeHtml(word.zh) + '</h2><p class="question-sub">' + escapeHtml(word.example.zh) + (hint ? '<br>Hint: starts with “' + escapeHtml(word.term.charAt(0)) + '”' : '') + '</p><div class="tile-answer" id="tileAnswer" aria-live="polite">' + Array(letters.length).fill('_').join(' ') + '</div><div class="letter-tiles">' + session.tileLetters.map(function(item, index) { return '<button class="letter-tile" type="button" data-tile="' + index + '">' + escapeHtml(item.letter) + '</button>'; }).join('') + '</div><div class="tile-actions"><button class="icon-text-button" id="clearTiles" type="button">Reset</button><button class="button button-dark" id="checkTiles" type="button">Check</button></div>';
    panel.querySelectorAll('[data-tile]').forEach(function(button) { button.addEventListener('click', function() { selectTile(Number(button.dataset.tile), button); }); });
    document.getElementById('clearTiles').addEventListener('click', clearTiles);
    document.getElementById('checkTiles').addEventListener('click', function() { checkSpelling(session.selectedTiles.map(function(index) { return session.tileLetters[index].letter; }).join(''), true); });
  }

  function selectTile(index, button) {
    if (session.selectedTiles.includes(index)) return;
    session.selectedTiles.push(index);
    button.classList.add('used');
    button.disabled = true;
    var answer = session.selectedTiles.map(function(tileIndex) { return session.tileLetters[tileIndex].letter; }).join('');
    var total = session.current.term.replace(/[^a-z0-9]/gi, '').length;
    document.getElementById('tileAnswer').textContent = answer.toUpperCase() + ' ' + Array(Math.max(0, total - answer.length)).fill('_').join(' ');
  }

  function clearTiles() {
    session.selectedTiles = [];
    document.querySelectorAll('[data-tile]').forEach(function(button) { button.disabled = false; button.classList.remove('used'); });
    document.getElementById('tileAnswer').textContent = Array(session.current.term.replace(/[^a-z0-9]/gi, '').length).fill('_').join(' ');
  }

  function checkSpelling(value, tile) {
    var expected = tile ? session.current.term.replace(/[^a-z0-9]/gi, '').toLowerCase() : Challenge.normalizeAnswer(session.current.term);
    var actual = tile ? String(value).toLowerCase() : Challenge.normalizeAnswer(value);
    if (actual === expected) { completeAnswer(true); return; }
    session.attempt += 1;
    if (session.attempt === 1) {
      showToast('Not yet. Use the first-letter hint and try once more.');
      session.selectedTiles = [];
      renderQuestion(true);
    } else completeAnswer(false);
  }

  function completeAnswer(correct) {
    if (!session || session.answered) return;
    session.answered = true;
    var word = session.current;
    var previous = store.progress[word.id] || { attempts: 0, correct: 0, streak: 0, mastery: 0, lastSeen: null, nextReview: null };
    var mastery = Challenge.updateMastery(previous.mastery || 0, session.type, correct);
    store.progress[word.id] = {
      attempts: (previous.attempts || 0) + 1,
      correct: (previous.correct || 0) + (correct ? 1 : 0),
      streak: correct ? (previous.streak || 0) + 1 : 0,
      mastery: mastery,
      lastSeen: new Date().toISOString(),
      nextReview: Challenge.nextReviewDate(Date.now(), mastery)
    };
    if (correct) session.correct += 1;
    session.results.push({ id: word.id, correct: correct, type: session.type, before: previous.mastery || 0, after: mastery });
    saveStore();
    renderFeedback(correct, word, mastery);
  }

  function renderFeedback(correct, word, mastery) {
    var feedback = document.getElementById('challengeFeedback');
    feedback.className = 'challenge-feedback ' + (correct ? 'feedback-correct' : 'feedback-wrong');
    feedback.innerHTML = '<div class="feedback-status"><span class="feedback-mark">' + (correct ? '✓' : '×') + '</span><span>' + (correct ? 'Correct' : 'Review this word') + ' / Mastery ' + mastery + '</span></div><h3 class="feedback-answer">' + escapeHtml(word.term) + '</h3><p>' + escapeHtml(word.zh) + '</p><div class="feedback-example"><p class="example-en">' + escapeHtml(word.example.en) + '</p><p class="example-zh">' + escapeHtml(word.example.zh) + '</p></div><div class="feedback-actions"><button class="icon-text-button" id="feedbackListen" type="button">Listen</button><button class="icon-text-button" id="feedbackFavorite" type="button">' + (isFavorite(word.id) ? 'Remove from review' : 'Add to review') + '</button><button class="button button-dark" id="nextQuestion" type="button">' + (session.index + 1 === session.words.length ? 'View result' : 'Next question') + ' →</button></div>';
    feedback.hidden = false;
    document.getElementById('feedbackListen').addEventListener('click', function() { speak(word.term + '. ' + word.example.en, document.getElementById('feedbackListen')); });
    document.getElementById('feedbackFavorite').addEventListener('click', function() { var index = store.favorites.indexOf(word.id); if (index >= 0) store.favorites.splice(index, 1); else store.favorites.push(word.id); saveStore(); document.getElementById('feedbackFavorite').textContent = isFavorite(word.id) ? 'Remove from review' : 'Add to review'; });
    document.getElementById('nextQuestion').addEventListener('click', nextQuestion);
    feedback.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' });
  }

  function finishChallenge() {
    var completedAt = new Date().toISOString();
    var record = { id: 'session-' + Date.now(), startedAt: session.startedAt, completedAt: completedAt, mode: session.settings.mode, category: session.settings.category, count: session.words.length, correct: session.correct, accuracy: Math.round(session.correct / session.words.length * 100), results: session.results };
    store.sessions.unshift(record);
    while (store.sessions.length > 100) {
      var old = store.sessions.pop();
      var date = old.completedAt.slice(0, 10);
      var summary = store.dailySummaries[date] || { sessions: 0, questions: 0, correct: 0 };
      summary.sessions += 1; summary.questions += old.count; summary.correct += old.correct;
      store.dailySummaries[date] = summary;
    }
    store.incomplete = null;
    saveStore();
    document.getElementById('challengeStage').hidden = true;
    var results = document.getElementById('challengeResults');
    results.hidden = false;
    results.style.display = 'grid';
    results.innerHTML = '<p class="section-code">SESSION COMPLETE</p><h2>' + record.accuracy + '%</h2><p>' + record.correct + ' of ' + record.count + ' correct · ' + escapeHtml(record.mode) + ' mode</p><div class="result-actions"><button class="button button-dark" id="repeatChallenge" type="button">Try again</button><button class="button" type="button" data-route="dashboard">View dashboard</button></div>';
    document.getElementById('repeatChallenge').addEventListener('click', startChallenge);
    bindRouteButtons(results);
    session = null;
    updateHomeMetrics();
  }

  function exitChallenge() {
    if (!session) return;
    store.incomplete = { startedAt: session.startedAt, settings: session.settings, completedQuestions: session.results.length };
    saveStore();
    session = null;
    document.getElementById('challengeStage').hidden = true;
    document.getElementById('challengeResults').hidden = true;
    document.getElementById('challengeSetup').hidden = false;
  }

  function handleChallengeKeys(event) {
    if (!session || !document.getElementById('view-challenge').classList.contains('active')) return;
    if (session.type === 'listening' && /^[1-4]$/.test(event.key) && !session.answered) {
      var button = document.querySelectorAll('[data-choice]')[Number(event.key) - 1];
      if (button) button.click();
    }
    if (event.key === 'Enter' && session.answered) {
      var next = document.getElementById('nextQuestion');
      if (next) next.click();
    }
  }

  var topicState = { category: 'all', date: '', query: '', selected: null, scroll: 0 };

  function latestTopics() {
    var days = TOPIC_BOOTSTRAP.index && TOPIC_BOOTSTRAP.index.days || [];
    if (!days.length) return [];
    var payload = TOPIC_BOOTSTRAP.days[days[0].date];
    return payload ? payload.items : [];
  }

  function renderHomeTopics() {
    document.getElementById('homeToday').innerHTML = latestTopics().map(function(item, index) {
      return '<article class="today-card" tabindex="0" role="button" data-home-topic="' + escapeHtml(item.id) + '"><time>' + escapeHtml(item.date) + '</time><div><span class="topic-type">0' + (index + 1) + ' / ' + escapeHtml(item.label) + '</span><h3>' + escapeHtml(item.titleEn) + '</h3><p>' + escapeHtml(item.summaryEn) + '</p></div><span class="row-arrow">↗</span></article>';
    }).join('');
    document.querySelectorAll('[data-home-topic]').forEach(function(card) {
      function open() { openTopic(card.dataset.homeTopic); }
      card.addEventListener('click', open);
      card.addEventListener('keydown', function(event) { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } });
    });
  }

  function renderTopics() {
    if (topicState.selected) return;
    var items = window.AKSATopics.filterTopics(TOPICS, topicState);
    document.getElementById('topicCount').textContent = formatNumber(items.length) + ' archived topics';
    document.getElementById('topicsUpdated').textContent = 'Last successful update: ' + formatDate((TOPIC_BOOTSTRAP.index.lastSuccessfulUpdate || '').slice(0, 10)) + '. Previous topics remain available.';
    var list = document.getElementById('topicsList');
    list.innerHTML = items.length ? items.map(function(item, index) {
      return '<button class="topic-row" type="button" data-topic="' + escapeHtml(item.id) + '" data-index="' + String(index + 1).padStart(2, '0') + '"><time>' + escapeHtml(item.date) + '</time><span class="topic-category">' + escapeHtml(item.label || item.category) + '</span><div><h2>' + escapeHtml(item.titleEn) + '</h2><p>' + escapeHtml(item.summaryEn) + '</p></div><span class="row-arrow">↗</span></button>';
    }).join('') : '<div class="empty-state">No topics match these filters. Clear one filter or try another keyword.</div>';
    list.querySelectorAll('[data-topic]').forEach(function(button) { button.addEventListener('click', function() { openTopic(button.dataset.topic); }); });
  }

  function openTopic(id) {
    var item = TOPICS.find(function(topic) { return topic.id === id; });
    if (!item) return;
    topicState.scroll = window.scrollY;
    topicState.selected = id;
    navigate('topics');
    document.getElementById('topicsBrowser').hidden = true;
    var detail = document.getElementById('topicDetail');
    detail.hidden = false;
    detail.innerHTML = '<button class="text-button detail-back" id="topicBack" type="button">← Back to archive</button><p class="section-code">' + escapeHtml(item.label || item.category) + ' / ' + escapeHtml(item.date) + '</p><h1>' + escapeHtml(item.titleEn) + '</h1><p class="zh-title">' + escapeHtml(item.titleZh) + '</p><div class="topic-meta"><span>' + escapeHtml(item.sourceName || 'AKSA English Hub') + '</span><span>Published ' + escapeHtml(item.publishedAt || item.displayDate || item.date) + '</span></div><div class="topic-summary"><p>' + escapeHtml(item.summaryEn) + '</p><p>' + escapeHtml(item.summaryZh) + '</p>' + (item.body ? item.body.map(function(text) { return '<p>' + escapeHtml(text) + '</p>'; }).join('') : '') + '</div><div class="topic-learning"><section><p class="mini-heading">Key vocabulary</p><ul class="vocab-list">' + (item.vocabulary || []).map(function(entry) { return '<li><strong>' + escapeHtml(entry.en) + '</strong><span>' + escapeHtml(entry.zh) + '</span></li>'; }).join('') + '</ul></section><section><p class="mini-heading">Discussion questions</p><ol class="question-list">' + (item.questions || []).map(function(entry) { var question = typeof entry === 'string' ? entry : entry.question; var starter = typeof entry === 'string' ? 'I think this matters because...' : entry.starter; return '<li><strong>' + escapeHtml(question) + '</strong><p>' + escapeHtml(starter) + '</p></li>'; }).join('') + '</ol></section></div>' + (item.sourceUrl ? '<a class="source-link" href="' + escapeHtml(item.sourceUrl) + '" target="_blank" rel="noopener">Open original source ↗</a>' : '');
    document.getElementById('topicBack').addEventListener('click', closeTopic);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function closeTopic() {
    topicState.selected = null;
    document.getElementById('topicDetail').hidden = true;
    document.getElementById('topicsBrowser').hidden = false;
    renderTopics();
    setTimeout(function() { window.scrollTo({ top: topicState.scroll, behavior: 'auto' }); }, 0);
  }

  function setupTopics() {
    document.getElementById('topicCategory').addEventListener('change', function(event) { topicState.category = event.target.value; renderTopics(); });
    document.getElementById('topicDate').addEventListener('change', function(event) { topicState.date = event.target.value; renderTopics(); });
    document.getElementById('topicSearch').addEventListener('input', function(event) { topicState.query = event.target.value.trim(); renderTopics(); });
    document.getElementById('clearTopicFilters').addEventListener('click', function() {
      topicState.category = 'all'; topicState.date = ''; topicState.query = '';
      document.getElementById('topicCategory').value = 'all'; document.getElementById('topicDate').value = ''; document.getElementById('topicSearch').value = '';
      renderTopics();
    });
    renderTopics();
  }

  function progressMetrics() {
    var values = Object.values(store.progress);
    var now = Date.now();
    var mastered = values.filter(function(item) { return (item.mastery || 0) >= 75; }).length;
    var due = values.filter(function(item) { return item.attempts && item.nextReview && Date.parse(item.nextReview) <= now; }).length;
    var recent = store.sessions.slice(0, 7);
    var questions = recent.reduce(function(total, item) { return total + item.count; }, 0);
    var correct = recent.reduce(function(total, item) { return total + item.correct; }, 0);
    return { mastered: mastered, due: due, accuracy: questions ? Math.round(correct / questions * 100) : null, tested: values.length };
  }

  function updateHomeMetrics() {
    var metrics = progressMetrics();
    document.getElementById('homeMastered').textContent = metrics.mastered;
    document.getElementById('homeDue').textContent = metrics.due;
    document.getElementById('homeAccuracy').textContent = metrics.accuracy == null ? '—' : metrics.accuracy + '%';
    document.getElementById('homeWordCount').textContent = formatNumber(WORDS.length) + ' terms';
    document.getElementById('homeLessonCount').textContent = LESSONS.length + ' lessons';
  }

  function renderDashboard() {
    renderProfile();
    var metrics = progressMetrics();
    document.getElementById('dashboardMetrics').innerHTML = [
      [metrics.accuracy == null ? '—' : metrics.accuracy + '%', 'Recent accuracy'], [metrics.mastered, 'Mastered words'], [metrics.due, 'Due for review'], [metrics.tested, 'Words tested']
    ].map(function(item) { return '<div class="dashboard-metric"><strong>' + item[0] + '</strong><span>' + item[1] + '</span></div>'; }).join('');
    var recent = store.sessions.slice(0, 7).reverse();
    document.getElementById('scoreChart').innerHTML = recent.length ? recent.map(function(item) { return '<div class="score-bar"><strong>' + item.accuracy + '%</strong><i style="--score:' + item.accuracy + '%"></i><span>' + formatDate(item.completedAt).split(' ').slice(0, 2).join(' ') + '</span></div>'; }).join('') : '<div class="empty-state">Complete a Word Challenge to start the performance chart.</div>';
    var dueWords = WORDS.filter(function(word) { var item = store.progress[word.id]; return isFavorite(word.id) || (item && item.nextReview && Date.parse(item.nextReview) <= Date.now()); }).slice(0, 12);
    document.getElementById('reviewList').innerHTML = dueWords.length ? dueWords.map(function(word) { var item = store.progress[word.id] || {}; return '<div class="review-item"><strong>' + escapeHtml(word.term) + '</strong><span>' + escapeHtml(word.zh) + '</span><span>Mastery ' + (item.mastery || 0) + '</span></div>'; }).join('') : '<div class="empty-state">No words are due. Add words from Vocabulary or finish a challenge.</div>';
    document.getElementById('historyList').innerHTML = store.sessions.length ? store.sessions.slice(0, 12).map(function(item) { return '<div class="history-item"><strong>' + escapeHtml(item.mode) + ' · ' + item.accuracy + '%</strong><span>' + escapeHtml(item.category) + ' / ' + item.count + ' questions</span><span>' + formatDate(item.completedAt) + '</span></div>'; }).join('') : '<div class="empty-state">No completed sessions yet.</div>';
  }

  function setupDashboard() {
    document.getElementById('clearProgress').addEventListener('click', function() {
      if (!window.confirm('Delete all learning history stored in this browser?')) return;
      store = Profile.clearLearning(store); saveStore(); renderDashboard(); renderVocabulary(); updateHomeMetrics(); showToast('Local learning history cleared.');
    });
  }

  function setupCounts() {
    updateHomeMetrics();
    renderHomeTopics();
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('./sw.js').catch(function() {});
  }

  function init() {
    setupProfile();
    setupNavigation();
    setupHero();
    setupReveal();
    setupDialogue();
    setupVocabulary();
    renderGrammar();
    setupChallengeOptions();
    setupTopics();
    setupDashboard();
    setupCounts();
    registerServiceWorker();
    navigate(location.hash.slice(1) || 'home', true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
