export const environment = {
  /** Origen del backend NestJS. REST en `${apiUrl}/api`, Socket.IO en `${apiUrl}/telemetry`. */
  apiUrl: 'http://localhost:3000',
  /** Debe coincidir con TELEMETRY_API_KEY del backend. Vacío si el backend no la exige. */
  apiKey: '',
};
