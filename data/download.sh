#!/usr/bin/env bash
# BD Forêt batch downloader + importer
#
# Downloads all departments for the 4 regions available in the app,
# then runs import.sh for each one.
#
# Usage:
#   ./data/download.sh                  # download + import all regions
#   ./data/download.sh --download-only  # download archives, skip import
#   ./data/download.sh --import-only    # import already-downloaded archives
#   ./data/download.sh --truncate       # truncate forest_plots before first import
#
# Dependencies: curl, 7z, ogr2ogr, psql
# Already-downloaded archives are skipped (safe to re-run).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RAW_DIR="$SCRIPT_DIR/bd-foret/raw"
IMPORT_SCRIPT="$SCRIPT_DIR/import.sh"
BASE_URL="https://data.geopf.fr/telechargement/download/BDFORET"

DOWNLOAD=true
IMPORT=true
TRUNCATE_FLAG=""

for arg in "$@"; do
    case "$arg" in
        --download-only) IMPORT=false ;;
        --import-only)   DOWNLOAD=false ;;
        --truncate)      TRUNCATE_FLAG="--truncate" ;;
    esac
done

mkdir -p "$RAW_DIR"

# ── Department catalogue for the 4 app regions ────────────────────────────
# Format: "RESOURCE_ID"  (dept code and date are encoded in the name)
ARCHIVES=(
    # NORMANDIE (14, 27, 50, 61, 76)
    "BDFORET_1-0__SHP_LAMB93_D014_2014-04-01"
    "BDFORET_1-0__SHP_LAMB93_D027_2014-04-01"
    "BDFORET_1-0__SHP_LAMB93_D050_2014-04-01"
    "BDFORET_1-0__SHP_LAMB93_D061_2014-04-01"
    "BDFORET_1-0__SHP_LAMB93_D076_2013-01-01"

    # PAYS_DE_LA_LOIRE (44, 49, 53, 72, 85)
    "BDFORET_1-0__SHP_LAMB93_D044_2014-04-01"
    "BDFORET_1-0__SHP_LAMB93_D049_2014-04-01"
    "BDFORET_1-0__SHP_LAMB93_D053_2014-04-01"
    "BDFORET_1-0__SHP_LAMB93_D072_2014-04-01"
    "BDFORET_1-0__SHP_LAMB93_D085_2014-04-01"

    # CENTRE_VAL_DE_LOIRE (18, 28, 36, 37, 41, 45)
    "BDFORET_1-0__SHP_LAMB93_D018_2014-04-01"
    "BDFORET_1-0__SHP_LAMB93_D028_2013-01-01"
    "BDFORET_1-0__SHP_LAMB93_D036_2014-04-01"
    "BDFORET_1-0__SHP_LAMB93_D037_2013-01-01"
    "BDFORET_1-0__SHP_LAMB93_D041_2013-01-01"
    "BDFORET_1-0__SHP_LAMB93_D045_2013-01-01"

    # AUVERGNE_RHONE_ALPES (01, 03, 07, 15, 26, 38, 42, 43, 63, 69, 73, 74)
    "BDFORET_1-0__SHP_LAMB93_D001_2014-04-01"
    "BDFORET_1-0__SHP_LAMB93_D003_2014-04-01"
    "BDFORET_1-0__SHP_LAMB93_D007_2014-04-01"
    "BDFORET_1-0__SHP_LAMB93_D015_2013-01-01"
    "BDFORET_1-0__SHP_LAMB93_D026_2014-04-01"
    "BDFORET_1-0__SHP_LAMB93_D038_2014-04-01"
    "BDFORET_1-0__SHP_LAMB93_D042_2014-04-01"
    "BDFORET_1-0__SHP_LAMB93_D043_2013-01-01"
    "BDFORET_1-0__SHP_LAMB93_D063_2014-04-01"
    "BDFORET_1-0__SHP_LAMB93_D069_2014-04-01"
    "BDFORET_1-0__SHP_LAMB93_D073_2014-04-01"
    "BDFORET_1-0__SHP_LAMB93_D074_2014-04-01"
)

TOTAL=${#ARCHIVES[@]}
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " BD Forêt batch loader — $TOTAL departments"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

FIRST_IMPORT=true

for RESOURCE_ID in "${ARCHIVES[@]}"; do
    ARCHIVE="$RAW_DIR/${RESOURCE_ID}.7z"
    URL="$BASE_URL/$RESOURCE_ID/$RESOURCE_ID.7z"

    echo ""
    echo "── $RESOURCE_ID"

    # ── Download ──────────────────────────────────────────────────────────
    if [[ "$DOWNLOAD" == "true" ]]; then
        if [[ -f "$ARCHIVE" ]]; then
            echo "   [skip] already downloaded"
        else
            echo "   Downloading from IGN..."
            curl -L --progress-bar -o "$ARCHIVE" "$URL" || {
                echo "   [error] download failed — skipping"
                rm -f "$ARCHIVE"
                continue
            }
            SIZE=$(du -sh "$ARCHIVE" | cut -f1)
            echo "   Downloaded: $SIZE"
        fi
    fi

    # ── Import ────────────────────────────────────────────────────────────
    if [[ "$IMPORT" == "true" ]]; then
        if [[ ! -f "$ARCHIVE" ]]; then
            echo "   [skip] archive not found, skipping import"
            continue
        fi

        # Only pass --truncate on the first import to avoid wiping previous depts
        if [[ "$FIRST_IMPORT" == "true" && -n "$TRUNCATE_FLAG" ]]; then
            bash "$IMPORT_SCRIPT" "$ARCHIVE" --truncate
            FIRST_IMPORT=false
        else
            bash "$IMPORT_SCRIPT" "$ARCHIVE"
        fi
    fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Done."

if [[ "$IMPORT" == "true" ]]; then
    # Load .env for DB credentials
    ENV_FILE="$SCRIPT_DIR/../apps/api/.env"
    if [[ -f "$ENV_FILE" ]]; then
        export $(grep -v '^#' "$ENV_FILE" | grep -v '^$' | xargs)
    fi
    DB_HOST="${DATABASE_HOST:-localhost}"
    DB_PORT="${DATABASE_PORT:-5432}"
    DB_USER="${DATABASE_USERNAME:-postgres}"
    DB_PASS="${DATABASE_PASSWORD:-postgres}"
    DB_NAME="${DATABASE_NAME:-forest_bd_viewer}"
    PG_CONN="host=$DB_HOST dbname=$DB_NAME user=$DB_USER password=$DB_PASS port=$DB_PORT"

    echo ""
    echo " Total plots by region:"
    PGPASSWORD="$DB_PASS" psql "$PG_CONN" -c "
SELECT code_region, COUNT(*) AS plots, SUM(surface_hectares)::bigint AS hectares
FROM forest_plots
GROUP BY code_region
ORDER BY plots DESC;"
fi
