import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Truck, User, Mail, Phone, MapPin, Package, Home, Globe, Euro, List, MoreVertical, Undo2, Archive, UserCircle, Bell, Upload } from "lucide-react";
import AdminHeader from "@/components/admin/layout/AdminHeader";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import React from "react";

const fieldLabels = {
  first_name: "Prénom",
  last_name: "Nom",
  email: "Email",
  phone: "Téléphone",
  address1: "Adresse",
  address2: "Complément",
  postal_code: "Code postal",
  city: "Ville",
  country: "Pays",
  shipping_method: "Mode de livraison",
  mondial_relay: "Point Relais (Mondial Relay)",
  total: "Total",
  created_at: "Date/Heure",
  id: "ID commande",
};

function formatDate(dateString) {
  if (!dateString) return "-";
  const d = new Date(dateString);
  return d.toLocaleString("fr-FR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

// Fonction utilitaire pour transformer les liens en <a> et images (copie de renderMessageContent du client)
function renderMessageContent(msg) {
  const urlRegex = /(https?:\/\/[\w\-._~:/?#[\]@!$&'()*+,;=%]+\.(?:jpg|jpeg|png|gif|webp))(?![\w.])/gi;
  const genericUrlRegex = /(https?:\/\/[\w\-._~:/?#[\]@!$&'()*+,;=%]+)/gi;
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

export default function CommandesPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [productTitles, setProductTitles] = useState({});
  const [tab, setTab] = useState<'active' | 'en_cours' | 'litige' | 'archived'>('active');
  const [dropdownOpen, setDropdownOpen] = useState(null); // id de la commande pour le menu déroulant
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientOrders, setClientOrders] = useState([]);
  const [loadingClient, setLoadingClient] = useState(false);
  const [litigeCount, setLitigeCount] = useState(0);
  const [showLitigeModal, setShowLitigeModal] = useState(false);
  const [litigeOrder, setLitigeOrder] = useState(null);
  const [litigeMessages, setLitigeMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [closingLitige, setClosingLitige] = useState(false);
  const messagesEndRef = useRef(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [trackingInput, setTrackingInput] = useState("");
  const [trackingLoading, setTrackingLoading] = useState(false);

  useEffect(() => {
    const fetchOrders = async () => {
      console.log("[DEBUG] Starting to fetch orders...");
      setLoading(true);
      try {
        let query = supabase
          .from("orders")
          .select("*, order_items(*)")
          .order("created_at", { ascending: false });

        // Filtrage selon l'onglet sélectionné
        if (tab === 'archived') {
          query = query.eq("archived", true);
        } else if (tab === 'en_cours') {
          query = query.eq("archived", false).eq("status", "en_cours");
        } else if (tab === 'litige') {
          query = query.eq("archived", false).eq("status", "litige");
        } else {
          // tab === 'active' : commandes 'active', null, ou autres statuts non spécifiques
          query = query.eq("archived", false).not("status", "in", "(en_cours,litige)");
        }

        const { data, error } = await query;
        
        console.log("[DEBUG] Supabase response orders:", data);
        if (data) {
          data.forEach(order => {
            console.log(`[DEBUG] Commande ${order.id} - total:`, order.total);
            if (order.order_items) {
              console.log(`[DEBUG] Commande ${order.id} - order_items:`, order.order_items);
            }
          });
        }
        if (error) {
          console.error("[DEBUG] Error fetching orders:", error);
          return;
        }
        
        setOrders(data);
      } catch (err) {
        console.error("[DEBUG] Unexpected error in fetchOrders:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [tab]);

  useEffect(() => {
    const fetchLitigeCount = async () => {
      const { count } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("status", "litige")
        .eq("archived", false);
      
      setLitigeCount(count || 0);
    };

    fetchLitigeCount();
  }, []);

  const handleShowItems = async (orderId) => {
    console.log("[DEBUG] Showing items for order:", orderId);
    setSelectedOrder(orderId);
    setLoadingItems(true);
    
    try {
      const { data, error } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", orderId);
      
      console.log("[DEBUG] Order items response:", { data, error });
      
      if (error) {
        console.error("[DEBUG] Error fetching order items:", error);
        return;
      }
      
      setOrderItems(data || []);
      
      if (data && data.length > 0) {
        const ids = [...new Set(data.map(item => item.product_id))];
        console.log("[DEBUG] Fetching product titles for IDs:", ids);
        
        const { data: products, error: productsError } = await supabase
          .from("products")
          .select("shopify_id,title,id")
          .in("shopify_id", ids);
        
        console.log("[DEBUG] Products response:", { products, productsError });
        
        if (productsError) {
          console.error("[DEBUG] Error fetching products:", productsError);
          return;
        }
        
        const titles = {};
        products?.forEach(p => { titles[p.shopify_id] = p.title; });
        console.log("[DEBUG] Setting product titles:", titles);
        setProductTitles(titles);
      } else {
        setProductTitles({});
      }
    } catch (err) {
      console.error("[DEBUG] Unexpected error in handleShowItems:", err);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleCloseItems = () => {
    setSelectedOrder(null);
    setOrderItems([]);
  };

  const handleArchive = async (orderId) => {
    console.log("[DEBUG] Archiving order:", orderId);
    console.log("[DEBUG] handleArchive orderId typeof:", typeof orderId, orderId);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .update({ archived: true })
        .eq("id", orderId)
        .select();
      
      console.log("[DEBUG] Archive response:", { data, error, orderId });
      
      if (error) {
        console.error("[DEBUG] Error archiving order:", error);
        return;
      }
      
      setOrders(orders => orders.filter(o => o.id !== orderId));
    } catch (err) {
      console.error("[DEBUG] Unexpected error in handleArchive:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (orderId) => {
    console.log("[DEBUG] Restoring order:", orderId);
    setLoading(true);
    try {
      const { error } = await supabase.from("orders").update({ archived: false }).eq("id", orderId);
      console.log("[DEBUG] Restore response:", { error });
      
      if (error) {
        console.error("[DEBUG] Error restoring order:", error);
        return;
      }
      
      setOrders(orders => orders.filter(o => o.id !== orderId));
    } catch (err) {
      console.error("[DEBUG] Unexpected error in handleRestore:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeStatus = async (orderId, newStatus) => {
    console.log("[DEBUG] Changing status:", orderId, "to", newStatus);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId)
        .select();
      
      console.log("[DEBUG] Change status response:", { data, error, orderId, newStatus });
      
      if (error) {
        console.error("[DEBUG] Error changing status:", error);
        return;
      }
      
      // Retire la commande de la liste actuelle si elle ne correspond plus au filtre
      if ((tab === 'active' && newStatus !== 'active') ||
          (tab === 'en_cours' && newStatus !== 'en_cours') ||
          (tab === 'litige' && newStatus !== 'litige')) {
        setOrders(orders => orders.filter(o => o.id !== orderId));
      }
    } catch (err) {
      console.error("[DEBUG] Unexpected error in handleChangeStatus:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAllOrders = async () => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer TOUTES les commandes ? Cette action est irréversible.")) return;
    
    console.log("[DEBUG] Starting to delete all orders");
    setLoading(true);
    try {
      const { data: allItems, error: fetchError } = await supabase.from("order_items").select("id");
      console.log("[DEBUG] Récupération order_items:", { allItems, fetchError });
      const ids = allItems.map(item => item.id).filter(id => !!id && id !== "");
      if (ids.length > 0) {
        const { error: itemsError } = await supabase.from("order_items").delete().in("id", ids);
        console.log("[DEBUG] Suppression order_items:", { ids, itemsError });
        if (itemsError) {
          console.error("[DEBUG] Erreur suppression order_items:", itemsError);
          return;
        }
      } else {
        console.log("[DEBUG] Aucun order_item à supprimer");
      }
      
      const { data: allOrders, error: fetchOrdersError } = await supabase.from("orders").select("id");
      console.log("[DEBUG] Récupération orders:", { allOrders, fetchOrdersError });
      const orderIds = allOrders.map(order => order.id);
      if (orderIds.length > 0) {
        const { error: ordersError } = await supabase.from("orders").delete().in("id", orderIds);
        console.log("[DEBUG] Suppression orders:", { orderIds, ordersError });
        if (ordersError) {
          console.error("[DEBUG] Erreur suppression orders:", ordersError);
          return;
        }
      } else {
        console.log("[DEBUG] Aucun order à supprimer");
      }
      
      setOrders([]);
    } catch (err) {
      console.error("[DEBUG] Unexpected error in handleDeleteAllOrders:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleShowClientProfile = async (order) => {
    setLoadingClient(true);
    try {
      // Récupérer toutes les commandes du même client (par email)
      const { data: orders, error } = await supabase
        .from("orders")
        .select("*")
        .eq("email", order.email)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[DEBUG] Error fetching client orders:", error);
        return;
      }

      // Vérifier si le client a un compte
      const { data: user } = await supabase
        .from("users")
        .select("id, email")
        .eq("email", order.email)
        .single();

      setClientOrders(orders);
      setSelectedClient({
        ...order,
        hasAccount: !!user,
        userId: user?.id
      });
    } catch (err) {
      console.error("[DEBUG] Unexpected error in handleShowClientProfile:", err);
    } finally {
      setLoadingClient(false);
    }
  };

  const handleCloseClientProfile = () => {
    setSelectedClient(null);
    setClientOrders([]);
  };

  // Récupérer les messages de litige pour la commande sélectionnée
  useEffect(() => {
    const fetchLitigeMessages = async () => {
      if (!showLitigeModal || !litigeOrder) return;
      setLoadingMessages(true);
      const { data, error } = await supabase
        .from("litige_messages")
        .select("*")
        .eq("order_id", litigeOrder.id)
        .order("created_at", { ascending: true });
      if (!error) setLitigeMessages(data);
      setLoadingMessages(false);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    };
    fetchLitigeMessages();
  }, [showLitigeModal, litigeOrder]);

  // Envoi d'un message admin
  const handleSendLitigeMessage = async () => {
    if (!newMessage.trim() || !litigeOrder || litigeOrder.litige_closed) return;
    const { error } = await supabase.from("litige_messages").insert({
      order_id: litigeOrder.id,
      sender_type: "admin",
      sender_id: null,
      message: newMessage.trim(),
    });
    // Met à jour la date du dernier message admin
    await supabase.from("orders").update({ last_admin_litige_message_at: new Date().toISOString() }).eq("id", litigeOrder.id);
    if (!error) {
      setNewMessage("");
      // Rafraîchir les messages
      const { data } = await supabase
        .from("litige_messages")
        .select("*")
        .eq("order_id", litigeOrder.id)
        .order("created_at", { ascending: true });
      setLitigeMessages(data);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  };

  // Clôturer le litige
  const handleCloseLitige = async () => {
    if (!litigeOrder) return;
    setClosingLitige(true);
    // 1. Mettre à jour la commande
    await supabase.from("orders").update({ litige_closed: true, last_admin_litige_message_at: new Date().toISOString() }).eq("id", litigeOrder.id);
    // 2. Ajouter un message système
    await supabase.from("litige_messages").insert({
      order_id: litigeOrder.id,
      sender_type: "admin",
      sender_id: null,
      message: "Le litige a été clôturé par l'administration. Merci pour votre retour.",
    });
    // 3. Rafraîchir les messages et la commande
    const { data } = await supabase
      .from("litige_messages")
      .select("*")
      .eq("order_id", litigeOrder.id)
      .order("created_at", { ascending: true });
    setLitigeMessages(data);
    setClosingLitige(false);
    // 4. Rafraîchir la liste des commandes (optionnel)
    setOrders(orders => orders.map(o => o.id === litigeOrder.id ? { ...o, litige_closed: true } : o));
  };

  // Upload image sur Supabase Storage (admin)
  const handleUploadImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `admin_${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage.from('litige-messages').upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });
      if (error) throw error;
      // Récupérer l'URL publique
      const { data: publicUrlData } = supabase.storage.from('litige-messages').getPublicUrl(fileName);
      if (publicUrlData?.publicUrl) {
        if (!litigeOrder || litigeOrder.litige_closed) return;
        await supabase.from("litige_messages").insert({
          order_id: litigeOrder.id,
          sender_type: "admin",
          sender_id: null,
          message: publicUrlData.publicUrl,
        });
        // Rafraîchir les messages
        const { data: messages } = await supabase
          .from("litige_messages")
          .select("*")
          .eq("order_id", litigeOrder.id)
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

  // Ajout d'un numéro de suivi
  const handleAddTracking = async (orderId) => {
    if (!trackingInput.trim()) return;
    setTrackingLoading(true);
    try {
      const order = orders.find(o => o.id === orderId);
      const newNumbers = [...(order.tracking_numbers || []), trackingInput.trim()];
      const { error } = await supabase.from("orders").update({ tracking_numbers: newNumbers }).eq("id", orderId);
      if (!error) {
        setOrders(orders => orders.map(o => o.id === orderId ? { ...o, tracking_numbers: newNumbers } : o));
        setTrackingInput("");
      }
    } finally {
      setTrackingLoading(false);
    }
  };

  // Suppression d'un numéro de suivi
  const handleRemoveTracking = async (orderId, idx) => {
    setTrackingLoading(true);
    try {
      const order = orders.find(o => o.id === orderId);
      const newNumbers = (order.tracking_numbers || []).filter((_, i) => i !== idx);
      const { error } = await supabase.from("orders").update({ tracking_numbers: newNumbers }).eq("id", orderId);
      if (!error) {
        setOrders(orders => orders.map(o => o.id === orderId ? { ...o, tracking_numbers: newNumbers } : o));
      }
    } finally {
      setTrackingLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">
      <AdminHeader />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Commandes clients</h1>
          <div className="flex items-center gap-4">
            {litigeCount > 0 && (
              <div className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-2 rounded-lg">
                <Bell className="h-5 w-5" />
                <span className="font-semibold">{litigeCount} litige(s) en attente</span>
              </div>
            )}
            <Button variant="destructive" onClick={handleDeleteAllOrders} disabled={loading}>
              Supprimer toutes les commandes
            </Button>
          </div>
        </div>
        <div className="mb-6 flex gap-4">
          <Button variant={tab === 'active' ? 'default' : 'outline'} onClick={() => setTab('active')}>
            Actives
          </Button>
          <Button variant={tab === 'en_cours' ? 'default' : 'outline'} onClick={() => setTab('en_cours')}>
            En cours de livraison
          </Button>
          <Button variant={tab === 'litige' ? 'default' : 'outline'} onClick={() => setTab('litige')}>
            En litige
          </Button>
          <Button variant={tab === 'archived' ? 'default' : 'outline'} onClick={() => setTab('archived')}>
            Archivées
          </Button>
        </div>
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-4 text-blue-700 font-semibold">Chargement des commandes...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center text-gray-500 py-12">Aucune commande trouvée.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {orders.map((order) => (
              <Card key={order.id} className="shadow-lg border-0 bg-white/90 backdrop-blur-sm relative">
                <CardHeader className="pb-2 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-blue-700" />
                    <CardTitle className="text-lg font-mono">{order.id}</CardTitle>
                    <Badge className="bg-blue-100 text-blue-700 ml-2">{formatDate(order.created_at)}</Badge>
                    {/* Badge couleur selon le statut */}
                    <div className={`rounded-full px-2 py-1 text-xs font-bold ml-2 ${
                      order.status === 'active' ? 'bg-green-200 text-green-800' :
                      order.status === 'en_cours' ? 'bg-blue-200 text-blue-800' :
                      order.status === 'litige' ? 'bg-red-200 text-red-800' :
                      order.archived ? 'bg-gray-200 text-gray-800' :
                      'bg-gray-200 text-gray-800'
                    }`}>
                      {order.status === 'active' ? 'Active' :
                        order.status === 'en_cours' ? 'En cours' :
                        order.status === 'litige' ? 'En litige' :
                        order.archived ? 'Archivée' :
                        order.status || 'Inconnue'}
                    </div>
                    {order.status === 'litige' && order.litige_reason && (
                      <div className="ml-2 text-xs text-red-600">
                        Raison: {order.litige_reason}
                      </div>
                    )}
                    {/* Menu déroulant */}
                    <div className="ml-auto relative">
                      <button onClick={() => setDropdownOpen(dropdownOpen === order.id ? null : order.id)} className="p-1 rounded hover:bg-gray-200">
                        <MoreVertical className="h-5 w-5 text-gray-500" />
                      </button>
                      {dropdownOpen === order.id && (
                        <div className="absolute right-0 mt-2 bg-white border rounded shadow z-10 min-w-[140px]">
                          {tab === 'archived' ? (
                            <button
                              className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-left"
                              onClick={() => { handleRestore(order.id); setDropdownOpen(null); }}
                            >
                              <Undo2 className="h-4 w-4 text-gray-500" /> Restaurer
                            </button>
                          ) : (
                            <>
                              {/* Bouton Profil Client */}
                              <button
                                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-left"
                                onClick={() => { handleShowClientProfile(order); setDropdownOpen(null); }}
                              >
                                <UserCircle className="h-4 w-4 text-blue-500" /> Profil Client
                              </button>
                              <hr className="my-1" />
                              {/* Changer le statut */}
                              {order.status !== 'active' && (
                                <button
                                  className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-left"
                                  onClick={() => { handleChangeStatus(order.id, 'active'); setDropdownOpen(null); }}
                                >
                                  <div className="h-3 w-3 rounded-full bg-green-500"></div> Mettre en Active
                                </button>
                              )}
                              {order.status !== 'en_cours' && (
                                <button
                                  className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-left"
                                  onClick={() => { handleChangeStatus(order.id, 'en_cours'); setDropdownOpen(null); }}
                                >
                                  <div className="h-3 w-3 rounded-full bg-blue-500"></div> Mettre en Livraison
                                </button>
                              )}
                              <hr className="my-1" />
                              <button
                                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-left"
                                onClick={() => { handleArchive(order.id); setDropdownOpen(null); }}
                              >
                                <Archive className="h-4 w-4 text-gray-500" /> Archiver
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Euro className="h-4 w-4 text-green-700" />
                    <span className="font-bold text-green-700">
                      {(
                        (order.total && order.total > 0)
                          ? order.total
                          : (order.order_items
                              ? order.order_items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
                              : 0)
                      ).toFixed(2)} €
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span>{order.first_name} {order.last_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span>{order.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span>{order.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-gray-500" />
                    <span>{order.address1} {order.address2 && <span className="text-gray-400">({order.address2})</span>}</span>
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
                        <div className="bg-blue-50 border border-blue-200 rounded p-2 mt-2 text-xs">
                          <b>Point Relais :</b><br />
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
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span>{order.postal_code} {order.city} {order.country && <span>({order.country})</span>}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-gray-500" />
                    <span className="font-semibold">{order.shipping_method === 'mondial_relay' ? 'Mondial Relay' : 'Colissimo'}</span>
                  </div>
                  <div className="pt-2">
                    <Button size="sm" variant="outline" className="w-full flex items-center gap-2" onClick={() => handleShowItems(order.id)}>
                      <List className="h-4 w-4" /> Voir les produits
                    </Button>
                  </div>
                  {order.status === 'litige' && (
                    <Button size="sm" variant="outline" className="ml-2 border-red-500 text-red-500 hover:bg-red-50"
                      onClick={() => { setLitigeOrder(order); setShowLitigeModal(true); }}>
                      Voir la discussion litige
                    </Button>
                  )}
                  {/* Numéros de suivi */}
                  {order.tracking_numbers && order.tracking_numbers.length > 0 && (
                    <div className="flex flex-col gap-1 mt-2">
                      <span className="text-xs text-gray-500 font-semibold">Numéro(s) de suivi :</span>
                      {order.tracking_numbers.map((num, idx) => (
                        <div key={num + idx} className="flex items-center gap-2">
                          <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{num}</span>
                          <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleRemoveTracking(order.id, idx)} disabled={trackingLoading}>✕</Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      className="flex-1 border rounded px-2 py-1 text-sm"
                      placeholder="Ajouter un numéro de suivi..."
                      value={trackingInput}
                      onChange={e => setTrackingInput(e.target.value)}
                      disabled={trackingLoading}
                    />
                    <Button size="sm" onClick={() => handleAddTracking(order.id)} disabled={!trackingInput.trim() || trackingLoading}>
                      Ajouter
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Modal/Panneau détail produits */}
        {selectedOrder && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 relative">
              <button className="absolute top-2 right-2 text-gray-500 hover:text-red-600 text-xl" onClick={handleCloseItems}>&times;</button>
              <h2 className="text-xl font-bold mb-4">Produits de la commande</h2>
              {loadingItems ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-blue-700">Chargement...</span>
                </div>
              ) : orderItems.length === 0 ? (
                <div className="text-center text-gray-500 py-8">Aucun produit trouvé pour cette commande.</div>
              ) : (
                <>
                  <table className="min-w-full text-sm border mt-2">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="p-2 border">Produit</th>
                        <th className="p-2 border">Quantité</th>
                        <th className="p-2 border">Prix unitaire</th>
                        <th className="p-2 border">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderItems.filter(item => !item.product_id.startsWith('shipping_')).map((item, idx) => (
                        <tr key={item.id || idx}>
                          <td className="p-2 border">
                            {item.product_title || productTitles[item.product_id] || item.product_id}
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
                  <div className="mt-4 font-semibold">
                    Livraison : {(() => {
                      const shipping = orderItems.find(item => item.product_id.startsWith('shipping_'));
                      if (!shipping) return '—';
                      if (shipping.product_id.includes('colissimo')) return `Colissimo (${shipping.price?.toFixed(2)} €)`;
                      if (shipping.product_id.includes('mondial')) return `Mondial Relay (${shipping.price?.toFixed(2)} €)`;
                      return `Autre (${shipping.price?.toFixed(2)} €)`;
                    })()}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Modal Profil Client */}
        {selectedClient && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full p-6 relative max-h-[90vh] overflow-y-auto">
              <button className="absolute top-2 right-2 text-gray-500 hover:text-red-600 text-xl" onClick={handleCloseClientProfile}>&times;</button>
              
              {/* En-tête du profil */}
              <div className="flex items-center gap-4 mb-6 pb-4 border-b">
                <UserCircle className="h-12 w-12 text-blue-500" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedClient.first_name} {selectedClient.last_name}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={selectedClient.hasAccount ? "default" : "secondary"}>
                      {selectedClient.hasAccount ? "Compte Client" : "Client Invité"}
                    </Badge>
                    {selectedClient.hasAccount && (
                      <span className="text-sm text-gray-500">ID: {selectedClient.userId}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Informations de contact */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Informations de contact</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <span>{selectedClient.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span>{selectedClient.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Home className="h-4 w-4 text-gray-500" />
                      <span>{selectedClient.address1} {selectedClient.address2 && <span className="text-gray-400">({selectedClient.address2})</span>}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span>{selectedClient.postal_code} {selectedClient.city} {selectedClient.country && <span>({selectedClient.country})</span>}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Statistiques */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Statistiques</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-gray-500" />
                      <span>Total commandes: {clientOrders.length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Euro className="h-4 w-4 text-gray-500" />
                      <span>Total dépensé: {clientOrders.reduce((sum, order) => sum + (order.total || 0), 0).toFixed(2)}€</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span>Première commande: {formatDate(clientOrders[clientOrders.length - 1]?.created_at)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Historique des commandes */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-gray-900">Historique des commandes</h3>
                {loadingClient ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {clientOrders.map((order) => (
                      <Card key={order.id} className="bg-white/80 backdrop-blur-sm">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Package className="h-5 w-5 text-blue-700" />
                              <CardTitle className="text-lg font-mono">{order.id}</CardTitle>
                              <Badge className="bg-blue-100 text-blue-700">
                                {formatDate(order.created_at)}
                              </Badge>
                              <div className={`rounded-full px-2 py-1 text-xs font-bold ${
                                order.status === 'active' ? 'bg-green-200 text-green-800' :
                                order.status === 'en_cours' ? 'bg-blue-200 text-blue-800' :
                                order.status === 'litige' ? 'bg-red-200 text-red-800' :
                                order.archived ? 'bg-gray-200 text-gray-800' :
                                'bg-gray-200 text-gray-800'
                              }`}>
                                {order.status === 'active' ? 'Active' :
                                 order.status === 'en_cours' ? 'En cours' :
                                 order.status === 'litige' ? 'Litige' :
                                 order.archived ? 'Archivée' :
                                 order.status || 'Inconnue'}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-green-700">{order.total?.toFixed(2)} €</span>
                              <Button size="sm" variant="outline" onClick={() => handleShowItems(order.id)}>
                                <List className="h-4 w-4 mr-2" />
                                Produits
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modale discussion litige */}
        {showLitigeModal && litigeOrder && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 relative">
              <button className="absolute top-2 right-2 text-gray-500 hover:text-red-600 text-xl" onClick={() => setShowLitigeModal(false)}>&times;</button>
              <h2 className="text-xl font-bold mb-4">Discussion litige pour la commande {litigeOrder.id}</h2>
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
              {litigeOrder.litige_closed ? (
                <div className="text-center text-red-600 font-semibold">Ce litige est clôturé.</div>
              ) : (
                <>
                  <div className="flex gap-2 mt-2 items-center">
                    <input
                      type="text"
                      className="flex-1 border rounded px-2 py-1"
                      placeholder="Votre message..."
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSendLitigeMessage(); }}
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
                    <Button onClick={handleSendLitigeMessage} disabled={!newMessage.trim() || loadingMessages || uploadingImage}>
                      {uploadingImage ? (
                        <span className="flex items-center"><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>Envoi...</span>
                      ) : (
                        "Envoyer"
                      )}
                    </Button>
                  </div>
                  <div className="flex justify-end mt-4">
                    <Button variant="destructive" onClick={handleCloseLitige} disabled={closingLitige}>
                      {closingLitige ? 'Clôture en cours...' : 'Clôturer le litige'}
                    </Button>
                  </div>
                  {litigeOrder?.tracking_numbers && litigeOrder.tracking_numbers.length > 0 && (
                    <div className="mb-4">
                      <span className="text-xs text-gray-500 font-semibold">Numéro(s) de suivi :</span>
                      {litigeOrder.tracking_numbers.map((num, idx) => (
                        <div key={num + idx} className="font-mono text-sm bg-gray-100 px-2 py-1 rounded inline-block mr-2 mt-1">{num}</div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
} 