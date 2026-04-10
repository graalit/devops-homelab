'use strict';

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt   = require('bcryptjs');
const readline = require('readline');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'postgres',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'portfolio_mcarvalho',
  user:     process.env.DB_USER     || 'homelab',
  password: process.env.DB_PASSWORD,
});

const schema = `

-- Utilisateurs admin
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  last_login    TIMESTAMPTZ
);

-- Section Hero
CREATE TABLE IF NOT EXISTS hero (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  role       TEXT NOT NULL,
  subtitle   TEXT NOT NULL,
  tagline    TEXT,
  target     TEXT,
  city       TEXT DEFAULT 'Paris',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expériences professionnelles
CREATE TABLE IF NOT EXISTS experiences (
  id          SERIAL PRIMARY KEY,
  type        TEXT NOT NULL CHECK(type IN ('current','previous','personal')),
  period      TEXT NOT NULL,
  role        TEXT NOT NULL,
  company     TEXT NOT NULL,
  description TEXT NOT NULL,
  tags        JSONB DEFAULT '[]',
  sort_order  INTEGER DEFAULT 0,
  visible     BOOLEAN DEFAULT TRUE,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Stack technique
CREATE TABLE IF NOT EXISTS stack (
  id          SERIAL PRIMARY KEY,
  category    TEXT NOT NULL,
  icon_type   TEXT,
  icon_value  TEXT,
  label       TEXT NOT NULL,
  tier        TEXT DEFAULT 'primary' CHECK(tier IN ('primary','secondary','tertiary')),
  sort_order  INTEGER DEFAULT 0,
  visible     BOOLEAN DEFAULT TRUE,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Projets
CREATE TABLE IF NOT EXISTS projects (
  id          SERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  subtitle    TEXT,
  url         TEXT,
  description TEXT NOT NULL,
  tags        JSONB DEFAULT '[]',
  wf_title    TEXT,
  wf_nodes    JSONB DEFAULT '[]',
  sort_order  INTEGER DEFAULT 0,
  visible     BOOLEAN DEFAULT TRUE,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Soft skills
CREATE TABLE IF NOT EXISTS softskills (
  id         SERIAL PRIMARY KEY,
  text       TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  visible    BOOLEAN DEFAULT TRUE
);

-- Veille technologique
CREATE TABLE IF NOT EXISTS veille (
  id          SERIAL PRIMARY KEY,
  icon        TEXT,
  name        TEXT NOT NULL,
  description TEXT NOT NULL,
  frequency   TEXT DEFAULT 'régulier',
  sort_order  INTEGER DEFAULT 0,
  visible     BOOLEAN DEFAULT TRUE
);

-- Langues
CREATE TABLE IF NOT EXISTS languages (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  level      TEXT NOT NULL,
  sublevel   TEXT,
  percent    INTEGER DEFAULT 100,
  color      TEXT DEFAULT 'cyan',
  sort_order INTEGER DEFAULT 0
);

-- Contact
CREATE TABLE IF NOT EXISTS contact_info (
  id                TEXT PRIMARY KEY DEFAULT 'main',
  email             TEXT,
  linkedin          TEXT,
  website           TEXT,
  cities            JSONB DEFAULT '[]',
  available         BOOLEAN DEFAULT TRUE,
  availability_text TEXT DEFAULT 'Disponible · Préavis négociable',
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Logs auth
CREATE TABLE IF NOT EXISTS auth_logs (
  id       SERIAL PRIMARY KEY,
  username TEXT,
  ip       TEXT,
  success  BOOLEAN,
  at       TIMESTAMPTZ DEFAULT NOW()
);

`;

const seedData = async (client) => {

  // Hero
  const heroExists = await client.query('SELECT id FROM hero LIMIT 1');
  if (heroExists.rows.length === 0) {
    await client.query(`
      INSERT INTO hero (name, role, subtitle, tagline, target, city) VALUES ($1,$2,$3,$4,$5,$6)
    `, [
      'Miguel Carvalho',
      'Architecte Infrastructures & Intégrateur IA',
      '9 ans de terrain. IA en production. Je cherche un CDI où les deux se rejoignent.',
      'Infrastructure critique grands comptes — aujourd\'hui j\'automatise ce que je maîtrise réellement.',
      'CDI Technicien Infra / Sysadmin avec composante IA',
      'Paris'
    ]);
    console.log('✓ Hero initialisé');
  }

  // Expériences
  const xpExists = await client.query('SELECT id FROM experiences LIMIT 1');
  if (xpExists.rows.length === 0) {
    await client.query(`
      INSERT INTO experiences (type, period, role, company, description, tags, sort_order) VALUES
      ($1,$2,$3,$4,$5,$6,$7),
      ($8,$9,$10,$11,$12,$13,$14),
      ($15,$16,$17,$18,$19,$20,$21)
    `, [
      'current','Mai 2025 → Présent','Technicien Datacenter',
      'Evernex International — Mission France Télévisions via Sopra Steria, Paris',
      'En charge de l\'infrastructure réseau et datacenter pour l\'un des plus grands groupes audiovisuels publics français.',
      JSON.stringify(['Fibre optique','RJ45','PaloAlto','Cisco','DC Thésée','DC Data4']), 1,
      'previous','2017 → 2025 · 8 ans','Technicien Maintenance Serveurs',
      'Evernex International — Île-de-France',
      'Montage et configuration de serveurs dédiés grands comptes (HP ProLiant, Dell PowerEdge, Huawei, Sun/Oracle).',
      JSON.stringify(['HP ProLiant','Dell PowerEdge','Huawei','SAN/NAS','iDRAC/iLO']), 2,
      'personal','Années 2000 → aujourd\'hui · 20+ ans','Passionné Hardware & Conseiller Technique PC',
      'Autodidacte — builds gaming personnels & conseil communauté',
      'Plus de 20 ans à construire, tester et optimiser des configurations PC gaming.',
      JSON.stringify(['Build PC Gaming','Overclocking','Diagnostic hardware']), 3
    ]);
    console.log('✓ Expériences initialisées');
  }

  // Projets
  const projExists = await client.query('SELECT id FROM projects LIMIT 1');
  if (projExists.rows.length === 0) {
    await client.query(`
      INSERT INTO projects (title, subtitle, url, description, tags, sort_order) VALUES
      ($1,$2,$3,$4,$5,$6),
      ($7,$8,$9,$10,$11,$12)
    `, [
      'mcarvalho.work — Ce portfolio','Architecture complète, de A à Z','https://mcarvalho.work',
      'Domaine, DNS Cloudflare, VPS OVH Ubuntu, Docker + Traefik + SSL. Conçu et déployé seul.',
      JSON.stringify(['VPS','Traefik','DNS','Docker','PostgreSQL','Node.js']), 1,
      'DevOps Homelab','Infrastructure complète self-hosted',null,
      'Stack complète : Traefik, Portainer, Prometheus, Grafana, Uptime Kuma, Loki, n8n, OpenClaw.',
      JSON.stringify(['Docker','Traefik','Prometheus','Grafana','n8n','OpenClaw']), 2
    ]);
    console.log('✓ Projets initialisés');
  }

  // Veille
  const veilleExists = await client.query('SELECT id FROM veille LIMIT 1');
  if (veilleExists.rows.length === 0) {
    await client.query(`
      INSERT INTO veille (icon, name, description, frequency, sort_order) VALUES
      ($1,$2,$3,$4,$5),($6,$7,$8,$9,$10),($11,$12,$13,$14,$15),($16,$17,$18,$19,$20)
    `, [
      '🤖','Modèles IA & LLM','Claude, DeepSeek R1, Llama, Mistral — test et intégration via OpenRouter','quotidien',1,
      '⚙️','Automatisation & Agents','Protocole MCP, agents autonomes, workflows n8n','hebdo',2,
      '☁️','Cloud & Infrastructure','Docker, Traefik, certifications Azure/AWS/GCP, DevOps','hebdo',3,
      '🔒','Cybersécurité','Sécurité réseau, PaloAlto, bonnes pratiques SSL/TLS','régulier',4
    ]);
    console.log('✓ Veille initialisée');
  }

  // Langues
  const langExists = await client.query('SELECT id FROM languages LIMIT 1');
  if (langExists.rows.length === 0) {
    await client.query(`
      INSERT INTO languages (name, level, sublevel, percent, color, sort_order) VALUES
      ($1,$2,$3,$4,$5,$6),($7,$8,$9,$10,$11,$12),($13,$14,$15,$16,$17,$18)
    `, [
      'Français','Natif','Langue natale',100,'cyan',1,
      'Portugais','Courant','Langue familiale',78,'violet',2,
      'Anglais','Intermédiaire','Lecture & bases orales',28,'cyan',3
    ]);
    console.log('✓ Langues initialisées');
  }

  // Contact
  const contactExists = await client.query('SELECT id FROM contact_info LIMIT 1');
  if (contactExists.rows.length === 0) {
    await client.query(`
      INSERT INTO contact_info (email, linkedin, website, cities, available, availability_text) 
      VALUES ($1,$2,$3,$4,$5,$6)
    `, [
      'contact@mcarvalho.work',
      'https://www.linkedin.com/in/miguel-carvalho-mp/',
      'https://mcarvalho.work',
      JSON.stringify(['Paris','Suisse','Luxembourg']),
      true,
      'Disponible · Préavis négociable'
    ]);
    console.log('✓ Contact initialisé');
  }
};

const createAdmin = async (client) => {
  const existing = await client.query(
    'SELECT id FROM users WHERE username = $1',
    [process.env.ADMIN_USERNAME || 'admin']
  );
  if (existing.rows.length > 0) {
    console.log('ℹ️  Compte admin déjà existant — ignoré');
    return;
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question('\n🔐 Choisissez un mot de passe admin (min 12 caractères) : ', async (pwd) => {
      rl.close();
      if (!pwd || pwd.length < 12) {
        console.error('❌ Mot de passe trop court.');
        process.exit(1);
      }
      const hash = await bcrypt.hash(pwd, 14);
      await client.query(
        'INSERT INTO users (username, password_hash) VALUES ($1, $2)',
        [process.env.ADMIN_USERNAME || 'admin', hash]
      );
      console.log('✅ Compte admin créé !');
      console.log(`\n📋 URL Admin : https://mcarvalho.work/admin`);
      console.log(`   Login     : ${process.env.ADMIN_USERNAME || 'admin'}\n`);
      resolve();
    });
  });
};

(async () => {
  const client = await pool.connect();
  try {
    console.log('🚀 Initialisation de la base de données...\n');
    await client.query(schema);
    console.log('✓ Schéma créé');
    await seedData(client);
    await createAdmin(client);
    console.log('\n✅ Base de données prête !');
  } catch (err) {
    console.error('❌ Erreur:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
