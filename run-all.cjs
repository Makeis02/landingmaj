// Orchestrateur Railway : exécute les trois tâches l'une après l'autre
(async () => {
  try {
    await require('./generate-facebook-catalog.cjs');
  } catch (e) {
    console.error('Erreur lors de la génération du catalogue Facebook:', e);
  }
  try {
    await require('./alert-wheel-gift-expiry.cjs');
  } catch (e) {
    console.error('Erreur lors de l\'alerte Omnisend cadeaux roue:', e);
  }
  try {
    await require('./railway-cron-abandoned-carts.js');
  } catch (e) {
    console.error('Erreur lors de l\'alerte Omnisend paniers abandonnés:', e);
  }
})(); 