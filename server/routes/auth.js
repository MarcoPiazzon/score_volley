const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const pool    = require('../db');
const { authenticate } = require('../middleware/auth');

const TOKEN_EXPIRY = process.env.JWT_EXPIRY || '8h';


// ================================================================
//  HELPER: query su pool senza transazione
//  Restituisce direttamente rows[] per comodità.
// ================================================================
async function q(text, params = []) {
    const { rows } = await pool.query(text, params);
    return rows;
}


// ================================================================
//  HELPER: costruisce il payload JWT
// ================================================================
async function buildTokenPayload(user) {
    const payload = {
        id:       user.id,
        username: user.username,
        role:     user.role,
        team_id:  null,
    };

    if (user.role === 'collaborator') {
        const rows = await q(
            'SELECT team_id FROM collaborators WHERE user_id = $1',
            [user.id]
        );
        payload.team_id = rows[0]?.team_id ?? null;
    }

    if (user.role === 'coach') {
        const rows = await q(
            'SELECT id FROM coaches WHERE user_id = $1',
            [user.id]
        );
        payload.coach_id = rows[0]?.id ?? null;
    }

    return payload;
}


// ================================================================
//  HELPER: recupera il profilo esteso (coach o collaborator)
// ================================================================
async function getProfile(userId, role) {
    if (role === 'coach') {
        const rows = await q(
            'SELECT id, name, surname, photo_url FROM coaches WHERE user_id = $1',
            [userId]
        );
        return rows[0] ?? null;
    }
    if (role === 'collaborator') {
        const rows = await q(
            'SELECT id, name, surname FROM collaborators WHERE user_id = $1',
            [userId]
        );
        return rows[0] ?? null;
    }
    return null;
}


// ================================================================
//  HELPER: validazioni
// ================================================================
function validatePassword(password) {
    const errors = [];
    if (!password || password.length < 8)   errors.push('almeno 8 caratteri');
    if (!/[A-Z]/.test(password))            errors.push('almeno una lettera maiuscola');
    if (!/[a-z]/.test(password))            errors.push('almeno una lettera minuscola');
    if (!/[0-9]/.test(password))            errors.push('almeno un numero');
    if (!/[^A-Za-z0-9]/.test(password))     errors.push('almeno un carattere speciale');
    return errors;
}

function validateUsername(username) {
    if (!username || username.length < 3)   return 'Username troppo corto (min. 3 caratteri)';
    if (username.length > 50)               return 'Username troppo lungo (max. 50 caratteri)';
    if (!/^[a-zA-Z0-9_.\-]+$/.test(username)) return 'Username può contenere solo lettere, numeri, _ . -';
    return null;
}


// ================================================================
//  GET /api/auth/register-info
// ================================================================
router.get('/register-info', (_req, res) => {
    res.json({ public: process.env.ALLOW_PUBLIC_REGISTER === 'true' });
});


// ================================================================
//  POST /api/auth/register
// ================================================================
router.post('/register', async (req, res) => {
    const {
        username, password, confirm_password, email,
        role, name, surname,
        team_id, role_label, phone,
        invite_code,
    } = req.body;

    // ── 1. Codice invito ────────────────────────────────────────
    if (process.env.ALLOW_PUBLIC_REGISTER !== 'true') {
        if (!invite_code || invite_code.trim() !== process.env.REGISTER_INVITE_CODE) {
            return res.status(403).json({
                error: 'Registrazione riservata. Inserisci il codice di invito corretto.',
                field: 'invite_code',
            });
        }
    }

    // ── 2. Campi obbligatori ────────────────────────────────────
    const missing = ['username','password','email','role','name','surname']
        .filter(f => !req.body[f]);
    if (missing.length) {
        return res.status(400).json({ error: `Campi obbligatori mancanti: ${missing.join(', ')}` });
    }

    // ── 3. Ruolo valido ─────────────────────────────────────────
    if (!['coach', 'collaborator'].includes(role)) {
        return res.status(400).json({ error: 'Ruolo non valido', field: 'role' });
    }

    // ── 4. Collaboratore deve avere team_id ─────────────────────
    if (role === 'collaborator' && !team_id) {
        return res.status(400).json({ error: 'Seleziona la squadra di appartenenza', field: 'team_id' });
    }

    // ── 5. Validazione username ─────────────────────────────────
    const usernameError = validateUsername(username.trim());
    if (usernameError) return res.status(400).json({ error: usernameError, field: 'username' });

    // ── 6. Validazione email ────────────────────────────────────
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return res.status(400).json({ error: 'Email non valida', field: 'email' });
    }

    // ── 7. Validazione password ─────────────────────────────────
    const pwdErrors = validatePassword(password);
    if (pwdErrors.length) {
        return res.status(400).json({ error: `La password deve avere: ${pwdErrors.join(', ')}`, field: 'password' });
    }
    if (password !== confirm_password) {
        return res.status(400).json({ error: 'Le due password non coincidono', field: 'confirm_password' });
    }

    // ── Transazione PostgreSQL ──────────────────────────────────
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // ── 8. Username/email già in uso? ───────────────────────
        const existing = await client.query(
            'SELECT id FROM users WHERE username = $1 OR email = $2',
            [username.trim().toLowerCase(), email.trim().toLowerCase()]
        );
        if (existing.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({
                error: 'Username o email già in uso.',
                field: 'username',
            });
        }

        // ── 9. Squadra esiste? (solo collaboratori) ─────────────
        if (role === 'collaborator') {
            const teamCheck = await client.query(
                'SELECT id FROM teams WHERE id = $1',
                [parseInt(team_id)]
            );
            if (teamCheck.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Squadra non trovata', field: 'team_id' });
            }
        }

        // ── 10. Hash password ───────────────────────────────────
        const hash = await bcrypt.hash(password, 12);

        // ── 11. Inserisce in users — RETURNING id ───────────────
        const userRes = await client.query(
            `INSERT INTO users (username, password_hash, email, role)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
            [username.trim().toLowerCase(), hash, email.trim().toLowerCase(), role]
        );
        const userId = userRes.rows[0].id;

        // ── 12. Inserisce profilo esteso ────────────────────────
        if (role === 'coach') {
            await client.query(
                `INSERT INTO coaches (user_id, name, surname, phone)
                 VALUES ($1, $2, $3, $4)`,
                [userId, name.trim(), surname.trim(), phone?.trim() || null]
            );
        } else {
            await client.query(
                `INSERT INTO collaborators (user_id, team_id, name, surname, role_label, phone)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [userId, parseInt(team_id), name.trim(), surname.trim(), role_label?.trim() || null, phone?.trim() || null]
            );
        }

        await client.query('COMMIT');

        // ── 13. Login automatico ────────────────────────────────
        const newUser = { id: userId, username: username.trim().toLowerCase(), role };
        const payload = await buildTokenPayload(newUser);
        const token   = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
        const profile = await getProfile(userId, role);

        return res.status(201).json({
            token,
            user: {
                ...payload,
                name:      profile?.name    ?? name.trim(),
                surname:   profile?.surname ?? surname.trim(),
                photo_url: null,
                email:     email.trim().toLowerCase(),
            },
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[auth] POST /register:', err);
        return res.status(500).json({ error: 'Errore interno del server durante la registrazione' });
    } finally {
        client.release();
    }
});


// ================================================================
//  POST /api/auth/login
// ================================================================
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username e password sono obbligatori' });
    }

    try {
        const rows = await q(
            `SELECT id, username, password_hash, email, role, is_active
             FROM users WHERE username = $1 LIMIT 1`,
            [username.trim()]
        );
        const user = rows[0];

        if (!user) return res.status(401).json({ error: 'Credenziali non valide' });
        if (!user.is_active) return res.status(403).json({ error: "Account disattivato. Contatta l'amministratore." });

        const passwordOk = await bcrypt.compare(password, user.password_hash);
        if (!passwordOk) return res.status(401).json({ error: 'Credenziali non valide' });

        // Aggiorna last_login (fire-and-forget)
        pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id])
            .catch(err => console.error('[auth] last_login update:', err));

        const payload = await buildTokenPayload(user);
        const token   = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
        const profile = await getProfile(user.id, user.role);

        return res.json({
            token,
            user: {
                ...payload,
                name:      profile?.name      ?? null,
                surname:   profile?.surname   ?? null,
                photo_url: profile?.photo_url ?? null,
                email:     user.email,
            },
        });

    } catch (err) {
        console.error('[auth] POST /login:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
});


// ================================================================
//  GET /api/auth/me
// ================================================================
router.get('/me', authenticate, async (req, res) => {
    try {
        const rows = await q(
            'SELECT id, username, email, role, is_active, last_login FROM users WHERE id = $1',
            [req.user.id]
        );
        const user = rows[0];

        if (!user || !user.is_active) {
            return res.status(401).json({ error: 'Utente non trovato o disattivato' });
        }

        const profile = await getProfile(user.id, user.role);
        const payload = await buildTokenPayload(user);

        return res.json({
            ...payload,
            name:       profile?.name      ?? null,
            surname:    profile?.surname   ?? null,
            photo_url:  profile?.photo_url ?? null,
            email:      user.email,
            last_login: user.last_login,
        });

    } catch (err) {
        console.error('[auth] GET /me:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
});


// ================================================================
//  POST /api/auth/logout
// ================================================================
router.post('/logout', authenticate, (_req, res) => {
    return res.json({ ok: true, message: 'Logout effettuato' });
});


// ================================================================
//  POST /api/auth/refresh
// ================================================================
router.post('/refresh', authenticate, async (req, res) => {
    try {
        const rows = await q(
            'SELECT id, username, role, is_active FROM users WHERE id = $1',
            [req.user.id]
        );
        const user = rows[0];

        if (!user || !user.is_active) {
            return res.status(401).json({ error: 'Utente non trovato o disattivato' });
        }

        const payload = await buildTokenPayload(user);
        const token   = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: TOKEN_EXPIRY });

        return res.json({ token });

    } catch (err) {
        console.error('[auth] POST /refresh:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
});


module.exports = router;
