import { Product } from "@/types/product";

interface DebugPanelProps {
  id: string | undefined;
  shopifyId: string | null;
  cleanId: string;
  product: Product | null;
  shopifyData: any[];
}

export const DebugPanel = ({ id, shopifyId, cleanId, product, shopifyData }: DebugPanelProps) => {
  return (
    <div className="space-y-2 text-sm p-4 bg-yellow-50 rounded border border-yellow-200">
      <h3 className="font-bold mb-2">🛠 Panel de Debug</h3>
      
      <div className="grid grid-cols-2 gap-2">
        <p><strong>🆔 ID dans useParams:</strong></p>
        <p className="font-mono">{id || "undefined"}</p>
        
        <p><strong>💾 ID dans localStorage:</strong></p>
        <p className="font-mono">{localStorage.getItem("last_product_id") || "non défini"}</p>
        
        <p><strong>🔍 ID final utilisé:</strong></p>
        <p className="font-mono">{shopifyId || "null"}</p>
        
        <p><strong>🧼 ID nettoyé:</strong></p>
        <p className="font-mono">{cleanId || "vide"}</p>
        
        <p><strong>📦 Nb produits Shopify:</strong></p>
        <p className="font-mono">{shopifyData?.length || 0}</p>
        
        <p><strong>🔎 Produit trouvé:</strong></p>
        <p className="font-mono">{product ? "✅ OUI" : "❌ NON"}</p>
        
        <p><strong>🧩 Clé description:</strong></p>
        <p className="font-mono">product_{cleanId}_description</p>
      </div>

      {/* Détails supplémentaires si le produit est trouvé */}
      {product && (
        <div className="mt-4 pt-4 border-t border-yellow-200">
          <h4 className="font-bold mb-2">📋 Détails du produit</h4>
          <div className="grid grid-cols-2 gap-2">
            <p><strong>ID complet:</strong></p>
            <p className="font-mono">{product.id}</p>
            
            <p><strong>Titre:</strong></p>
            <p className="font-mono">{product.title}</p>
            
            <p><strong>Prix:</strong></p>
            <p className="font-mono">{product.price} €</p>
            
            <p><strong>Marque:</strong></p>
            <p className="font-mono">{product.brand || "non définie"}</p>
          </div>
        </div>
      )}

      {/* Détails des produits Shopify */}
      {shopifyData && shopifyData.length > 0 && (
        <div className="mt-4 pt-4 border-t border-yellow-200">
          <h4 className="font-bold mb-2">📦 Produits Shopify chargés</h4>
          <div className="max-h-40 overflow-auto">
            {shopifyData.slice(0, 5).map((p, index) => (
              <div key={index} className="mb-2 p-2 bg-yellow-100 rounded">
                <p className="font-mono text-xs">
                  ID: {p.id} ({typeof p.id})<br />
                  Titre: {p.title}
                </p>
              </div>
            ))}
            {shopifyData.length > 5 && (
              <p className="text-xs text-gray-500 mt-2">
                ... et {shopifyData.length - 5} autres produits
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}; 