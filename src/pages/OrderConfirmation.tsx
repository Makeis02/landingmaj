import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle, MapPin, Truck, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingHeader from "@/components/admin/FloatingHeader";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/stores/useCartStore";

const OrderConfirmation = () => {
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState<any>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [wheelGifts, setWheelGifts] = useState<any[]>([]);
  const [productImages, setProductImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const orderId = searchParams.get("order_id");
  const { clearCart } = useCartStore();

  useEffect(() => {
    // 🧹 VIDAGE DU PANIER dès l'arrivée sur la page de confirmation
    clearCart();
    console.log("🧹 [ORDER-CONFIRMATION] Panier vidé après confirmation de commande");
    
    if (!orderId) return;
    const fetchOrder = async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();
      if (!error && data) {
        setOrder(data);
        
        // Récupérer les order_items
        const { data: items, error: itemsError } = await supabase
          .from("order_items")
          .select("*")
          .eq("order_id", orderId);
        if (!itemsError && items) {
          setOrderItems(items);
          
          // Récupérer les images produits
          const ids = [...new Set(items.filter(i => !i.product_id.startsWith('shipping_')).map(i => i.product_id))];
          if (ids.length > 0) {
            const keys = ids.map(id => `product_${id}_image_0`);
            const { data: imgData } = await supabase
              .from("editable_content")
              .select("content_key, content")
              .in("content_key", keys);
            const imgMap: Record<string, string> = {};
            imgData?.forEach(item => {
              const id = item.content_key.replace("product_", "").replace("_image_0", "");
              imgMap[id] = item.content;
            });
            setProductImages(imgMap);
          }
        }
        
        // 🎁 NOUVEAU : Récupérer les cadeaux de la roue
        const { data: gifts, error: giftsError } = await supabase
          .from("order_wheel_gifts")
          .select("*")
          .eq("order_id", orderId);
        if (!giftsError && gifts) {
          setWheelGifts(gifts);
          console.log("🎁 [ORDER-CONFIRMATION] Cadeaux de la roue récupérés:", gifts);
        }
      }
      setLoading(false);
    };
    fetchOrder();
  }, [orderId]);

  // Calculs totaux
  const sousTotal = orderItems.filter(i => !i.product_id.startsWith('shipping_')).reduce((sum, i) => sum + (i.price * i.quantity), 0);
  const livraison = orderItems.find(i => i.product_id.startsWith('shipping_'));
  const total = order?.total && order.total > 0 ? order.total : (orderItems.reduce((sum, i) => sum + (i.price * i.quantity), 0));

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">
      <FloatingHeader />
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12 flex flex-col items-center justify-center text-center">
        <Card className="max-w-3xl w-full">
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-3 text-green-700">
              <CheckCircle className="h-6 w-6" />
              Merci pour votre commande !
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-left">
            {loading ? (
              <p className="text-gray-600 text-sm">Chargement de votre commande...</p>
            ) : order ? (
              <>
                <div className="mb-2 text-sm text-gray-700">
                  <b>Commande n°:</b> {order.id}<br />
                  <b>Date:</b> {new Date(order.created_at).toLocaleString("fr-FR")}
                </div>
                <div className="mb-2 text-sm text-gray-700">
                  <b>Client:</b> {order.first_name} {order.last_name}<br />
                  <b>Email:</b> {order.email}
                </div>
                {/* Adresse ou Point Relais */}
                {order.shipping_method === 'mondial_relay' && order.mondial_relay ? (
                  (() => {
                    let relay = null;
                    try {
                      relay = typeof order.mondial_relay === 'string' ? JSON.parse(order.mondial_relay) : order.mondial_relay;
                    } catch (e) {
                      relay = order.mondial_relay;
                    }
                    return (
                      <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-2 text-xs">
                        <b>Livraison en Point Relais :</b><br />
                        {relay && typeof relay === 'object' ? (
                          <span>
                            {relay.LgAdr1}<br />
                            {relay.LgAdr2 && <>{relay.LgAdr2}<br /></>}
                            {relay.CP} {relay.Ville}<br />
                            {relay.Pays}
                          </span>
                        ) : (
                          <span>{String(relay)}</span>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <div className="flex items-center gap-2 mb-2 text-xs text-gray-700">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span>{order.address1} {order.address2 && <span className="text-gray-400">({order.address2})</span>} {order.postal_code} {order.city} {order.country && <span>({order.country})</span>}</span>
                  </div>
                )}
                
                {/* 🎁 Section des cadeaux de la roue */}
                {wheelGifts.length > 0 && (
                  <div className="border-t pt-4 space-y-3 mb-6">
                    <div className="flex items-center gap-2 pb-2 border-b border-blue-200">
                      <span className="text-2xl">🎁</span>
                      <h4 className="font-semibold text-blue-800">Cadeaux de la roue de la fortune</h4>
                      <Badge className="bg-blue-100 text-blue-800">{wheelGifts.length}</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {wheelGifts.map((gift, idx) => (
                        <div key={gift.id || idx} className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-2 border-blue-200 relative overflow-hidden">
                          {/* Effet scintillant pour les cadeaux */}
                          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                          
                          {gift.image_url && (
                            <div className="relative">
                              <img
                                src={gift.image_url}
                                alt={gift.title}
                                className="w-12 h-12 object-cover rounded-lg border-2 border-blue-300 shadow-lg"
                              />
                              <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs">🎁</span>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex-1 min-w-0 relative z-10">
                            <div className="flex items-center gap-2 mb-1">
                              <h5 className="font-medium text-sm leading-tight text-blue-900">{gift.title}</h5>
                              <Badge className="bg-green-100 text-green-800 text-xs">GRATUIT</Badge>
                            </div>
                            
                            <div className="text-xs text-blue-600 mb-1">
                              🎉 Gagné le {new Date(gift.won_at).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: '2-digit', 
                                year: 'numeric'
                              })}
                            </div>
                            
                            <div className="text-sm font-bold text-green-600">
                              OFFERT 🎉
                            </div>
                          </div>
                          
                          <div className="text-right relative z-10">
                            <p className="text-sm font-bold text-green-600">
                              GRATUIT
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Liste des produits payants */}
                {orderItems.filter(i => !i.product_id.startsWith('shipping_')).length > 0 && (
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex items-center gap-2 mb-3">
                      <Package className="h-5 w-5 text-gray-700" />
                      <h4 className="font-semibold text-gray-800">Produits commandés</h4>
                      <Badge className="bg-gray-100 text-gray-800">
                        {orderItems.filter(i => !i.product_id.startsWith('shipping_')).length}
                      </Badge>
                    </div>
                    <table className="min-w-full text-sm border">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="p-2 border">Produit</th>
                          <th className="p-2 border">Qté</th>
                          <th className="p-2 border">Prix</th>
                          <th className="p-2 border">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orderItems.filter(i => !i.product_id.startsWith('shipping_')).map((item, idx) => (
                          <tr key={item.id || idx}>
                            <td className="p-2 border flex items-center gap-2">
                              {productImages[item.product_id] && (
                                <img src={productImages[item.product_id]} alt="img" className="w-10 h-10 object-contain rounded border mr-2" />
                              )}
                              {item.product_title || item.title || item.product_id}
                              {item.variant && (
                                <span className="text-xs text-gray-500 ml-1">– {item.variant}</span>
                              )}
                            </td>
                            <td className="p-2 border text-center">{item.quantity}</td>
                            <td className="p-2 border text-right">{item.price?.toFixed(2)} €</td>
                            <td className="p-2 border text-right">{(item.price * item.quantity).toFixed(2)} €</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                
                {/* Récapitulatif total */}
                <div className="mt-4 p-3 bg-gray-50 rounded border flex flex-col gap-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Sous-total produits</span>
                    <span>{sousTotal.toFixed(2)} €</span>
                  </div>
                  {wheelGifts.length > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-600">Cadeaux de la roue</span>
                      <span className="text-green-600 font-bold">GRATUIT</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-gray-600">Livraison</span>
                    {(!livraison || livraison.price === 0) ? (
                      <span className="text-green-700 font-bold bg-green-100 px-2 py-0.5 rounded">Gratuit</span>
                    ) : (
                      <span>{livraison.price?.toFixed(2)} €</span>
                    )}
                  </div>
                  <div className="flex justify-between font-medium text-lg mt-2">
                    <span>Total payé</span>
                    <span>{total.toFixed(2)} €</span>
                  </div>
                </div>
                {/* Message suivi */}
                <div className="mt-4 text-xs text-blue-700 text-center">
                  Un numéro de suivi vous sera communiqué par email dès l'expédition de votre commande.
                </div>
                <div className="mt-6 text-center">
                  <Button asChild className="w-full bg-[#0074b3] text-white hover:bg-[#005a8c]">
                    <Link to="/">Retour à l'accueil</Link>
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-red-600 text-sm">Commande introuvable.</p>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default OrderConfirmation; 