# Cómo Iniciar el Proyecto

## Modo único: Dockerizado

## 1. Desplegar aplicación y base de datos
```bash
cd /home/Proyecto/PokerKings
bash deploy.sh
```

## 2. Alternativa manual sin script
```bash
cd /home/Proyecto/PokerKings
docker compose up -d --build
```

## URLs
- **Aplicación**: https://pokerkings.duckdns.org
- **API local en el servidor**: http://127.0.0.1:3000

## Ver cambios sin reiniciar contenedor (mismo stack actual)

```bash
cd /home/Proyecto/PokerKings
docker compose up -d --build
```

### Notas
- El contenedor `app` ahora ejecuta un watcher del frontend (`FRONTEND_WATCH=true`) y recompila al guardar.
- Los cambios en `fronted/src` pasan automáticamente a `public` dentro del contenedor.
- Ya no hace falta reiniciar contenedores por cambios de CSS/JS.
- Para seguir logs: `docker compose logs -f app`
- Si el navegador conserva CSS antiguo, usa recarga forzada (Ctrl+F5).

## Notas
- El backend y PostgreSQL ya no se ejecutan fuera de Docker.
- La base de datos no se publica hacia fuera del servidor.
- La aplicación se conecta a PostgreSQL usando `DB_HOST=postgres` dentro de la red interna de Docker.
