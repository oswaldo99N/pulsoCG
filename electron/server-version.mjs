export function assertServerVersion(health, expectedVersion, port) {
  if (health?.application === 'pulso-cg' && health.version === expectedVersion) return;
  throw new Error(`El puerto ${port} está ocupado por otra versión o programa (${health?.version || 'versión anterior sin identificar'}). Cierra la otra copia de Pulso CG o el servidor de la terminal y vuelve a abrir Pulso CG ${expectedVersion}. No se cargará la interfaz antigua.`);
}
