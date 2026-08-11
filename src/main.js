import '@material/web/button/filled-button.js';
import '@material/web/button/filled-tonal-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/button/text-button.js';
import '@material/web/iconbutton/icon-button.js';
import '@material/web/icon/icon.js';
import '@material/web/chips/assist-chip.js';
import '@material/web/progress/circular-progress.js';
import '@material/web/progress/linear-progress.js';
import '@material/web/labs/card/elevated-card.js';
import '@material/web/labs/card/outlined-card.js';
import '@material/web/list/list.js';
import '@material/web/list/list-item.js';
import '@material/web/divider/divider.js';

import { initTheme } from './theme.js';
import {
  GH_USER,
  ACHIEVEMENTS,
  LANGUAGE_COLORS,
  languageColor,
  fetchUser,
  fetchRepos,
  fetchEvents,
  humanizeEvent,
  rateLimitMessage,
  fmtCount,
  fmtDate,
} from './github.js';
import './styles.css';

const OCTI_STAR =
  '<path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"/>';

const OCTI_FORK =
  '<path d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z"/>';

function octiIcon(path, label) {
  const span = document.createElement('span');
  span.className = 'octi';
  span.setAttribute('role', 'img');
  span.setAttribute('aria-label', label);
  span.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true" width="14" height="14">${path}</svg>`;
  return span;
}

const $ = (id) => document.getElementById(id);

const els = {
  navAvatar: $('nav-avatar'),
  heroAvatar: $('hero-avatar'),
  heroBio: $('hero-bio'),
  heroStats: $('hero-stats'),
  statGrid: $('stat-grid'),
  languages: $('languages'),
  achievements: $('achievements'),
  projects: $('projects'),
  activityList: $('activity-list'),
  activityPanel: $('activity-panel'),
  activityEmpty: $('activity-empty'),
  activityLoading: $('activity-loading'),
  githubLoading: $('github-loading'),
  githubContent: $('github-content'),
  githubError: $('github-error'),
  githubErrorMsg: $('github-error-msg'),
};

let state = null;

/* ---------- renderers ---------- */

function renderProfile(user) {
  const avatar = `${user.avatar_url}&s=320`;
  els.navAvatar.src = avatar;
  els.navAvatar.alt = `@${GH_USER}`;
  els.heroAvatar.src = avatar;
  els.heroAvatar.alt = `${user.login}'s avatar`;
  els.heroBio.innerHTML =
    'I dabble in Python, bash, C++, and QML. <span class="hero__pasta">Proud Pastafarian.</span>';
}

function renderHeroStats(user, repos) {
  const stars = repos.reduce((sum, r) => sum + (r.stargazers_count || 0), 0);
  const chips = [
    [`${fmtCount(repos.length)}`, 'repos'],
    [`${fmtCount(user.followers)}`, 'followers'],
    [`${fmtCount(user.following)}`, 'following'],
    [`${fmtCount(stars)}`, 'stars earned'],
  ];
  els.heroStats.innerHTML = chips
    .map(([v, l]) => `<span class="chip-static"><b>${v}</b> ${l}</span>`)
    .join('');
}

function statCard(icon, value, label) {
  const card = document.createElement('md-outlined-card');
  card.className = 'stat-card';
  card.innerHTML = `
    <md-icon class="stat-card__icon">${icon}</md-icon>
    <span class="stat-card__value">${value}</span>
    <span class="stat-card__label">${label}</span>`;
  return card;
}

function renderStatGrid(user, repos) {
  const stars = repos.reduce((sum, r) => sum + (r.stargazers_count || 0), 0);
  const forks = repos.reduce((sum, r) => sum + (r.forks_count || 0), 0);
  const watch = repos.reduce((sum, r) => sum + (r.watchers_count || 0), 0);
  const since = new Date(user.created_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
  });
  const top = [...repos].sort((a, b) => b.stargazers_count - a.stargazers_count)[0];
  const topStarred = top ? `${fmtCount(top.stargazers_count)} · ${top.name}` : '—';

  els.statGrid.replaceChildren(
    statCard('folder', repos.length, 'Public repositories'),
    statCard('group', user.followers, 'Followers'),
    statCard('person_add', user.following, 'Following'),
    statCard('star', stars, 'Stars earned'),
    statCard('fork_right', forks, 'Forks'),
    statCard('calendar_month', since, 'On GitHub since'),
    statCard('trending_up', topStarred, 'Most starred repo'),
    statCard('schedule', fmtCount(watch), 'Watchers'),
  );
}

function renderLanguages(repos) {
  const counts = {};
  for (const r of repos) {
    if (r.language) counts[r.language] = (counts[r.language] || 0) + 1;
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  if (!entries.length) {
    els.languages.innerHTML = '<p class="muted">No languages detected.</p>';
    return;
  }

  els.languages.innerHTML = entries
    .map(([lang, n]) => {
      const color = languageColor(lang) || '#6e7681';
      const pct = (n / total) * 100;
      return `
      <div class="lang">
        <div class="lang__row">
          <span class="lang__dot" style="background:${color}"></span>
          <span class="lang__name">${lang}</span>
          <span class="lang__count">${n} repo${n === 1 ? '' : 's'}</span>
        </div>
        <md-linear-progress value="${pct / 100}"></md-linear-progress>
      </div>`;
    })
    .join('');
}

function renderAchievements() {
  els.achievements.innerHTML = '';
  for (const a of ACHIEVEMENTS) {
    const chip = document.createElement('md-assist-chip');
    chip.label = a.label;
    chip.setAttribute('elevated', '');
    chip.setAttribute('title', a.title);
    chip.setAttribute('aria-label', `${a.label} — ${a.title}`);
    chip.innerHTML = `<md-icon slot="icon">${a.icon}</md-icon>`;
    els.achievements.appendChild(chip);
  }
}

function projectCard(repo) {
  const card = document.createElement('md-elevated-card');
  card.className = 'project-card';
  const stars = octiIcon(OCTI_STAR, 'stars');
  const forks = octiIcon(OCTI_FORK, 'forks');
  const topics = (repo.topics || [])
    .slice(0, 4)
    .map((t) => `<span class="topic">${t}</span>`)
    .join('');

  const lang = repo.language
    ? `<span class="project-card__lang"><span class="lang-dot" style="background:${languageColor(repo.language)}"></span>${repo.language}</span>`
    : '';

  card.innerHTML = `
    <div class="project-card__head">
      <a class="project-card__name" href="${repo.html_url}" target="_blank" rel="noopener">${repo.name}</a>
      <span class="project-card__stars">${repo.stargazers_count}</span>
    </div>
    <p class="project-card__desc">${repo.description || 'No description.'}</p>
    <div class="project-card__meta">
      ${lang}
      <span class="project-card__meta-item">${forks.outerHTML} ${repo.forks_count}</span>
      <span class="project-card__meta-item project-card__updated">Updated ${fmtDate(repo.pushed_at || repo.updated_at)}</span>
    </div>
    ${topics ? `<div class="project-card__topics">${topics}</div>` : ''}`;

  card.querySelector('.project-card__stars').prepend(stars);
  return card;
}

function renderProjects(repos) {
  const featured = [...repos]
    .filter((r) => !r.archived)
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 8);
  els.projects.replaceChildren(...featured.map(projectCard));
}

function renderEvents(events) {
  const featured = events.filter((e) => e.payload && e.repo).slice(0, 15);
  if (!featured.length) {
    els.activityEmpty.hidden = false;
    els.activityPanel.hidden = true;
    return;
  }
  els.activityEmpty.hidden = true;
  els.activityPanel.hidden = false;

  const items = featured.map((e) => {
    const h = humanizeEvent(e);
    const item = document.createElement('md-list-item');
    item.type = 'link';
    item.href = h.link;
    item.target = '_blank';
    item.headline = h.text.replace(/<[^>]*>/g, '');
    item.supportingText = h.time;
    const icon = document.createElement('md-icon');
    icon.slot = 'start';
    icon.textContent = h.icon;
    item.appendChild(icon);
    return item;
  });
  els.activityList.replaceChildren(...items);
}

/* ---------- load ---------- */

async function loadAll() {
  els.githubLoading.hidden = false;
  els.githubError.hidden = true;
  els.githubContent.hidden = true;

  try {
    const [user, repos, events] = await Promise.all([fetchUser(), fetchRepos(), fetchEvents()]);
    state = { user, repos, events };
    renderProfile(user);
    renderHeroStats(user, repos);
    renderStatGrid(user, repos);
    renderLanguages(repos);
    renderAchievements();
    renderProjects(repos);
    renderEvents(events);
    els.githubLoading.hidden = true;
    els.githubContent.hidden = false;
  } catch (err) {
    els.githubLoading.hidden = true;
    els.githubError.hidden = false;
    els.githubErrorMsg.textContent = rateLimitMessage(err);
    if (state) els.githubContent.hidden = false;
  }
}

function init() {
  initTheme();
  $('year').textContent = new Date().getFullYear();
  $('refresh-btn').addEventListener('click', loadAll);
  $('retry-btn').addEventListener('click', loadAll);
  loadAll();
}

init();
