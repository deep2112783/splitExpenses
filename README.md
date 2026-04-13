# SplitSmart

SplitSmart is a web application to split expenses inside groups, track balances, request and accept settlements (cash or UPI), and keep group members financially in sync with notifications and a dashboard.

## Key Features

- Create and join groups
- Add expenses and split them equally or with custom shares
- View group-level and per-member balances
- Request cash settlements (pending requests) or record net/app settlements
- In-app notifications for events (expenses, joins, settlement requests)
- Dashboard and recent activity

## Tech Stack

- Frontend: React (Vite) + TailwindCSS + shadcn UI primitives
- Backend: Node.js + Express
- Database: MongoDB (via Mongoose)

## Project structure (folders)

- `client/`
  - `public/`
  - `src/`
    - `lib/`
    - `hooks/`
    - `components/`
      - `layout/`
      - `landing/`
      - `ui/`
    - `pages/`
- `server/`
  - `src/`
    - `config/`
    - `routes/`
    - `models/`
    - `utils/`
    - `middleware/`

> Note: See the code for individual files in each folder (pages, routes, models). The folders above contain the application code and UI primitives.

## Important files

- `client/vite.config.js` — Vite dev server config and `/api` proxy to the backend
- `client/src/lib/api.js` — helper for authenticated API requests and small local pending-request helpers used by the UI
- `server/src/server.js` — Express app entry
- `server/.env` — environment variables (see example below)

## Environment variables

Create/update `server/.env` with values appropriate for your environment. Example:

```
PORT=5001
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/<dbname>
JWT_SECRET=replace-with-a-secret
CLIENT_ORIGIN=http://localhost:8080
```

Adjust `CLIENT_ORIGIN` to match the dev port Vite uses (Vite may auto-select another free port if the configured one is taken).

## Run locally (development)

1. Start the backend server

```bash
cd server
npm install
# ensure server/.env is configured
npm run dev
```

The server will log which port it listens on (defaults to `5001`), and reads `CLIENT_ORIGIN` from `server/.env` for CORS.

2. Start the frontend (client)

```bash
cd client
npm install
npm run dev
```

Vite will start the dev server and print the local URL (e.g. `http://localhost:8080` or another available port). The frontend proxies `/api` to the server port configured in `client/vite.config.js` (default target `http://localhost:5001`).

## Notes and tips

- The client stores a small local cache of outgoing pending settlement requests to prevent duplicate cash requests from multiple UI sections (Groups / Expenses / Balances). These are recorded in `sessionStorage` and cleared when the server-accepted events are observed.
- If the dev client shows the wrong origin or port, check `client/vite.config.js` (server port and proxy) and `server/.env` (CLIENT_ORIGIN).
- To change the displayed favicon or site meta, edit `client/index.html`.

## Build and deploy

1. Build client

```bash
cd client
npm run build
```

2. Serve built client (your choice of static host) and run the server in production mode (`node src/server.js`) with `server/.env` configured for production.


