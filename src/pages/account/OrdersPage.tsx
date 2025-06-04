import { useState, useEffect, useRef, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Package, Calendar, Euro, Eye, Truck, CheckCircle, Clock, AlertCircle, AlertTriangle, Upload, Bell, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useUserStore } from "@/stores/useUserStore";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import React from "react";
import RevePointsBanner from "@/components/RevePointsBanner";

// Types pour les commandes
interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  price: number;
  title?: string;
  image_url?: string;
  variant?: string;
  product_title?: string;
}

interface Order {
  id: string;
  created_at: string;
  total: number;
  status: "active" | "en_cours" | "litige" | "archived";
  order_items: OrderItem[];
  tracking_number?: string;
  litige_closed?: boolean;
  tracking_numbers?: string[];
  last_admin_litige_message_at?: string;
  last_client_litige_read_at?: string;
  shipping_method?: string;
  mondial_relay?: string;
  address1?: string;
  address2?: string;
  postal_code?: string;
  city?: string;
  country?: string;
}

// Fonction utilitaire pour transformer les liens en <a> et images
function renderMessageContent(msg) {
  const urlRegex = /(https?:\/\/[\w\-._~:/?#[\]@!$&'()*+,;=%]+\.(?:jpg|jpeg|png|gif|webp))(?![\w.])/gi;
  const genericUrlRegex = /(https?:\/\/[\w\-._~:/?#[\]@!$&'()*+,;=%]+)/gi;
  // Images
  let parts = msg.message.split(urlRegex);
  return parts.map((part, i) => {
    if (urlRegex.test(part)) {
      return <img key={i} src={part} alt="img" className="max-w-[180px] max-h-[120px] rounded my-1" />;
    } else if (genericUrlRegex.test(part)) {
      return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline text-blue-700 break-all">{part}</a>;
    } else {
      return <React.Fragment key={i}>{part}</React.Fragment>;
    }
  });
}

// Fonction de rendu de la messagerie litige
function LitigeChat({ order, litigeMessages, loadingMessages, newMessage, setNewMessage, handleSendLitigeMessage, messagesEndRef, canSend, spamMsg, handleUploadImage, uploadingImage }) {
  if (!order || order.status !== "litige") return null;
  return (
    <div className="mt-6">
      <h3 className="text-lg font-bold mb-2">Discussion avec l'administration</h3>
      <div className="bg-gray-50 rounded p-3 max-h-60 overflow-y-auto mb-2 border">
        {loadingMessages ? (
          <div className="text-center text-gray-400">Chargement...</div>
        ) : litigeMessages.length === 0 ? (
          <div className="text-center text-gray-400">Aucun message pour ce litige.</div>
        ) : (
          litigeMessages.map(msg => (
            <div
              key={msg.id}
              className={`mb-2 flex ${msg.sender_type === 'client' ? 'justify-start' : 'justify-end'}`}
            >
              <div className={`rounded-lg px-3 py-2 max-w-xs break-words text-sm shadow ${msg.sender_type === 'client' ? 'bg-blue-100 text-blue-900' : 'bg-green-100 text-green-900'}`}>
                {renderMessageContent(msg)}
                <div className="text-xs text-gray-400 mt-1 text-right">{new Date(msg.created_at).toLocaleString("fr-FR")}</div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      {order.litige_closed ? (
        <div className="text-center text-red-600 font-semibold">Ce litige a été clôturé par l'administration.</div>
      ) : (
        <div className="flex flex-col gap-2 mt-2">
          {spamMsg && <div className="text-xs text-red-500 text-center">{spamMsg}</div>}
          <div className="flex gap-2 items-center">
            <input
              type="text"
              className="flex-1 border rounded px-2 py-1"
              placeholder="Votre message..."
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && canSend) handleSendLitigeMessage(); }}
              disabled={loadingMessages || uploadingImage}
            />
            <label className="cursor-pointer flex items-center justify-center p-2 bg-gray-100 rounded hover:bg-gray-200">
              <Upload className="h-5 w-5 text-blue-600" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUploadImage}
                disabled={uploadingImage}
              />
            </label>
            <Button onClick={handleSendLitigeMessage} disabled={!canSend || loadingMessages || uploadingImage}>
              {uploadingImage ? (
                <span className="flex items-center"><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>Envoi...</span>
              ) : (
                "Envoyer"
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Ajout utilitaire pour récupérer l'image principale produit (editable_content puis fallback products.image)
const fetchProductMainImages = async (productIds, setProductImages) => {
  if (!productIds.length) return;
  const keys = productIds.map(id => `product_${id}_image_0`);
  const { data: editableData } = await supabase
    .from('editable_content')
    .select('content_key, content')
    .in('content_key', keys);
  const imageMap = {};
  if (editableData) {
    editableData.forEach(item => {
      const id = item.content_key.replace('product_', '').replace('_image_0', '');
      if (item.content) imageMap[id] = item.content;
    });
  }
  const missingIds = productIds.filter(id => !imageMap[id]);
  if (missingIds.length > 0) {
    const { data: prodData } = await supabase
      .from('products')
      .select('shopify_id, image')
      .in('shopify_id', missingIds);
    if (prodData) {
      prodData.forEach(p => {
        if (p.image) imageMap[p.shopify_id] = p.image;
      });
    }
  }
  setProductImages(imageMap);
};

const OrdersPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [productTitles, setProductTitles] = useState<Record<string, string>>({});
  const user = useUserStore((s) => s.user);
  const navigate = useNavigate();
  const [showLitigeModal, setShowLitigeModal] = useState(false);
  const [selectedOrderForLitige, setSelectedOrderForLitige] = useState<Order | null>(null);
  const [litigeReason, setLitigeReason] = useState("");
  const [submittingLitige, setSubmittingLitige] = useState(false);
  const [litigeMessages, setLitigeMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);
  const [lastSentTime, setLastSentTime] = useState(0);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [productImages, setProductImages] = useState({});

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    const fetchOrders = async () => {
      try {
        const { data: ordersData } = await supabase
          .from("orders")
          .select("*, order_items(*)")
          .eq("user_id", user.id)
          .eq("archived", false)
          .order("created_at", { ascending: false });
        if (ordersData) {
          setOrders(ordersData);
          // Récupérer titres produits
          const productIds = ordersData.flatMap(order => order.order_items).map(item => item.product_id);
          if (productIds.length > 0) {
            const { data: products } = await supabase
              .from("products")
              .select("shopify_id, title")
              .in("shopify_id", productIds);
            if (products) {
              const titles = products.reduce((acc, product) => ({ ...acc, [product.shopify_id]: product.title }), {});
              setProductTitles(titles);
            }
            // Récupérer les images produits enrichies
            await fetchProductMainImages(productIds, setProductImages);
          }
        }
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [user]);

  // Récupérer les messages de litige pour la commande sélectionnée
  useEffect(() => {
    const fetchLitigeMessages = async () => {
      if (!selectedOrder) return;
      const order = orders.find(o => o.id === selectedOrder);
      if (!order || order.status !== "litige") return;
      setLoadingMessages(true);
      const { data, error } = await supabase
        .from("litige_messages")
        .select("*")
        .eq("order_id", selectedOrder)
        .order("created_at", { ascending: true });
      if (!error) setLitigeMessages(data);
      setLoadingMessages(false);
      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    };
    fetchLitigeMessages();
  }, [selectedOrder]);

  const getStatusIcon = (status: Order["status"]) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-4 w-4" />;
      case "en_cours":
        return <Truck className="h-4 w-4" />;
      case "litige":
        return <Clock className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getStatusText = (status: Order["status"]) => {
    switch (status) {
      case "active":
        return "Active";
      case "en_cours":
        return "En cours de livraison";
      case "litige":
        return "En litige";
      case "archived":
        return "Archivée";
      default:
        return "Inconnue";
    }
  };

  const getStatusColor = (status: Order["status"]) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700";
      case "en_cours":
        return "bg-blue-100 text-blue-700";
      case "litige":
        return "bg-red-100 text-red-700";
      case "archived":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleShowOrderDetails = (orderId: string) => {
    setSelectedOrder(orderId);
    const order = orders.find(o => o.id === orderId);
    if (order && order.status === "litige") {
      markLitigeAsRead(orderId);
    }
  };

  const handleCloseOrderDetails = () => {
    setSelectedOrder(null);
  };

  const handleOpenLitigeModal = (order: Order) => {
    setSelectedOrderForLitige(order);
    setShowLitigeModal(true);
  };

  const handleCloseLitigeModal = () => {
    setShowLitigeModal(false);
    setSelectedOrderForLitige(null);
    setLitigeReason("");
  };

  const handleSubmitLitige = async () => {
    if (!selectedOrderForLitige || !litigeReason.trim()) return;

    setSubmittingLitige(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ 
          status: "litige",
          litige_reason: litigeReason,
          litige_date: new Date().toISOString(),
          litige_by: user?.id
        })
        .eq("id", selectedOrderForLitige.id);

      if (error) throw error;

      toast.success("Votre signalement a été envoyé. Nous vous contacterons rapidement.");
      handleCloseLitigeModal();
      
      // Rafraîchir les commandes
      const { data: ordersData } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("user_id", user.id)
        .eq("archived", false)
        .order("created_at", { ascending: false });

      if (ordersData) setOrders(ordersData);
    } catch (err) {
      console.error("Erreur lors du signalement:", err);
      toast.error("Une erreur est survenue lors du signalement");
    } finally {
      setSubmittingLitige(false);
    }
  };

  // Anti-spam rules (corrigé)
  const spamMsg = React.useMemo(() => {
    const now = Date.now();
    if (newMessage.trim().length < 3) return "Votre message est trop court.";
    if (now - lastSentTime < 10000) return "Merci d'attendre 10 secondes entre chaque message.";
    const lastAdminIdx = litigeMessages.map(m => m.sender_type).lastIndexOf('admin');
    const clientSinceLastAdmin = litigeMessages.slice(lastAdminIdx + 1).filter(m => m.sender_type === 'client').length;
    if (clientSinceLastAdmin >= 5) return "Merci d'attendre une réponse de l'administration avant de continuer.";
    return "";
  }, [newMessage, lastSentTime, litigeMessages]);
  const canSend = !spamMsg;

  // Envoi d'un message litige
  const handleSendLitigeMessage = async () => {
    if (!canSend || !newMessage.trim() || !selectedOrder) return;
    const order = orders.find(o => o.id === selectedOrder);
    if (!order || order.litige_closed) return;
    const { error } = await supabase.from("litige_messages").insert({
      order_id: selectedOrder,
      sender_type: "client",
      sender_id: user.id,
      message: newMessage.trim(),
    });
    if (!error) {
      setNewMessage("");
      setLastSentTime(Date.now());
      // Rafraîchir les messages
      const { data } = await supabase
        .from("litige_messages")
        .select("*")
        .eq("order_id", selectedOrder)
        .order("created_at", { ascending: true });
      setLitigeMessages(data);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  };

  // Upload image sur Supabase Storage
  const handleUploadImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage.from('litige-messages').upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });
      if (error) throw error;
      // Récupérer l'URL publique
      const { data: publicUrlData } = supabase.storage.from('litige-messages').getPublicUrl(fileName);
      if (publicUrlData?.publicUrl) {
        // Envoie le message image directement
        const order = orders.find(o => o.id === selectedOrder);
        if (!order || order.litige_closed) return;
        await supabase.from("litige_messages").insert({
          order_id: selectedOrder,
          sender_type: "client",
          sender_id: user.id,
          message: publicUrlData.publicUrl,
        });
        // Rafraîchir les messages
        const { data: messages } = await supabase
          .from("litige_messages")
          .select("*")
          .eq("order_id", selectedOrder)
          .order("created_at", { ascending: true });
        setLitigeMessages(messages);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    } catch (err) {
      toast.error("Erreur lors de l'upload de l'image");
    } finally {
      setUploadingImage(false);
    }
  };

  // Marquer la discussion comme lue côté client
  const markLitigeAsRead = async (orderId) => {
    await supabase.from("orders").update({ last_client_litige_read_at: new Date().toISOString() }).eq("id", orderId);
    // Rafraîchir les commandes pour mettre à jour le badge
    const { data: ordersData } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("user_id", user.id)
      .eq("archived", false)
      .order("created_at", { ascending: false });
    if (ordersData) setOrders(ordersData);
  };

  // Ajout d'un composant OrderTotalDetails adapté client
  function OrderTotalDetailsClient({ order, orderItems }) {
    const hasItems = Array.isArray(orderItems) && orderItems.length > 0;
    const sousTotal = hasItems
      ? orderItems.filter(item => !item.product_id.startsWith('shipping_')).reduce((sum, item) => sum + (item.price * item.quantity), 0)
      : null;
    const livraison = hasItems
      ? (orderItems.find(item => item.product_id && item.product_id.startsWith('shipping_'))?.price ?? null)
      : null;
    const totalPaye = order.total && order.total > 0
      ? order.total
      : (hasItems ? orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0) : 0);
    return (
      <div className="mb-2 p-2 bg-gray-50 rounded border flex flex-col gap-1">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Sous-total produits</span>
          <span>{sousTotal !== null ? sousTotal.toFixed(2) + ' €' : '—'}</span>
        </div>
        <div className="flex justify-between text-sm items-center">
          <span className="text-gray-600">Livraison</span>
          {livraison === 0 ? (
            <span className="text-green-700 font-bold bg-green-100 px-2 py-0.5 rounded">Gratuit</span>
          ) : livraison !== null ? (
            <span>{livraison.toFixed(2)} €</span>
          ) : (
            <span>—</span>
          )}
        </div>
        <div className="flex justify-between font-medium text-base mt-2">
          <span>Total payé</span>
          <span>{totalPaye.toFixed(2)} €</span>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement de vos commandes...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <RevePointsBanner />
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate("/account")}
              variant="outline"
              size="icon"
              className="shrink-0 border-[#0074b3] text-[#0074b3] hover:bg-[#e6f4fa] hover:border-[#005a8c]"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Mes Commandes</h1>
              <p className="text-gray-600">Suivez l'état de vos commandes et consultez l'historique</p>
            </div>
          </div>

          {/* Statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-0">
              <CardContent className="p-4 text-center">
                <Package className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-600">{orders.length}</div>
                <p className="text-sm text-gray-600">Total commandes</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-blue-50 border-0">
              <CardContent className="p-4 text-center">
                <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-600">
                  {orders.filter(o => o.status === "active").length}
                </div>
                <p className="text-sm text-gray-600">Actives</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-0">
              <CardContent className="p-4 text-center">
                <Truck className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-purple-600">
                  {orders.filter(o => o.status === "en_cours").length}
                </div>
                <p className="text-sm text-gray-600">En livraison</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-0">
              <CardContent className="p-4 text-center">
                <Euro className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-yellow-600">
                  {orders.reduce((sum, order) => sum + (order.total || 0), 0).toFixed(0)}€
                </div>
                <p className="text-sm text-gray-600">Total dépensé</p>
              </CardContent>
            </Card>
          </div>

          {/* Liste des commandes */}
          <div className="space-y-6">
            {orders.length === 0 ? (
              <Card className="text-center p-12 bg-white/80 backdrop-blur-sm">
                <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Aucune commande
                </h3>
                <p className="text-gray-600 mb-6">
                  Vous n'avez pas encore passé de commande
                </p>
                <Button onClick={() => navigate("/")} className="bg-[#2596be] hover:bg-[#1e7ca3] text-white font-semibold rounded-xl shadow transition-all">
                  Découvrir nos produits
                </Button>
              </Card>
            ) : (
              orders.map((order) => (
                <Card key={order.id} className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-lg">{order.id}</CardTitle>
                        <Badge className={`${getStatusColor(order.status)} border-0`}>
                          {getStatusIcon(order.status)}
                          <span className="ml-1">{getStatusText(order.status)}</span>
                        </Badge>
                        {order.status === "litige" && order.last_admin_litige_message_at && (!order.last_client_litige_read_at || new Date(order.last_admin_litige_message_at) > new Date(order.last_client_litige_read_at)) && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-600 text-white animate-pulse">
                            <Bell className="h-3 w-3 mr-1" /> Nouveau message
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="border-[#0074b3] text-[#0074b3] hover:bg-[#e6f4fa] hover:border-[#005a8c]"
                          onClick={() => handleShowOrderDetails(order.id)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Détails
                        </Button>
                        {order.status !== "litige" && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="border-red-500 text-red-500 hover:bg-red-50"
                            onClick={() => handleOpenLitigeModal(order)}
                          >
                            <AlertCircle className="h-4 w-4 mr-2" />
                            Signaler un litige
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">Date:</span>
                        <span className="font-medium">{formatDate(order.created_at)}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Euro className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">Total:</span>
                        <span className="font-medium text-blue-600">{order.total?.toFixed(2)}€</span>
                      </div>

                      {order.tracking_numbers && order.tracking_numbers.length > 0 && (
                        <div className="flex flex-col gap-1 mt-2">
                          <span className="text-xs text-gray-500 font-semibold">Numéro(s) de suivi :</span>
                          {order.tracking_numbers.map((num, idx) => (
                            <div key={num + idx} className="font-mono text-sm bg-gray-100 px-2 py-1 rounded inline-block mr-2 mt-1">{num}</div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Aperçu des articles */}
                    <div className="border-t border-gray-200 pt-4">
                      <div className="space-y-3">
                        {order.order_items
                          ?.filter(item => !item.product_id.startsWith('shipping_'))
                          .slice(0, 2)
                          .map((item) => (
                            <div key={item.id} className="flex items-center gap-3 py-3 flex-wrap md:flex-nowrap">
                              {productImages[item.product_id] ? (
                                <img src={productImages[item.product_id]} alt={item.product_title || productTitles[item.product_id] || item.title || item.product_id} className="w-14 h-14 object-cover rounded-md" />
                              ) : (
                                <div className="w-14 h-14 rounded-md bg-gray-100 flex items-center justify-center text-gray-300">
                                  <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 17l6-6 4 4 8-8"/></svg>
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-base text-gray-900 truncate">
                                  {item.product_title || productTitles[item.product_id] || item.title || item.product_id}
                                </p>
                                {item.variant && <p className="text-xs text-gray-500 mt-0.5">{item.variant}</p>}
                                <p className="text-sm text-gray-500 mt-1">Quantité: {item.quantity} • {item.price.toFixed(2)}€</p>
                              </div>
                              <div className="text-right min-w-[70px] font-semibold text-blue-700 text-base">{(item.price * item.quantity).toFixed(2)}€</div>
                            </div>
                          ))}
                        {order.order_items?.filter(item => !item.product_id.startsWith('shipping_')).length > 2 && (
                          <p className="text-sm text-gray-500">
                            + {order.order_items.filter(item => !item.product_id.startsWith('shipping_')).length - 2} autre(s) article(s)
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2 mb-2">
                        <MapPin className="h-5 w-5 text-gray-400" />
                        <span className="text-sm text-gray-700">
                          {order.shipping_method === 'mondial_relay' && order.mondial_relay ? (
                            (() => {
                              let relay = null;
                              try { relay = typeof order.mondial_relay === 'string' ? JSON.parse(order.mondial_relay) : order.mondial_relay; } catch (e) { relay = order.mondial_relay; }
                              return relay && typeof relay === 'object' ? (
                                <span>
                                  <b>Point Relais :</b> {relay.LgAdr1} {relay.LgAdr2 && <span>({relay.LgAdr2})</span>}<br />
                                  {relay.CP} {relay.Ville} {relay.Pays && <span>({relay.Pays})</span>}
                                </span>
                              ) : <span>{String(relay)}</span>;
                            })()
                          ) : (
                            <span>
                              <b>Adresse :</b> {order.address1} {order.address2 && <span>({order.address2})</span>}, {order.postal_code} {order.city} {order.country && <span>({order.country})</span>}
                            </span>
                          )}
                        </span>
                      </div>
                      <OrderTotalDetailsClient order={order} orderItems={order.order_items} />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Modal détails commande */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 relative">
            <button 
              className="absolute top-2 right-2 text-gray-500 hover:text-red-600 text-xl" 
              onClick={handleCloseOrderDetails}
            >
              &times;
            </button>
            <h2 className="text-xl font-bold mb-4">Détails de la commande</h2>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-blue-700">Chargement...</span>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {orders.find(o => o.id === selectedOrder)?.order_items?.filter(item => !item.product_id.startsWith('shipping_')).map((item) => (
                    <div key={item.id} className="flex items-center gap-3 py-3 flex-wrap md:flex-nowrap">
                      {productImages[item.product_id] ? (
                        <img src={productImages[item.product_id]} alt={item.product_title || productTitles[item.product_id] || item.title || item.product_id} className="w-14 h-14 object-cover rounded-md" />
                      ) : (
                        <div className="w-14 h-14 rounded-md bg-gray-100 flex items-center justify-center text-gray-300">
                          <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 17l6-6 4 4 8-8"/></svg>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-base text-gray-900 truncate">
                          {item.product_title || productTitles[item.product_id] || item.title || item.product_id}
                        </p>
                        {item.variant && <p className="text-xs text-gray-500 mt-0.5">{item.variant}</p>}
                        <p className="text-sm text-gray-500 mt-1">Quantité: {item.quantity} • {item.price.toFixed(2)}€</p>
                      </div>
                      <div className="text-right min-w-[70px] font-semibold text-blue-700 text-base">{(item.price * item.quantity).toFixed(2)}€</div>
                    </div>
                  ))}
                </div>
                <OrderTotalDetailsClient order={orders.find(o => o.id === selectedOrder)} orderItems={orders.find(o => o.id === selectedOrder)?.order_items} />
                <LitigeChat
                  order={orders.find(o => o.id === selectedOrder)}
                  litigeMessages={litigeMessages}
                  loadingMessages={loadingMessages}
                  newMessage={newMessage}
                  setNewMessage={setNewMessage}
                  handleSendLitigeMessage={handleSendLitigeMessage}
                  messagesEndRef={messagesEndRef}
                  canSend={canSend}
                  spamMsg={spamMsg}
                  handleUploadImage={handleUploadImage}
                  uploadingImage={uploadingImage}
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal de signalement de litige */}
      {showLitigeModal && selectedOrderForLitige && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 relative">
            <button 
              className="absolute top-2 right-2 text-gray-500 hover:text-red-600 text-xl" 
              onClick={handleCloseLitigeModal}
            >
              &times;
            </button>
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-500" />
              <h2 className="text-xl font-bold text-gray-900">Signaler un litige</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Veuillez décrire le problème rencontré avec votre commande #{selectedOrderForLitige.id}.
              Notre équipe vous contactera dans les plus brefs délais.
            </p>
            <Textarea
              value={litigeReason}
              onChange={(e) => setLitigeReason(e.target.value)}
              placeholder="Décrivez le problème rencontré..."
              className="mb-4 min-h-[150px]"
            />
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={handleCloseLitigeModal}
                disabled={submittingLitige}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={handleSubmitLitige}
                disabled={!litigeReason.trim() || submittingLitige}
              >
                {submittingLitige ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Envoi en cours...
                  </>
                ) : (
                  "Envoyer le signalement"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      <Footer />
    </div>
  );
};

export default OrdersPage;