(function(root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AKSAProfile = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  function normaliseProfile(value) {
    if (!value || typeof value !== 'object') return null;
    var name = String(value.name || '').trim();
    var department = String(value.department || value.dept || '').trim();
    return name && department ? { name: name, department: department } : null;
  }

  function emptyStore(profile) {
    return {
      version: 3,
      profile: normaliseProfile(profile),
      progress: {},
      sessions: [],
      dailySummaries: {},
      favorites: [],
      incomplete: null
    };
  }

  function parse(raw) {
    if (!raw) return null;
    try {
      var value = JSON.parse(raw);
      return value && typeof value === 'object' ? value : null;
    } catch (error) {
      return null;
    }
  }

  function migrate(currentRaw, legacyRaw) {
    var current = parse(currentRaw);
    var legacy = parse(legacyRaw);
    var profile = normaliseProfile(current && current.profile) || normaliseProfile(legacy);
    var result = emptyStore(profile);
    if (!current) return result;
    result.progress = current.progress && typeof current.progress === 'object' && !Array.isArray(current.progress) ? current.progress : {};
    result.sessions = Array.isArray(current.sessions) ? current.sessions : [];
    result.dailySummaries = current.dailySummaries && typeof current.dailySummaries === 'object' && !Array.isArray(current.dailySummaries) ? current.dailySummaries : {};
    result.favorites = Array.isArray(current.favorites) ? current.favorites : [];
    result.incomplete = current.incomplete && typeof current.incomplete === 'object' ? current.incomplete : null;
    return result;
  }

  function clearLearning(store) {
    return emptyStore(normaliseProfile(store && store.profile));
  }

  return {
    emptyStore: emptyStore,
    normaliseProfile: normaliseProfile,
    migrate: migrate,
    clearLearning: clearLearning
  };
});
