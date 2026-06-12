# Workforce Management Platform

Full-stack MERN workforce management platform with role-based auth, user management, developer tasks, dashboard analytics, caller interviews, bidder submissions, owner-user chat, payments, performance scoring, activity logs, settings, and notifications.

## Start

```bash
npm run install:all
cp .env.example server/.env
npm run dev
```

Fill `server/.env` with MongoDB Atlas, JWT, Cloudinary, and client URL values before using database-backed APIs.

## Initial Owner

There is no public signup. After configuring `server/.env`, create the first owner from the server folder:

```bash
npm run seed:owner -- "Owner Name" owner@example.com "strong-password"
```

After that, the owner can create all other users from the app.

## Commands

```bash
npm run dev --prefix server
npm run dev --prefix client
npm run build --prefix client
```

The root `npm run dev` uses `concurrently` to run both apps.

## Verification Audit

Configure `server/.env` with a disposable test MongoDB URI and JWT secrets, restart the server, then run:

```bash
npm run seed:owner --prefix server -- "Test Owner" owner@test.com "TestPass123!"
npm run seed:audit-fixtures --prefix server -- --confirm-disposable-db
npm run verify:audit --prefix server -- --use-existing-fixtures --confirm-disposable-db
```

For a fully reset deterministic audit that recreates all four fixture users directly through Mongoose, run:

```bash
npm run verify:audit --prefix server -- --confirm-disposable-db
```

The prompt-exact path creates the owner with the seed script, creates the remaining roles through `/api/users`, confirms all four users directly in MongoDB, then runs the live HTTP/Socket.io permission and business-logic report. Generated fixture records are left in the test database for manual testing.

## Deployment

Deploy the app as two services:

- Frontend: `client/` on Vercel as a Vite project.
- Backend: `server/` on Render or Railway as a persistent Node service with Socket.io support.

### Backend on Render

1. Create a new Render Web Service from the GitHub repository.
2. Set the root directory to `server`.
3. Use `npm install` as the build command and `npm start` as the start command.
4. Add production environment variables:
   - `MONGO_URI` - production MongoDB Atlas URI, not the test URI.
   - `JWT_SECRET` - production random secret.
   - `JWT_REFRESH_SECRET` - production random refresh secret.
   - `PORT` - `5000` for local parity, or leave Render's injected port if preferred.
   - `CLIENT_URL` - the deployed Vercel frontend URL.
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
5. After Render gives the backend URL, use it for the frontend env vars below.

`server/render.yaml` is included as a reference blueprint, but manual setup is still required for account creation and secret entry.

### Frontend on Vercel

1. Create a new Vercel project from the same GitHub repository.
2. Set the root directory to `client`.
3. Keep the Vite defaults: build command `npm run build`, output directory `dist`.
4. Add production environment variables:
   - `VITE_API_URL=https://your-backend-host/api`
   - `VITE_SOCKET_URL=https://your-backend-host`
5. Deploy, then update backend `CLIENT_URL` to the final Vercel URL and redeploy/restart the backend.

### Handoff Notes

- Do not ship the test Atlas URI as production infrastructure.
- Do not commit `.env` files or plaintext secrets.
- Test accounts such as `owner@test.com` are throwaway fixtures and should be wiped or clearly documented before client handoff.
