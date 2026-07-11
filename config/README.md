# /config — Credentials

Ce dossier est monté en lecture seule dans le container API.
Ne jamais committer de credentials dans git.

## Pour Vertex AI (Google Cloud)

1. Créer un Service Account sur GCP Console :
   - IAM & Admin → Comptes de service → Créer
   - Rôles requis : "Vertex AI User" + "Model Garden User"

2. Générer une clé JSON :
   - Cliquer sur le SA → Clés → Ajouter une clé → JSON
   - Renommer le fichier en `service-account.json`
   - Placer le fichier ici : `/config/service-account.json`

3. Dans votre `.env` :
   ```
   AI_PROVIDER=vertex
   VERTEX_PROJECT_ID=votre-projet-gcp
   VERTEX_REGION=us-east5
   GOOGLE_APPLICATION_CREDENTIALS=/app/config/service-account.json
   ```
