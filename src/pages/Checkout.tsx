import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { User, ShoppingCart, CreditCard, Truck, Lock, Minus, Plus, Trash2, User as UserIcon, Mail, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useCartStore } from "@/stores/useCartStore";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useUserStore } from "@/stores/useUserStore";
import FloatingHeader from "@/components/admin/FloatingHeader";
import { useEditStore } from "@/stores/useEditStore";
import { getPriceIdForProduct } from "@/lib/stripe/getPriceIdFromSupabase";
import MondialRelaySelector from "@/components/MondialRelaySelector";

// Ajoute l'interface pour le debug
interface DebugPanelProps {
  apiDebug: {
    url?: string;
    headers?: Record<string, string>;
    payload?: any;
    response?: any;
    error?: any;
  };
}

const DebugPanel = ({ apiDebug }: DebugPanelProps) => {
  if (!apiDebug || Object.keys(apiDebug).length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white/90 backdrop-blur-sm p-4 rounded-lg shadow-lg border border-gray-200 max-w-2xl max-h-[80vh] overflow-auto">
      <h3 className="text-lg font-semibold mb-2">Debug API Checkout</h3>
      
      {apiDebug.url && (
        <div className="mb-4">
          <h4 className="font-medium text-sm text-gray-600">URL</h4>
          <code className="text-xs bg-gray-100 p-2 rounded block break-all">{apiDebug.url}</code>
        </div>
      )}

      {apiDebug.headers && (
        <div className="mb-4">
          <h4 className="font-medium text-sm text-gray-600">Headers</h4>
          <pre className="text-xs bg-gray-100 p-2 rounded block overflow-x-auto">
            {JSON.stringify(apiDebug.headers, null, 2)}
          </pre>
        </div>
      )}

      {apiDebug.payload && (
        <div className="mb-4">
          <h4 className="font-medium text-sm text-gray-600">Payload</h4>
          <pre className="text-xs bg-gray-100 p-2 rounded block overflow-x-auto">
            {JSON.stringify(apiDebug.payload, null, 2)}
          </pre>
        </div>
      )}

      {apiDebug.response && (
        <div className="mb-4">
          <h4 className="font-medium text-sm text-gray-600">Response</h4>
          <pre className="text-xs bg-gray-100 p-2 rounded block overflow-x-auto">
            {JSON.stringify(apiDebug.response, null, 2)}
          </pre>
        </div>
      )}

      {apiDebug.error && (
        <div className="mb-4">
          <h4 className="font-medium text-sm text-red-600">Error</h4>
          <pre className="text-xs bg-red-50 p-2 rounded block overflow-x-auto text-red-700">
            {JSON.stringify(apiDebug.error, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

// Ajout du type pour les paramètres de livraison
interface ShippingSettings {
  colissimo: {
    base_price: number;
    free_shipping_threshold: number;
    logo_url: string;
    stripe_price_id: string;
  };
  mondial_relay: {
    base_price: number;
    free_shipping_threshold: number;
    logo_url: string;
    stripe_price_id: string;
  };
}

const Checkout = () => {
  const { items, updateQuantity, removeItem, getTotal } = useCartStore();
  const user = useUserStore((s) => s.user);
  const setUser = useUserStore((s) => s.setUser);
  const [loading, setLoading] = useState(false);
  const [checkingUser, setCheckingUser] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isEditMode, isAdmin, checkAdminStatus } = useEditStore();
  const [debugStripe, setDebugStripe] = useState<{
    items?: any[],
    enrichedItems?: any[],
    missing?: any[],
    apiPayload?: any,
    apiResponse?: any,
    apiError?: any,
    apiDebug?: any
  } | null>(null);
  const [apiDebug, setApiDebug] = useState<any>({});
  const location = useLocation();
  const clearCart = useCartStore((state) => state.clearCart);

  // 🎁 NOUVEAU : Calcul des produits payants vs cadeaux
  const payableItems = items.filter(item => !item.is_gift && !item.threshold_gift);
  const giftItems = items.filter(item => item.is_gift || item.threshold_gift);
  const hasOnlyGifts = items.length > 0 && payableItems.length === 0;
  const canCheckout = payableItems.length > 0; // Peut checkout seulement s'il y a des produits payants

  // Formulaire d'adresse
  const [shippingForm, setShippingForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address1: "",
    address2: "",
    postalCode: "",
    city: "",
    country: "France"
  });

  // Ajout du state pour le mode de livraison
  const [shippingSettings, setShippingSettings] = useState<ShippingSettings | null>(null);
  const [selectedShipping, setSelectedShipping] = useState<'colissimo' | 'mondial_relay'>(() => {
    return (localStorage.getItem('selectedShipping') as 'colissimo' | 'mondial_relay') || 'colissimo';
  });

  // Ajout du state pour le point relais sélectionné
  const [selectedRelais, setSelectedRelais] = useState<any>(null);

  // Ajout du state pour la recherche automatique
  const [autoSearchMondialRelay, setAutoSearchMondialRelay] = useState(false);

  // Vérifier si l'utilisateur est connecté
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Préremplir le formulaire si l'utilisateur est connecté
      if (user) {
        setShippingForm(prev => ({
          ...prev,
          email: user.email || "",
          firstName: user.user_metadata?.first_name || "",
          lastName: user.user_metadata?.last_name || ""
        }));
      }
      setCheckingUser(false);
    };

    checkUser();

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [setUser]);

  // Au chargement, force la récupération de l'utilisateur Supabase si le store est vide
  useEffect(() => {
    if (!user) {
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user) setUser(data.user);
      });
    }
  }, [user, setUser]);

  useEffect(() => {
    checkAdminStatus();
  }, [checkAdminStatus]);

  // Charger les paramètres de livraison depuis Supabase
  useEffect(() => {
    const fetchShippingSettings = async () => {
      const { data, error } = await supabase
        .from('checkout_settings')
        .select('*')
        .single();
      if (!error && data?.settings) {
        setShippingSettings(data.settings);
      }
    };
    fetchShippingSettings();
  }, []);

  // Persistance du choix
  useEffect(() => {
    localStorage.setItem('selectedShipping', selectedShipping);
  }, [selectedShipping]);

  // Quand le mode de livraison change
  useEffect(() => {
    if (selectedShipping === 'mondial_relay') {
      setAutoSearchMondialRelay(true);
    } else {
      setAutoSearchMondialRelay(false);
    }
  }, [selectedShipping]);

  // Ajout d'un useEffect pour forcer Colissimo à l'arrivée sur la page
  useEffect(() => {
    setSelectedShipping('colissimo');
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("success") === "true") {
      clearCart();
    }
  }, [location.search, clearCart]);

  const total = getTotal();

  const shippingStripePriceId = shippingSettings?.[selectedShipping]?.stripe_price_id;

  // Calcul du tarif de livraison
  let shippingPrice = 0;
  let shippingFree = false;
  let shippingLogo = '';
  if (shippingSettings) {
    const settings = shippingSettings[selectedShipping];
    shippingLogo = settings.logo_url;
    if (total >= settings.free_shipping_threshold) {
      shippingFree = true;
      shippingPrice = 0;
    } else {
      shippingPrice = settings.base_price;
    }
  }

  const handleQuantityChange = async (productId: string, change: number) => {
    const item = items.find((i) => i.id === productId);
    if (!item) return;

    const newQuantity = Math.max(0, item.quantity + change);
    if (newQuantity === 0) {
      await removeItem(productId);
      toast({
        title: "Produit retiré",
        description: "Le produit a été retiré de votre panier",
      });
    } else {
      await updateQuantity(productId, newQuantity);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setShippingForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCheckout = async () => {
    try {
      setLoading(true);

      // 1. FILTRAGE : Séparer les produits payants des cadeaux
      const payableItems = items.filter(item => !item.is_gift && !item.threshold_gift);
      const giftItems = items.filter(item => item.is_gift || item.threshold_gift);
      
      console.log(`🎁 [CHECKOUT] ${giftItems.length} cadeaux détectés (exclus du traitement Stripe)`);
      console.log(`💰 [CHECKOUT] ${payableItems.length} produits payants à traiter`);

      // Validation des champs obligatoires
      const requiredAlways = [
        { key: "firstName", label: "Prénom" },
        { key: "lastName", label: "Nom" },
        { key: "email", label: "E-mail" },
        { key: "phone", label: "Téléphone" }
      ];
      const missingAlways = requiredAlways.filter(f => !shippingForm[f.key]?.trim());
      if (missingAlways.length > 0) {
        toast({
          variant: "destructive",
          title: "Champs obligatoires manquants",
          description: `Merci de remplir : ${missingAlways.map(f => f.label).join(", ")}`,
        });
        setLoading(false);
        return;
      }

      // Pour Colissimo, champs adresse obligatoires
      if (selectedShipping === 'colissimo') {
        const colissimoFields = [
          { key: "address1", label: "Adresse" },
          { key: "postalCode", label: "Code postal" },
          { key: "city", label: "Ville" },
          { key: "country", label: "Pays" }
        ];
        const missingColissimo = colissimoFields.filter(f => !shippingForm[f.key]?.trim());
        if (missingColissimo.length > 0) {
          toast({
            variant: "destructive",
            title: "Champs obligatoires manquants",
            description: `Merci de remplir : ${missingColissimo.map(f => f.label).join(", ")}`,
          });
          setLoading(false);
          return;
        }
      }

      // Pour Mondial Relay, point relais obligatoire
      if (selectedShipping === 'mondial_relay' && !selectedRelais) {
        toast({
          variant: "destructive",
          title: "Point relais manquant",
          description: "Merci de sélectionner un point relais Mondial Relay.",
        });
        setLoading(false);
        return;
      }

      // 2. TRAITEMENT STRIPE : Enrichir seulement les produits payants
      const enrichedPayableItems = await Promise.all(payableItems.map(async (item) => {
        // Récupérer les informations de prix avec réduction
        const { getDiscountedPrice } = useCartStore.getState();
        const priceInfo = await getDiscountedPrice(item.id, item.variant);
        
        let finalPriceId = item.stripe_price_id;
        let finalPrice = item.price;
        let originalPrice = item.original_price;
        let discountPercentage = item.discount_percentage;
        let hasDiscount = item.has_discount;
        
        if (priceInfo) {
          finalPrice = priceInfo.price;
          
          // Si il y a une promotion, utiliser le stripe_discount_price_id
          if (priceInfo.discount_percentage && priceInfo.stripe_discount_price_id) {
            finalPriceId = priceInfo.stripe_discount_price_id;
            originalPrice = priceInfo.original_price;
            discountPercentage = priceInfo.discount_percentage;
            hasDiscount = true;
            console.log(`🎯 [CHECKOUT] Promotion appliquée pour ${item.id}: ${originalPrice}€ -> ${finalPrice}€ (-${discountPercentage}%)`);
          } else {
            // Pas de promotion, utiliser le prix de base
            finalPriceId = item.stripe_price_id || await getPriceIdForProduct(item.id, item.variant);
            hasDiscount = false;
          }
        } else {
          // Fallback : récupérer le price_id de base
          finalPriceId = item.stripe_price_id || await getPriceIdForProduct(item.id, item.variant);
        }
        
        console.log(`📋 [CHECKOUT] Item ${item.id}:`, {
          originalPrice: item.price,
          finalPrice,
          finalPriceId,
          hasDiscount,
          discountPercentage
        });
        
        return {
          ...item,
          price: finalPrice,
          stripe_price_id: finalPriceId,
          original_price: originalPrice,
          discount_percentage: discountPercentage,
          has_discount: hasDiscount,
          _debug: {
            id: item.id,
            variant: item.variant,
            price_id_found: finalPriceId,
            promotion_applied: hasDiscount
          }
        };
      }));

      // 3. RÉASSEMBLER : Combiner les produits enrichis avec les cadeaux (inchangés)
      const enrichedItems = [...enrichedPayableItems, ...giftItems];

      // Ajout dynamique du frais de port si nécessaire
      let shippingItem = null;
      if (shippingSettings && !shippingFree) {
        const settings = shippingSettings[selectedShipping];
        shippingItem = {
          id: `shipping_${selectedShipping}`,
          title: selectedShipping === 'colissimo' ? 'Colissimo' : 'Mondial Relay',
          quantity: 1,
          price: settings.base_price,
          stripe_price_id: settings.stripe_price_id,
          is_shipping: true,
        };
      }

      // Créer le payload final
      const finalItems = shippingItem
        ? [...enrichedItems, shippingItem]
        : enrichedItems;

      // 💰 NOUVELLE VALIDATION : Vérifier le minimum Stripe
      const totalAmount = finalItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const STRIPE_MINIMUM_EUR = 0.50;
      
      if (totalAmount < STRIPE_MINIMUM_EUR) {
        toast({
          variant: "destructive",
          title: "Montant minimum requis",
          description: `Le montant total doit être d'au moins ${STRIPE_MINIMUM_EUR.toFixed(2)}€ pour procéder au paiement. Montant actuel : ${totalAmount.toFixed(2)}€`,
        });
        setLoading(false);
        return;
      }

      // 4. VALIDATION STRIPE : Vérifier seulement les produits payants (pas les cadeaux)
      const payableItemsForValidation = finalItems.filter(item => !item.is_gift && !item.threshold_gift);
      const missing = payableItemsForValidation.filter(
        i => !i.stripe_price_id && !i.stripe_discount_price_id && !("price_data" in i)
      );
      
      if (missing.length) {
        console.error("🚨 [CHECKOUT] Produits payants sans stripe_price_id:", missing);
        toast({
          title: "Erreur",
          description: "Certains produits n'ont pas de prix Stripe configuré. Veuillez vérifier votre panier.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }
      
      console.log(`✅ [CHECKOUT] Validation OK: ${payableItemsForValidation.length} produits payants prêts pour Stripe`);
      
      // Créer le payload final pour le backend (Supabase ou API)
      // On conserve tous les champs existants (dont stripe_price_id), et on ajoute/force title et variant
      const payloadItems = finalItems.map(item => ({
        ...item,
        title: item.title || item.product_title || '',
        variant: item.variant || null
      }));
      
      // Stocker le payload avant l'appel API
      setDebugStripe((prev) => ({
        ...prev,
        items,
        enrichedItems,
        payableItems,
        giftItems,
        missing,
        totalAmount,
        stripeMinimum: STRIPE_MINIMUM_EUR,
        apiPayload: {
          items: payloadItems,
          user_id: user?.id || null,
          first_name: String(shippingForm.firstName || ""),
          last_name: String(shippingForm.lastName || ""),
          email: String(shippingForm.email || ""),
          phone: String(shippingForm.phone || ""),
          address1: String(shippingForm.address1 || ""),
          address2: String(shippingForm.address2 || ""),
          postal_code: String(shippingForm.postalCode || ""),
          city: String(shippingForm.city || ""),
          country: String(shippingForm.country || ""),
          shipping_method: String(selectedShipping || ""),
          ...(selectedShipping === 'mondial_relay' && selectedRelais ? { mondial_relay: JSON.stringify(selectedRelais) } : {})
        }
      }));

      // Debug info
      const debugInfo = {
        url: "https://btnyenoxsjtuydpzbapq.functions.supabase.co/checkout",
        headers: {
          "Content-Type": "application/json"
        },
        payload: {
          items: payloadItems,
          user_id: user?.id || null,
          first_name: String(shippingForm.firstName || ""),
          last_name: String(shippingForm.lastName || ""),
          email: String(shippingForm.email || ""),
          phone: String(shippingForm.phone || ""),
          address1: String(shippingForm.address1 || ""),
          address2: String(shippingForm.address2 || ""),
          postal_code: String(shippingForm.postalCode || ""),
          city: String(shippingForm.city || ""),
          country: String(shippingForm.country || ""),
          shipping_method: String(selectedShipping || ""),
          ...(selectedShipping === 'mondial_relay' && selectedRelais ? { mondial_relay: JSON.stringify(selectedRelais) } : {})
        }
      };
      setApiDebug(debugInfo);

      const response = await fetch(debugInfo.url, {
        method: "POST",
        headers: debugInfo.headers,
        body: JSON.stringify(debugInfo.payload)
      });

      const data = await response.json();

      // Update debug avec la réponse
      setDebugStripe((prev) => ({
        ...prev,
        apiResponse: data.url ? { url: data.url } : undefined,
        apiDebug: data.debug
      }));

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors du checkout");
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("Pas d'URL de redirection Stripe");
      }
    } catch (error) {
      console.error("Erreur checkout:", error);
      setDebugStripe((prev) => ({
        ...prev,
        apiError: error,
      }));
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingUser) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">
        <FloatingHeader />
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">
      <FloatingHeader />
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            <ShoppingCart className="inline h-8 w-8 mr-3" />
            Finaliser ma commande
          </h1>

          {items.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Votre panier est vide</h2>
                <p className="text-gray-600 mb-4">Ajoutez des produits pour continuer</p>
                <Button asChild className="rounded-xl bg-[#0074b3] text-white hover:bg-[#005a8c] transition-colors px-6 py-2 font-semibold w-full flex items-center justify-center gap-2">
                  <Link to="/">Continuer mes achats</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Colonne principale - Informations client et livraison */}
              <div className="lg:col-span-2 space-y-6">
                {/* Section client */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <UserIcon className="h-5 w-5 mr-2" />
                      Informations client
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {user ? (
                      <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                            <UserIcon className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {user.user_metadata?.first_name || user.email}
                            </p>
                            <p className="text-sm text-gray-600">{user.email}</p>
                          </div>
                        </div>
                        <Badge className="bg-green-100 text-green-800">Connecté</Badge>
                      </div>
                    ) : (
                      <div className="text-center p-6 bg-blue-50 rounded-lg border border-blue-200">
                        <UserIcon className="h-12 w-12 text-blue-400 mx-auto mb-3" />
                        <h3 className="font-medium text-gray-900 mb-2">Vous n'êtes pas connecté</h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Connectez-vous pour accélérer votre commande
                        </p>
                        <Button asChild variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50">
                          <Link to="/account/login">Se connecter</Link>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Adresse de livraison */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Truck className="h-5 w-5 mr-2" />
                      Adresse de livraison
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">Prénom *</Label>
                        <Input
                          id="firstName"
                          value={shippingForm.firstName}
                          onChange={(e) => handleInputChange('firstName', e.target.value)}
                          placeholder="Votre prénom"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Nom *</Label>
                        <Input
                          id="lastName"
                          value={shippingForm.lastName}
                          onChange={(e) => handleInputChange('lastName', e.target.value)}
                          placeholder="Votre nom"
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="email" className="flex items-center">
                        <Mail className="h-4 w-4 mr-1" />
                        Email *
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={shippingForm.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="votre@email.com"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="phone" className="flex items-center">
                        <Phone className="h-4 w-4 mr-1" />
                        Téléphone *
                      </Label>
                      <Input
                        id="phone"
                        value={shippingForm.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="06 12 34 56 78"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="address1" className="flex items-center">
                        <MapPin className="h-4 w-4 mr-1" />
                        Adresse *
                      </Label>
                      <Input
                        id="address1"
                        value={shippingForm.address1}
                        onChange={(e) => handleInputChange('address1', e.target.value)}
                        placeholder="Numéro et nom de rue"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="address2">Complément d'adresse</Label>
                      <Input
                        id="address2"
                        value={shippingForm.address2}
                        onChange={(e) => handleInputChange('address2', e.target.value)}
                        placeholder="Appartement, étage, etc."
                        className="mt-1"
                      />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="postalCode">Code postal *</Label>
                        <Input
                          id="postalCode"
                          value={shippingForm.postalCode}
                          onChange={(e) => handleInputChange('postalCode', e.target.value)}
                          placeholder="75000"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="city">Ville *</Label>
                        <Input
                          id="city"
                          value={shippingForm.city}
                          onChange={(e) => handleInputChange('city', e.target.value)}
                          placeholder="Paris"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="country">Pays *</Label>
                        <Input
                          id="country"
                          value={shippingForm.country}
                          onChange={(e) => handleInputChange('country', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Début : Champ de recherche Mondial Relay au-dessus du mode de livraison */}
                {selectedShipping === 'mondial_relay' && (
                  <div className="my-4">
                    <MondialRelaySelector
                      onSelect={setSelectedRelais}
                      selected={selectedRelais}
                      initialCodePostal={shippingForm.postalCode}
                      initialVille={shippingForm.city}
                      autoSearch={autoSearchMondialRelay}
                    />
                  </div>
                )}
                {/* Fin : Champ de recherche Mondial Relay */}

                {/* Sélecteur de mode de livraison */}
                {shippingSettings && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Truck className="h-5 w-5 mr-2" />
                        Mode de livraison
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-6 flex-col sm:flex-row">
                        {(['colissimo', 'mondial_relay'] as const).map((mode) => {
                          const s = shippingSettings[mode];
                          return (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => setSelectedShipping(mode)}
                              className={`flex-1 flex flex-col items-center p-4 rounded-xl border transition shadow-sm cursor-pointer focus:outline-none
                                ${selectedShipping === mode ? 'border-blue-600 bg-blue-50 shadow-md' : 'border-gray-200 bg-white hover:border-blue-300'}
                              `}
                              style={{ minWidth: 180 }}
                            >
                              <div className="mb-2">
                                {s.logo_url ? (
                                  <img src={s.logo_url} alt={mode} className="h-10 object-contain" />
                                ) : (
                                  <Truck className="h-10 w-10 text-gray-400" />
                                )}
                              </div>
                              <div className="font-semibold text-lg capitalize mb-1">
                                {mode === 'colissimo' ? 'Colissimo' : 'Mondial Relay'}
                              </div>
                              <div className="text-sm text-gray-600 mb-1">
                                {total >= s.free_shipping_threshold ? (
                                  <span className="text-green-600 font-bold">Offert</span>
                                ) : (
                                  <span>{s.base_price.toFixed(2)} €</span>
                                )}
                              </div>
                              {selectedShipping === mode && (
                                <span className="mt-2 px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-medium">Sélectionné</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Sidebar - Récapitulatif commande */}
              <div className="space-y-6">
                {/* Récapitulatif du panier */}
                <Card>
                  <CardHeader>
                    <CardTitle>Récapitulatif de commande</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        {item.image_url && (
                          <img
                            src={item.image_url}
                            alt={item.title}
                            className="w-16 h-16 object-cover rounded"
                          />
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm leading-tight">{item.title}</h4>
                          {item.variant && (
                            <div className="text-xs text-gray-500 mb-1">{item.variant}</div>
                          )}
                          <div className="text-sm">
                            {item.has_discount && item.original_price ? (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 line-through">
                                  {item.original_price.toFixed(2)}€
                                </span>
                                <span className="text-red-600 font-medium">
                                  {item.price.toFixed(2)}€
                                </span>
                                <span className="text-xs bg-red-100 text-red-800 px-1 py-0.5 rounded">
                                  -{item.discount_percentage}%
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-600">{item.price.toFixed(2)}€</span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 mt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleQuantityChange(item.id, -1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleQuantityChange(item.id, 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 ml-2 text-red-500 hover:text-red-600"
                              onClick={() => removeItem(item.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="font-medium text-sm">
                            {(item.price * item.quantity).toFixed(2)}€
                          </p>
                        </div>
                      </div>
                    ))}

                    {/* Affichage du point relais sélectionné si Mondial Relay */}
                    {selectedShipping === 'mondial_relay' && selectedRelais && (
                      <div className="p-2 bg-blue-50 border border-blue-200 rounded mb-2">
                        <div className="font-semibold text-blue-800 text-sm mb-1">Point relais sélectionné :</div>
                        <div className="text-xs text-blue-900">
                          <b>{selectedRelais.LgAdr1}</b><br />
                          {selectedRelais.LgAdr2 && <>{selectedRelais.LgAdr2}<br /></>}
                          {selectedRelais.CP} {selectedRelais.Ville}
                        </div>
                      </div>
                    )}

                    <div className="border-t pt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Sous-total</span>
                        <span>{total.toFixed(2)}€</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Livraison</span>
                        {shippingSettings ? (
                          shippingFree ? (
                            <span className="text-green-600 font-bold">Offert</span>
                          ) : (
                            <span>{shippingPrice.toFixed(2)}€</span>
                          )
                        ) : (
                          <span>—</span>
                        )}
                      </div>
                      <div className="flex justify-between text-lg font-bold pt-2 border-t">
                        <span>Total TTC</span>
                        <span>{(total + (shippingFree ? 0 : shippingPrice)).toFixed(2)}€</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Paiement */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <CreditCard className="h-5 w-5 mr-2" />
                      Paiement
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-center p-4 bg-green-50 rounded-lg border border-green-200">
                      <Lock className="h-5 w-5 text-green-600 mr-2" />
                      <span className="text-sm text-green-700 font-medium">
                        Paiement 100% sécurisé via Stripe
                      </span>
                    </div>
                    
                    {/* 🎁 Message informatif si seulement des cadeaux */}
                    {hasOnlyGifts && (
                      <div className="flex items-center justify-center p-4 bg-amber-50 rounded-lg border border-amber-200 mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.18 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <div className="text-sm text-amber-700">
                          <span className="font-medium">Panier contenant uniquement des cadeaux</span>
                          <br />
                          <span className="text-xs">Ajoutez des produits payants pour pouvoir commander</span>
                        </div>
                      </div>
                    )}
                    
                    <Button
                      onClick={handleCheckout}
                      disabled={loading || items.length === 0 || !canCheckout}
                      className={`rounded-xl transition-colors px-6 py-2 font-semibold w-full flex items-center justify-center gap-2 h-12 ${
                        !canCheckout 
                          ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                          : 'bg-[#0074b3] text-white hover:bg-[#005a8c]'
                      }`}
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Redirection en cours...
                        </>
                      ) : !canCheckout ? (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.18 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          Ajoutez des produits pour commander
                        </>
                      ) : (
                        <>
                          Procéder au paiement
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2 h-4 w-4"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                        </>
                      )}
                    </Button>
                    
                    <p className="text-xs text-gray-500 text-center">
                      {canCheckout ? (
                        "En cliquant sur \"Procéder au paiement\", vous acceptez nos conditions générales de vente."
                      ) : (
                        "Vous ne pouvez pas passer commande avec uniquement des cadeaux gratuits."
                      )}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
          {isEditMode && isAdmin && debugStripe && (
            <div className="mt-10 p-6 bg-gray-100 border border-gray-300 rounded-xl max-w-3xl mx-auto">
              <h3 className="font-bold text-lg mb-4 text-blue-900">🧩 Stripe Checkout Debug</h3>

              <section className="space-y-4 text-xs text-gray-800">
                <div>
                  <b>Panier AVANT enrichissement :</b>
                  <pre className="bg-white p-2 rounded">{JSON.stringify(debugStripe.items, null, 2)}</pre>
                </div>

                <div>
                  <b>Panier APRÈS enrichissement :</b>
                  <pre className="bg-white p-2 rounded">{JSON.stringify(debugStripe.enrichedItems, null, 2)}</pre>
                </div>

                <div>
                  <b>Produits SANS stripe_price_id :</b>
                  <pre className="bg-red-100 p-2 rounded">{JSON.stringify(debugStripe.missing, null, 2)}</pre>
                </div>

                <div>
                  <b>✅ Payload API Stripe :</b>
                  <pre className="bg-white p-2 rounded">{JSON.stringify(debugStripe.apiPayload, null, 2)}</pre>
                </div>

                <div>
                  <b>📨 Réponse Stripe :</b>
                  <pre className="bg-green-100 p-2 rounded">{JSON.stringify(debugStripe.apiResponse, null, 2)}</pre>
                </div>

                {debugStripe.apiError && (
                  <div>
                    <b>❌ Erreur Stripe :</b>
                    <pre className="bg-red-200 p-2 rounded">{JSON.stringify(debugStripe.apiError, null, 2)}</pre>
                  </div>
                )}

                {debugStripe.apiDebug && (
                  <div>
                    <b>📝 Trace complète API (Supabase & Stripe) :</b>
                    <pre className="bg-white p-4 rounded border text-xs whitespace-pre-wrap">{JSON.stringify(debugStripe.apiDebug, null, 2)}</pre>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
      
      {/* Ajoute le panneau de debug */}
      <DebugPanel apiDebug={apiDebug} />
    </div>
  );
};

export default Checkout;