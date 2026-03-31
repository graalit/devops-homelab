# 🏗️ DevOps Homelab Infrastructure

Personal DevOps homelab running on a VPS — built to learn and showcase DevOps practices.

## 🚀 Stack

| Service | Role | URL |
|---|---|---|
| Traefik | Reverse proxy + SSL | — |
| Portainer | Docker management | portainer.mcarvalho.work |
| n8n | Automation | nn.mcarvalho.work |
| OpenClaw | AI agent | ai.mcarvalho.work |
| Grafana | Metrics dashboard | grafana.mcarvalho.work |
| Uptime Kuma | Monitoring | uptime.mcarvalho.work |
| PostgreSQL | Database | internal |
| Redis | Cache | internal |

## 🏛️ Architecture
```
Internet → Cloudflare → Traefik → Docker containers
```

## 🔒 Security

- SSH key authentication only
- UFW firewall (ports 22, 80, 443)
- Fail2ban active
- No secrets in repository

## 📁 Structure
```
devops-homelab/
├── docker/       # Docker Compose files
├── configs/      # Configuration files
├── scripts/      # Utility scripts
└── docs/         # Documentation
```

## 🛠️ Built With

- Ubuntu 24.04 LTS
- Docker 29 + Docker Compose v5
- Cloudflare DNS + SSL
- OVH VPS

---
*Miguel Carvalho — mcarvalho.work*
