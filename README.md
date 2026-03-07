# 🏐 Volleyball Manager

App per il monitoraggio e la gestione di partite di pallavolo.

**Stack:**
- Frontend: React 18 + Vite + Tailwind CSS
- Backend: Node.js + Express
- Database: PostgreSQL
- Deploy: Railway (tutto in uno)

---

## Sviluppo locale

### Prerequisiti
- Node.js ≥ 18
- PostgreSQL installato localmente (o usa Docker)
- Git

### 1. Clona e installa
```bash
git clone <tuo-repo>
cd volleyball-app
npm run install:all   # installa dipendenze di client/ e server/
```

### 2. Configura le variabili d'ambiente
```bash
cp .env.example server/.env
# Modifica server/.env con i tuoi valori locali
```

Valori minimi per lo sviluppo:
```env
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=tua_password
DB_NAME=volleyball
JWT_SECRET=una_stringa_segreta_lunga_almeno_32_caratteri
```

### 3. Inizializza il database
```bash
# Crea il database
psql -U postgres -c "CREATE DATABASE volleyball;"

# Esegui lo schema (nella root del progetto)
psql -U postgres -d volleyball -f volleyball_v3_integration.sql
```

### 4. Avvia in sviluppo
```bash
npm run dev
# Frontend: http://localhost:5173
# Backend:  http://localhost:3000
# Il proxy Vite inoltra /api/* al backend automaticamente
```

---

## Deploy su Railway (raccomandato)

Railway gestisce frontend + backend + database in un'unica piattaforma.
Costo: ~$5/mese per progetti piccoli (piano Starter).

### 1. Crea account e progetto
1. Vai su [railway.app](https://railway.app) → Sign up con GitHub
2. New Project → **Deploy from GitHub repo**
3. Seleziona il tuo repository

### 2. Aggiungi il database PostgreSQL
1. Nel progetto Railway → **New** → **Database** → **Add PostgreSQL**
2. Railway crea automaticamente `DATABASE_URL` come variabile d'ambiente

### 3. Inizializza il DB in produzione
1. Vai sul servizio PostgreSQL → **Connect** → copia la connection string
2. Esegui: `psql <DATABASE_URL> -f volleyball_v3_integration.sql`

### 4. Configura le variabili d'ambiente del server
Nel tuo servizio Railway → **Variables**, aggiungi:

| Variabile | Valore |
|-----------|--------|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | stringa random lunga (usa: `openssl rand -base64 32`) |
| `JWT_EXPIRY` | `8h` |
| `ALLOWED_ORIGINS` | `https://tuo-dominio.railway.app` |
| `ALLOW_PUBLIC_REGISTER` | `false` |
| `REGISTER_INVITE_CODE` | codice a tua scelta |
| `DB_SSL` | `true` |

> `DATABASE_URL` viene aggiunta automaticamente da Railway quando colleghi PostgreSQL.

### 5. Come funziona il build
Railway esegue automaticamente (grazie a `railway.json`):
1. `npm run build` → compila il frontend React in `client/dist/`
2. `npm start` → avvia Express che serve sia le API che i file statici React

### 6. Ottieni il dominio
Railway assegna un dominio tipo `volleyball-app-production.up.railway.app`.
Puoi anche collegare un dominio custom (Settings → Domains).

---

## Struttura del progetto

```
volleyball-app/
├── client/                    # React + Vite + Tailwind
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/        # AppShell, ProtectedRoute
│   │   │   └── court/         # (future componenti campo)
│   │   ├── context/
│   │   │   └── AuthContext.jsx  # Login/logout, token storage
│   │   ├── lib/
│   │   │   ├── api.js          # Fetch wrapper autenticato
│   │   │   ├── enums.js        # Costanti STAT, ACTION_MAP...
│   │   │   └── match-engine.js # Classi Match/Squad/Player/Sset
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   └── Monitor.jsx     # Monitoraggio partita live
│   │   └── App.jsx
│   └── vite.config.js          # Proxy /api → localhost:3000
│
├── server/                    # Node.js + Express
│   ├── routes/
│   │   ├── auth.js            # Login, register, me, refresh
│   │   ├── matches.js         # CRUD partite + save (con stats)
│   │   ├── teams.js           # Squadre + stats
│   │   ├── players.js         # Giocatori + stats
│   │   └── competitions.js    # Campionati e tornei
│   ├── middleware/
│   │   └── auth.js            # JWT verify, requireRole
│   ├── db.js                  # Pool PostgreSQL
│   └── server.js              # Entry point Express
│
├── railway.json               # Config deploy
├── .env.example               # Template variabili d'ambiente
└── package.json               # Script monorepo (dev, build, start)
```

---

## Flow utente

```
/login  →  autenticazione JWT
   ↓
/dashboard  →  lista partite + stats squadra
   ↓
clic su partita "Programmata"  →  apre Monitor in modalità setup
clic su partita "In corso"     →  riprende Monitor
clic su partita "Completata"   →  vista sola lettura (futura)
   ↓
/monitor/:id  →  monitoraggio live
  - Campo con giocatori posizionati
  - Panchina + timeout per entrambe le squadre
  - Pulsanti azione (Punto, Ace, Out, ...)
  - Cambio giocatori
  - Cartellini
  - Undo ultimo punto
  - Pannello statistiche
  - Salva su DB (💾)
```

---

## API principali

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login → JWT |
| GET | `/api/auth/me` | Profilo utente corrente |
| GET | `/api/teams/me` | Squadre del coach |
| GET | `/api/matches/team/:id` | Partite di una squadra |
| GET | `/api/matches/:id/lineup` | Formazione di una partita |
| POST | `/api/matches/:id/save` | Salva risultato + stats |
| GET | `/api/teams/:id/stats` | Statistiche squadra |
| GET | `/api/players/:id/stats` | Statistiche giocatore |

---

## Troubleshooting

**"Cannot connect to database"**
→ Verifica `DATABASE_URL` o le variabili `DB_*` nel `.env`

**CORS error in produzione**
→ Imposta `ALLOWED_ORIGINS=https://tuo-dominio.railway.app` nelle variabili Railway

**Build fallisce su Railway**
→ Assicurati che `client/package.json` sia presente e che lo script `build` sia definito

**JWT_SECRET mancante in produzione**
→ Railway → Variables → aggiungi `JWT_SECRET` con valore generato da `openssl rand -base64 32`
