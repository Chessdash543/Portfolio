import { argbFromHex, hexFromArgb, themeFromSourceColor } from '@material/material-color-utilities';

const SEED = '#8e6cf7';

const DARK_QUERY = window.matchMedia('(prefers-color-scheme: dark)');
const store = window.localStorage;
const metaTheme = document.getElementById('meta-theme-color');

let scheme = store.getItem('theme') || 'system';

const schemeState = {
  light: false,
  dark: true,
  system: DARK_QUERY.matches,
};

const theme = themeFromSourceColor(argbFromHex(SEED));

function apply() {
  const dark = schemeState[scheme];
  document.body.classList.toggle('dark', dark);
  document.body.classList.toggle('light', !dark);
  metaTheme.setAttribute('content', hexFromArgb(theme.schemes[dark ? 'dark' : 'light'].surface));
}

export function initTheme() {
  apply();
  DARK_QUERY.addEventListener('change', () => {
    if (scheme === 'system') apply();
  });

  const toggle = document.getElementById('theme-toggle');
  const icon = document.getElementById('theme-icon');

  function syncIcon() {
    const dark = schemeState[scheme];
    icon.textContent = dark ? 'light_mode' : 'dark_mode';
  }

  toggle.addEventListener('click', () => {
    scheme = schemeState[scheme] ? 'light' : 'dark';
    store.setItem('theme', scheme);
    apply();
    syncIcon();
  });

  syncIcon();
}

export function seedSwatch() {
  return hexFromArgb(argbFromHex(SEED));
}
