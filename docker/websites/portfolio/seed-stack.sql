-- ══════════════════════════════════════════════
-- Seed Stack Technique — Miguel Carvalho
-- Extraite depuis portfolio-v7.html
-- ══════════════════════════════════════════════

-- Supprimer les données existantes (si relance)
DELETE FROM stack;

-- ── Serveurs & Hardware ──────────────────────
INSERT INTO stack (category, icon_value, icon_type, label, tier, sort_order, visible) VALUES
('Serveurs & Hardware', '🖥️', 'emoji', 'HP ProLiant',              'primary',   1,  true),
('Serveurs & Hardware', '🖥️', 'emoji', 'Dell PowerEdge',           'primary',   2,  true),
('Serveurs & Hardware', '🖥️', 'emoji', 'Huawei',                   'primary',   3,  true),
('Serveurs & Hardware', '💾', 'emoji', 'SAN / NAS',                'primary',   4,  true),
('Serveurs & Hardware', '⚙️', 'emoji', 'BIOS / Firmware',          'secondary', 5,  true),
('Serveurs & Hardware', '🔧', 'emoji', 'Montage rack',             'secondary', 6,  true),
('Serveurs & Hardware', '🔌', 'emoji', 'Câblage',                  'secondary', 7,  true),
('Serveurs & Hardware', '✅', 'emoji', 'Tests validation',         'secondary', 8,  true),
('Serveurs & Hardware', '📦', 'emoji', 'Gestion approvisionnement','tertiary',  9,  true);

-- ── Cybersécurité & Réseau ───────────────────
INSERT INTO stack (category, icon_value, icon_type, label, tier, sort_order, visible) VALUES
('Cybersécurité & Réseau', '🛡️', 'emoji', 'PaloAlto',             'primary',   10, true),
('Cybersécurité & Réseau', '🌐', 'emoji', 'Cisco',                'primary',   11, true),
('Cybersécurité & Réseau', '🔥', 'emoji', 'Firewall',             'primary',   12, true),
('Cybersécurité & Réseau', '🗺️', 'emoji', 'Matrice brassage',     'secondary', 13, true),
('Cybersécurité & Réseau', '🔐', 'emoji', 'Administration accès', 'secondary', 14, true),
('Cybersécurité & Réseau', '🔒', 'emoji', 'VPN',                  'secondary', 15, true),
('Cybersécurité & Réseau', '⚔️', 'emoji', 'Durcissement infra',   'secondary', 16, true);

-- ── Systèmes & Infra ─────────────────────────
INSERT INTO stack (category, icon_value, icon_type, label, tier, sort_order, visible) VALUES
('Systèmes & Infra', '🐳', 'emoji', 'Docker',           'primary',   17, true),
('Systèmes & Infra', '🔀', 'emoji', 'Traefik',          'primary',   18, true),
('Systèmes & Infra', '☁️', 'emoji', 'VPS OVH',          'primary',   19, true),
('Systèmes & Infra', '🐧', 'emoji', 'Linux / Ubuntu',   'primary',   20, true),
('Systèmes & Infra', '📝', 'emoji', 'Bash',             'secondary', 21, true),
('Systèmes & Infra', '🔑', 'emoji', 'SSH',              'secondary', 22, true),
('Systèmes & Infra', '📦', 'emoji', 'Docker Compose',   'secondary', 23, true),
('Systèmes & Infra', '🔒', 'emoji', 'SSL / TLS',        'secondary', 24, true),
('Systèmes & Infra', '🏠', 'emoji', 'Self-hosting',     'tertiary',  25, true);

-- ── IA & Automatisation ──────────────────────
INSERT INTO stack (category, icon_value, icon_type, label, tier, sort_order, visible) VALUES
('IA & Automatisation', '🤖', 'emoji', 'Claude API',            'primary',   26, true),
('IA & Automatisation', '⚙️', 'emoji', 'n8n',                   'primary',   27, true),
('IA & Automatisation', '🔗', 'emoji', 'OpenRouter',            'primary',   28, true),
('IA & Automatisation', '🦞', 'emoji', 'OpenClaw',              'primary',   29, true),
('IA & Automatisation', '🧠', 'emoji', 'Agents IA autonomes',   'secondary', 30, true),
('IA & Automatisation', '🔄', 'emoji', 'Workflows automatisés', 'secondary', 31, true),
('IA & Automatisation', '📡', 'emoji', 'LLM en production',     'secondary', 32, true),
('IA & Automatisation', '👁️', 'emoji', 'Veille modèles IA',     'tertiary',  33, true);

-- ── Outils & Méthodes ────────────────────────
INSERT INTO stack (category, icon_value, icon_type, label, tier, sort_order, visible) VALUES
('Outils & Méthodes', '🌐', 'emoji', 'Apache / Nginx',       'primary',   34, true),
('Outils & Méthodes', '📂', 'emoji', 'Git',                  'primary',   35, true),
('Outils & Méthodes', '🔀', 'emoji', 'Reverse proxy',        'secondary', 36, true),
('Outils & Méthodes', '💻', 'emoji', 'HTML / CSS / JS',      'secondary', 37, true),
('Outils & Méthodes', '📊', 'emoji', 'Core Web Vitals',      'tertiary',  38, true),
('Outils & Méthodes', '📋', 'emoji', 'Rédaction procédures', 'tertiary',  39, true),
('Outils & Méthodes', '🎓', 'emoji', 'Formation techniciens','tertiary',  40, true);

-- ══════════════════════════════════════════════
-- Soft Skills
-- ══════════════════════════════════════════════
DELETE FROM softskills;

INSERT INTO softskills (text, sort_order, visible) VALUES
('Interface directe avec les équipes commerciales — qualification des besoins clients et validation des configurations serveurs.', 1, true),
('Formation et encadrement de nouveaux techniciens — transmission du savoir-faire terrain acquis en 9 ans.', 2, true),
('Conseil technique sur la compatibilité composants, proposition d''alternatives selon budget et contraintes terrain.', 3, true),
('Rigueur et autonomie construites en 9 ans sur du matériel critique — zéro filet de sécurité en production.', 4, true),
('Capacité à expliquer un problème technique à des interlocuteurs non-techniques sans perdre la précision.', 5, true),
('Coordination quotidienne multi-prestataires sur sites critiques FTV — gestion des priorités en temps réel.', 6, true);

-- Vérification
SELECT category, COUNT(*) as nb FROM stack GROUP BY category ORDER BY MIN(sort_order);
SELECT COUNT(*) as total_stack FROM stack;
SELECT COUNT(*) as total_softskills FROM softskills;
