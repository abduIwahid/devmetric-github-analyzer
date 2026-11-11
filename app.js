'use strict';
/*
 * DevMetric — GitHub Profile Analyzer, vanilla JS on the GitHub REST API.
 * Flow: profile fetch + paginated repo fetch -> aggregate (mapper layer) -> render.
 * Rate-limit aware: reads X-RateLimit-* headers and shows the remaining quota.
 * ETag caching: responses are stored in localStorage with their ETag; repeat
 * requests send If-None-Match and a 304 means "use the cached copy" (and does
 * not count against the rate limit).
 * Token: optional, entered by the visitor, stored ONLY in localStorage.
 */
const API = 'https://api.github.com';
const LS_CACHE = 'devmetric:cache:';
const LS_TOKEN = 'devmetric:token';
const MAX_PAGES = 5; // cap: 5 pages x 100 repos = 500 repos analysed

const state = { username: null, quota: null };

const el = {
  form: document.getElementById('search-form'),
  input: document.getElementById('username-input'),
  tokenInput: document.getElementById('token-input'),
  tokenStatus: document.getElementById('token-status'),
  quota: document.getElementById('quota-line'),
  status: document.getElementById('status-region'),
  results: document.getElementById('results-region'),
  empty: document.getElementById('empty-state'),
  emptyText: document.getElementById('empty-text'),
  error: document.getElementById('error-state'),
  errorText: document.getElementById('error-text'),
  offline: document.getElementById('offline-banner'),
};

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function getToken() {
  try { return localStorage.getItem(LS_TOKEN) || ''; } catch (e) { return ''; }
}

/* ---------- rate limit ---------- */
function readQuota(headers) {
  const remaining = headers.get('x-ratelimit-remaining');
  const reset = headers.get('x-ratelimit-reset');
  if (remaining === null) return;
  state.quota = { remaining: Number(remaining), reset: reset ? Number(reset) : null };
  renderQuota();
}
function renderQuota() {
  if (!state.quota) { el.quota.textContent = ''; return; }
  let txt = 'API calls left: ' + state.quota.remaining;
  if (state.quota.reset) {
    txt += ' (resets ' + new Date(state.quota.reset * 1000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ')';
  }
  el.quota.textContent = txt;
  el.quota.classList.toggle('low', state.quota.remaining <= 5);
}

/* ---------- ETag-cached fetch ---------- */
async function fetchCached(url) {
  const key = LS_CACHE + url;
  let cached = null;
  try {
    const raw = localStorage.getItem(key);
    if (raw) cached = JSON.parse(raw);
  } catch (e) { /* ignore */ }

  const headers = { 'Accept': 'application/vnd.github+json' };
  const token = getToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;
  if (cached && cached.etag) headers['If-None-Match'] = cached.etag;

  const res = await fetch(url, { headers });
  readQuota(res.headers);

  if (res.status === 304 && cached) {
    return { data: cached.data, fromCache: true };
  }
  if (res.status === 404) {
    const err = new Error('Not found');
    err.status = 404;
    throw err;
  }
  if (res.status === 403 || res.status === 429) {
    const reset = res.headers.get('x-ratelimit-reset');
    const err = new Error('Rate limit exceeded');
    err.status = res.status;
    err.resetAt = reset ? new Date(Number(reset) * 1000) : null;
    throw err;
  }
  if (!res.ok) {
    const err = new Error('HTTP ' + res.status);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  const etag = res.headers.get('etag');
  if (etag) {
    try { localStorage.setItem(key, JSON.stringify({ etag, data })); } catch (e) { /* quota — skip caching */ }
  }
  return { data, fromCache: false };
}

/* ---------- mapper / aggregation layer ---------- */
function mapProfile(raw) {
  const created = new Date(raw.created_at);
  const ageYears = ((Date.now() - created.getTime()) / (365.25 * 24 * 3600 * 1000)).toFixed(1);
  return {
    login: raw.login,
    name: raw.name || raw.login,
    bio: raw.bio || '',
    avatarUrl: raw.avatar_url,
    profileUrl: raw.html_url,
    followers: raw.followers,
    following: raw.following,
    publicRepos: raw.public_repos,
    joined: created.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    ageYears,
  };
}
function aggregateRepos(repos) {
  // N+1 avoidance: the per-repo /languages endpoint would cost one call per
  // repo. The repo list's own `language` field gives the breakdown in the
  // calls we already made. Forks are excluded (they are other people's code)
  // and null languages are skipped.
  const own = repos.filter((r) => !r.fork);
  let totalStars = 0;
  let totalForks = 0;
  const langCounts = new Map();
  for (const r of own) {
    totalStars += r.stargazers_count || 0;
    totalForks += r.forks_count || 0;
    if (r.language) langCounts.set(r.language, (langCounts.get(r.language) || 0) + 1);
  }
  const withLang = own.filter((r) => r.language).length;
  const languages = Array.from(langCounts.entries())
    .map(([name, count]) => ({ name, count, pct: withLang ? Math.round(count / withLang * 100) : 0 }))
    .sort((a, b) => b.count - a.count);
  // Footprint stats: honest shares the language chart cannot show —
  // how much of the account is original work, and how current it is.
  const now = Date.now();
  const activeYear = own.filter((r) => now - new Date(r.pushed_at).getTime() < 365.25 * 24 * 3600 * 1000).length;
  const footprint = {
    originalPct: repos.length ? Math.round(own.length / repos.length * 100) : 0,
    activeYear,
    topLanguage: languages.length ? languages[0].name : '—',
  };
  const mapRepo = (r) => ({
    name: r.name,
    url: r.html_url,
    description: r.description || '',
    stars: r.stargazers_count || 0,
    forks: r.forks_count || 0,
    language: r.language || '—',
    pushedAt: r.pushed_at,
  });
  const topByStars = own.slice().sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0)).slice(0, 5).map(mapRepo);
  const recent = own.slice().sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at)).slice(0, 5).map(mapRepo);
  return { totalRepos: repos.length, ownCount: own.length, totalStars, totalForks, languages, topByStars, recent, footprint };
}

/* ---------- load ---------- */
let loadController = null;
async function analyse(username) {
  const name = username.trim();
  if (!name) return;
  state.username = name;
  if (loadController) loadController.abort();
  loadController = new AbortController();
  hideStates();
  showSkeleton();
  el.status.textContent = 'Analysing ' + name + '…';
  try { history.replaceState(null, '', '?user=' + encodeURIComponent(name)); } catch (e) { /* file:// */ }
  try {
    const profileRes = await fetchCached(API + '/users/' + encodeURIComponent(name));
    const profile = mapProfile(profileRes.data);
    const repos = [];
    let cacheHits = profileRes.fromCache ? 1 : 0;
    for (let page = 1; page <= MAX_PAGES; page++) {
      const pageRes = await fetchCached(API + '/users/' + encodeURIComponent(name) + '/repos?per_page=100&page=' + page);
      if (pageRes.fromCache) cacheHits++;
      repos.push(...pageRes.data);
      if (pageRes.data.length < 100) break; // short page = last page
    }
    const agg = aggregateRepos(repos);
    renderResults(profile, agg);
    el.status.textContent = 'Analysis complete for ' + profile.login + (cacheHits ? ' (' + cacheHits + ' response' + (cacheHits > 1 ? 's' : '') + ' served from ETag cache)' : '') + '.';
  } catch (err) {
    if (err.name === 'AbortError') return;
    el.results.innerHTML = '';
    if (err.status === 404) {
      el.emptyText.textContent = 'GitHub returned 404 for "' + name + '". Check the spelling — usernames are a single word with hyphens allowed.';
      hideStates();
      el.empty.hidden = false;
    } else if (err.status === 403 || err.status === 429) {
      const when = err.resetAt ? ' Quota resets at ' + err.resetAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + '.' : '';
      showError('GitHub rate limit reached.' + when + ' Add a free personal token in the settings above to raise the limit to 5,000 requests/hour, or wait for the reset.');
    } else {
      showError('Could not reach the GitHub API. Check your connection and try again.');
    }
    el.status.textContent = '';
  }
}

/* ---------- render ---------- */
function hideStates() { el.empty.hidden = true; el.error.hidden = true; }
function showError(msg) {
  hideStates();
  el.errorText.textContent = msg;
  el.error.hidden = false;
}
function showSkeleton() {
  el.results.innerHTML = '<div class="skeleton"><div class="skel skel-avatar"></div><div class="skel skel-line"></div><div class="skel skel-line short"></div><div class="skel skel-line"></div></div>';
}
function repoLi(r) {
  const pushed = new Date(r.pushedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return '<li><a class="rname" href="' + esc(r.url) + '" target="_blank" rel="noopener">' + esc(r.name) + '</a>' +
    '<div class="rmeta">★ ' + r.stars + ' · ⑂ ' + r.forks + ' · <span class="lang-dot">●</span> ' + esc(r.language) + ' · Last push ' + pushed + '</div>' +
    (r.description ? '<p class="rdesc">' + esc(r.description) + '</p>' : '') + '</li>';
}
function renderResults(profile, agg) {
  hideStates();
  const langs = agg.languages.length
    ? agg.languages.map((l) =>
      '<div class="lang-row"><span class="lang-name">' + esc(l.name) + '</span>' +
      '<span class="lang-track"><span class="lang-fill" style="width:' + Math.max(2, l.pct) + '%"></span></span>' +
      '<span class="pct">' + l.pct + '%</span></div>').join('')
    : '<p>No language data — every repository is a fork or has no detected language.</p>';
  el.results.innerHTML =
    '<article class="profile-card"><div class="profile-top">' +
    '<img src="' + esc(profile.avatarUrl) + '" alt="Avatar of ' + esc(profile.login) + '">' +
    '<div class="profile-main"><div class="profile-name-row"><h2>' + esc(profile.name) + '</h2>' +
    '<a class="profile-link" href="' + esc(profile.profileUrl) + '" target="_blank" rel="noopener">View on GitHub ↗</a></div>' +
    '<p class="login">@' + esc(profile.login) + ' · joined ' + esc(profile.joined) + ' (' + profile.ageYears + ' years ago)</p>' +
    (profile.bio ? '<p class="bio">' + esc(profile.bio) + '</p>' : '') +
    '</div></div>' +
    '<div class="stat-tiles">' +
    '<div class="stat-tile"><b>' + profile.followers + '</b><span>Followers</span></div>' +
    '<div class="stat-tile"><b>' + profile.following + '</b><span>Following</span></div>' +
    '<div class="stat-tile"><b>' + profile.publicRepos + '</b><span>Public repos</span></div>' +
    '<div class="stat-tile"><b>' + agg.totalStars + '</b><span>Total stars · own</span></div>' +
    '<div class="stat-tile"><b>' + agg.totalForks + '</b><span>Total forks · own</span></div>' +
    '</div></article>' +
    '<section class="panel"><div class="panel-head"><h3>Language breakdown</h3><span class="panel-note">share of own repos with a detected language</span></div>' + langs + '</section>' +
    '<section class="panel"><div class="panel-head"><h3>Footprint</h3><span class="panel-note">the numbers GitHub does not show</span></div><div class="footprint-grid">' +
    '<div class="footprint-item"><b>' + agg.footprint.originalPct + '%</b><span>Original work (not forks)</span></div>' +
    '<div class="footprint-item"><b>' + agg.footprint.activeYear + '</b><span>Own repos pushed in the last year</span></div>' +
    '<div class="footprint-item"><b>' + esc(agg.footprint.topLanguage) + '</b><span>Most-used language</span></div>' +
    '</div></section>' +
    '<section class="panel"><div class="panel-head"><h3>Top repositories by stars</h3></div><ul class="repo-list">' +
    (agg.topByStars.length ? agg.topByStars.map(repoLi).join('') : '<li>No repositories found.</li>') + '</ul></section>' +
    '<section class="panel"><div class="panel-head"><h3>Most recently pushed</h3></div><ul class="repo-list">' +
    (agg.recent.length ? agg.recent.map(repoLi).join('') : '<li>No repositories found.</li>') + '</ul></section>';
}

/* ---------- wiring ---------- */
el.form.addEventListener('submit', (e) => {
  e.preventDefault();
  analyse(el.input.value);
});
document.querySelectorAll('[data-try-user]').forEach((b) => {
  b.addEventListener('click', () => {
    el.input.value = b.dataset.tryUser;
    analyse(b.dataset.tryUser);
  });
});
document.getElementById('error-retry').addEventListener('click', () => {
  if (state.username) analyse(state.username);
});
function refreshTokenStatus() {
  el.tokenStatus.textContent = getToken()
    ? 'A token is saved in this browser and will be sent with requests.'
    : 'No token saved — requests run at the 60/hour unauthenticated limit.';
}
document.getElementById('token-save').addEventListener('click', () => {
  const v = el.tokenInput.value.trim();
  try {
    if (v) localStorage.setItem(LS_TOKEN, v);
    el.tokenInput.value = '';
  } catch (e) { /* ignore */ }
  refreshTokenStatus();
});
document.getElementById('token-clear').addEventListener('click', () => {
  try { localStorage.removeItem(LS_TOKEN); } catch (e) { /* ignore */ }
  refreshTokenStatus();
});

function updateOffline() { el.offline.hidden = navigator.onLine; }
window.addEventListener('online', updateOffline);
window.addEventListener('offline', updateOffline);

refreshTokenStatus();
updateOffline();
// Shareable URL: auto-load only when ?user= is present; otherwise wait.
const params = new URLSearchParams(window.location.search);
const initialUser = params.get('user');
if (initialUser) {
  el.input.value = initialUser;
  analyse(initialUser);
}
