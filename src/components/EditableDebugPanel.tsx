import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, CreditCard, Database } from "lucide-react";

interface EditableContent {
  content_key: string;
  content: string;
  updated_at: string;
}

interface ProductPrice {
  id: string;
  product_id: string;
  stripe_price_id: string;
  lookup_key: string;
  variant_label: string;
  variant_value: string;
  is_discount: boolean;
  created_at: string;
}

interface StripeData {
  editable_content: {
    priceId: string | null;
    lastUpdated?: string;
    found: boolean;
  };
  product_prices: ProductPrice[];
  combined: {
    mainPriceId: string | null;
    totalPrices: number;
    hasDiscountPrices: boolean;
  };
}

interface EditableDebugPanelProps {
  productId: string;
}

export const EditableDebugPanel = ({ productId }: EditableDebugPanelProps) => {
  const [data, setData] = useState<EditableContent[]>([]);
  const [stripeData, setStripeData] = useState<StripeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStripeLoading, setIsStripeLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log(`🔍 Recherche des données pour l'ID: ${productId}`);
      
      const { data, error } = await supabase
        .from("editable_content")
        .select("content_key, content, updated_at")
        .like("content_key", `product_${productId}_%`);
      
      if (error) throw error;
      
      console.log(`✅ ${data.length} entrées trouvées dans Supabase`);
      setData(data);
    } catch (err) {
      console.error("❌ Erreur lors de la récupération des données:", err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  const fetchStripeData = useCallback(async () => {
    try {
      setIsStripeLoading(true);
      setStripeError(null);
      
      console.log(`💳 Recherche des stripe_price_id pour: ${productId}`);
      
      // 1. Récupérer depuis editable_content
      const { data: editableData, error: editableError } = await supabase
        .from("editable_content")
        .select("content_key, content, updated_at")
        .eq("content_key", `product_${productId}_stripe_price_id`);
      
      if (editableError) throw editableError;
      
      // 2. Récupérer depuis product_prices
      const { data: productPricesData, error: productPricesError } = await supabase
        .from("product_prices")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false });
      
      if (productPricesError) throw productPricesError;
      
      const editableContentInfo = {
        priceId: editableData?.[0]?.content || null,
        lastUpdated: editableData?.[0]?.updated_at,
        found: !!editableData?.[0]?.content
      };
      
      const mainPrice = productPricesData?.find(p => 
        p.variant_label === "main" && 
        p.variant_value === "default" && 
        !p.is_discount
      );
      
      const combinedInfo = {
        mainPriceId: mainPrice?.stripe_price_id || editableContentInfo.priceId,
        totalPrices: productPricesData?.length || 0,
        hasDiscountPrices: productPricesData?.some(p => p.is_discount) || false
      };
      
      console.log(`💳 Stripe data fetched:`, {
        editableContent: editableContentInfo,
        productPrices: productPricesData?.length || 0,
        combined: combinedInfo
      });
      
      setStripeData({
        editable_content: editableContentInfo,
        product_prices: productPricesData || [],
        combined: combinedInfo
      });
    } catch (err) {
      console.error("❌ Erreur lors de la récupération des données Stripe:", err);
      setStripeError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsStripeLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchData();
    fetchStripeData();
  }, [fetchData, fetchStripeData]);

  const refreshAll = () => {
    fetchData();
    fetchStripeData();
  };

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white border border-gray-200 rounded-lg shadow-lg text-sm">
      <Tabs defaultValue="general" className="w-full">
        <div className="flex items-center justify-between p-4 pb-0">
          <h3 className="font-semibold text-gray-800">
            🔍 Debug Panel – ID: {productId}
        </h3>
        <Button
          variant="ghost"
          size="sm"
            onClick={refreshAll}
            disabled={isLoading || isStripeLoading}
            className="hover:bg-gray-100"
        >
            <RefreshCw className={`h-4 w-4 mr-1 ${(isLoading || isStripeLoading) ? 'animate-spin' : ''}`} />
          Recharger
        </Button>
      </div>

        <TabsList className="grid w-full grid-cols-2 mx-4 mb-2">
          <TabsTrigger value="general" className="flex items-center gap-1">
            <Database className="h-3 w-3" />
            Données
          </TabsTrigger>
          <TabsTrigger value="stripe" className="flex items-center gap-1">
            <CreditCard className="h-3 w-3" />
            💳 Debug Stripe PriceID
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="p-4 pt-0">
      {isLoading ? (
            <div className="text-gray-600">Chargement des données...</div>
      ) : error ? (
        <div className="text-red-600">Erreur: {error}</div>
      ) : data.length === 0 ? (
            <div className="text-gray-600">
          Aucune donnée trouvée dans Supabase pour ce produit.
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {data.map((item, index) => (
                <div key={index} className="bg-gray-50 p-2 rounded border">
                  <div className="font-mono text-xs text-blue-600 mb-1 break-all">
                🧩 {item.content_key}
              </div>
                  <div className="text-gray-700 mb-1 line-clamp-2 break-all">
                📄 {item.content}
              </div>
              <div className="text-xs text-gray-500">
                🕓 {new Date(item.updated_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
        </TabsContent>

        <TabsContent value="stripe" className="p-4 pt-0 max-h-96 overflow-y-auto">
          {isStripeLoading ? (
            <div className="text-gray-600">Chargement des données Stripe...</div>
          ) : stripeError ? (
            <div className="text-red-600">Erreur: {stripeError}</div>
          ) : (
            <div className="space-y-3">
              {/* Résumé général */}
              <div className="bg-blue-50 border border-blue-200 p-3 rounded">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="h-4 w-4 text-blue-600" />
                  <span className="font-semibold text-blue-700">Résumé Stripe Prices</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div><strong>Prix principal:</strong> {stripeData?.combined.mainPriceId ? (
                    <code className="bg-blue-100 px-1 rounded ml-1">{stripeData.combined.mainPriceId}</code>
                  ) : (
                    <span className="text-red-600 ml-1">❌ Manquant</span>
                  )}</div>
                  <div><strong>Total prix:</strong> {stripeData?.combined.totalPrices || 0}</div>
                  <div><strong>Prix promotionnels:</strong> {stripeData?.combined.hasDiscountPrices ? '✅ Oui' : '❌ Non'}</div>
                </div>
              </div>

              {/* Table product_prices */}
              <div className="bg-green-50 border border-green-200 p-3 rounded">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="h-4 w-4 text-green-600" />
                  <span className="font-semibold text-green-700">Table product_prices</span>
                  <span className="text-xs bg-green-100 px-2 py-0.5 rounded">
                    {stripeData?.product_prices.length || 0} entrées
                  </span>
                </div>
                {stripeData?.product_prices.length ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {stripeData.product_prices.map((price, index) => (
                      <div key={index} className="bg-white p-2 rounded border text-xs">
                        <div className="font-mono text-green-600 mb-1 break-all">
                          💰 {price.stripe_price_id}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-gray-600">
                          <div><strong>Label:</strong> {price.variant_label}</div>
                          <div><strong>Value:</strong> {price.variant_value}</div>
                          <div><strong>Lookup:</strong> {price.lookup_key}</div>
                          <div><strong>Promo:</strong> {price.is_discount ? '🎯' : '❌'}</div>
                        </div>
                        <div className="text-gray-500 mt-1">
                          🕓 {new Date(price.created_at).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-green-700 text-sm">
                    ⚠️ Aucune entrée dans product_prices pour ce produit
                  </div>
                )}
              </div>

              {/* Table editable_content */}
              <div className="bg-orange-50 border border-orange-200 p-3 rounded">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="h-4 w-4 text-orange-600" />
                  <span className="font-semibold text-orange-700">Table editable_content</span>
                </div>
                {stripeData?.editable_content.found ? (
                  <div className="space-y-2">
                    <div className="bg-white p-2 rounded border font-mono text-sm break-all">
                      💰 {stripeData.editable_content.priceId}
                    </div>
                    <div className="text-xs text-orange-600">
                      🕓 {stripeData.editable_content.lastUpdated ? new Date(stripeData.editable_content.lastUpdated).toLocaleString() : 'N/A'}
                    </div>
                    <div className="text-xs text-orange-700">
                      <strong>Clé:</strong> <code className="bg-orange-100 px-1 rounded">product_{productId}_stripe_price_id</code>
                    </div>
                  </div>
                ) : (
                  <div className="text-orange-700 text-sm">
                    ⚠️ Aucun stripe_price_id dans editable_content
                  </div>
                )}
              </div>

              {/* Conseils de debugging */}
              <div className="bg-gray-50 border border-gray-200 p-3 rounded">
                <div className="text-xs text-gray-700">
                  <div className="font-semibold mb-1">💡 Guide de debugging :</div>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Le système vérifie d'abord <strong>product_prices</strong></li>
                    <li>Fallback vers <strong>editable_content</strong> si rien trouvé</li>
                    <li>Les produits sans variantes devraient avoir un prix main:default</li>
                    <li>Les prix promotionnels ont <code>is_discount: true</code></li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}; 