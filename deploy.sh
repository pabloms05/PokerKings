#!/bin/bash
# =============================================================
#  deploy.sh — PokerKings VPS Deploy Script
#  Contenedor único: backend Node.js + frontend React compilado
#  Uso: bash deploy.sh [--skip-build] [--fresh]
#  --skip-build  : No reconstruye la imagen Docker
#  --fresh       : Destruye volúmenes y empieza desde cero
#                  (¡borra todos los datos de la BD!)
# =============================================================

set -e

# ── Colores ───────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

SKIP_BUILD=false
FRESH=false

for arg in "$@"; do
  case $arg in
    --skip-build) SKIP_BUILD=true ;;
    --fresh)      FRESH=true ;;
  esac
done

# ── Detectar docker compose ───────────────────────────────────
if command -v docker-compose &> /dev/null; then
    DC="docker-compose"
elif docker compose version &> /dev/null 2>&1; then
    DC="docker compose"
else
    echo -e "${RED}❌ Docker Compose no está instalado${NC}"
    exit 1
fi

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║      🃏 PokerKings — Deploy Script       ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""

# ── 0. Verificar directorio raíz ─────────────────────────────
if [ ! -f "docker-compose.yml" ] || [ ! -d "backend" ] || [ ! -d "fronted" ]; then
    echo -e "${RED}❌ Ejecuta este script desde la raíz del proyecto PokerKings${NC}"
    echo -e "${RED}   (donde están las carpetas 'backend' y 'fronted')${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Directorio raíz correcto${NC}"

# ── 1. Archivo .env ───────────────────────────────────────────
echo -e "${YELLOW}📝 Configurando variables de entorno...${NC}"
if [ ! -f .env ]; then
    if [ -f .env.production ]; then
        cp .env.production .env
        echo -e "${GREEN}✅ .env creado desde .env.production${NC}"
    else
        echo -e "${YELLOW}⚠️  No hay .env ni .env.production. Creando .env con valores por defecto...${NC}"
        cat > .env << 'EOF'
# ─── Base de datos ────────────────────────────
DB_NAME=pokerkings
DB_USER=postgres
DB_PASSWORD=change_this_password_in_production

# ─── Backend ──────────────────────────────────
JWT_SECRET=change_this_jwt_secret_in_production
EOF
        echo -e "${RED}⚠️  IMPORTANTE: Edita .env y cambia las contraseñas antes de continuar.${NC}"
        echo -e "${YELLOW}   Pulsa ENTER para continuar de todos modos o Ctrl+C para cancelar...${NC}"
        read -r
    fi
else
    echo -e "${YELLOW}⚠️  .env ya existe, usando el existente${NC}"
fi

# ── 2. Opción --fresh ─────────────────────────────────────────
if [ "$FRESH" = true ]; then
    echo -e "${RED}⚠️  Modo --fresh: se eliminarán TODOS los datos de la base de datos${NC}"
    echo -e "${YELLOW}   ¿Estás seguro? Escribe 'si' para continuar: ${NC}"
    read -r confirm
    if [ "$confirm" != "si" ]; then
        echo "Operación cancelada."
        exit 0
    fi
    echo -e "${YELLOW}🗑️  Destruyendo contenedores y volúmenes...${NC}"
    $DC down -v || true
    echo -e "${GREEN}✅ Limpieza completada${NC}"
fi

# ── 3. Asegurar que proxy_network existe ─────────────────────
echo -e "${YELLOW}🌐 Verificando red compartida proxy_network...${NC}"
if ! docker network inspect proxy_network &> /dev/null; then
    docker network create proxy_network
    echo -e "${GREEN}✅ Red proxy_network creada${NC}"
else
    echo -e "${GREEN}✅ Red proxy_network ya existe${NC}"
fi

# ── 4. Detener contenedores existentes ───────────────────────
echo -e "${YELLOW}🛑 Deteniendo contenedores existentes...${NC}"
$DC down || true

# ── 5. Construir imagen ─────────────────────────────────────────────────
# La imagen compila el frontend React (Vite) y lo embebe
# dentro del contenedor Node.js. Un solo contenedor para todo.
if [ "$SKIP_BUILD" = false ]; then
    echo -e "${YELLOW}🔨 Construyendo imagen Docker (compila frontend + backend)...${NC}"
    echo -e "${YELLOW}   Esto puede tardar 3-5 minutos la primera vez...${NC}"
    $DC build --no-cache
    echo -e "${GREEN}✅ Imagen construida${NC}"
else
    echo -e "${YELLOW}⏭️  Saltando build (--skip-build)${NC}"
fi

# ── 6. Arrancar servicios ─────────────────────────────────────
echo -e "${YELLOW}🚀 Arrancando contenedores...${NC}"
$DC up -d

# ── 7. Esperar a que PostgreSQL esté listo ────────────────────
echo -e "${YELLOW}⏳ Esperando a que PostgreSQL esté listo...${NC}"
MAX_WAIT=60
ELAPSED=0
until $DC exec -T postgres pg_isready -U "${DB_USER:-postgres}" -d "${DB_NAME:-pokerkings}" &> /dev/null; do
    if [ $ELAPSED -ge $MAX_WAIT ]; then
        echo -e "${RED}❌ PostgreSQL no respondió en ${MAX_WAIT}s${NC}"
        $DC logs postgres
        exit 1
    fi
    echo -n "."
    sleep 2
    ELAPSED=$((ELAPSED + 2))
done
echo ""
echo -e "${GREEN}✅ PostgreSQL listo${NC}"

# ── 8. Esperar a que la app esté lista ───────────────────────
# Sequelize.sync() crea las tablas automáticamente al arrancar.
# Cuando /health responde, la BD ya está sincronizada.
echo -e "${YELLOW}⏳ Esperando a que la aplicación arranque...${NC}"
MAX_WAIT=90
ELAPSED=0
until $DC exec -T app wget -qO- http://localhost:3000/health &> /dev/null; do
    if [ $ELAPSED -ge $MAX_WAIT ]; then
        echo -e "${YELLOW}⚠️  La app tardó más de ${MAX_WAIT}s. Comprueba los logs:${NC}"
        $DC logs --tail=30 app
        break
    fi
    echo -n "."
    sleep 3
    ELAPSED=$((ELAPSED + 3))
done
echo ""
echo -e "${GREEN}✅ Aplicación lista (frontend + API en el mismo contenedor)${NC}"

# ── 9. Estado final ───────────────────────────────────────────
echo ""
echo -e "${YELLOW}📋 Estado de los contenedores:${NC}"
$DC ps

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ ¡Despliegue completado con éxito!       ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}🌐 Acceso a la aplicación:${NC}"
echo "   https://pokerkings.duckdns.org"
echo ""
echo -e "${CYAN}📝 Comandos útiles:${NC}"
echo "   Ver logs en tiempo real:  $DC logs -f"
echo "   Ver logs de la app:       $DC logs -f app"
echo "   Detener todo:             $DC down"
echo "   Reiniciar la app:         $DC restart app"
echo "   Entrar al contenedor:     $DC exec app sh"
echo "   Entrar a PostgreSQL:      $DC exec postgres psql -U postgres pokerkings"
echo ""
echo -e "${YELLOW}⚠️  Recordatorios de seguridad:${NC}"
echo "   • Cambia DB_PASSWORD y JWT_SECRET en .env"
echo "   • Añade .env a .gitignore (ya debería estar)"
echo "   • En producción, configura HTTPS con Traefik o Nginx externo"
echo ""

