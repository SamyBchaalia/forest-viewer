#!/usr/bin/env bash
# BD Forêt import script
# Extracts a BD Forêt .7z archive and loads it into forest_plots.
#
# Usage:
#   ./data/import.sh <path-to-archive.7z> [--truncate]
#
#   --truncate   Clear all existing forest_plots rows before loading
#
# Dependencies: 7z, ogr2ogr, psql
# DB credentials are read from apps/api/.env

set -euo pipefail

# ── Args ──────────────────────────────────────────────────────────────────
ARCHIVE="${1:-}"
TRUNCATE=false

if [[ -z "$ARCHIVE" ]]; then
    echo "Usage: $0 <path-to-archive.7z> [--truncate]"
    exit 1
fi

if [[ "${2:-}" == "--truncate" ]]; then
    TRUNCATE=true
fi

if [[ ! -f "$ARCHIVE" ]]; then
    echo "Error: file not found: $ARCHIVE"
    exit 1
fi

# ── Load .env ─────────────────────────────────────────────────────────────
ENV_FILE="$(dirname "$0")/../apps/api/.env"
if [[ -f "$ENV_FILE" ]]; then
    export $(grep -v '^#' "$ENV_FILE" | grep -v '^$' | xargs)
fi

DB_HOST="${DATABASE_HOST:-localhost}"
DB_PORT="${DATABASE_PORT:-5432}"
DB_USER="${DATABASE_USERNAME:-postgres}"
DB_PASS="${DATABASE_PASSWORD:-postgres}"
DB_NAME="${DATABASE_NAME:-forest_bd_viewer}"
PG_CONN="host=$DB_HOST dbname=$DB_NAME user=$DB_USER password=$DB_PASS port=$DB_PORT"

# ── Detect department code from filename ──────────────────────────────────
# Filename pattern: BDFORET_*_D<DEPT>_*
DEPT=$(basename "$ARCHIVE" | grep -oE '_D[0-9]+_' | grep -oE '[0-9]+' | head -1)
if [[ -z "$DEPT" ]]; then
    echo "Warning: could not detect department code from filename."
    echo "  Expected pattern: BDFORET_*_D<code>_*.7z"
    read -rp "Enter department code (e.g. 001, 14, 76): " DEPT
fi
DEPT=$(echo "$DEPT" | sed 's/^0*//')  # strip leading zeros for display
DEPT_PADDED=$(printf "%02d" "$DEPT")
echo "Department: $DEPT_PADDED"

# ── Map department to region ───────────────────────────────────────────────
dept_to_region() {
    case "$1" in
        01|03|07|15|26|38|42|43|63|69|73|74) echo "AUVERGNE_RHONE_ALPES" ;;
        21|25|39|58|70|71|89|90)             echo "BOURGOGNE_FRANCHE_COMTE" ;;
        22|29|35|56)                          echo "BRETAGNE" ;;
        18|28|36|37|41|45)                   echo "CENTRE_VAL_DE_LOIRE" ;;
        2A|2B)                               echo "CORSE" ;;
        08|10|51|52|54|55|57|67|68|88)      echo "GRAND_EST" ;;
        02|59|60|62|80)                      echo "HAUTS_DE_FRANCE" ;;
        75|77|78|91|92|93|94|95)            echo "ILE_DE_FRANCE" ;;
        14|27|50|61|76)                      echo "NORMANDIE" ;;
        16|17|19|23|24|33|40|47|64|79|86|87) echo "NOUVELLE_AQUITAINE" ;;
        09|11|12|30|31|32|34|46|48|65|66|81|82) echo "OCCITANIE" ;;
        44|49|53|72|85)                      echo "PAYS_DE_LA_LOIRE" ;;
        04|05|06|13|83|84)                   echo "PACA" ;;
        *)                                   echo "UNKNOWN" ;;
    esac
}

REGION=$(dept_to_region "$DEPT_PADDED")
if [[ "$REGION" == "UNKNOWN" ]]; then
    echo "Warning: no region mapping for department $DEPT_PADDED."
    read -rp "Enter region code (e.g. NORMANDIE): " REGION
fi
echo "Region:     $REGION"

# ── Extract ───────────────────────────────────────────────────────────────
TMP_DIR=$(mktemp -d)
trap "rm -rf $TMP_DIR" EXIT

echo "Extracting $ARCHIVE..."
7z e "$ARCHIVE" -o"$TMP_DIR" "*.shp" "*.dbf" "*.prj" "*.shx" "*.cpg" -r -y > /dev/null

SHP=$(find "$TMP_DIR" -name "FORMATION_VEGETALE*.shp" | head -1)
if [[ -z "$SHP" ]]; then
    echo "Error: no FORMATION_VEGETALE*.shp found in archive."
    exit 1
fi
echo "Shapefile:  $SHP"

# ── Load into staging ─────────────────────────────────────────────────────
STAGING="_import_staging_$$"
echo "Loading into staging table $STAGING..."

PGPASSWORD="$DB_PASS" ogr2ogr \
    -f PostgreSQL \
    "PG:$PG_CONN" \
    "$SHP" \
    -nln "$STAGING" \
    -t_srs EPSG:4326 \
    -nlt MULTIPOLYGON \
    -overwrite \
    --config SHAPE_ENCODING "ISO-8859-1" \
    -skipfailures

ROW_COUNT=$(PGPASSWORD="$DB_PASS" psql "$PG_CONN" -tAc "SELECT COUNT(*) FROM \"$STAGING\"")
echo "Staged:     $ROW_COUNT rows"

# ── Insert into forest_plots ──────────────────────────────────────────────
if [[ "$TRUNCATE" == "true" ]]; then
    echo "Truncating forest_plots..."
    PGPASSWORD="$DB_PASS" psql "$PG_CONN" -c "TRUNCATE TABLE forest_plots;"
fi

echo "Inserting into forest_plots..."
PGPASSWORD="$DB_PASS" psql "$PG_CONN" <<SQL
INSERT INTO forest_plots (id, code_region, code_departement, code_commune, lieu_dit, geom, essences, surface_hectares, type_foret)
SELECT
    gen_random_uuid()::text,
    '$REGION',
    '$DEPT_PADDED',
    NULL,
    NULL,
    wkb_geometry,
    NULL,
    ROUND((ST_Area(wkb_geometry::geography) / 10000)::numeric, 2),
    COALESCE(
        NULLIF(TRIM(libelle), ''),
        NULLIF(TRIM(nom_typn), ''),
        NULLIF(TRIM(libelle2), ''),
        'Unknown'
    )
FROM "$STAGING"
WHERE wkb_geometry IS NOT NULL;

DROP TABLE "$STAGING";
SQL

FINAL=$(PGPASSWORD="$DB_PASS" psql "$PG_CONN" -tAc "SELECT COUNT(*) FROM forest_plots WHERE code_departement = '$DEPT_PADDED'")
echo ""
echo "Done. $FINAL plots loaded for department $DEPT_PADDED ($REGION)."
echo ""
echo "Top forest types:"
PGPASSWORD="$DB_PASS" psql "$PG_CONN" -c "
SELECT type_foret, COUNT(*) AS plots
FROM forest_plots
WHERE code_departement = '$DEPT_PADDED'
GROUP BY type_foret
ORDER BY plots DESC
LIMIT 8;"
