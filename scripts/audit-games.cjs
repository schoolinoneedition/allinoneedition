'use strict';
const fs = require('node:fs');
const html = fs.readFileSync('index.html', 'utf8');
const startToken = 'const GAMES=';
const startAt = html.indexOf(startToken);
if (startAt < 0) throw new Error('Could not find the GAMES registry in index.html');
const start = startAt + startToken.length;
const end = html.indexOf(';const EXTRA_', start);
if (end < 0) throw new Error('Could not find the end of the GAMES registry');
const games = JSON.parse(html.slice(start, end));
const normalize = value => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const byName = new Map(), byUrl = new Map(), bySource = new Map(), byCategory = new Map();
for (const game of games) {
  const name = normalize(game.name);
  let url = String(game.url || '').trim().toLowerCase();
  if (url.endsWith('/')) url = url.slice(0, -1);
  if (name) byName.set(name, [...(byName.get(name) || []), game]);
  if (url) byUrl.set(url, [...(byUrl.get(url) || []), game]);
  const source = game.source || 'Unspecified';
  bySource.set(source, (bySource.get(source) || 0) + 1);
  const category = game.cat || 'Uncategorised';
  byCategory.set(category, (byCategory.get(category) || 0) + 1);
}
const duplicateNames = [...byName].filter(([, entries]) => entries.length > 1).map(([name, entries]) => ({ name, count: entries.length, urls: entries.map(g => g.url) }));
const duplicateUrls = [...byUrl].filter(([, entries]) => entries.length > 1).map(([url, entries]) => ({ url, names: entries.map(g => g.name) }));
const missing = games.filter(g => !g.name || !g.url || !g.cat);
const summary = { entries: games.length, uniqueNames: byName.size, uniqueUrls: byUrl.size, duplicateTitleGroups: duplicateNames.length, duplicateTitleEntries: duplicateNames.reduce((n, g) => n + g.count, 0), duplicateUrlGroups: duplicateUrls.length, missingRequiredFields: missing.length, categories: Object.fromEntries([...byCategory].sort((a, b) => b[1] - a[1])), sources: Object.fromEntries([...bySource].sort((a, b) => b[1] - a[1])), duplicateTitlesForManualReview: duplicateNames };
console.log(JSON.stringify(summary, null, 2));
if (duplicateUrls.length || missing.length) process.exitCode = 1;
