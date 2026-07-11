# Sauvegardes & réplication — DubaiAuto

## Architecture

```
                    ┌─────────────────────┐
   écritures  ───▶  │  postgres (primary)  │
                    └──────────┬───────────┘
                               │ WAL streaming (temps réel)
                    ┌──────────▼───────────┐
   lectures   ───▶  │ postgres-replica      │  (hot standby, read-only)
   (optionnel)      └───────────────────────┘

                    ┌───────────────────────┐
                    │  postgres-backup       │  pg_dump quotidien
                    │  → ./backups/           │  rétention 7j / 4 sem / 6 mois
                    └───────────────────────┘
```

**Ce sont deux mécanismes différents, pas redondants :**
- **La réplication** (`postgres-replica`) protège contre la perte du serveur primaire (bascule rapide) et permet de décharger les requêtes de lecture (reporting/analytics). Elle ne protège **pas** contre une erreur humaine : un `DELETE` malheureux sur le primaire se réplique aussi sur le standby.
- **Les backups** (`postgres-backup`) protègent contre les erreurs humaines, la corruption, un ransomware — tout ce qui nécessite de revenir à un point dans le temps.

**Il faut les deux en production.**

---

## Mise en route

1. Dans `.env`, définir en plus des variables déjà requises :
   ```bash
   POSTGRES_REPLICA_PASSWORD=<mot de passe fort, différent de POSTGRES_PASSWORD>
   ```
2. `docker-compose up -d` — au premier démarrage, `postgres-replica` clone automatiquement le primaire via `pg_basebackup` (peut prendre quelques minutes selon la taille de la base) puis démarre en mode standby (lecture seule).
3. Vérifier que la réplication est active :
   ```bash
   docker exec dubaiauto-postgres psql -U dubaiauto -c "SELECT client_addr, state, sync_state FROM pg_stat_replication;"
   ```
   Doit afficher une ligne avec `state = streaming`.
4. Vérifier les backups :
   ```bash
   ls -la ./backups/daily/
   ```
   Le premier dump apparaît au prochain déclenchement du planning (`@daily` par défaut, configurable via `BACKUP_SCHEDULE`).

---

## Restaurer depuis un backup (disaster recovery)

**⚠️ Teste cette procédure en staging avant d'en avoir besoin en urgence.**

1. Arrêter l'API pour éviter les écritures pendant la restauration :
   ```bash
   docker-compose stop api
   ```
2. Identifier le dump à restaurer :
   ```bash
   ls -la ./backups/daily/   # ou weekly/ ou monthly/
   ```
3. Restaurer (⚠️ écrase la base actuelle) :
   ```bash
   gunzip -c ./backups/daily/dubaiauto-<timestamp>.sql.gz | \
     docker exec -i dubaiauto-postgres psql -U dubaiauto -d dubaiauto
   ```
4. Si la restauration remplace des données déjà répliquées vers `postgres-replica`, le standby va détecter une divergence de timeline. Le plus simple est de le recloner :
   ```bash
   docker-compose stop postgres-replica
   docker volume rm dubaiauto_postgres_replica_data
   docker-compose up -d postgres-replica   # reclone automatiquement depuis le primaire restauré
   ```
5. Redémarrer l'API :
   ```bash
   docker-compose start api
   ```

---

## Bascule vers le réplica en cas de panne du primaire (promotion manuelle)

Ce projet n'a pas de bascule automatique (pas d'outil comme Patroni/repmgr — volontairement, pour rester simple). En cas de panne du primaire :

1. Promouvoir le standby en lecture-écriture :
   ```bash
   docker exec dubaiauto-postgres-replica pg_ctl promote -D /var/lib/postgresql/data
   ```
2. Mettre à jour `DATABASE_URL` dans `.env` pour pointer vers `postgres-replica` (ou renommer les services dans `docker-compose.yml`).
3. Redémarrer l'API.
4. **Une fois l'ancien primaire réparé**, ne pas le redémarrer tel quel — il faut le recloner depuis le nouveau primaire (même procédure que pour recloner un replica), sinon risque de "split brain" (deux bases divergentes acceptant des écritures).

> Pour une vraie haute disponibilité avec bascule automatique, la prochaine étape serait un outil dédié (Patroni, repmgr, ou un service managé comme RDS/Cloud SQL avec failover automatique). Le setup actuel est un bon socle production (protection contre la perte de données + option de bascule manuelle rapide) mais reste manuel pour la promotion.

---

## Sauvegarde hors-site (recommandé pour la production réelle)

`./backups/` est sur le même disque que le serveur — en cas de panne matérielle ou de perte du serveur entier, ces backups sont perdus aussi. Pour une vraie protection :

- Synchroniser `./backups/` vers S3 (le bucket `AWS_S3_BUCKET` existe déjà pour les images véhicules — utiliser un bucket ou préfixe séparé pour les dumps DB) via un cron `aws s3 sync ./backups s3://<bucket>/db-backups/ --delete` sur l'hôte, ou
- Configurer un `rclone`/`restic` planifié, ou
- Si hébergé chez un cloud provider (AWS RDS, GCP Cloud SQL, etc.), utiliser leurs snapshots automatiques hors-site natifs à la place de ce setup Docker maison.

Ce point n'est **pas encore automatisé** dans ce projet — à mettre en place avant un vrai déploiement production.
