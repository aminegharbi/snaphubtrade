# DubaiAuto — Suite de tests E2E (Robot Framework)

Suite de tests de bout en bout dockerisée, dérivée du plan de tests
(`DubaiAuto-Plan-de-tests.md`) et des bugs concrets trouvés/corrigés au fil du
projet. Objectif : pouvoir lancer une seule commande avant chaque déploiement
production et savoir immédiatement si quelque chose de critique est cassé.

## Ce qui est couvert

| Suite | Fichier | Ce qu'elle teste |
|---|---|---|
| Auth | `tests/01_auth/login_register.robot` | Inscription, connexion, émission du JWT, anti-escalade de rôle, mots de passe faibles |
| Auth (lent) | `tests/01_auth/rate_limiting.robot` | Rate limiting login/register (exclu par défaut, `--include slow`) |
| Sécurité IDOR | `tests/02_security/idor_dealers_vehicles.robot` | Dealer B ne peut jamais toucher aux données de Dealer A (véhicules, profil, avis) |
| Dealers | `tests/03_dealers/dealer_management.robot` | Cycle de vie complet d'un profil dealer, cas limites |
| Véhicules | `tests/04_vehicles/vehicle_management.robot` | Création/édition/statut/suppression d'annonces |
| Admin — verrouillage | `tests/05_admin/admin_lockdown.robot` | **Le test le plus critique** : chaque endpoint admin rejette buyer/dealer/broker/anonyme |
| Admin — gestion | `tests/05_admin/admin_management.robot` | Édition dealer/broker/user par l'admin, reset mot de passe |
| Broker (régression) | `tests/06_broker/broker_dashboard.robot` | Pin du bug "top brokers disparu" (403 silencieux sur `/broker/dealer/:id/stats`) |
| Smoke UI | `tests/07_smoke_ui/critical_pages.robot` | Pages critiques rendues dans un vrai navigateur (Playwright), garde de route admin |
| Requêtes clients | `tests/08_leads/lead_requests.robot` | Cycle complet d'une demande acheteur : soumission publique, inbox dealer, Accepter/Contre-offre/Refuser/Rouvrir, contact (deep links WhatsApp/tel/mailto), timeline, filtres, validations + IDOR complet |
| AI Twin | `tests/09_ai_twin/ai_twin.robot` | Daily Brief (génération lazy, cache journalier, regenerate), Command Center (structure + **scores réactifs aux changements métier**), Copilot chat & Marketing (dégradation gracieuse), config admin, logs, IDOR |
| Market Data Lake | `tests/10_market_lake/market_lake.robot` | Overview/santé (lake vide inclus), intelligence par modèle (validation + dégradation honnête), tendances, intelligence personnalisée dealer, file de jobs + monitoring, config admin (roundtrip), sync réservée admin, IDOR |

Ce n'est **pas** une couverture exhaustive des ~200 scénarios du plan de
tests — c'est le socle prioritaire (section 18 du plan : auth/admin,
IDOR, régressions connues) plus une structure prête à étendre.

## Démarrage rapide — UNE commande

Depuis la racine du projet (la stack doit tourner : `docker compose up -d`,
et `ADMIN_EMAIL`/`ADMIN_PASSWORD` doivent être dans `.env`) :

```bash
./run-tests.sh
```

Le script attend que l'API soit saine, exécute toute la suite, puis affiche
le chemin du rapport. Exemples de variantes :

```bash
./run-tests.sh --include security     # uniquement les tests de sécurité/IDOR
./run-tests.sh --suite ai_twin        # une seule suite
./run-tests.sh --include slow         # inclut aussi le rate-limiting (~2 min)
```

**Suite smoke UI (`07_smoke_ui`, tag `ui`)** : exclue par défaut — elle pilote
un vrai Chromium via Playwright et nécessite que l'image ait pu télécharger
les binaires de navigateur (`rfbrowser init chromium`), ce qui peut échouer
en environnement de build restreint/hors-ligne. Pour l'inclure une fois les
binaires disponibles : `./run-tests.sh --include ui`. Toutes les autres
suites (auth, sécurité, dealers, véhicules, admin, broker, leads, ai-twin,
market-lake) sont purement API (`RequestsLibrary`) et ne dépendent jamais du
navigateur.

**Rapport** : `robot-tests/results/report.html` (vue synthétique) et
`robot-tests/results/log.html` (détail requête par requête). Le code de
sortie est non-zéro si un test échoue → utilisable comme gate CI/CD.

## Démarrage rapide (méthode docker compose brute)

```bash
# 1. Démarrer la stack normalement (le service robot-tests est dans le
#    profil "testing", il ne se lance jamais avec un `docker-compose up` classique)
docker-compose up -d

# 2. Lancer la suite (BASE_URL/WEB_URL pointent déjà vers nginx par défaut)
docker-compose --profile testing run --rm \
  -e ADMIN_EMAIL=admin@dubaiauto.ae \
  -e ADMIN_PASSWORD=<le mot de passe admin défini dans .env> \
  robot-tests

# 3. Consulter le rapport
open robot-tests/results/report.html   # ou xdg-open sous Linux
```

Le conteneur attend que `/api/v1/health` réponde avant de lancer les tests
(jusqu'à 120s), donc pas besoin d'attendre manuellement que la stack soit prête.

## Codes de sortie (pour CI/CD)

`docker-compose --profile testing run --rm robot-tests` renvoie un code de
sortie **non-zéro si un seul test échoue** — c'est ce qui permet de bloquer
un déploiement :

```bash
# Exemple de gate dans un pipeline CI/CD
docker-compose --profile testing run --rm \
  -e ADMIN_EMAIL="$ADMIN_EMAIL" -e ADMIN_PASSWORD="$ADMIN_PASSWORD" \
  robot-tests
if [ $? -ne 0 ]; then
  echo "❌ Tests E2E échoués — déploiement annulé"
  exit 1
fi
echo "✅ Tests E2E passés — déploiement autorisé"
```

## Lancer contre un autre environnement (staging, pré-prod)

Le suite ne connaît jamais l'URL en dur — tout passe par variables :

```bash
docker run --rm \
  -e BASE_URL=https://staging.dubaiauto.ae/api/v1 \
  -e WEB_URL=https://staging.dubaiauto.ae \
  -e ADMIN_EMAIL=admin@dubaiauto.ae \
  -e ADMIN_PASSWORD=... \
  -v $(pwd)/robot-tests/results:/opt/robot/results \
  dubaiauto-robot-tests
```

⚠️ Les tests créent de vraies données (comptes buyer/dealer/broker,
véhicules) — email en `@dubaiauto-test.invalid` pour être facilement
identifiables et purgeables. **Ne pas lancer contre une prod contenant de
vraies données clients sans plan de nettoyage.**

## Filtrer les tests (tags)

```bash
# Seulement la sécurité (le plus important avant un déploiement)
docker-compose --profile testing run --rm robot-tests --include security

# Tout sauf les tests UI (pas besoin d'un navigateur/frontend buildé)
docker-compose --profile testing run --rm robot-tests --exclude ui

# Inclure le rate limiting (lent, exclu par défaut)
docker-compose --profile testing run --rm robot-tests --include slow

# Combiner
docker-compose --profile testing run --rm robot-tests --include admin-lockdown --include idor
```

Tags disponibles : `auth`, `security`, `idor`, `admin-lockdown`, `admin`,
`dealers`, `vehicles`, `broker`, `regression`, `functional`, `smoke`, `ui`, `slow`.

## Lancer en local sans Docker (dev rapide)

```bash
cd robot-tests
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
rfbrowser init

robot --outputdir results \
  --variable BASE_URL:http://localhost/api/v1 \
  --variable WEB_URL:http://localhost \
  --variable ADMIN_EMAIL:admin@dubaiauto.ae \
  --variable ADMIN_PASSWORD:<votre mot de passe admin> \
  --exclude slow \
  tests/
```

## Structure du projet

```
robot-tests/
├── Dockerfile                  # Image Python + Playwright/Chromium headless
├── requirements.txt
├── run.sh                      # Entrypoint : attend la stack, lance robot, code de sortie
├── resources/
│   ├── variables.resource      # BASE_URL, WEB_URL, credentials admin — tout overridable en CLI
│   └── common.resource         # Keywords partagés : Register New Dealer/Broker/Buyer, Auth Headers, Expect Forbidden...
├── libraries/
│   └── DataFactory.py          # Génération de données uniques (email, VIN, mot de passe fort...)
├── tests/
│   ├── 01_auth/
│   ├── 02_security/
│   ├── 03_dealers/
│   ├── 04_vehicles/
│   ├── 05_admin/
│   ├── 06_broker/
│   └── 07_smoke_ui/
└── results/                    # report.html, log.html, output.xml (généré, gitignored)
```

## Ajouter un test

1. Choisir/créer le fichier `.robot` dans le bon dossier `tests/`.
2. Importer `Resource ../../resources/common.resource` pour réutiliser
   `Register New Dealer`, `Auth Headers`, `Expect Forbidden`, etc. plutôt que
   de ré-écrire l'appel `/auth/register` à chaque fois.
3. Si un nouvel endpoint admin est créé : **l'ajouter à la liste
   `ADMIN_ONLY_GET_ENDPOINTS`** dans `admin_lockdown.robot` — c'est ce qui
   garantit qu'un futur module oublié (comme celui qui a causé la faille
   originale : 1 seul module protégé sur 30) est détecté automatiquement.

## Limitations connues (honnêteté sur la couverture)

- **Pas de nettoyage automatique des données de test.** Chaque run crée de
  nouveaux comptes/véhicules ; en local avec une base éphémère ce n'est pas
  un problème, mais contre un environnement partagé (staging) la base va
  grossir. Une tâche de purge par email `@dubaiauto-test.invalid` est à
  ajouter si la suite tourne souvent contre un environnement persistant.
- **`admin-lockdown.robot` couvre les GET des modules listés**, pas tous les
  verbes (POST/PATCH/DELETE) de chaque module — un bon point de départ, pas
  une couverture exhaustive de tous les ~200 endpoints du backend.
- **Les tests IDOR restants identifiés dans `SECURITY_TODO.md`**
  (reservations, notifications, collaborative, alerts) ne sont pas encore
  couverts ici puisqu'ils ne sont pas encore corrigés côté backend — à
  ajouter en même temps que le correctif.
- **Pas de tests de charge/performance** (section 16.1 du plan de tests) —
  hors périmètre de Robot Framework, prévoir k6/autocannon séparément si besoin.
