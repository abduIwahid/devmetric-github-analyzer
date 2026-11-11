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
function setBusy(busy) {
  const btn = document.querySelector('#search-form button[type="submit"]');
  if (!btn) return;
  btn.disabled = busy;
  btn.classList.toggle('is-loading', busy);
  btn.textContent = busy ? 'Analysing…' : 'Analyse';
}
let loadController = null;
async function analyse(username) {
  const name = username.trim();
  if (!name) return;
  state.username = name;
  if (loadController) loadController.abort();
  loadController = new AbortController();
  hideStates();
  showSkeleton();
  setBusy(true);
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
    const score = computeScore(profile, agg, repos);
    setBusy(false);
    renderResults(profile, agg, score);
    el.status.textContent = 'Analysis complete for ' + profile.login + (cacheHits ? ' (' + cacheHits + ' response' + (cacheHits > 1 ? 's' : '') + ' served from ETag cache)' : '') + '.';
  } catch (err) {
    if (err.name === 'AbortError') return;
    setBusy(false);
    el.results.innerHTML = '';
    if (err.status === 404) {
      el.emptyText.textContent = 'GitHub returned 404 for "' + name + '". Check the spelling — usernames are a single word with hyphens allowed.';
      hideStates();
      el.empty.hidden = false;
    } else if (err.status === 403 || err.status === 429) {
      const when = err.resetAt ? ' Quota resets at ' + err.resetAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + '.' : '';
      showError('GitHub rate limit reached.' + when + ' Wait for the reset — the free unauthenticated limit is 60 requests per hour.');
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
/* Inline SVG icons (stroke style, currentColor) — no emoji, no icon font. */
const ICON_STAR = '<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path d="M12 3.6l2.5 5.2 5.7.7-4.2 3.9 1.1 5.6L12 16.3 6.9 19l1.1-5.6L3.8 9.5l5.7-.7z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
const ICON_FORK = '<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><circle cx="6" cy="5.5" r="2.3" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="6" cy="18.5" r="2.3" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="18" cy="5.5" r="2.3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M6 7.8v8.4M18 7.8c0 4.6-4.9 5-8.6 5.3" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
const ICON_EXT = '<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path d="M14 4h6v6M20 4L11 13M9 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function repoLi(r) {
  const pushed = new Date(r.pushedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return '<li><a class="rname" href="' + esc(r.url) + '" target="_blank" rel="noopener">' + esc(r.name) + '</a>' +
    '<div class="rmeta"><span class="rmeta-item">' + ICON_STAR + r.stars + '</span><span class="rmeta-item">' + ICON_FORK + r.forks + '</span>' +
      (r.language ? '<span class="rmeta-item"><span class="lang-dot"></span>' + esc(r.language) + '</span>' : '') +
      '<span class="rmeta-item">Last push ' + pushed + '</span></div>' +
    (r.description ? '<p class="rdesc">' + esc(r.description) + '</p>' : '') + '</li>';
}
/* ---------- profile score (0-100) ----------
 * A transparent heuristic from data already fetched — no extra calls.
 * Originality 30 · Activity 25 · Reach 20 · Craft 15 · Longevity 10.
 * It is an opinionated summary of this app's own metrics, not an
 * official GitHub measure; the breakdown is always shown with it. */
function computeScore(profile, agg, repos) {
  const parts = [];
  const own = repos.filter((r) => !r.fork);
  const originality = Math.round(agg.footprint.originalPct / 100 * 30);
  parts.push({ label: 'Originality', got: originality, max: 30, note: agg.footprint.originalPct + '% original work' });
  const activity = Math.min(25, Math.round(agg.footprint.activeYear / 20 * 25));
  parts.push({ label: 'Activity', got: activity, max: 25, note: agg.footprint.activeYear + ' repos pushed in the last year' });
  const reachRaw = profile.followers * 2 + agg.totalStars * 5 + agg.totalForks * 3;
  const reach = Math.min(20, Math.round(Math.log10(1 + reachRaw) / Math.log10(1 + 220) * 20));
  parts.push({ label: 'Reach', got: reach, max: 20, note: profile.followers + ' followers, ' + agg.totalStars + ' stars earned' });
  const described = own.filter((r) => r.description).length;
  const withLang = own.filter((r) => r.language).length;
  const craft = own.length ? Math.round(((described + withLang) / (2 * own.length)) * 15) : 0;
  parts.push({ label: 'Craft', got: craft, max: 15, note: described + ' of ' + own.length + ' own repos carry a description' });
  const longevity = Math.min(10, Math.round(parseFloat(profile.ageYears) / 5 * 10));
  parts.push({ label: 'Longevity', got: longevity, max: 10, note: profile.ageYears + ' years on GitHub' });
  const total = parts.reduce((a, p) => a + p.got, 0);
  const grade = total >= 85 ? 'Exceptional' : total >= 70 ? 'Strong' : total >= 50 ? 'Solid' : total >= 30 ? 'Emerging' : 'Just starting';
  return { total, grade, parts };
}
function renderResults(profile, agg, score) {
  hideStates();
  const langs = agg.languages.length
    ? agg.languages.map((l) =>
      '<div class="lang-row"><span class="lang-name">' + esc(l.name) + '</span>' +
      '<span class="pct">' + l.pct + '%</span>' +
      '<span class="lang-track"><span class="lang-fill" style="width:' + Math.max(2, l.pct) + '%"></span></span></div>').join('')
    : '<p>No language data — every repository is a fork or has no detected language.</p>';
  el.results.innerHTML =
    '<article class="profile-card rise" style="--d:0ms"><div class="profile-top">' +
    '<img src="' + esc(profile.avatarUrl) + '" alt="Avatar of ' + esc(profile.login) + '">' +
    '<div class="profile-main"><div class="profile-name-row"><h2>' + esc(profile.name) + '</h2>' +
    '<a class="profile-link" href="' + esc(profile.profileUrl) + '" target="_blank" rel="noopener">View on GitHub ' + ICON_EXT + '</a></div>' +
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
    '<section class="panel score-panel rise" style="--d:60ms"><div class="score-main"><div class="score-ring" style="--score-pct:' + score.total + '"><span class="score-num">' + score.total + '</span></div>' +
    '<div class="score-head"><h3>Profile score</h3><p class="score-grade">' + score.grade + ' · out of 100</p>' +
    '<p class="panel-note">DevMetric\'s own summary of the metrics above — originality, activity, reach, craft and longevity. Not an official GitHub measure.</p></div></div>' +
    '<div class="score-parts">' + score.parts.map((p) =>
      '<div class="score-part"><div class="score-part-top"><span class="score-part-label">' + p.label + '</span><span class="score-part-val">' + p.got + '/' + p.max + '</span></div>' +
      '<span class="lang-track"><span class="lang-fill" style="width:' + Math.round(p.got / p.max * 100) + '%"></span></span>' +
      '<span class="score-part-note">' + esc(p.note) + '</span></div>').join('') + '</div></section>' +
    '<section class="panel rise" style="--d:120ms"><div class="panel-head"><h3>Language breakdown</h3><span class="panel-note">share of own repos with a detected language</span></div>' + langs + '</section>' +
    '<section class="panel rise" style="--d:180ms"><div class="panel-head"><h3>Footprint</h3><span class="panel-note">the numbers GitHub does not show</span></div><div class="footprint-grid">' +
    '<div class="footprint-item"><b>' + agg.footprint.originalPct + '%</b><span>Original work (not forks)</span></div>' +
    '<div class="footprint-item"><b>' + agg.footprint.activeYear + '</b><span>Own repos pushed in the last year</span></div>' +
    '<div class="footprint-item"><b>' + esc(agg.footprint.topLanguage) + '</b><span>Most-used language</span></div>' +
    '</div></section>' +
    '<section class="panel rise" style="--d:240ms"><div class="panel-head"><h3>Top repositories by stars</h3></div><ul class="repo-list">' +
    (agg.topByStars.length ? agg.topByStars.map(repoLi).join('') : '<li>No repositories found.</li>') + '</ul></section>' +
    '<section class="panel rise" style="--d:300ms"><div class="panel-head"><h3>Most recently pushed</h3></div><ul class="repo-list">' +
    (agg.recent.length ? agg.recent.map(repoLi).join('') : '<li>No repositories found.</li>') + '</ul></section>';
}

/* ---------- wiring ---------- */
el.form.addEventListener('submit', (e) => {
  e.preventDefault();
  analyse(el.input.value);
});
function updateOffline() { el.offline.hidden = navigator.onLine; }
window.addEventListener('online', updateOffline);
window.addEventListener('offline', updateOffline);

updateOffline();
// Shareable URL: auto-load only when ?user= is present; otherwise wait.
const params = new URLSearchParams(window.location.search);
const initialUser = params.get('user');
if (initialUser) {
  el.input.value = initialUser;
  analyse(initialUser);
}
