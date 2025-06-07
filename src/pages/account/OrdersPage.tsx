import { useState, useEffect, useRef, Fragment } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Package, Calendar, Euro, Eye, Truck, CheckCircle, Clock, AlertCircle, AlertTriangle, Upload, Bell, MapPin, Home, Phone, Mail, User } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";

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
  payment_status?: string;
  order_items: OrderItem[];
  tracking_number?: string;
  litige_closed?: boolean;
  tracking_numbers?: string[];
  last_admin_litige_message_at?: string;
  last_client_litige_read_at?: string;
  mondial_relay?: any;
  address1?: string;
  address2?: string;
  postal_code?: string;
  city?: string;
  country?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
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

const OrdersPage = () => {
  const { user } = useUserStore();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [productTitles, setProductTitles] = useState<Record<string, string>>({});
  const [orderProductImages, setOrderProductImages] = useState<Record<string, string>>({});
  const [orderWheelGifts, setOrderWheelGifts] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [showLitigeModal, setShowLitigeModal] = useState(false);
  const [selectedOrderForLitige, setSelectedOrderForLitige] = useState<Order | null>(null);
  const [litigeReason, setLitigeReason] = useState("");
  const [submittingLitige, setSubmittingLitige] = useState(false);
  const [litigeMessages, setLitigeMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [lastSentTime, setLastSentTime] = useState(0);
  const [uploadingImage, setUploadingImage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<Order | null>(null);
  const [activeTab, setActiveTab] = useState<'produits' | 'details'>('produits');

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const fetchOrders = async () => {
      try {
        // Récupérer les commandes de l'utilisateur
        const { data: ordersData, error: ordersError } = await supabase
          .from("orders")
          .select("*, order_items(*)")
          .eq("user_id", user.id)
          .eq("archived", false)
          .order("created_at", { ascending: false });

        if (ordersError) {
          console.error("Erreur lors de la récupération des commandes:", ordersError);
          return;
        }

        if (ordersData) {
          setOrders(ordersData);

          // Récupérer les cadeaux de la roue pour toutes les commandes
          const orderIds = ordersData.map(order => order.id);
          const { data: wheelGifts, error: wheelGiftsError } = await supabase
            .from("order_wheel_gifts")
            .select("*")
            .in("order_id", orderIds);

          if (!wheelGiftsError && wheelGifts) {
            const giftsMap = wheelGifts.reduce((acc, gift) => {
              if (!acc[gift.order_id]) acc[gift.order_id] = [];
              acc[gift.order_id].push(gift);
              return acc;
            }, {});
            setOrderWheelGifts(giftsMap);
          }

          // Récupérer les titres des produits
          const productIds = ordersData
            .flatMap(order => order.order_items)
            .filter(item => !item.product_id.startsWith('shipping_'))
            .map(item => item.product_id);

          if (productIds.length > 0) {
            const { data: products, error: productsError } = await supabase
              .from("products")
              .select("shopify_id, title")
              .in("shopify_id", productIds);

            if (!productsError && products) {
              const titles = products.reduce((acc, product) => ({
                ...acc,
                [product.shopify_id]: product.title
              }), {});
              setProductTitles(titles);
            }

            // Récupérer les images principales via editable_content
            const keys = productIds.map(id => `product_${id}_image_0`);
            const { data: imagesData, error: imagesError } = await supabase
              .from("editable_content")
              .select("content_key, content")
              .in("content_key", keys);
            if (!imagesError && imagesData) {
              const imageMap = {};
              for (const item of imagesData) {
                const id = item.content_key.replace("product_", "").replace("_image_0", "");
                imageMap[id] = item.content;
              }
              setOrderProductImages(imageMap);
            }
          }
        }
      } catch (err) {
        console.error("Erreur inattendue:", err);
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

  const getStatusText = (status) => {
    if (!status || status === "") return "Active";
    if (status === "active") return "Active";
    if (status === "en_cours") return "En cours";
    if (status === "litige") return "Litige";
    if (status === "archived") return "Archivée";
    return status;
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

  const handleShowDetailsModal = (order: Order) => {
    setSelectedOrderForDetails(order);
    setActiveTab('produits');
    setShowDetailsModal(true);
  };

  const handleCloseDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedOrderForDetails(null);
    setActiveTab('produits');
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

      toast("Votre signalement a été envoyé. Nous vous contacterons rapidement.");
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
      toast("Une erreur est survenue lors du signalement");
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
      toast("Erreur lors de l'upload de l'image");
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

  // Filtrer les commandes à afficher (uniquement actives/payées)
  const displayedOrders = orders.filter(order => order.payment_status === 'paid' || order.status === 'active');

  // Calcul du total dépensé (somme des commandes affichées)
  const totalDepense = displayedOrders
    .reduce((sum, order) => {
      if (order.total && order.total > 0) return sum + order.total;
      if (order.order_items) {
        return sum + order.order_items.reduce((s, i) => s + (i.price * i.quantity), 0);
      }
      return sum;
    }, 0);

  // Nombre de commandes actives/payées
  const totalCommandes = displayedOrders.length;

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
            <Card className="text-center p-6 bg-gradient-to-br from-blue-50 to-purple-50 border-0">
              <CardContent className="space-y-2">
                <div className="text-2xl font-bold text-blue-600">{loading ? '...' : totalCommandes}</div>
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
                <span className="text-3xl font-bold text-yellow-600">{totalDepense.toFixed(2)}€</span>
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
              displayedOrders.map((order) => (
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
                          className="border-blue-500 text-blue-500 hover:bg-blue-50"
                          onClick={() => handleShowDetailsModal(order)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Voir détails
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
                        <span className="font-medium text-blue-600">
                          {(
                            order.total && order.total > 0
                              ? order.total
                              : order.order_items
                                ? order.order_items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
                                : 0
                          ).toFixed(2)}€
                        </span>
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

                    {/* Affichage détaillé des produits */}
                    <div className="border-t border-gray-200 pt-4">
                      <div className="space-y-3">
                        {order.order_items?.filter(item => !item.product_id.startsWith('shipping_')).map((item) => (
                            <div key={item.id} className="flex items-center gap-3">
                            {orderProductImages[item.product_id] ? (
                              <img src={orderProductImages[item.product_id]} alt="img" className="w-12 h-12 object-contain rounded border" />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                                <Package className="h-6 w-6 text-gray-400" />
                              </div>
                            )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-gray-900 truncate">
                                {item.product_title || productTitles[item.product_id] || item.product_id}
                                {item.variant && <span className="text-xs text-gray-500 ml-1">– {item.variant}</span>}
                                </p>
                                <p className="text-sm text-gray-500">
                                  Quantité: {item.quantity} • {item.price.toFixed(2)}€
                                </p>
                              </div>
                            <div className="text-right">
                              <span className="font-medium text-blue-600">{(item.price * item.quantity).toFixed(2)}€</span>
                              </div>
                            </div>
                          ))}
                      </div>
                      
                      {/* Section cadeaux de la roue */}
                      {orderWheelGifts[order.id] && orderWheelGifts[order.id].length > 0 && (
                        <div className="mt-4 pt-3 border-t border-gray-200">
                          <h4 className="text-sm font-semibold text-blue-600 mb-3 flex items-center gap-2">
                            🎁 Cadeaux de la roue de la fortune
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {orderWheelGifts[order.id].map((gift, idx) => (
                              <div key={gift.id || idx} className="bg-gradient-to-br from-blue-50 to-purple-50 p-3 rounded-lg border border-blue-200">
                                <div className="flex items-center gap-3">
                                  <img 
                                    src={gift.image_url} 
                                    alt={gift.title} 
                                    className="w-10 h-10 object-contain rounded-lg bg-white border"
                                  />
                                  <div className="flex-1">
                                    <div className="font-medium text-sm text-gray-900">{gift.title}</div>
                                    <div className="text-xs text-gray-500">
                                      Gagné le {new Date(gift.won_at).toLocaleDateString('fr-FR')}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Livraison et point relais */}
                      <div className="mt-2 font-semibold text-sm">
                        Livraison : {
                          (() => {
                            const shipping = order.order_items.find(item => item.product_id.startsWith('shipping_'));
                            let label = '';
                            if (shipping?.product_id?.includes('colissimo')) label = 'Colissimo';
                            else if (shipping?.product_id?.includes('mondial')) label = 'Mondial Relay';
                            return <>
                              {(!shipping || shipping.price === 0) ? (
                                <span className="text-green-700 font-bold bg-green-100 px-2 py-0.5 rounded">
                                  {label ? label + ' ' : ''}Gratuit{label === 'Mondial Relay' ? 'e' : ''}
                                </span>
                              ) : (
                                <span>
                                  {label ? label + ' ' : ''}{shipping.price?.toFixed(2)} €
                                </span>
                              )}
                            </>;
                          })()
                        }
                      </div>
                      {/* Sous-total et total */}
                      <div className="mt-2 flex justify-end gap-4 text-sm">
                        <span className="text-gray-600">Sous-total : <b>{order.order_items.filter(item => !item.product_id.startsWith('shipping_')).reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)} €</b></span>
                        <span className="text-gray-600">Total payé : <b>{(
                          order.total && order.total > 0
                            ? order.total
                            : order.order_items
                              ? order.order_items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
                              : 0
                        ).toFixed(2)} €</b></span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>

      {/* 🆕 MODALE DE DÉTAILS AVEC ONGLETS */}
      {showDetailsModal && selectedOrderForDetails && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 relative max-h-[90vh] overflow-y-auto">
            <button 
              className="absolute top-2 right-2 text-gray-500 hover:text-red-600 text-xl" 
              onClick={handleCloseDetailsModal}
            >
              &times;
            </button>
            
            <div className="flex items-center gap-3 mb-6">
              <Package className="h-6 w-6 text-blue-500" />
              <h2 className="text-xl font-bold text-gray-900">
                Commande #{selectedOrderForDetails.id}
              </h2>
              <Badge className={`${getStatusColor(selectedOrderForDetails.status)} border-0 ml-2`}>
                {getStatusIcon(selectedOrderForDetails.status)}
                <span className="ml-1">{getStatusText(selectedOrderForDetails.status)}</span>
              </Badge>
              </div>

            {/* Onglets */}
            <div className="flex border-b border-gray-200 mb-6">
              <button
                onClick={() => setActiveTab('produits')}
                className={`px-4 py-2 font-medium text-sm ${
                  activeTab === 'produits'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                📦 Produits
              </button>
              <button
                onClick={() => setActiveTab('details')}
                className={`px-4 py-2 font-medium text-sm ml-6 ${
                  activeTab === 'details'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                📋 Détails d'expédition
              </button>
            </div>

            {/* Contenu des onglets */}
            {activeTab === 'produits' && (
                <div className="space-y-4">
                {/* Liste des produits */}
                <div className="space-y-3">
                  {selectedOrderForDetails.order_items?.filter(item => !item.product_id.startsWith('shipping_')).map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      {orderProductImages[item.product_id] ? (
                        <img src={orderProductImages[item.product_id]} alt="img" className="w-16 h-16 object-contain rounded border" />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center">
                          <Package className="h-8 w-8 text-gray-400" />
                      </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">
                          {item.product_title || productTitles[item.product_id] || item.product_id}
                          {item.variant && <span className="text-sm text-gray-500 ml-1">– {item.variant}</span>}
                        </p>
                        <p className="text-sm text-gray-500">
                          Quantité: {item.quantity} • Prix unitaire: {item.price.toFixed(2)}€
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-medium text-blue-600">{(item.price * item.quantity).toFixed(2)}€</span>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Cadeaux de la roue */}
                {orderWheelGifts[selectedOrderForDetails.id] && orderWheelGifts[selectedOrderForDetails.id].length > 0 && (
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <h4 className="text-lg font-semibold text-blue-600 mb-3 flex items-center gap-2">
                      🎁 Cadeaux de la roue de la fortune
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {orderWheelGifts[selectedOrderForDetails.id].map((gift, idx) => (
                        <div key={gift.id || idx} className="bg-gradient-to-br from-blue-50 to-purple-50 p-3 rounded-lg border border-blue-200">
                          <div className="flex items-center gap-3">
                            <img 
                              src={gift.image_url} 
                              alt={gift.title} 
                              className="w-12 h-12 object-contain rounded-lg bg-white border"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{gift.title}</div>
                              <div className="text-xs text-gray-500">
                                Gagné le {new Date(gift.won_at).toLocaleDateString('fr-FR')}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Récapitulatif des prix */}
                <div className="mt-6 pt-4 border-t border-gray-200 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Sous-total produits:</span>
                    <span className="font-medium">
                      {selectedOrderForDetails.order_items.filter(item => !item.product_id.startsWith('shipping_')).reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}€
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Livraison:</span>
                    <span className="font-medium">
                      {(() => {
                        const shipping = selectedOrderForDetails.order_items.find(item => item.product_id.startsWith('shipping_'));
                        if (!shipping || shipping.price === 0) return 'Gratuite';
                        return `${shipping.price.toFixed(2)}€`;
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
                    <span>Total payé:</span>
                    <span className="text-blue-600">
                      {(selectedOrderForDetails.total && selectedOrderForDetails.total > 0
                        ? selectedOrderForDetails.total
                        : selectedOrderForDetails.order_items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
                      ).toFixed(2)}€
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'details' && (
              <div className="space-y-6">
                {/* Informations de livraison */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Truck className="h-5 w-5 text-blue-500" />
                    Mode de livraison
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">
                        {(() => {
                          const shipping = selectedOrderForDetails.order_items.find(item => item.product_id.startsWith('shipping_'));
                          if (shipping?.product_id?.includes('colissimo')) return 'Colissimo';
                          if (shipping?.product_id?.includes('mondial')) return 'Mondial Relay';
                          return 'Livraison standard';
                        })()}
                      </span>
                      {(() => {
                        const shipping = selectedOrderForDetails.order_items.find(item => item.product_id.startsWith('shipping_'));
                        if (!shipping || shipping.price === 0) {
                          return <Badge className="bg-green-100 text-green-700 ml-2">Gratuite</Badge>;
                        }
                        return <span className="text-gray-600 ml-2">({shipping.price.toFixed(2)}€)</span>;
                      })()}
                </div>
                    
                    {/* Numéros de suivi */}
                    {selectedOrderForDetails.tracking_numbers && selectedOrderForDetails.tracking_numbers.length > 0 && (
                      <div className="mt-3">
                        <span className="text-sm font-semibold text-gray-700">Numéro(s) de suivi:</span>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {selectedOrderForDetails.tracking_numbers.map((num, idx) => (
                            <code key={num + idx} className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm font-mono">
                              {num}
                            </code>
                          ))}
                        </div>
                      </div>
            )}
          </div>
        </div>

                {/* Adresse de livraison */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    {selectedOrderForDetails.mondial_relay ? (
                      <MapPin className="h-5 w-5 text-purple-500" />
                    ) : (
                      <Home className="h-5 w-5 text-green-500" />
                    )}
                    {selectedOrderForDetails.mondial_relay ? 'Point Relais Mondial Relay' : 'Adresse de livraison'}
                  </h3>
                  
                  {selectedOrderForDetails.mondial_relay ? (
                    // Affichage du point relais
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                      {(() => {
                        let relay = null;
                        try {
                          relay = typeof selectedOrderForDetails.mondial_relay === 'string' 
                            ? JSON.parse(selectedOrderForDetails.mondial_relay) 
                            : selectedOrderForDetails.mondial_relay;
                        } catch (e) {
                          relay = selectedOrderForDetails.mondial_relay;
                        }
                        return relay && typeof relay === 'object' ? (
                          <div className="space-y-1">
                            <div className="font-semibold text-purple-800">{relay.LgAdr1}</div>
                            {relay.LgAdr2 && <div className="text-purple-700">{relay.LgAdr2}</div>}
                            <div className="text-purple-700">{relay.CP} {relay.Ville}</div>
                            {relay.Pays && <div className="text-purple-600">{relay.Pays}</div>}
                          </div>
                        ) : (
                          <div className="text-purple-700">{String(relay)}</div>
                        );
                      })()}
                    </div>
                  ) : (
                    // Affichage de l'adresse classique
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span>{selectedOrderForDetails.first_name} {selectedOrderForDetails.last_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Home className="h-4 w-4 text-gray-500" />
                        <span>{selectedOrderForDetails.address1}</span>
                        {selectedOrderForDetails.address2 && (
                          <span className="text-gray-500">({selectedOrderForDetails.address2})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span>{selectedOrderForDetails.postal_code} {selectedOrderForDetails.city}</span>
                        {selectedOrderForDetails.country && (
                          <span className="text-gray-500">({selectedOrderForDetails.country})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <span>{selectedOrderForDetails.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <span>{selectedOrderForDetails.email}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Informations de commande */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-500" />
                    Informations de commande
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">ID de commande:</span>
                      <p className="font-mono text-xs mt-1 p-2 bg-gray-100 rounded">{selectedOrderForDetails.id}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Date de commande:</span>
                      <p className="font-medium mt-1">{formatDate(selectedOrderForDetails.created_at)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Statut:</span>
                      <Badge className={`${getStatusColor(selectedOrderForDetails.status)} border-0 mt-1`}>
                        {getStatusIcon(selectedOrderForDetails.status)}
                        <span className="ml-1">{getStatusText(selectedOrderForDetails.status)}</span>
                      </Badge>
                    </div>
                    <div>
                      <span className="text-gray-600">Total payé:</span>
                      <p className="font-bold text-blue-600 mt-1">
                        {(selectedOrderForDetails.total && selectedOrderForDetails.total > 0
                          ? selectedOrderForDetails.total
                          : selectedOrderForDetails.order_items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
                        ).toFixed(2)}€
                      </p>
                    </div>
                  </div>
                </div>
              </div>
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