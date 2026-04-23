# =============================================================
#  Dockerfile raíz — PokerKings (contenedor único)
#  Etapa 1: compila el frontend React con Vite
#  Etapa 2: imagen final con el backend Node.js que sirve
#           tanto la API como los ficheros estáticos del frontend
# =============================================================

# ── Etapa 1: Build del Frontend ───────────────────────────────
FROM node:18-alpine AS frontend-build

WORKDIR /frontend

COPY fronted/package*.json ./
RUN npm ci

COPY fronted/ .

# Rutas relativas: el backend sirve /api en el mismo origen
ARG VITE_API_URL=/api
ARG VITE_SOCKET_URL=/
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL

RUN npm run build

# ── Etapa 2: Backend + Frontend compilado ─────────────────────
FROM node:18-alpine

WORKDIR /app

# Instalar solo dependencias de producción
COPY backend/package*.json ./
RUN npm install --omit=dev

# Copiar código del backend
COPY backend/ .

# Copiar el frontend compilado a /app/public
COPY --from=frontend-build /frontend/dist ./public

# Copiar código y dependencias del frontend para modo watch en el mismo contenedor
COPY --from=frontend-build /frontend /frontend

RUN chmod +x /app/start-container.sh

EXPOSE 3000

CMD ["sh", "/app/start-container.sh"]
