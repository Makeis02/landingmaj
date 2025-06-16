// Fonction pour obtenir un emoji basé sur le slug de la catégorie
const getEmojiForCategory = (slug: string) => {
  const normalized = slug.toLowerCase();
  if (normalized.includes("eau-douce") || normalized.includes("eaudouce")) return "🐟";
  if (normalized.includes("eau-de-mer") || normalized.includes("eaudemer")) return "🌊";
  if (normalized.includes("universel")) return "🔄";
  if (normalized.includes("entretien") || normalized.includes("maintenance") || normalized.includes("nettoyage")) return "🧹";
  if (normalized.includes("produits-specifiques") || normalized.includes("produitsspecifiques")) return "🧪";
  if (normalized.includes("pompes") || normalized.includes("filtration")) return "⚙️";
  if (normalized.includes("chauffage") || normalized.includes("ventilation")) return "🔥";
  if (normalized.includes("eclairage")) return "💡";
  if (normalized.includes("alimentation") || normalized.includes("nourriture")) return "🦐";
  if (normalized.includes("sols-substrats")) return "🏞️";
  if (normalized.includes("co2")) return "💨";
  if (normalized.includes("tests-analyses")) return "🔬";
  if (normalized.includes("decoration")) return "🏺";
  if (normalized.includes("meubles-supports")) return "🛋️";
  if (normalized.includes("aquariums")) return " tanks";
  // Ajouter d'autres cas si nécessaire
  return "✨"; // Emoji par défaut
};

export default UniverselAccessoiresPage;

const SupabaseStockDebugger = ({ productIds }) => {
// ... existing code ...
} 