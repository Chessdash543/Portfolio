export const GH_USER = 'dim-ghub';

const API = 'https://api.github.com';

async function gh(path) {
  const res = await fetch(`${API}${path}`, {
    headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
  });
  if (!res.ok) {
    const remaining = res.headers.get('X-RateLimit-Remaining');
    const reset = res.headers.get('X-RateLimit-Reset');
    const err = new Error(`GitHub API error ${res.status} (${path})`);
    err.rateLimited = res.status === 403 && remaining === '0';
    err.resetAt = reset ? Number(reset) * 1000 : null;
    throw err;
  }
  return res.json();
}

export async function fetchUser() {
  return gh(`/users/${GH_USER}`);
}

export async function fetchRepos() {
  const repos = [];
  let page = 1;
  for (;;) {
    const batch = await gh(`/users/${GH_USER}/repos?per_page=100&page=${page}&sort=updated`);
    repos.push(...batch);
    if (batch.length < 100) break;
    page += 1;
  }
  return repos;
}

export async function fetchEvents() {
  return gh(`/users/${GH_USER}/events/public?per_page=30`);
}

export const LANGUAGE_COLORS = {
  Python: '#3572A5',
  Shell: '#89e051',
  'C++': '#f34b7d',
  QML: '#44a51c',
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  CSS: '#563d7c',
  HTML: '#e34c26',
  Go: '#00ADD8',
  Kotlin: '#A97BFF',
  'C#': '#178600',
  PowerShell: '#012456',
  C: '#555555',
  Rust: '#dea584',
  Java: '#b07219',
  Zig: '#ec915c',
  Lua: '#000080',
  Nix: '#7e7eff',
  Ruby: '#701516',
};

export function languageColor(lang) {
  if (!lang) return null;
  const lower = lang.toLowerCase();
  for (const [name, color] of Object.entries(LANGUAGE_COLORS)) {
    if (name.toLowerCase() === lower) return color;
  }
  return '#6e7681';
}

export const ACHIEVEMENTS = [
  { slug: 'yolo', label: 'YOLO', title: 'Merged a pull request without a review on the default branch.', icon: 'rocket_launch' },
  { slug: 'pull_shark', label: 'Pull Shark', title: 'Opened pull requests that have been merged.', icon: 'shark_fin' },
  { slug: 'starstruck', label: 'Starstruck', title: 'Your repository has received stars.', icon: 'star' },
  { slug: 'quickdraw', label: 'Quickdraw', title: 'Closed an issue or PR within 5 minutes of opening it.', icon: 'bolt' },
];

function relTime(iso) {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.round(months / 12);
  return `${years}y ago`;
}

export function fmtDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function fmtCount(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(n);
}

function repoName(full) {
  return full.replace(`${GH_USER}/`, '');
}

export function humanizeEvent(e) {
  const repo = repoName(e.repo.name);
  const icon = 'code';
  let text = '';

  switch (e.type) {
    case 'PushEvent':
      text = `Pushed to <b>${repo}</b>`;
      break;
    case 'CreateEvent': {
      const ref = e.payload.ref;
      if (e.payload.ref_type === 'repository') text = `Created repository <b>${repo}</b>`;
      else if (ref) text = `Created ${e.payload.ref_type} <b>${ref}</b> in <b>${repo}</b>`;
      else text = `Created ${e.payload.ref_type} in <b>${repo}</b>`;
      break;
    }
    case 'DeleteEvent':
      text = `Deleted ${e.payload.ref_type} <b>${e.payload.ref}</b> in <b>${repo}</b>`;
      break;
    case 'StarEvent':
      text = `Starred <b>${repo}</b>`;
      break;
    case 'ForkEvent':
      text = `Forked <b>${repo}</b>`;
      break;
    case 'PullRequestEvent': {
      const a = e.payload.action;
      text = a === 'closed' && e.payload.pull_request?.merged
        ? `Merged PR <b>#${e.payload.number}</b> in <b>${repo}</b>`
        : `${a[0].toUpperCase() + a.slice(1)} PR <b>#${e.payload.number}</b> in <b>${repo}</b>`;
      break;
    }
    case 'IssuesEvent': {
      const a = e.payload.action;
      text = `${a[0].toUpperCase() + a.slice(1)} issue <b>#${e.payload.issue.number}</b> in <b>${repo}</b>`;
      break;
    }
    case 'IssueCommentEvent':
      text = `Commented on issue <b>#${e.payload.issue.number}</b> in <b>${repo}</b>`;
      break;
    case 'ReleaseEvent':
      text = `Released <b>${e.payload.release?.name || e.payload.release?.tag_name || 'a release'}</b> in <b>${repo}</b>`;
      break;
    case 'PublicEvent':
      text = `Made <b>${repo}</b> public`;
      break;
    case 'WatchEvent':
      text = `Started watching <b>${repo}</b>`;
      break;
    default:
      text = `${e.type} on <b>${repo}</b>`;
  }

  return { icon, text, time: relTime(e.created_at), link: e.repo.url.replace('api.github.com/repos', 'github.com') };
}

export function rateLimitMessage(err) {
  if (err.rateLimited) {
    const reset = err.resetAt ? new Date(err.resetAt).toLocaleTimeString() : 'soon';
    return `GitHub rate limit reached (60 req/hr for anonymous users). It resets at ${reset} — or run your own copy with a token.`;
  }
  if (err.message) return err.message;
  return 'Unknown error while talking to GitHub.';
}
