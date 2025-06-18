import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useImageUpload } from "@/hooks/useImageUpload";

interface ShippingSettings {
  colissimo: {
    base_price: number;
    free_shipping_threshold: number;
    logo_url: string;
    stripe_price_id?: string;
    stripe_product_id?: string;
  };
  mondial_relay: {
    base_price: number;
    free_shipping_threshold: number;
    logo_url: string;
    stripe_price_id?: string;
    stripe_product_id?: string;
  };
}

export default function CheckoutSettings() {
  const [settings, setSettings] = useState<ShippingSettings>({
    colissimo: {
      base_price: 0,
      free_shipping_threshold: 0,
      logo_url: "",
      stripe_product_id: "prod_XXXXX",
    },
    mondial_relay: {
      base_price: 0,
      free_shipping_threshold: 0,
      logo_url: "",
      stripe_product_id: "prod_YYYYY",
    },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingPrice, setIsUpdatingPrice] = useState(false);
  const { toast } = useToast();
  const { handleImageUpload } = useImageUpload({ 
    imageKey: "shipping-logos",
    onUpdate: (url) => {
      // L'URL est déjà mise à jour dans handleLogoChange
    }
  });
  const [debugStripe, setDebugStripe] = useState<any[]>([]);
  const [globalFreeShippingThreshold, setGlobalFreeShippingThreshold] = useState<number>(settings.colissimo.free_shipping_threshold);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (settings.colissimo.free_shipping_threshold !== globalFreeShippingThreshold) {
      setGlobalFreeShippingThreshold(settings.colissimo.free_shipping_threshold);
    }
  }, [settings.colissimo.free_shipping_threshold]);

  const fetchData = async () => {
    try {
      const { data, error } = await supabase
        .from("checkout_settings")
        .select("*")
        .single();

      if (error) throw error;

      if (data) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des paramètres:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les paramètres de livraison",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateStripePrice = async (transporteur: string, amount: number) => {
    const productId = settings[transporteur].stripe_product_id;
    const payload = { productId, amount };
    let debugEntry: any = { date: new Date().toISOString(), transporteur, payload };
    try {
      setIsUpdatingPrice(true);
      if (!productId) {
        throw new Error(`ID du produit Stripe manquant pour ${transporteur}`);
      }
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-shipping-price`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify(payload),
        }
      );
      const data = await response.json();
      debugEntry.response = data;
      debugEntry.status = response.status;
      if (!response.ok) {
        debugEntry.error = data.error || 'Erreur lors de la création du prix';
        setDebugStripe(prev => [debugEntry, ...prev].slice(0, 10));
        throw new Error(data.error || 'Erreur lors de la création du prix');
      }
      setSettings(prev => ({
        ...prev,
        [transporteur]: {
          ...prev[transporteur],
          stripe_price_id: data.priceId,
        },
      }));
      setDebugStripe(prev => [debugEntry, ...prev].slice(0, 10));
      toast({
        title: "Succès",
        description: `Nouveau prix Stripe créé pour ${transporteur}`,
      });
      return data.priceId;
    } catch (error) {
      debugEntry.error = error?.message || String(error);
      setDebugStripe(prev => [debugEntry, ...prev].slice(0, 10));
      console.error(`Erreur lors de la mise à jour du prix Stripe pour ${transporteur}:`, error);
      toast({
        title: "Erreur",
        description: `Impossible de créer le prix Stripe pour ${transporteur}`,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsUpdatingPrice(false);
    }
  };

  const fetchStripePriceForProduct = async (transporteur: string, productId: string) => {
    if (!productId) {
      setSettings(prev => ({
        ...prev,
        [transporteur]: {
          ...prev[transporteur],
          stripe_price_id: "",
        },
      }));
      return;
    }

    let debugEntry: any = { 
      date: new Date().toISOString(), 
      transporteur, 
      action: 'fetch_price_for_product',
      productId 
    };

    try {
      setIsUpdatingPrice(true);
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-stripe-prices`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ productId }),
        }
      );
      
      const data = await response.json();
      debugEntry.response = data;
      debugEntry.status = response.status;
      
      if (!response.ok) {
        debugEntry.error = data.error || 'Erreur lors de la récupération des prix';
        setDebugStripe(prev => [debugEntry, ...prev].slice(0, 10));
        throw new Error(data.error || 'Erreur lors de la récupération des prix');
      }

      const defaultPrice = data.prices?.[0];
      
      if (defaultPrice) {
        setSettings(prev => ({
          ...prev,
          [transporteur]: {
            ...prev[transporteur],
            stripe_price_id: defaultPrice.id,
          },
        }));
        
        debugEntry.result = `Prix trouvé: ${defaultPrice.id} (${defaultPrice.unit_amount / 100}€)`;
        setDebugStripe(prev => [debugEntry, ...prev].slice(0, 10));
        
        toast({
          title: "Prix récupéré",
          description: `Prix Stripe automatiquement récupéré pour ${transporteur}: ${defaultPrice.unit_amount / 100}€`,
        });
      } else {
        setSettings(prev => ({
          ...prev,
          [transporteur]: {
            ...prev[transporteur],
            stripe_price_id: "",
          },
        }));
        
        debugEntry.result = "Aucun prix trouvé pour ce produit";
        setDebugStripe(prev => [debugEntry, ...prev].slice(0, 10));
        
        toast({
          title: "Aucun prix trouvé",
          description: `Aucun prix Stripe trouvé pour le produit ${productId}. Créez un prix en modifiant le tarif de base.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      debugEntry.error = error?.message || String(error);
      setDebugStripe(prev => [debugEntry, ...prev].slice(0, 10));
      console.error(`Erreur lors de la récupération du prix Stripe pour ${transporteur}:`, error);
      toast({
        title: "Erreur",
        description: `Impossible de récupérer le prix Stripe pour ${transporteur}`,
        variant: "destructive",
      });
    } finally {
      setIsUpdatingPrice(false);
    }
  };

  const handleTarifChange = async (transporteur: string, field: string, value: string) => {
    let newValue;
    if (field === "stripe_product_id" || field === "stripe_price_id" || field === "logo_url") {
      newValue = value;
    } else {
      newValue = parseFloat(value) || 0;
    }
    
    if (field === "free_shipping_threshold") {
      setGlobalFreeShippingThreshold(newValue);
      setSettings((prev) => ({
        ...prev,
        colissimo: {
          ...prev.colissimo,
          free_shipping_threshold: newValue,
        },
        mondial_relay: {
          ...prev.mondial_relay,
          free_shipping_threshold: newValue,
        },
      }));
      return;
    }
    
    setSettings((prev) => ({
      ...prev,
      [transporteur]: {
        ...prev[transporteur],
        [field]: newValue,
      },
    }));
    
    if (field === "stripe_product_id") {
      await fetchStripePriceForProduct(transporteur, newValue);
    }
    
    if (field === "base_price") {
      try {
        await updateStripePrice(transporteur, newValue as number);
      } catch (error) {
        console.error("Erreur lors de la mise à jour du prix Stripe:", error);
      }
    }
  };

  const handleLogoChange = async (transporteur: string, file: File) => {
    try {
      const url = await handleImageUpload(file);
      setSettings((prev) => ({
        ...prev,
        [transporteur]: {
          ...prev[transporteur],
          logo_url: url,
        },
      }));
    } catch (error) {
      console.error("Erreur lors du téléchargement du logo:", error);
      toast({
        title: "Erreur",
        description: "Impossible de télécharger le logo",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from("checkout_settings")
        .upsert({
          id: 1,
          settings,
        });

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Les paramètres ont été enregistrés",
      });
    } catch (error) {
      console.error("Erreur lors de l'enregistrement:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer les paramètres",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Paramètres de livraison</h1>
      <div className="mb-6">
        <Label htmlFor="global-threshold">Seuil livraison gratuite (tous transporteurs) (€)</Label>
        <Input
          id="global-threshold"
          type="number"
          value={globalFreeShippingThreshold}
          onChange={e => handleTarifChange("colissimo", "free_shipping_threshold", e.target.value)}
        />
        <p className="text-sm text-gray-500">Ce seuil s'applique à tous les modes de livraison</p>
      </div>
      <Tabs defaultValue="colissimo" className="space-y-4">
        <TabsList>
          <TabsTrigger value="colissimo">Colissimo</TabsTrigger>
          <TabsTrigger value="mondial_relay">Mondial Relay</TabsTrigger>
          <TabsTrigger value="debug_stripe">Debug Stripe</TabsTrigger>
        </TabsList>

        <TabsContent value="colissimo">
          <Card>
            <CardHeader>
              <CardTitle>Configuration Colissimo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="colissimo-base-price">Prix de base (€)</Label>
                <Input
                  id="colissimo-base-price"
                  type="number"
                  value={settings.colissimo.base_price}
                  onChange={(e) => handleTarifChange("colissimo", "base_price", e.target.value)}
                  disabled={isUpdatingPrice}
                />
                {isUpdatingPrice && (
                  <p className="text-sm text-gray-500">Mise à jour du prix Stripe en cours...</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="colissimo-stripe-product-id">Stripe Product ID</Label>
                <div className="flex gap-2">
                  <Input
                    id="colissimo-stripe-product-id"
                    type="text"
                    value={settings.colissimo.stripe_product_id || ""}
                    onChange={(e) => handleTarifChange("colissimo", "stripe_product_id", e.target.value)}
                    placeholder="prod_XXXXXX"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchStripePriceForProduct("colissimo", settings.colissimo.stripe_product_id || "")}
                    disabled={isUpdatingPrice || !settings.colissimo.stripe_product_id}
                  >
                    {isUpdatingPrice ? "..." : "Récupérer"}
                  </Button>
                </div>
                <p className="text-sm text-gray-500">Obligatoire pour créer un prix Stripe. Le prix sera récupéré automatiquement.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="colissimo-stripe-price-id">Stripe Price ID</Label>
                <Input
                  id="colissimo-stripe-price-id"
                  type="text"
                  value={settings.colissimo.stripe_price_id || ""}
                  onChange={(e) => handleTarifChange("colissimo", "stripe_price_id", e.target.value)}
                  placeholder="price_1XXXXXX"
                  disabled={true}
                />
                <p className="text-sm text-gray-500">Géré automatiquement lors de la modification du prix de base</p>
              </div>

              <div className="space-y-2">
                <Label>Logo</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleLogoChange("colissimo", file);
                  }}
                />
                {settings.colissimo.logo_url && (
                  <img
                    src={settings.colissimo.logo_url}
                    alt="Logo Colissimo"
                    className="h-12 mt-2"
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mondial_relay">
          <Card>
            <CardHeader>
              <CardTitle>Configuration Mondial Relay</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mondial-base-price">Prix de base (€)</Label>
                <Input
                  id="mondial-base-price"
                  type="number"
                  value={settings.mondial_relay.base_price}
                  onChange={(e) => handleTarifChange("mondial_relay", "base_price", e.target.value)}
                  disabled={isUpdatingPrice}
                />
                {isUpdatingPrice && (
                  <p className="text-sm text-gray-500">Mise à jour du prix Stripe en cours...</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="mondial-stripe-product-id">Stripe Product ID</Label>
                <div className="flex gap-2">
                  <Input
                    id="mondial-stripe-product-id"
                    type="text"
                    value={settings.mondial_relay.stripe_product_id || ""}
                    onChange={(e) => handleTarifChange("mondial_relay", "stripe_product_id", e.target.value)}
                    placeholder="prod_YYYYYY"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchStripePriceForProduct("mondial_relay", settings.mondial_relay.stripe_product_id || "")}
                    disabled={isUpdatingPrice || !settings.mondial_relay.stripe_product_id}
                  >
                    {isUpdatingPrice ? "..." : "Récupérer"}
                  </Button>
                </div>
                <p className="text-sm text-gray-500">Obligatoire pour créer un prix Stripe. Le prix sera récupéré automatiquement.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mondial-stripe-price-id">Stripe Price ID</Label>
                <Input
                  id="mondial-stripe-price-id"
                  type="text"
                  value={settings.mondial_relay.stripe_price_id || ""}
                  onChange={(e) => handleTarifChange("mondial_relay", "stripe_price_id", e.target.value)}
                  placeholder="price_1YYYYYY"
                  disabled={true}
                />
                <p className="text-sm text-gray-500">Géré automatiquement lors de la modification du prix de base</p>
              </div>

              <div className="space-y-2">
                <Label>Logo</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleLogoChange("mondial_relay", file);
                  }}
                />
                {settings.mondial_relay.logo_url && (
                  <img
                    src={settings.mondial_relay.logo_url}
                    alt="Logo Mondial Relay"
                    className="h-12 mt-2"
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="debug_stripe">
          <div className="bg-gray-50 border rounded p-4">
            <h2 className="font-bold mb-2">Debug Stripe – Création de prix</h2>
            {debugStripe.length === 0 ? (
              <div className="text-gray-500">Aucun appel effectué pour l'instant.</div>
            ) : (
              <ul className="space-y-4">
                {debugStripe.map((entry, idx) => (
                  <li key={idx} className="border rounded p-3 bg-white">
                    <div className="text-xs text-gray-400 mb-1">{entry.date} – {entry.transporteur}</div>
                    <div className="mb-1">
                      <b>Payload :</b>
                      <pre className="bg-gray-100 rounded p-2 text-xs overflow-x-auto">{JSON.stringify(entry.payload, null, 2)}</pre>
                    </div>
                    <div className="mb-1">
                      <b>Réponse :</b>
                      <pre className="bg-gray-100 rounded p-2 text-xs overflow-x-auto">{JSON.stringify(entry.response, null, 2)}</pre>
                    </div>
                    <div className="mb-1">
                      <b>Status HTTP :</b> <span className="font-mono">{entry.status}</span>
                    </div>
                    {entry.error && (
                      <div className="text-red-600 text-xs"><b>Erreur :</b> {entry.error}</div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-6">
        <Button onClick={handleSave} disabled={isUpdatingPrice}>
          Enregistrer les paramètres
        </Button>
      </div>
    </div>
  );
} 