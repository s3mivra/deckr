# Deckr

Collectible trading cards for the projects you have built. Sign in with GitHub,
build one card per project, flip and zoom them, pick a theme, unlock achievements
and share a public profile.

Stack: MongoDB, Express, React, Node. Deploys for free.

## Layout

```
deckr/
  server/   Express API, Mongoose models, GitHub OAuth, achievement engine
  client/   React + Vite single page app, "Cute-alism" design system
  render.yaml   one click API deploy on Render free tier
```

## Local setup

Prerequisites: Node 20 or newer, and either a local MongoDB or a free
MongoDB Atlas M0 cluster.

1. Create a GitHub OAuth app at https://github.com/settings/developers
   - Homepage URL: `http://localhost:5173`
   - Authorization callback URL: `http://localhost:4000/api/auth/github/callback`

2. Server env:

```bash
cp server/.env.example server/.env
# fill in MONGODB_URI, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET
```

3. Client env is optional in dev (the Vite proxy points at the API):

```bash
cp client/.env.example client/.env
```

4. Install and run both apps:

```bash
npm install
npm run dev
```

Client on http://localhost:5173, API on http://localhost:4000.

## Features

- GitHub OAuth only, no passwords stored
- Onboarding: about you, privacy and terms, guidelines, first card
- Card builder with a live flip preview and GitHub prefill (stars, language, stack)
- 5 card themes: lilac, mint, butter, peach, sky
- Flip animation and full screen zoom
- 22 achievements, evaluated server side on every card or profile change
- Showcase up to 4 achievements on a public profile at `/u/:username`
- Public or private profile and per card visibility

Run `npm --workspace server run seed:achievements` to print the full catalog.

## Free deployment

| Piece    | Service            | Notes                                        |
| -------- | ------------------ | -------------------------------------------- |
| Database | MongoDB Atlas M0   | 512 MB, free forever                         |
| API      | Render free web    | uses `render.yaml`, sleeps after 15 min idle |
| Client   | Vercel or Netlify  | `client/vercel.json` and `public/_redirects` |

The client and API deploy as two separate services from the same repo.

### 1. Push the repo to GitHub

```bash
git init && git add -A && git commit -m "Deckr"
gh repo create deckr --private --source . --push
```

### 2. Database: MongoDB Atlas

1. Create a free account at cloud.mongodb.com, then a free **M0** cluster.
2. Database Access: add a user with a password, "Read and write to any database".
3. Network Access: add `0.0.0.0/0` (Render's IPs are not fixed on the free tier).
4. Deploy > Connect > Drivers: copy the SRV string. It looks like
   `mongodb+srv://user:pass@cluster0.xxxx.mongodb.net/?retryWrites=true&w=majority`.
   Add a db name before the `?`: `.../deckr?retryWrites=...`.

### 3. GitHub OAuth app (production)

At https://github.com/settings/developers, "New OAuth App":

- Homepage URL: your Vercel URL, e.g. `https://deckr.vercel.app` (guess it now,
  you can edit later)
- Authorization callback URL: `https://<your-render-service>.onrender.com/api/auth/github/callback`

Copy the Client ID and generate a Client secret. Leave Device Flow and token
expiry off.

### 4. API on Render

1. render.com > New > **Blueprint**, pick this repo. Render reads `render.yaml`
   and creates the `deckr-api` web service (`rootDir: server`).
2. It will prompt for the `sync: false` env vars. Set:
   - `MONGODB_URI` = the Atlas string from step 2
   - `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` = from step 3
   - `GITHUB_CALLBACK_URL` = `https://<service>.onrender.com/api/auth/github/callback`
   - `CLIENT_URL` = your Vercel URL (no trailing slash)
   - `JWT_SECRET` is generated automatically.
3. Deploy. When it is live, hit `https://<service>.onrender.com/api/health`,
   you should get `{"ok":true}`.

### 5. Client on Vercel

1. vercel.com > Add New > Project, import the repo.
2. Set **Root Directory** to `client`. Vercel picks up `client/vercel.json`
   (framework: Vite, output `dist`, SPA rewrite).
3. Environment Variables: `VITE_API_URL` = `https://<service>.onrender.com`
   (no `/api`, no trailing slash). Optional: `VITE_SUPPORT_URL` for the coffee
   button.
4. Deploy.

### 6. Reconcile URLs

- If your real Vercel URL differs from what you guessed, update the GitHub OAuth
  app Homepage URL and the Render `CLIENT_URL` var, then redeploy the API.
- Redeploy the client if you changed `VITE_API_URL`.

### Notes

- The free Render service sleeps after 15 minutes idle. The first request after
  that takes ~30s to wake. A cron ping (e.g. cron-job.org hitting `/api/health`
  every 10 min) keeps it warm.
- `render.yaml` installs with `--no-workspaces` so the server builds on its own,
  independent of the repo-root npm workspace config. Same for `installCommand`
  in `client/vercel.json`.
- Netlify instead of Vercel: base directory `client`, build `npm run build`,
  publish `client/dist`. `public/_redirects` handles SPA routing. Set
  `VITE_API_URL` the same way.

## API quick reference

```
GET    /api/health
GET    /api/auth/github               start OAuth
GET    /api/auth/github/callback      OAuth return, redirects to client
GET    /api/auth/me                   current user + unlocked achievement keys
POST   /api/auth/logout

PATCH  /api/users/me                  edit profile, change username
POST   /api/users/me/onboarding       finish onboarding
PUT    /api/users/me/showcase         set up to 4 showcased achievement keys
GET    /api/users/:username           public profile, cards, achievements

GET    /api/cards                     my cards
POST   /api/cards                     create
GET    /api/cards/:id                 one card (public unless private)
PATCH  /api/cards/:id                 update
DELETE /api/cards/:id                 delete
POST   /api/cards/:id/sync            refresh stars and language from GitHub
GET    /api/cards/prefill?repo=...    prefill fields from a public repo

GET    /api/achievements              catalog with unlocked flags
POST   /api/achievements/evaluate     force a re-check
```
