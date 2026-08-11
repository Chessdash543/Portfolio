# DiM — Portfolio

My web portfolio, rebuilt on **Material Design 3** with **Material Web** (`@material/web`) and live GitHub integration.

- **Live data**: profile, repos, languages, and activity are fetched from the GitHub REST API on every load.
- **M3 dynamic color**: theme is generated from a seed color with `@material/material-color-utilities`; light/dark/system scheme with a toggle.
- **Deploy**: GitHub Pages via GitHub Actions.

## Content

Everything on [dim.contact](https://dim.contact) is preserved:

- Identity — DiM · dɪm · he/him/his · United States
- Bio — *I dabble in Python, bash, C++, and QML. Proud Pastafarian.*
- Contact — Matrix `@d-im:beeper.com`, email `dim@dim.contact`
- Payments — PayPal `MRudim`, Cash App `$MattRds`

Plus deeper GitHub integration:

- Live profile stats (repos, followers, stars, forks, account age, watchers)
- Language breakdown across all repositories
- Top projects sorted by stars, with topics and language badges
- Recent public activity feed (pushed / PRs / releases / stars…)
- Achievements (YOLO, Pull Shark, Starstruck, Quickdraw)

## Getting started

```bash
npm install
npm run dev      # local dev server
npm run build    # production build -> dist/
npm run preview  # preview the build
```

## GitHub integration

All data is pulled client-side from the GitHub REST API, so it's always up to date:

| Data | Endpoint |
| --- | --- |
| Profile | `GET /users/dim-ghub` |
| Repositories | `GET /users/dim-ghub/repos` (paginated) |
| Activity | `GET /users/dim-ghub/events/public` |

Anonymous requests are limited to **60 requests/hour** per IP. If you hit the limit, the site shows a friendly banner with the reset time and a retry button. To avoid limits entirely, run the app with your own token:

```bash
gh auth login          # or create a token with read-only access
npm run dev
```

To use a token, set `VITE_GITHUB_TOKEN` in a local `.env` file (it only sends the `Authorization` header — never commit it).

## Deploying

Push to `main` and the [GitHub Actions workflow](.github/workflows/deploy.yml) builds and deploys to GitHub Pages automatically at `https://dim-ghub.github.io/Portfolio/`.

To serve it from your own domain (e.g. `dim.contact`), add a `public/CNAME` file containing your domain, point your DNS at GitHub Pages, and update the `base` in `vite.config.js` to `/`.

## Stack

- [Material Web](https://github.com/material-components/material-web) — Material 3 web components
- [Material Color Utilities](https://github.com/material-foundation/material-color-utilities) — dynamic M3 color generation
- [Vite](https://vitejs.dev/) — build tool
- [GitHub REST API](https://docs.github.com/en/rest) — live data
