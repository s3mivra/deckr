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

Steps:

1. Create the Atlas cluster, copy the SRV connection string.
2. On Render, "New" then "Blueprint", point it at this repo. Render reads
   `render.yaml`. Set `MONGODB_URI`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`,
   `GITHUB_CALLBACK_URL` (your Render URL plus `/api/auth/github/callback`) and
   `CLIENT_URL` (your Vercel URL).
3. On Vercel, import the repo, set the project root to `client`, add
   `VITE_API_URL` pointing at the Render URL.
4. Update the GitHub OAuth app URLs to the deployed domains.

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
