#!/bin/bash
# ═══════════════════════════════════════════════
# DevOps Homelab — Script de sauvegarde
# Miguel Carvalho — mcarvalho.work
# ═══════════════════════════════════════════════

set -euo pipefail

# ── Variables ───────────────────────────────────
DATE=$(date +%Y%m%d_%H%M)
BACKUP_DIR=~/homelab/backups/$DATE
HOMELAB_DIR=~/homelab
LOG_FILE=~/homelab/backups/backup.log

# ── Couleurs pour les logs ───────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# ── Fonctions ────────────────────────────────────
log() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $1" | tee -a $LOG_FILE
}

warn() {
    echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠️  $1${NC}" | tee -a $LOG_FILE
}

error() {
    echo -e "${RED}[$(date '+%H:%M:%S')] ❌ $1${NC}" | tee -a $LOG_FILE
}

# ── Début du backup ──────────────────────────────
echo "" >> $LOG_FILE
echo "════════════════════════════════════" >> $LOG_FILE
log "🚀 Début du backup — $DATE"

# ── Créer le dossier de backup ───────────────────
mkdir -p $BACKUP_DIR
log "📁 Dossier créé : $BACKUP_DIR"

# ── 1. Backup des configs ────────────────────────
log "📋 Backup des configurations..."
# Copie les configs en excluant les dossiers de données
mkdir -p $BACKUP_DIR/docker
find $HOMELAB_DIR/docker \
    -not -path "*/data/*" \
    -not -path "*/workspace/*" \
    \( -name "docker-compose.yml" -o -name "*.yml" -o -name "*.yaml" -o -name "*.json" -o -name "*.conf" \) \
    2>/dev/null \
    | while read f; do
        dir=$(dirname $f | sed "s|$HOMELAB_DIR/docker|$BACKUP_DIR/docker|")
        mkdir -p "$dir"
        cp "$f" "$dir/" 2>/dev/null || true
    done
cp $HOMELAB_DIR/.env $BACKUP_DIR/.env
cp $HOMELAB_DIR/.gitignore $BACKUP_DIR/.gitignore
log "✅ Configurations sauvegardées"

# ── 2. Backup des certificats ────────────────────
log "🔐 Backup des certificats..."
cp -r $HOMELAB_DIR/docker/traefik/certs $BACKUP_DIR/certs
log "✅ Certificats sauvegardés"

# ── 3. Backup PostgreSQL ─────────────────────────
if docker ps | grep -q postgres; then
    log "🗄️  Backup PostgreSQL..."
    source $HOMELAB_DIR/.env
    docker exec postgres pg_dumpall -U $POSTGRES_USER > $BACKUP_DIR/postgres_dump.sql
    log "✅ PostgreSQL sauvegardé"
else
    warn "PostgreSQL non démarré — backup ignoré"
fi

# ── 4. Backup volumes Docker ─────────────────────
log "💾 Backup des volumes Docker..."

VOLUMES=(
    "monitoring_grafana_data:grafana"
    "monitoring_prometheus_data:prometheus"
    "portainer_portainer_data:portainer"
)

for VOLUME_PAIR in "${VOLUMES[@]}"; do
    VOLUME=$(echo $VOLUME_PAIR | cut -d: -f1)
    NAME=$(echo $VOLUME_PAIR | cut -d: -f2)
    if docker volume ls | grep -q $VOLUME; then
        docker run --rm \
            -v $VOLUME:/data \
            -v $BACKUP_DIR:/backup \
            alpine tar czf /backup/${NAME}_volume.tar.gz -C /data . 2>/dev/null
        log "✅ Volume $NAME sauvegardé"
    else
        warn "Volume $VOLUME non trouvé — ignoré"
    fi
done

# ── 5. Informations système ──────────────────────
log "📊 Sauvegarde des infos système..."
cat > $BACKUP_DIR/system_info.txt << EOF
Date: $(date)
Hostname: $(hostname)
OS: $(lsb_release -d | cut -f2)
Kernel: $(uname -r)
RAM: $(free -h | grep Mem | awk '{print $2}')
Disk: $(df -h / | tail -1 | awk '{print $2}')
Docker: $(docker --version)
Containers running: $(docker ps --format '{{.Names}}' | tr '\n' ', ')
EOF
log "✅ Infos système sauvegardées"

# ── 6. Compression du backup ─────────────────────
log "🗜️  Compression du backup..."
cd ~/homelab/backups
tar czf ${DATE}.tar.gz $DATE/
rm -rf $DATE/
log "✅ Backup compressé : ${DATE}.tar.gz"

# ── 7. Nettoyage des anciens backups ─────────────
log "🧹 Nettoyage des backups de plus de 7 jours..."
find ~/homelab/backups -name "*.tar.gz" -mtime +7 -delete
REMAINING=$(find ~/homelab/backups -name "*.tar.gz" | wc -l)
log "✅ $REMAINING backup(s) conservé(s)"

# ── Fin ──────────────────────────────────────────
SIZE=$(du -sh ~/homelab/backups/${DATE}.tar.gz | cut -f1)
log "🎉 Backup terminé avec succès — Taille : $SIZE"
echo "════════════════════════════════════" >> $LOG_FILE
