(function(root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AKSATopics = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  function searchableText(item) {
    var vocabulary = (item.vocabulary || []).map(function(entry) { return `${entry.en || ''} ${entry.zh || ''}`; }).join(' ');
    return [item.titleEn, item.titleZh, item.summaryEn, item.summaryZh, item.label, vocabulary].join(' ').toLowerCase();
  }

  function filterTopics(items, filters) {
    var options = filters || {};
    var query = String(options.query || '').trim().toLowerCase();
    return items.filter(function(item) {
      if (options.category && options.category !== 'all' && item.category !== options.category) return false;
      if (options.date && item.date !== options.date) return false;
      return !query || searchableText(item).includes(query);
    }).sort(function(a, b) {
      return String(b.date || '').localeCompare(String(a.date || '')) || String(a.id).localeCompare(String(b.id));
    });
  }

  function flattenBootstrap(bootstrap) {
    var result = (bootstrap.archive || []).slice();
    var days = bootstrap.days || {};
    Object.keys(days).forEach(function(date) {
      result = result.concat(days[date].items || []);
    });
    return result;
  }

  return { filterTopics: filterTopics, flattenBootstrap: flattenBootstrap, searchableText: searchableText };
});

