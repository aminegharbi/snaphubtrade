#!/bin/sh
# ─── run-tests.sh — lance TOUTE la suite de tests et produit le rapport ───────
#
#   ./run-tests.sh                     # suite complète (hors tests lents)
#   ./run-tests.sh --include slow      # inclut aussi le rate-limiting (~2 min)
#   ./run-tests.sh --include security  # uniquement les tests de sécurité
#   ./run-tests.sh --suite ai_twin     # une seule suite (leads, ai_twin, market_lake…)
#
# Prérequis : la stack tourne (docker compose up -d) et ADMIN_EMAIL /
# ADMIN_PASSWORD sont définis dans .env (nécessaires aux tests admin).
#
# Rapport : robot-tests/results/report.html (+ log.html pour le détail pas-à-pas)
# Code de sortie : 0 si tout passe, non-zéro sinon → utilisable en gate CI/CD.
set -e

cd "$(dirname "$0")"

# Charge .env pour transmettre ADMIN_EMAIL/ADMIN_PASSWORD au conteneur de tests
if [ -f .env ]; then
  ADMIN_EMAIL=$(grep -E '^ADMIN_EMAIL=' .env | cut -d= -f2- | tr -d '"' || true)
  ADMIN_PASSWORD=$(grep -E '^ADMIN_PASSWORD=' .env | cut -d= -f2- | tr -d '"' || true)
  TEST_BYPASS_TOKEN=$(grep -E '^TEST_BYPASS_TOKEN=' .env | cut -d= -f2- | tr -d '"' || true)
fi

if [ -z "$TEST_BYPASS_TOKEN" ]; then
  echo "ℹ️  TEST_BYPASS_TOKEN non défini — les tests tournent contre le vrai rate"
  echo "   limiting (5 inscriptions/min, 8 logins/min par IP). Avec ~50+ comptes"
  echo "   créés par la suite complète, attends-toi à des 429. Pour un run"
  echo "   fiable : ajoute TEST_BYPASS_TOKEN=<valeur-aleatoire> dans .env et"
  echo "   REDÉMARRE l'API (docker compose up -d --force-recreate api) avant"
  echo "   de relancer les tests — jamais en production."
fi

if [ -z "$ADMIN_PASSWORD" ]; then
  echo "⚠️  ADMIN_PASSWORD introuvable dans .env — les tests admin échoueront."
  echo "⚠️  Ajoute ADMIN_EMAIL et ADMIN_PASSWORD dans .env puis relance."
fi

# --suite X → ne lance que tests/*X* ; tout autre argument est passé tel quel à robot
ROBOT_EXTRA=""
while [ $# -gt 0 ]; do
  case "$1" in
    --suite) shift; ROBOT_EXTRA="$ROBOT_EXTRA --suite *$1*";;
    *) ROBOT_EXTRA="$ROBOT_EXTRA $1";;
  esac
  shift
done

echo "==> Build de l'image de tests (rapide si déjà à jour)..."
docker compose --profile testing build robot-tests

echo "==> Lancement de la suite Robot Framework..."
set +e
docker compose --profile testing run --rm \
  -e ADMIN_EMAIL="${ADMIN_EMAIL:-admin@dubaiauto.ae}" \
  -e ADMIN_PASSWORD="${ADMIN_PASSWORD}" \
  -e TEST_BYPASS_TOKEN="${TEST_BYPASS_TOKEN}" \
  robot-tests $ROBOT_EXTRA
EXIT_CODE=$?
set -e

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  📊 Rapport   : robot-tests/results/report.html"
echo "  🔍 Log détail: robot-tests/results/log.html"
if [ "$EXIT_CODE" -eq 0 ]; then
  echo "  ✅ Résultat  : TOUS LES TESTS PASSENT"
else
  echo "  ❌ Résultat  : ÉCHECS DÉTECTÉS (code $EXIT_CODE) — ouvre le rapport"
fi
echo "════════════════════════════════════════════════════════════"
exit $EXIT_CODE
