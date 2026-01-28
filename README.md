# FirmerQuest

Short setup guide for running and testing the project.

## Prerequisites
- Node.js 22 (recommended)
- MongoDB running locally

## Setup
1) Install server dependencies:
```bash
cd server
npm install
```

2) Configure environment:
- Copy `server/.env.example` → `server/.env`
- Add `JWT_SECRET` (required for login)
Example:
```
MONGODB_URI=mongodb://127.0.0.1:27017/intern_quest
JWT_SECRET=your_secret_here
SEED_USERS_PATH=./seed-data/users.json
SEED_LOGS_PATH=./seed-data/logs.json
SEED_RESET=false
```

3) Seed the database (optional but recommended):
```bash
cd server
npm run seed
```

4) Install client dependencies:
```bash
cd client
npm install
```

## Run
Open two terminals:

**Terminal 1 (server)**
```bash
cd server
npm run dev
```

**Terminal 2 (client)**
```bash
cd client
npm run dev
```

Then open the client app at:
```
http://localhost:5173
```

## Test / Quick checks

### Login API
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"alice123"}'
```

### Logs API
```bash
TOKEN="your_jwt_here"
curl "http://localhost:4000/api/logs?page=1&limit=50" \
  -H "Authorization: Bearer $TOKEN"
```

### Export Excel
```bash
TOKEN="your_jwt_here"
curl -H "Authorization: Bearer $TOKEN" \
  -o logs.xlsx \
  "http://localhost:4000/api/logs/export/excel"
```

### Export PDF (client)
Use the **Export PDF** button on the Log page.

---
Notes:
- Client uses Vite proxy to `http://localhost:4000`.
- If login fails, confirm `JWT_SECRET` is set in `server/.env`.
