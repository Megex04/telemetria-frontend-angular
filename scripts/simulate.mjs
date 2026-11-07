// Simulador de dispositivos: envía lecturas a POST /api/telemetry para probar el dashboard.
//   npm run simulate
//   API_URL=http://localhost:3000 API_KEY=secreto DEVICES=5 INTERVAL_MS=500 npm run simulate
const API_URL = process.env.API_URL ?? 'http://localhost:3000';
const API_KEY = process.env.API_KEY ?? '';
const DEVICES = Number(process.env.DEVICES ?? 3);
const INTERVAL_MS = Number(process.env.INTERVAL_MS ?? 1000);

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const walk = (v, step, lo, hi) => clamp(v + (Math.random() - 0.5) * step, lo, hi);

const devices = Array.from({ length: DEVICES }, (_, i) => ({
  deviceId: `sensor-${String(i + 1).padStart(3, '0')}`,
  temperature: 22 + Math.random() * 6,
  humidity: 50 + Math.random() * 15,
  battery: 60 + Math.random() * 40,
  lat: 4.711 + (Math.random() - 0.5) * 0.05,
  lng: -74.0721 + (Math.random() - 0.5) * 0.05,
}));

async function send(d) {
  d.temperature = walk(d.temperature, 1.2, 10, 95);
  d.humidity = walk(d.humidity, 3, 20, 99);
  d.battery = clamp(d.battery - 0.02 - Math.random() * 0.05, 5, 100);
  if (d.battery <= 5) d.battery = 100; // "recarga"

  // De vez en cuando fuerza un pico para disparar alertas (temperature > 80).
  const spike = Math.random() < 0.01 ? 60 : 0;

  const res = await fetch(`${API_URL}/api/telemetry`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(API_KEY && { 'x-api-key': API_KEY }) },
    body: JSON.stringify({
      deviceId: d.deviceId,
      timestamp: new Date().toISOString(),
      metrics: {
        temperature: +(d.temperature + spike).toFixed(2),
        humidity: +d.humidity.toFixed(2),
        battery: +d.battery.toFixed(2),
      },
      location: { lat: d.lat, lng: d.lng },
    }),
  });
  if (!res.ok) console.error(`${d.deviceId}: HTTP ${res.status} ${await res.text()}`);
}

console.log(`Simulando ${DEVICES} dispositivo(s) hacia ${API_URL} cada ${INTERVAL_MS} ms (Ctrl+C para salir)`);
setInterval(() => {
  for (const d of devices) send(d).catch((e) => console.error(`${d.deviceId}: ${e.message}`));
}, INTERVAL_MS);
