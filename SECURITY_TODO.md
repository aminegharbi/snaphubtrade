# Sécurité & Validation — État des lieux (Juillet 2026)

Ce document résume ce qui a été fait dans cette passe et ce qu'il reste à traiter.

## ✅ Fait

### Authentification & autorisation
- **Toutes les routes de l'API sont désormais protégées par défaut** via un `JwtAuthGuard` global (`api/src/shared/auth/`). Auparavant, un seul contrôleur sur ~30 modules utilisait un guard — le reste (admin, CRM, billing, executive, affiliés…) était accessible sans authentification.
- Endpoints publics explicitement marqués avec `@Public()` (catalogue, recherche, fiches véhicules/dealers en lecture, health check…).
- Endpoints admin protégés par `@Roles('admin')` (admin, executive, CRM, marketing, email, push, affiliates, reports, analytics, sessions, market-analysis/analytics, feature-flags de gestion).
- `POST /auth/login` renvoie désormais un vrai `access_token` JWT (auparavant aucun token n'était émis !).
- Secret JWT : l'app refuse de démarrer si `JWT_SECRET` est absent ou < 32 caractères (avant : fallback silencieux sur `'secret'`).
- Ownership checks (anti-IDOR) ajoutés sur `vehicles` (update/patch/status/delete) et `dealers` (update) : un dealer ne peut modifier que ses propres ressources.

### Rate limiting & anti-brute-force
- Throttling global (120 req/min) + throttling strict sur `/auth/login` (8/min) et `/auth/register` (5/min).
- Le login compare toujours un hash bcrypt même si l'utilisateur n'existe pas, pour limiter le user-enumeration par timing.

### Validation des données (DTOs `class-validator`)
- `auth` : `RegisterDto`, `LoginDto` (email, force du mot de passe, téléphone, rôle limité à buyer/dealer/broker — impossible de s'auto-promouvoir admin).
- `dealers` : `UpdateDealerDto`, `CreateReviewDto`.
- `vehicles` : `CreateVehicleDto`, `UpdateVehicleDto`, `UpdateVehicleStatusDto` (année, prix, kilométrage, VIN, enums fuel/transmission/status…).
- Le pipe de validation global fait du **whitelisting** (`whitelist:true`) : tout champ non déclaré dans un DTO est silencieusement retiré de la requête (protection anti mass-assignment), même sur les endpoints qui utilisent encore `@Body() body: any`.

### Infrastructure / secrets
- CORS : remplacé `origin: true` (reflète n'importe quelle origine, dangereux avec `credentials:true`) par une liste blanche via `ALLOWED_ORIGINS`.
- CSP (Content-Security-Policy) + HSTS ajoutés via Helmet.
- Upload d'images véhicules : filtrage MIME (JPEG/PNG/WebP uniquement), taille limitée à 8 Mo.
- `docker-compose.yml` : mots de passe Postgres et secret JWT ne sont plus codés en dur — l'app refuse de démarrer sans variables d'environnement définies.
- Ports Postgres (5432) et Redis (6379) désormais liés à `127.0.0.1` uniquement (plus exposés publiquement par défaut).

### Frontend
- `web/src/lib/validation.ts` : validateurs partagés (email, téléphone, mot de passe, VIN, année, prix) alignés sur les règles backend.
- Appliqués sur : login, register-dealer, modal d'édition véhicule (`VehicleFullEditModal`).
- Le JWT est désormais stocké (`localStorage.auth_token`) et **automatiquement attaché** à tous les appels `fetch('/api/v1/...')` existants via un patch de `window.fetch` dans `SessionContext` — évite de devoir réécrire ~40 fichiers qui appellent l'API directement.

## ⚠️ À faire ensuite (priorisé)

1. **IDOR restants** : `billing` (dealer_id en query param non vérifié contre le JWT), `reservations`, `notifications` (dealerId/brokerId en param d'URL non vérifiés). Même pattern que ce qui a été fait sur `vehicles`/`dealers` à répliquer.
2. **DTOs manquants** : `broker`, `crm`, `reservations`, `subscription`, `collaborative`, `alerts`, `saved-search` utilisent encore `@Body() body: any`. Le whitelisting global les protège du mass-assignment mais pas de la validation de type/format.
3. **Refresh token** : il n'existe pas de mécanisme de refresh — le token dure 7 jours (`JWT_EXPIRES_IN`). À raccourcir (ex. 2h) une fois un flux de refresh en place.
4. **Vérification d'email** : `email_verified` est maintenant `false` à l'inscription (avant : toujours `true`, jamais vérifié) mais aucun flux d'envoi/validation d'email n'existe encore.
5. **Incohérences de schéma préexistantes** (non liées à la sécurité, découvertes pendant ce travail) :
   - Le formulaire `dealer/profile` envoie des champs qui n'existent pas dans le modèle Prisma `Dealer` (`trade_license`, `trn`, `zone`, `working_hours`, `vat_registered`, `export_enabled`, `specialties`) — ils sont actuellement ignorés silencieusement à la sauvegarde plutôt que rejetés en erreur.
   - Le modal d'édition véhicule envoie `engine_power_hp` et `is_new`, qui n'existent pas dans le modèle `Vehicle` (le modèle a `horsepower`, pas d'équivalent à `is_new`). Même traitement : ignorés silencieusement.
   - Ces deux points expliquent probablement des champs qui "ne se sauvegardent jamais" dans l'app — à corrigér séparément (soit ajouter les colonnes Prisma, soit aligner les formulaires).
6. **Password reset** : aucun flux "mot de passe oublié" trouvé dans le code.
