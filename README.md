# Dashboard de telemetría en tiempo real (Angular)

Frontend Angular 21 (standalone, signals, zoneless) para el backend NestJS de `../backend-nestjs`.
Muestra dispositivos, valores actuales, gráficos en vivo (Chart.js) y alertas, alimentados por el
namespace Socket.IO `/telemetry`.

## Puesta en marcha

```bash
# 1. Backend (otra terminal)
cd ../backend-nestjs && npm install && npm run start:dev      # http://localhost:3000

# 2. Frontend
npm install
npm start                                                     # http://localhost:4200

# 3. Datos de prueba (opcional)
npm run simulate                                              # 3 sensores, 1 lectura/s
DEVICES=5 INTERVAL_MS=500 npm run simulate
```

Configuración en [`src/environments/environment.ts`](src/environments/environment.ts):
`apiUrl` (por defecto `http://localhost:3000`) y `apiKey` (debe coincidir con `TELEMETRY_API_KEY`
del backend; vacío si no la usa). El simulador acepta `API_URL`, `API_KEY`, `DEVICES`, `INTERVAL_MS`.

Otros comandos: `npm run build`, `npm test` (Vitest).

## Cómo funciona

| Capa | Archivo | Rol |
| --- | --- | --- |
| Estado | `core/telemetry-store.ts` | Socket.IO + señales: dispositivos, lecturas del dispositivo seleccionado, alertas, umbrales |
| REST | `core/telemetry-api.ts` | `GET /api/devices`, `/api/telemetry`, `/api/alerts` (carga inicial y recuperación) |
| Gráfico | `features/metric-chart` | Línea Chart.js con ventana deslizante (1/5/15 min) y líneas de umbral |
| UI | `features/*` | Lista de dispositivos, tarjetas de métricas, gráficos, feed de alertas |

- Se suscribe a **todos** los dispositivos (`telemetry:subscribe {}`) y filtra en el cliente.
- Al seleccionar un dispositivo se hace backfill (hasta 500 lecturas) y se mezcla con las que llegan en
  vivo, sin duplicar por `id` y ordenando por `timestamp`.
- En cada `connect` (incluidas las reconexiones) se vuelve a suscribir y se recargan dispositivos,
  alertas y lecturas, porque Socket.IO pierde las salas al reconectar.
- Los gráficos se crean por cada métrica numérica que aparezca en las lecturas; no hay que configurarlas.
- Modo claro/oscuro: botón sol/luna en la barra superior. Arranca con el tema del sistema y recuerda
  la elección en `localStorage`. Las paletas son variables CSS en `src/styles.scss`; los gráficos las leen
  al cambiar de tema.
- Si el backend responde `unauthorized` (API key incorrecta) se muestra un aviso y no se reintenta.

## Notas

- La API key de `environment.ts` queda dentro del bundle JS: sirve para entornos internos, no es un
  secreto real frente a quien abra el sitio.
- Los gráficos usan el `timestamp` del dispositivo. Con relojes desfasados los puntos pueden quedar
  fuera de la ventana (si el dispositivo va adelantado, la ventana se ancla a su última muestra).
- Se usa Angular 21 porque Angular 22 exige Node ≥ 22.22 (aquí hay 22.12). `.npmrc` activa
  `legacy-peer-deps` por un fallo de npm 11.0.0 (`Cannot read properties of null (reading 'edgesOut')`).
