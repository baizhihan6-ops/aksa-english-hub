(function(root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AKSAChallenge = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function updateMastery(current, type, correct) {
    var gains = { tile: 6, listening: 8, typed: 12 };
    return clamp(Number(current || 0) + (correct ? gains[type] || 6 : -12), 0, 100);
  }

  function masteryTier(score) {
    if (score >= 75) return 'mastered';
    if (score >= 50) return 'familiar';
    if (score >= 25) return 'learning';
    return 'new';
  }

  function reviewDays(score) {
    return score >= 75 ? 14 : score >= 50 ? 7 : score >= 25 ? 3 : 1;
  }

  function resolveQuestionType(mode, mastery, ttsAvailable, random) {
    var rng = random || Math.random;
    var spelling = mastery < 50 ? 'tile' : 'typed';
    if (mode === 'spelling') return spelling;
    if (mode === 'listening') return ttsAvailable ? 'listening' : spelling;
    return rng() < 0.5 && ttsAvailable ? 'listening' : spelling;
  }

  function shuffled(items, random) {
    var rng = random || Math.random;
    var result = items.slice();
    for (var i = result.length - 1; i > 0; i -= 1) {
      var j = Math.floor(rng() * (i + 1));
      var temp = result[i];
      result[i] = result[j];
      result[j] = temp;
    }
    return result;
  }

  function buildChoices(target, words, random) {
    var candidates = words.filter(function(word) { return word.id !== target.id; });
    candidates.sort(function(a, b) {
      var categoryA = a.category === target.category ? 0 : 100;
      var categoryB = b.category === target.category ? 0 : 100;
      return categoryA + Math.abs(a.term.length - target.term.length) - categoryB - Math.abs(b.term.length - target.term.length);
    });
    var unique = [];
    var seen = new Set([target.term.toLowerCase()]);
    for (var i = 0; i < candidates.length && unique.length < 3; i += 1) {
      var key = candidates[i].term.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(candidates[i]);
      }
    }
    return shuffled([target].concat(unique), random);
  }

  function normalizeAnswer(value) {
    return String(value || '').trim().toLowerCase();
  }

  function nextReviewDate(now, mastery) {
    var date = new Date(now || Date.now());
    date.setDate(date.getDate() + reviewDays(mastery));
    return date.toISOString();
  }

  function selectSessionWords(words, progress, count, category, random) {
    var now = Date.now();
    var pool = words.filter(function(word) { return category === 'all' || word.category === category; });
    pool.sort(function(a, b) {
      var pa = progress[a.id] || {};
      var pb = progress[b.id] || {};
      function rank(p) {
        if (p.nextReview && Date.parse(p.nextReview) <= now && p.attempts) return 0;
        if (p.attempts && (p.mastery || 0) < 50) return 1;
        if (!p.attempts) return 2;
        return 3;
      }
      return rank(pa) - rank(pb) || (pa.mastery || 0) - (pb.mastery || 0);
    });
    var top = pool.slice(0, Math.max(count * 3, count));
    return shuffled(top, random).slice(0, count);
  }

  return {
    updateMastery: updateMastery,
    masteryTier: masteryTier,
    reviewDays: reviewDays,
    resolveQuestionType: resolveQuestionType,
    buildChoices: buildChoices,
    normalizeAnswer: normalizeAnswer,
    nextReviewDate: nextReviewDate,
    selectSessionWords: selectSessionWords,
    shuffled: shuffled
  };
});

