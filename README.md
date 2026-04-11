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

- Frontend: React (Vite) + TailwindCSS 
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





Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```



## What technologies are used for this project?

This project is built with:

- Vite
- JavaScript
- React
- Tailwind CSS


