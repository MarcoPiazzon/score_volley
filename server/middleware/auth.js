// ================================================================
//  middleware/auth.js  —  Verifica JWT su ogni route protetta
//
//  Uso:
//    const { authenticate, requireRole } = require('../middleware/auth');
//
//    router.get('/protected', authenticate, handler);
//    router.get('/coach-only', authenticate, requireRole('coach'), handler);
//
//  Dopo authenticate, req.user contiene il payload del token:
//    { id, username, role, team_id? }
// ================================================================

const jwt = require('jsonwebtoken');

// ----------------------------------------------------------------
//  authenticate  —  verifica presenza e validità del JWT
// ----------------------------------------------------------------
function authenticate(req, res, next) {
    const header = req.headers['authorization'];
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token mancante' });
    }

    const token = header.split(' ')[1];

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.user = payload;  // { id, username, role, team_id? }
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token scaduto' });
        }
        return res.status(401).json({ error: 'Token non valido' });
    }
}

// ----------------------------------------------------------------
//  requireRole  —  verifica che l'utente abbia il ruolo richiesto
//  Da usare DOPO authenticate.
//
//  Esempio:
//    requireRole('coach')
//    requireRole(['coach', 'collaborator'])
// ----------------------------------------------------------------
function requireRole(...roles) {
    const allowed = roles.flat();
    return function (req, res, next) {
        if (!req.user) {
            return res.status(401).json({ error: 'Non autenticato' });
        }
        if (!allowed.includes(req.user.role)) {
            return res.status(403).json({
                error: `Accesso negato. Ruoli consentiti: ${allowed.join(', ')}`,
            });
        }
        next();
    };
}

// ----------------------------------------------------------------
//  requireTeamAccess  —  l'utente può accedere solo ai dati
//  della propria squadra (o di qualsiasi squadra se è coach).
//
//  Un coach (ruolo = 'coach') ha accesso a tutte le squadre.
//  Un collaboratore (ruolo = 'collaborator') accede solo a team_id
//  registrato nel suo profilo (salvato nel JWT).
// ----------------------------------------------------------------
function requireTeamAccess(req, res, next) {
    if (!req.user) return res.status(401).json({ error: 'Non autenticato' });

    // I coach hanno accesso libero
    if (req.user.role === 'coach') return next();

    // I collaboratori solo alla propria squadra
    const requestedTeamId = parseInt(req.params.teamId || req.params.id);
    if (req.user.team_id && req.user.team_id === requestedTeamId) {
        return next();
    }

    return res.status(403).json({ error: 'Non hai accesso a questa squadra' });
}

module.exports = { authenticate, requireRole, requireTeamAccess };
