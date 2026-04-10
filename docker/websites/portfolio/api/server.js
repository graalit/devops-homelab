'use strict';

require('dotenv').config();

const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const morgan     = require('morgan');
const compression= require('compression');
const rateLimit  = require('express-rate-limit');
const { body, param, validationResult } = require('express-validator');
const jwt        = require('jsonwebtoken');
const bcrypt     = require('bcryptjs');
const xss        = require('xss');
const path       = require('path');
const fs         = require('fs');
const multer     = require('multer');
const pool       = require('./db');

// ══════════════════════════════════════════════
// CONFIG
// ══════════════════════════════════════════════
const PORT       = process.env.PORT       || 3001;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES= process.env.JWT_EXPIRES_IN || '8h';
const ORIGIN     = process.env.ALLOWED_ORIGIN || 'https://mcarvalho.work';

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('❌ JWT_SECRET manquant ou trop court (min 32 chars)');
  process.exit(1);
}


// ── Upload images ──────────────────────────────
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const name = Date.now() + '-' + Math.random().toString(36).slice(2) + ext;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg','.jpeg','.png','.gif','.webp','.svg'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  }
});

// ══════════════════════════════════════════════
// EXPRESS
// ══════════════════════════════════════════════
const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:     ["'self'"],
      scriptSrc:      ["'self'", "'unsafe-inline'"],
      scriptSrcAttr:  ["'unsafe-inline'"],
      styleSrc:       ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc:        ["'self'", 'https://fonts.gstatic.com'],
      imgSrc:         ["'self'", 'data:', 'https:'],
      connectSrc:     ["'self'"],
      frameAncestors: ["'none'"],
    }
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }
}));

app.use(compression());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? ORIGIN : '*',
  methods: ['GET','POST','PUT','DELETE','PATCH','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true
}));
app.use(express.json({ limit: '512kb' }));
app.use(express.urlencoded({ extended: false, limit: '512kb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Fichiers statiques ─────────────────────────
app.use('/admin', express.static(path.join(__dirname, '..', 'admin'), { maxAge: '1h' }));
app.use('/',      express.static(path.join(__dirname, '..', 'public'), { maxAge: '1d' }));

// ══════════════════════════════════════════════
// RATE LIMITING
// ══════════════════════════════════════════════
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Trop de tentatives. Réessayez dans 15 minutes.' },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { error: 'Trop de requêtes.' },
});

app.use('/api/', apiLimiter);

// ══════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════
function requireAuth(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Token requis' });
  try {
    req.user = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

function sanitize(v) {
  return typeof v === 'string' ? xss(v.trim()) : v;
}

function sanitizeObj(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = sanitize(v);
  }
  return out;
}

function validate(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ errors: errors.array() });
    return false;
  }
  return true;
}

// ══════════════════════════════════════════════
// AUTH ROUTES
// ══════════════════════════════════════════════
app.post('/api/auth/login', loginLimiter, [
  body('username').isString().trim().notEmpty().isLength({ max: 64 }),
  body('password').isString().notEmpty().isLength({ min: 1, max: 128 }),
], async (req, res) => {
  if (!validate(req, res)) return;
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];
    const dummy = '$2a$14$dummyhashtopreventtimingattacks000000000000000000000000';
    const match = await bcrypt.compare(password, user ? user.password_hash : dummy);
    await pool.query('INSERT INTO auth_logs (username, ip, success) VALUES ($1,$2,$3)',
      [username, req.ip, match]);
    if (!user || !match) return res.status(401).json({ error: 'Identifiants incorrects' });
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES, issuer: 'portfolio-admin', audience: 'portfolio-admin' }
    );
    res.json({ token, expiresIn: JWT_EXPIRES, username: user.username });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/auth/refresh', requireAuth, (req, res) => {
  const token = jwt.sign(
    { id: req.user.id, username: req.user.username },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES, issuer: 'portfolio-admin', audience: 'portfolio-admin' }
  );
  res.json({ token });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ username: req.user.username });
});


// ── Upload image ────────────────────────────────
app.post('/api/upload', requireAuth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier ou format non supporté' });
  res.json({ 
    url: '/uploads/' + req.file.filename,
    filename: req.file.filename,
    size: req.file.size
  });
});

// ── Lister les images uploadées ─────────────────
app.get('/api/uploads', requireAuth, (req, res) => {
  try {
    const files = fs.readdirSync(uploadsDir)
      .filter(f => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f))
      .map(f => ({ 
        filename: f, 
        url: '/uploads/' + f,
        size: fs.statSync(path.join(uploadsDir, f)).size
      }));
    res.json(files);
  } catch(e) {
    res.json([]);
  }
});

// ── Supprimer une image ─────────────────────────
app.delete('/api/uploads/:filename', requireAuth, (req, res) => {
  const filename = path.basename(req.params.filename);
  const filepath = path.join(uploadsDir, filename);
  try {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      res.json({ message: 'Image supprimée' });
    } else {
      res.status(404).json({ error: 'Fichier non trouvé' });
    }
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ══════════════════════════════════════════════
// ENDPOINT GLOBAL (portfolio public)
// ══════════════════════════════════════════════
app.get('/api/portfolio', async (req, res) => {
  try {
    const [hero, experiences, stack, projects, softskills, veille, languages, contact] =
      await Promise.all([
        pool.query('SELECT * FROM hero ORDER BY id DESC LIMIT 1'),
        pool.query('SELECT * FROM experiences WHERE visible=TRUE ORDER BY sort_order'),
        pool.query('SELECT * FROM stack WHERE visible=TRUE ORDER BY sort_order'),
        pool.query('SELECT * FROM projects WHERE visible=TRUE ORDER BY sort_order'),
        pool.query('SELECT * FROM softskills WHERE visible=TRUE ORDER BY sort_order'),
        pool.query('SELECT * FROM veille WHERE visible=TRUE ORDER BY sort_order'),
        pool.query('SELECT * FROM languages ORDER BY sort_order'),
        pool.query('SELECT * FROM contact_info LIMIT 1'),
      ]);
    res.json({
      hero:        hero.rows[0] || {},
      experiences: experiences.rows,
      stack:       stack.rows,
      projects:    projects.rows,
      softskills:  softskills.rows,
      veille:      veille.rows,
      languages:   languages.rows,
      contact:     contact.rows[0] || {},
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ══════════════════════════════════════════════
// CRUD GÉNÉRIQUE
// ══════════════════════════════════════════════
function crudRouter(table, fields, orderBy = 'sort_order') {
  const router = express.Router();

  // GET all (public — visibles uniquement)
  router.get('/', async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT * FROM ${table} WHERE visible=TRUE ORDER BY ${orderBy}`
      );
      res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // GET all (admin — tous)
  router.get('/all', requireAuth, async (req, res) => {
    try {
      const result = await pool.query(`SELECT * FROM ${table} ORDER BY ${orderBy}`);
      res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // GET one
  router.get('/:id', requireAuth, [param('id').isInt({ min: 1 })], async (req, res) => {
    if (!validate(req, res)) return;
    try {
      const result = await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [req.params.id]);
      if (!result.rows[0]) return res.status(404).json({ error: 'Introuvable' });
      res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // POST create
  router.post('/', requireAuth, async (req, res) => {
    try {
      const data = sanitizeObj(req.body);
      const cols = fields.filter(f => data[f] !== undefined);
      if (!cols.length) return res.status(422).json({ error: 'Aucune donnée' });
      const vals = cols.map(c => typeof data[c] === 'object' ? JSON.stringify(data[c]) : data[c]);
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
      const result = await pool.query(
        `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders}) RETURNING *`,
        vals
      );
      res.status(201).json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // PUT update
  router.put('/:id', requireAuth, [param('id').isInt({ min: 1 })], async (req, res) => {
    if (!validate(req, res)) return;
    try {
      const data = sanitizeObj(req.body);
      const cols = fields.filter(f => data[f] !== undefined);
      if (!cols.length) return res.status(422).json({ error: 'Aucune donnée' });
      const sets = cols.map((c, i) => `${c} = $${i + 1}`).join(', ');
      const vals = cols.map(c => typeof data[c] === 'object' ? JSON.stringify(data[c]) : data[c]);
      vals.push(req.params.id);
      const result = await pool.query(
        `UPDATE ${table} SET ${sets}, updated_at = NOW() WHERE id = $${vals.length} RETURNING *`,
        vals
      );
      if (!result.rows[0]) return res.status(404).json({ error: 'Introuvable' });
      res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // DELETE
  router.delete('/:id', requireAuth, [param('id').isInt({ min: 1 })], async (req, res) => {
    if (!validate(req, res)) return;
    try {
      const result = await pool.query(
        `DELETE FROM ${table} WHERE id = $1 RETURNING id`, [req.params.id]
      );
      if (!result.rows[0]) return res.status(404).json({ error: 'Introuvable' });
      res.json({ message: 'Supprimé' });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // PATCH toggle visibility
  router.patch('/:id/toggle', requireAuth, [param('id').isInt({ min: 1 })], async (req, res) => {
    if (!validate(req, res)) return;
    try {
      const result = await pool.query(
        `UPDATE ${table} SET visible = NOT visible WHERE id = $1 RETURNING id, visible`,
        [req.params.id]
      );
      if (!result.rows[0]) return res.status(404).json({ error: 'Introuvable' });
      res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // PATCH reorder
  router.patch('/reorder', requireAuth, async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(422).json({ error: 'ids requis (array)' });
    try {
      await Promise.all(ids.map((id, i) =>
        pool.query(`UPDATE ${table} SET sort_order = $1 WHERE id = $2`, [i + 1, id])
      ));
      res.json({ message: 'Ordre mis à jour' });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  return router;
}

// ── Routes CRUD ────────────────────────────────
app.use('/api/experiences', crudRouter('experiences',
  ['type','period','role','company','description','tags','sort_order','visible']));
app.use('/api/stack',       crudRouter('stack',
  ['category','icon_type','icon_value','label','tier','sort_order','visible']));
app.use('/api/projects',    crudRouter('projects',
  ['title','subtitle','url','description','tags','wf_title','wf_nodes','sort_order','visible']));
app.use('/api/softskills',  crudRouter('softskills',
  ['text','sort_order','visible'], 'sort_order'));
app.use('/api/veille',      crudRouter('veille',
  ['icon','name','description','frequency','sort_order','visible']));
app.use('/api/languages',   crudRouter('languages',
  ['name','level','sublevel','percent','color','sort_order'], 'sort_order'));

// ── Hero (table unique) ─────────────────────────
app.get('/api/hero', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM hero ORDER BY id DESC LIMIT 1');
    res.json(r.rows[0] || {});
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/hero', requireAuth, async (req, res) => {
  try {
    const d = sanitizeObj(req.body);
    const fields = ['name','role','subtitle','tagline','target','city'];
    const cols = fields.filter(f => d[f] !== undefined);
    if (!cols.length) return res.status(422).json({ error: 'Aucune donnée' });
    const existing = await pool.query('SELECT id FROM hero LIMIT 1');
    if (existing.rows[0]) {
      const sets = cols.map((c, i) => `${c} = $${i + 1}`).join(', ');
      const vals = [...cols.map(c => d[c]), existing.rows[0].id];
      await pool.query(
        `UPDATE hero SET ${sets}, updated_at = NOW() WHERE id = $${vals.length}`, vals
      );
    } else {
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
      await pool.query(
        `INSERT INTO hero (${cols.join(', ')}) VALUES (${placeholders})`,
        cols.map(c => d[c])
      );
    }
    res.json({ message: 'Hero mis à jour' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Contact (table unique) ──────────────────────
app.get('/api/contact', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM contact_info LIMIT 1');
    res.json(r.rows[0] || {});
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/contact', requireAuth, async (req, res) => {
  try {
    const d = sanitizeObj(req.body);
    const fields = ['email','linkedin','website','cities','available','availability_text'];
    const cols = fields.filter(f => d[f] !== undefined);
    const vals = cols.map(c => typeof d[c] === 'object' ? JSON.stringify(d[c]) : d[c]);
    const existing = await pool.query('SELECT id FROM contact_info LIMIT 1');
    if (existing.rows[0]) {
      const sets = cols.map((c, i) => `${c} = $${i + 1}`).join(', ');
      vals.push(existing.rows[0].id);
      await pool.query(
        `UPDATE contact_info SET ${sets}, updated_at = NOW() WHERE id = $${vals.length}`, vals
      );
    } else {
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
      await pool.query(
        `INSERT INTO contact_info (${cols.join(', ')}) VALUES (${placeholders})`, vals
      );
    }
    res.json({ message: 'Contact mis à jour' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Stats admin ─────────────────────────────────
app.get('/api/admin/stats', requireAuth, async (req, res) => {
  try {
    const [xp, proj, sk, ss, logins] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM experiences'),
      pool.query('SELECT COUNT(*) FROM projects'),
      pool.query('SELECT COUNT(*) FROM stack'),
      pool.query('SELECT COUNT(*) FROM softskills'),
      pool.query('SELECT COUNT(*) FROM auth_logs WHERE success=TRUE'),
    ]);
    res.json({
      experiences: parseInt(xp.rows[0].count),
      projects:    parseInt(proj.rows[0].count),
      stack:       parseInt(sk.rows[0].count),
      softskills:  parseInt(ss.rows[0].count),
      logins:      parseInt(logins.rows[0].count),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════
// 404 & ERROR HANDLER
// ══════════════════════════════════════════════
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Route introuvable' });
  }
  res.status(404).send('Not found');
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Erreur serveur interne' });
});

// ══════════════════════════════════════════════
// DÉMARRAGE
// ══════════════════════════════════════════════
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Portfolio API démarrée`);
  console.log(`   Port        : ${PORT}`);
  console.log(`   Environnement : ${process.env.NODE_ENV || 'development'}`);
  console.log(`   API         : http://localhost:${PORT}/api/portfolio\n`);
});

process.on('SIGTERM', () => { pool.end(); process.exit(0); });
process.on('SIGINT',  () => { pool.end(); process.exit(0); });

module.exports = app;
