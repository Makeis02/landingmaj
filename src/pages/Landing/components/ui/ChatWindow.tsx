import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ChatMessage } from '@/types/supabase';
import { createPortal } from 'react-dom';
import { v4 as uuidv4 } from "uuid";

interface Message {
  id: string;
  type: 'bot' | 'user';
  content: string;
  choices?: string[];
  timestamp: Date;
  sender?: 'admin';
}

interface ChatWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BoxProduct {
  title: string;
  price: number;
  image?: string;
}

interface BoxDetails {
  basic: {
    products: BoxProduct[];
    totalValue: number;
    price: number;
    description: string;
  };
  premium: {
    products: BoxProduct[];
    totalValue: number;
    price: number;
    description: string;
    exclusive: string[];
  };
}

const redirectToStripePortal = async (email: string) => {
  try {
    const response = await fetch(
      'https://btnyenoxsjtuydpzbapq.supabase.co/functions/v1/redirectToStripePortal',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:
            'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0bnllbm94c2p0dXlkcHpiYXBxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzk4MjU4NywiZXhwIjoyMDUzNTU4NTg3fQ.Mei4bM-eWHrgP_ZLFx7JAjpJxIlDxcxnt8LWIBwpA-k',
          'x-client-info': 'supabase-js/2.x',
        },
        body: JSON.stringify({ email }),
      }
    );

    if (!response.ok) throw new Error('Erreur création portail Stripe');

    const { url } = await response.json();
    window.open(url, '_blank');
  } catch (err) {
    console.error('❌ Redirection Stripe échouée:', err);
    alert("Erreur lors de l'ouverture du portail d'abonnement. Réessaie plus tard.");
  }
};

// Fonction pour nettoyer les noms de produits HTML
const cleanProductName = (name: string): string => {
  const withoutHtml = name.replace(/<[^>]+>/g, '');
  const cleaned = withoutHtml.replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim();
  console.log('🧹 Nettoyage du nom:', { original: name, cleaned });
  return cleaned;
};

// Fonction pour récupérer les produits depuis Supabase
const fetchBoxProductsFromSupabase = async (): Promise<BoxDetails | null> => {
  console.group('📡 Récupération des produits Supabase');

  try {
    console.log('📥 Récupération des produits en cours...');
    const { data, error } = await supabase
      .from('editable_content')
      .select('content_key, content')
      .or('content_key.like.monthly_pack_pack_basix_note%,content_key.like.monthly_pack_pack_premium_note%,content_key.like.%_product_price,content_key.like.monthly_pack_pack_%_price');

    if (error) {
      console.error('❌ Erreur Supabase:', error);
      return null;
    }

    console.log('✅ Données récupérées:', data);

    // Récupération des prix des packs avec valeurs par défaut
    const basicPriceEntry = data.find(entry => entry.content_key === 'monthly_pack_pack_basix_price');
    const premiumPriceEntry = data.find(entry => entry.content_key === 'monthly_pack_pack_premium_price');

    const basicPrice = basicPriceEntry?.content ? parseFloat(basicPriceEntry.content.replace(',', '.')) : 14.99;
    const premiumPrice = premiumPriceEntry?.content ? parseFloat(premiumPriceEntry.content.replace(',', '.')) : 24.99;

    // Fonction utilitaire pour extraire les produits avec leurs prix stockés
    const extractProductsWithPrices = (prefix: string) => {
      const products: BoxProduct[] = [];
      
      data
        .filter(entry => entry.content_key.startsWith(prefix) && !entry.content_key.endsWith('_product_price'))
        .forEach(entry => {
          if (!entry.content.includes("gid://shopify/Product") && entry.content.trim() !== '') {
            const priceEntry = data.find(d => d.content_key === `${entry.content_key}_product_price`);
            const price = priceEntry?.content ? parseFloat(priceEntry.content.replace(',', '.')) : 0;
            
            if (price > 0) {
              products.push({
                title: entry.content,
                price: price,
                image: undefined
              });
            }
          }
        });

      return products;
    };

    const basicProducts = extractProductsWithPrices('monthly_pack_pack_basix_note');
    const premiumProducts = extractProductsWithPrices('monthly_pack_pack_premium_note');

    const exclusiveProducts = data
      .filter(entry => 
        entry.content_key.startsWith('monthly_pack_pack_premium_gift_note') && 
        !entry.content.includes("gid://shopify/Product") &&
        entry.content.trim() !== ''
      )
      .map(entry => entry.content);

    const basicDescription = data.find(
      entry => entry.content_key === 'monthly_pack_pack_basix_description'
    )?.content || '';
    const premiumDescription = data.find(
      entry => entry.content_key === 'monthly_pack_pack_premium_description'
    )?.content || '';

    const basicTotalValue = basicProducts.reduce((sum, p) => sum + p.price, 0);
    const premiumTotalValue = premiumProducts.reduce((sum, p) => sum + p.price, 0);

    console.log('📦 Structuration des données...', {
      basicProducts,
      premiumProducts,
      basicPrice,
      premiumPrice,
      basicTotalValue,
      premiumTotalValue
    });

    const boxDetails: BoxDetails = {
      basic: {
        products: basicProducts,
        price: basicPrice,
        description: basicDescription,
        totalValue: basicTotalValue,
      },
      premium: {
        products: premiumProducts,
        price: premiumPrice,
        description: premiumDescription,
        exclusive: exclusiveProducts,
        totalValue: premiumTotalValue,
      },
    };

    console.log('✅ Données prêtes à être utilisées');
    console.groupEnd();
    return boxDetails;
  } catch (err) {
    console.error('❌ Erreur lors de la récupération des produits:', err);
    console.groupEnd();
    return null;
  }
};

const ChatWindow = ({ isOpen: isOpenProp, onClose }: ChatWindowProps) => {
  const [isOpen, setIsOpen] = useState(isOpenProp);
  const [messages, setMessages] = useState<Message[]>([]);
  const [boxDetails, setBoxDetails] = useState<BoxDetails | null>(null);
  const [awaitingEmail, setAwaitingEmail] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [chatId, setChatId] = useState<string | null>(null);
  const [awaitingQuestion, setAwaitingQuestion] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [isAdminChat, setIsAdminChat] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [hasAdminResponded, setHasAdminResponded] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [lastMessageTime, setLastMessageTime] = useState<number>(0);
  const [recentMessages, setRecentMessages] = useState<number>(0);
  const [isSpamBlocked, setIsSpamBlocked] = useState(false);
  const [spamBlockTime, setSpamBlockTime] = useState<number>(0);
  const [isUserActive, setIsUserActive] = useState(true);
  const [subscriptionFlow, setSubscriptionFlow] = useState<'cancel' | 'update' | null>(null);
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activityChannelRef = useRef<BroadcastChannel | null>(null);
  const activityIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastScrollHeightRef = useRef<number>(0);

  // Synchroniser l'état local avec les props
  useEffect(() => {
    setIsOpen(isOpenProp);
  }, [isOpenProp]);

  // Effet pour ouvrir automatiquement le chat si les paramètres sont présents
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlEmail = params.get("email");
    const urlChatId = params.get("chat_id");

    if (urlEmail && urlChatId) {
      console.log('🔗 Paramètres de chat trouvés dans l\'URL:', { email: urlEmail, chatId: urlChatId });
      setUserEmail(urlEmail);
      setChatId(urlChatId);
      setIsAdminChat(true);
      
      // Récupérer les messages existants
      const fetchMessages = async () => {
        try {
          const { data: messages, error } = await supabase
            .from("chatbot_messages")
            .select("*")
            .eq("chat_id", urlChatId)
            .order("timestamp", { ascending: true });

          if (!error && messages) {
            const formattedMessages = messages.map((msg) => ({
              id: msg.id,
              type: msg.sender === 'admin' ? 'bot' as const : 'user' as const,
              content: msg.message,
              timestamp: new Date(msg.timestamp),
              sender: msg.sender === 'admin' ? 'admin' as const : undefined,
            }));

            setMessages(formattedMessages);
            setHasAdminResponded(messages.some(msg => msg.sender === 'admin'));
            setIsBlocked(messages[messages.length - 1]?.sender !== 'admin');

            // Mettre à jour le statut d'activité
            const now = new Date().toISOString();
            await supabase
              .from('client_chat_opened')
              .update({ 
                updated_at: now,
                is_user_active: true 
              })
              .eq('chat_id', urlChatId);
          }
        } catch (error) {
          console.error('❌ Erreur lors de la récupération des messages:', error);
        }
      };

      fetchMessages();
    }
  }, []); // Exécuté une seule fois au montage du composant

  // Fonction pour gérer la fermeture du chat
  const handleCloseChat = async () => {
    console.log('🔌 Fermeture du chat pour:', userEmail);
    if (userEmail) {
      try {
        const now = new Date().toISOString();
        console.log('⏰ Mise à jour closed_at à:', now);
        
        const { error } = await supabase
          .from('client_chat_opened')
          .update({ 
            closed_at: now,
            is_user_active: false 
          })
          .eq('user_email', userEmail);

        if (error) {
          console.error('❌ Erreur lors de la mise à jour du statut de fermeture:', error);
        } else {
          console.log('✅ Statut de fermeture mis à jour avec succès');
        }
      } catch (error) {
        console.error('❌ Erreur lors de la fermeture du chat:', error);
      }
    }
    setIsOpen(false);
    onClose();
  };

  // Effet pour gérer l'activité utilisateur avec BroadcastChannel
  useEffect(() => {
    // Créer le canal de broadcast
    activityChannelRef.current = new BroadcastChannel('aquabot_activity');

    // Fonction pour gérer l'inactivité
    const setInactive = () => {
      setIsUserActive(false);
      if (chatId) {
        const now = new Date().toISOString();
        supabase
          .from('client_chat_opened')
          .update({ 
            is_user_active: false,
            updated_at: now
          })
          .eq('chat_id', chatId)
          .then(({ error }) => {
            if (error) {
              console.error('❌ Erreur mise à jour inactivité:', error);
            } else {
              console.log('✅ Statut inactif mis à jour');
            }
          });
      }
    };

    // Fonction pour gérer l'activité locale
    const handleActivity = () => {
      if (!isOpen) return; // Ne pas mettre à jour si le chat est fermé
      
      setIsUserActive(true);
      
      // Réinitialiser le timeout d'inactivité
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }
      
      // Définir un nouveau timeout plus court (30 secondes)
      inactivityTimeoutRef.current = setTimeout(setInactive, 30000);
    };

    // Fonction pour gérer la perte de focus
    const handleBlur = () => {
      setInactive();
    };

    // Fonction pour gérer la fermeture de la page
    const handleUnload = () => {
      setInactive();
    };

    // Écouter les messages des autres onglets
    activityChannelRef.current.onmessage = (event) => {
      if (!isOpen) return; // Ne pas mettre à jour si le chat est fermé
      
      if (event.data?.type === 'still_active') {
        setIsUserActive(true);
        if (inactivityTimeoutRef.current) {
          clearTimeout(inactivityTimeoutRef.current);
        }
        inactivityTimeoutRef.current = setTimeout(setInactive, 30000);
      }
    };

    // Envoyer un ping toutes les 10 secondes si l'onglet est actif ET le chat est ouvert
    activityIntervalRef.current = setInterval(() => {
      if (!isOpen || !chatId) return;

      activityChannelRef.current?.postMessage({ 
        type: 'still_active', 
        timestamp: Date.now() 
      });

      // Mettre à jour updated_at dans Supabase uniquement si actif
      if (isUserActive) {
        const now = new Date().toISOString();
        console.log(`📡 Ping activité envoyé pour chat_id: ${chatId} à ${now}`);

        supabase
          .from('client_chat_opened')
          .update({ 
            updated_at: now,
            is_user_active: true 
          })
          .eq('chat_id', chatId)
          .then(({ error }) => {
            if (error) {
              console.error('❌ Erreur update activité:', error);
            }
          });
      }
    }, 10000);

    // Ajouter les écouteurs d'événements
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('focus', handleActivity);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('beforeunload', handleUnload);

    // Initialiser l'activité
    handleActivity();

    // Cleanup
    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('focus', handleActivity);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('beforeunload', handleUnload);
      
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }
      
      if (activityIntervalRef.current) {
        clearInterval(activityIntervalRef.current);
      }
      
      if (activityChannelRef.current) {
        activityChannelRef.current.close();
      }

      // S'assurer que le statut est mis à jour lors du nettoyage
      setInactive();
    };
  }, [chatId, isOpen, isUserActive]);

  // Effet pour mettre à jour l'état d'activité dans Supabase
  useEffect(() => {
    if (!chatId) return;

    const updateActivityStatus = async () => {
      try {
        const { error } = await supabase
          .from('client_chat_opened')
          .update({ is_user_active: isUserActive })
          .eq('chat_id', chatId);

        if (error) {
          console.error('❌ Erreur lors de la mise à jour du statut d\'activité:', error);
        } else {
          console.log('✅ Statut d\'activité mis à jour:', isUserActive);
        }
      } catch (error) {
        console.error('❌ Erreur lors de la mise à jour du statut d\'activité:', error);
      }
    };

    updateActivityStatus();
  }, [isUserActive, chatId]);

  // Effet pour gérer le déblocage anti-spam
  useEffect(() => {
    if (isSpamBlocked) {
      const now = Date.now();
      if (now - spamBlockTime >= 30000) { // 30 secondes de blocage
        setIsSpamBlocked(false);
        setRecentMessages(0);
      }
    }
  }, [isSpamBlocked, spamBlockTime]);

  // Effet pour gérer le compteur de messages récents
  useEffect(() => {
    if (recentMessages > 0) {
      const timer = setTimeout(() => {
        setRecentMessages(prev => Math.max(0, prev - 1));
      }, 10000); // Réduire le compteur toutes les 10 secondes

      return () => clearTimeout(timer);
    }
  }, [recentMessages]);

  const scrollToBottom = () => {
    if (messagesContainerRef.current && shouldAutoScroll) {
      const container = messagesContainerRef.current;
      const newScrollHeight = container.scrollHeight;
      
      // Ne défile que si la hauteur a augmenté (nouveau message)
      if (newScrollHeight > lastScrollHeightRef.current) {
        container.scrollTo({
          top: newScrollHeight,
          behavior: "smooth"
        });
      }
      
      lastScrollHeightRef.current = newScrollHeight;
    }
  };

  // Détecter si l'utilisateur est en train de lire des messages plus anciens
  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 100;
      setShouldAutoScroll(isAtBottom);
    }
  };

  const fetchBoxDetails = async () => {
    try {
      const boxData = await fetchBoxProductsFromSupabase();
      setBoxDetails(boxData);
    } catch (error) {
      console.error("Erreur lors de la récupération des box:", error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBoxDetails();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && messages.length === 0 && !isAdminChat) {
      const initialMessage: Message = {
        id: 'intro',
        type: 'bot' as const,
        content: "Bonjour ! 😊 Je suis AquaBot, ton assistant. Que souhaites-tu faire ?",
        choices: [
          "⚙️ Gérer mon abonnement",
          "📩 Contacter le support"
        ],
        timestamp: new Date()
      };
      setMessages([initialMessage]);
    }
  }, [isOpen, isAdminChat]);

  // Effet pour gérer les messages de l'admin
  useEffect(() => {
    if (!isAdminChat || !userEmail || !chatId) return;

    // Récupérer l'historique des messages
    const fetchMessages = async () => {
      try {
        // Récupérer la session admin
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.email) {
          console.error('❌ Pas de session admin trouvée');
          return;
        }

        console.log('👨‍💼 Session admin trouvée:', session.user.email);

        // Marquer ce chat comme ouvert par l'admin
        const { error: upsertError } = await supabase
          .from('admin_chat_opened')
          .upsert({
            user_email: userEmail,
            admin_email: session.user.email,
            opened_at: new Date().toISOString()
          })
          .select('*')
          .maybeSingle();

        if (upsertError) {
          console.error('❌ Erreur lors de l\'enregistrement de la session de chat:', upsertError);
        }

        // Récupérer les messages
        const { data, error } = await supabase
          .from('chatbot_messages')
          .select('*')
          .eq('chat_id', chatId)
          .order('timestamp', { ascending: true });

        if (error) throw error;
        if (data) {
          setMessages(data.map(msg => ({
            id: msg.id,
            type: msg.sender === 'admin' ? 'bot' as const : 'user' as const,
            content: msg.message,
            timestamp: new Date(msg.timestamp),
            sender: msg.sender === 'admin' ? 'admin' as const : undefined
          })));
          
          // Marquer les messages comme lus
          const unreadMessages = data.filter(msg => !msg.read && msg.sender === 'user');
          if (unreadMessages.length > 0) {
            await supabase
              .from('chatbot_messages')
              .update({ read: true })
              .eq('chat_id', chatId)
              .eq('sender', 'user')
              .eq('read', false);
          }
        }
      } catch (error) {
        console.error('❌ Erreur lors de la récupération des messages:', error);
      }
    };

    fetchMessages();

    // Souscrire aux changements en temps réel
    console.log('🔄 Mise en place de la souscription temps réel pour chat_id:', chatId);
    const channel = supabase
      .channel(`chat:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chatbot_messages',
          filter: `chat_id=eq.${chatId}`
        },
        async (payload) => {
          console.log('📩 Nouveau changement reçu:', payload);
          const msg = payload.new as ChatMessage;
          
          if (payload.eventType === 'INSERT') {
            console.log('✨ Nouveau message à ajouter');
            setMessages(prev => {
              // Vérification plus stricte des doublons
              if (prev.some(m => 
                m.id === msg.id || 
                (m.content === msg.message && 
                 Math.abs(new Date(m.timestamp).getTime() - new Date(msg.timestamp).getTime()) < 1000)
              )) {
                console.log('⚠️ Message déjà présent ou doublon potentiel, ignoré');
                return prev;
              }
              console.log('✅ Ajout du nouveau message');
              return [...prev, {
                id: msg.id,
                type: msg.sender === 'admin' ? 'bot' : 'user',
                content: msg.message,
                timestamp: new Date(msg.timestamp),
                sender: msg.sender === 'admin' ? 'admin' : undefined
              }];
            });
            
            // Si c'est un message utilisateur, le marquer comme lu
            if (msg.sender === 'user' && !msg.read) {
              await supabase
                .from('chatbot_messages')
                .update({ read: true })
                .eq('id', msg.id);
            }
          } else if (payload.eventType === 'DELETE') {
            console.log('🗑️ Suppression de la conversation détectée');
            onClose();
          }
        }
      )
      .subscribe(status => {
        console.log('📡 Statut de la souscription:', status);
      });

    subscriptionRef.current = channel;

    return () => {
      console.log('🧹 Nettoyage de la souscription temps réel');
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [isAdminChat, userEmail, chatId]);

  // Effet pour le défilement automatique à chaque nouveau message
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleUserInput = async () => {
    if (!userInput.trim() && uploadedImages.length === 0 || (isBlocked && !awaitingEmail && !awaitingQuestion)) return;

    // Vérification anti-spam uniquement pour les messages utilisateur
    const now = Date.now();
    const timeSinceLastMessage = now - lastMessageTime;
    const minDelay = 1000;

    if (timeSinceLastMessage < minDelay) {
      return;
    }

    if (recentMessages >= 5) {
      setIsSpamBlocked(true);
      setSpamBlockTime(now);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'bot',
        content: "⚠️ Pour éviter le spam, veuillez attendre quelques secondes avant d'envoyer d'autres messages.",
        timestamp: new Date()
      }]);
      return;
    }

    console.group('⌨️ Saisie utilisateur');
    console.log('📝 Texte saisi:', userInput);

    const messageId = uuidv4(); // Utiliser UUID pour un ID vraiment unique

    setLastMessageTime(now);
    setRecentMessages(prev => prev + 1);

    if (awaitingEmail) {
      if (!userInput.includes("@") || !userInput.includes(".")) {
        setMessages(prev => [...prev, {
          id: messageId,
          type: 'bot',
          content: "❌ L'adresse email semble incorrecte. Veuillez entrer une adresse valide.",
          timestamp: new Date()
        }]);
        setUserInput("");
        return;
      }

      // Vérifier s'il existe déjà une session pour cet email
      console.log('🔍 Vérification session existante pour:', userInput);
      const { data: existingSession, error: sessionError } = await supabase
        .from('client_chat_opened')
        .select('chat_id')
        .eq('user_email', userInput)
        .maybeSingle();

      if (sessionError) {
        console.error('❌ Erreur récupération session existante:', sessionError);
      }

      let finalChatId = existingSession?.chat_id;

      if (!finalChatId) {
        // On génère un chat_id uniquement si aucun n'existe
        console.log('✨ Génération nouveau chat_id pour:', userInput);
        finalChatId = `${userInput}-${Date.now()}-${uuidv4()}`;
        const now = new Date().toISOString();

        const { error } = await supabase
          .from('client_chat_opened')
          .upsert({
            user_email: userInput,
            chat_id: finalChatId,
            opened_at: now,
            updated_at: now,
            is_user_active: true,
            client_has_ever_replied: false,
            client_has_replied_since_last_admin: false
          }, { onConflict: 'user_email' });

        if (error) {
          console.error("❌ Erreur création session :", error);
          setMessages(prev => [...prev, {
            id: messageId,
            type: 'bot',
            content: "❌ Une erreur est survenue lors de l'enregistrement de votre session. Veuillez réessayer.",
            timestamp: new Date()
          }]);
          setUserInput("");
          return;
        }
      }

      console.log("📩 Chat ID final utilisé :", finalChatId);
      setChatId(finalChatId);
      setUserEmail(userInput);
      setAwaitingEmail(false);

      // Vérifier les abonnements si on est dans le flux de résiliation/modification
      if (subscriptionFlow === 'cancel' || subscriptionFlow === 'update') {
        console.group('🔄 Vérification des abonnements Stripe');
        console.log('📧 Email à vérifier:', userInput);
        console.log('🔄 Type de flux:', subscriptionFlow);
        
        // 📦 Appel Edge Function
        try {
          console.log('📤 Envoi de la requête à la fonction Edge...');
          const response = await fetch(
            'https://btnyenoxsjtuydpzbapq.supabase.co/functions/v1/get-subscriptions-by-email',
            {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0bnllbm94c2p0dXlkcHpiYXBxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzk4MjU4NywiZXhwIjoyMDUzNTU4NTg3fQ.Mei4bM-eWHrgP_ZLFx7JAjpJxIlDxcxnt8LWIBwpA-k',
                'x-client-info': 'supabase-js/2.x',
              },
              body: JSON.stringify({ email: userInput }),
            }
          );

          console.log('📤 URL appelée:', 'https://btnyenoxsjtuydpzbapq.supabase.co/functions/v1/get-subscriptions-by-email');
          console.log('📤 Headers envoyés:', {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer [HIDDEN]',
            'x-client-info': 'supabase-js/2.x',
          });

          const responseText = await response.text();
          console.log('📥 Réponse brute:', responseText);

          let subscriptions;
          try {
            subscriptions = JSON.parse(responseText);
            console.log('📦 Données parsées:', subscriptions);
          } catch (parseError) {
            console.error('❌ Erreur de parsing JSON:', parseError);
            throw new Error('Invalid JSON response');
          }

          if (!Array.isArray(subscriptions)) {
            console.error('❌ Réponse invalide:', subscriptions);
            throw new Error('Invalid response format');
          }

          if (subscriptions.length === 0) {
            console.log('📭 Aucun abonnement trouvé');
            setMessages(prev => [...prev, {
              id: uuidv4(),
              type: 'bot',
              content: "❌ Aucun abonnement trouvé pour cette adresse. Vérifiez qu'elle correspond à celle utilisée lors de votre inscription.",
              timestamp: new Date(),
            }]);
          } else {
            console.log('✅ Abonnements trouvés:', subscriptions);
            
            // Trier les abonnements par statut (actif en premier)
            const sortedSubscriptions = [...subscriptions].sort((a, b) => {
              if (a.status === 'active' && b.status !== 'active') return -1;
              if (a.status !== 'active' && b.status === 'active') return 1;
              return 0;
            });

            const formatStatus = (status: string) => {
              switch (status) {
                case 'active': return 'actif';
                case 'canceled': return 'résilié';
                case 'past_due': return 'en retard de paiement';
                case 'unpaid': return 'impayé';
                default: return status;
              }
            };

            setMessages(prev => [...prev, {
              id: uuidv4(),
              type: 'bot',
              content: `
                <style>
                  .subscription-box {
                    background-color: #f9f9f9;
                    border-radius: 12px;
                    padding: 1rem;
                    border: 1px solid #eee;
                    margin-bottom: 1rem;
                  }
                  .subscription-title {
                    font-weight: 600;
                    font-size: 0.95rem;
                    margin-bottom: 0.5rem;
                  }
                  .subscription-status {
                    color: #10b981;
                    font-size: 0.85rem;
                  }
                  .subscription-list {
                    margin-top: 0.5rem;
                    font-size: 0.9rem;
                  }
                  .subscription-price {
                    color: #0a69a3;
                    font-weight: 700;
                  }
                  .subscription-date {
                    font-size: 0.8rem;
                    color: #6b7280;
                  }
                </style>
                <section class="space-y-3">
                  ${sortedSubscriptions.map(sub => `
                    <div class="subscription-box">
                      <div class="subscription-title">📦 Abonnement</div>
                      <div class="subscription-status">Statut : ${formatStatus(sub.status)}</div>
                      <ul class="subscription-list space-y-1">
                        ${sub.plans.map(plan =>
                          `<li>• ${plan.plan_name} - <span class="subscription-price">${plan.price}</span></li>`
                        ).join('')}
                      </ul>
                      <div class="space-y-2 mt-3">
                        ${sub.status === 'canceled' && sub.no_more_payments ? `
                          <div class="text-sm text-gray-500">
                            ⛔ Plus de paiement prévu
                          </div>
                        ` : `
                          <div class="text-sm text-gray-500">
                            ⏳ Jusqu'au ${new Date(sub.current_period_end).toLocaleDateString('fr-FR')}
                          </div>
                        `}
                        ${sub.last_payment ? `
                          <div class="text-sm text-gray-500">
                            💳 Dernier paiement : ${new Date(sub.last_payment).toLocaleDateString('fr-FR')}
                          </div>
                        ` : ''}
                      </div>
                    </div>
                  `).join('')}
                </section>
              `,
              choices: ["🛠️ Modifier ou résilier mon abonnement"],
              timestamp: new Date(),
            }]);
          }
        } catch (error) {
          console.error('❌ Erreur lors de la récupération des abonnements:', error);
          console.error('Stack trace:', error.stack);
          setMessages(prev => [...prev, {
            id: uuidv4(),
            type: 'bot',
            content: "❌ Une erreur est survenue lors de la vérification de votre abonnement. Veuillez réessayer plus tard.",
            timestamp: new Date(),
          }]);
        } finally {
          console.groupEnd();
        }

        // Fin du flux : reset le flag
        setSubscriptionFlow(null);
      } else {
        // Message de confirmation uniquement pour le flux de contact support
        setMessages(prev => [...prev, {
          id: messageId,
          type: 'bot',
          content: `
            <section class="space-y-2">
              <p>✅ Merci ! Votre email a été enregistré.</p>
              <p>✍️ Vous pouvez maintenant poser votre question. Nous vous répondrons directement ici et un email vous sera envoyé à <strong>${userInput}</strong> lorsque nous aurons répondu.</p>
            </section>
          `,
          timestamp: new Date()
        }]);
        setAwaitingQuestion(true);
      }

      setUserInput("");

      // Vérifier si l'admin n'est pas en train de chater avec cet utilisateur via Supabase
      console.log('🔍 Vérification de la session admin pour:', userEmail);

      const { data: chatSessions, error: chatSessionError } = await supabase
        .from("admin_chat_opened")
        .select("*")
        .eq("user_email", userEmail);

      if (chatSessionError) {
        console.error('❌ Erreur lors de la vérification des sessions:', chatSessionError);
      }

      console.log('📊 Résultat de la vérification:', {
        sessionsCount: chatSessions?.length || 0,
        sessions: chatSessions,
        userEmail,
        timestamp: new Date().toISOString()
      });

      if (!chatSessions || chatSessions.length === 0) {
        console.log('📤 Envoi notification Telegram car aucune session admin active');
        fetch(`https://api.telegram.org/bot7339701106:AAGq0O_0G26doiZfMu3BfxXe_ffELZ9-viE/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: '5786222528',
            text: `📩 Nouveau message de ${userInput}:\n"${userInput}"`
          })
        })
        .then(response => {
          console.log('✅ Notification Telegram envoyée avec succès');
          return response.json();
        })
        .catch(err => {
          console.error('❌ Erreur lors de l\'envoi de la notification Telegram:', err);
        });
      } else {
        console.log('🚫 Notification Telegram non envoyée car admin(s) actif(s):', chatSessions);
      }

      return;
    }

    if (awaitingQuestion || isAdminChat) {
      // On n'ajoute plus le message immédiatement à l'interface
      setUserInput("");

      if (awaitingQuestion) {
        setAwaitingQuestion(false);
        setIsAdminChat(true);
      }

      if (!hasAdminResponded) {
        setIsBlocked(true);
      }

      // Enregistrer le message dans Supabase
      try {
        const { error } = await supabase.from('chatbot_messages').insert([
          {
            id: messageId, // Utiliser le même ID
            email: userEmail,
            chat_id: chatId,
            message: userInput,
            timestamp: new Date().toISOString(),
            sender: 'user',
            read: false
          }
        ]);

        if (error) throw error;
        console.log('✅ Message enregistré dans Supabase:', {
          id: messageId,
          email: userEmail,
          chat_id: chatId,
          message: userInput
        });

        // Réinitialiser les compteurs de notification quand le client répond
        console.log('🔄 Réinitialisation des compteurs de notification pour', userEmail);
        const { error: updateError } = await supabase
          .from('client_chat_opened')
          .update({
            client_has_replied_since_last_admin: true,
            last_admin_message_id_notified: null,
            last_notified_at: null
          })
          .eq('chat_id', chatId);
          
        if (updateError) {
          console.error('❌ Erreur lors de la réinitialisation des compteurs:', updateError);
        } else {
          console.log('✅ Compteurs de notification réinitialisés avec succès');
        }
        
        // Attendre 1 seconde pour s'assurer que la fonction Edge arrive après cette mise à jour
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Ping manuel d'activité après l'envoi du message
        if (chatId) {
          const now = new Date().toISOString();
          console.log(`📡 Ping activité manuel après envoi message pour chat_id: ${chatId} à ${now}`);
          
          await supabase
            .from('client_chat_opened')
            .update({ 
              updated_at: now,
              is_user_active: true 
            })
            .eq('chat_id', chatId);
        }

        // Vérifier si l'admin n'est pas en train de chater avec cet utilisateur via Supabase
        console.log('🔍 Vérification de la session admin pour:', userEmail);

        const { data: chatSessions, error: chatSessionError } = await supabase
          .from("admin_chat_opened")
          .select("*")
          .eq("user_email", userEmail);

        if (chatSessionError) {
          console.error('❌ Erreur lors de la vérification des sessions:', chatSessionError);
        }

        console.log('📊 Résultat de la vérification:', {
          sessionsCount: chatSessions?.length || 0,
          sessions: chatSessions,
          userEmail,
          timestamp: new Date().toISOString()
        });

        if (!chatSessions || chatSessions.length === 0) {
          console.log('📤 Envoi notification Telegram car aucune session admin active');
          fetch(`https://api.telegram.org/bot7339701106:AAGq0O_0G26doiZfMu3BfxXe_ffELZ9-viE/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: '5786222528',
              text: `📩 Nouveau message de ${userEmail}:\n"${userInput}"`
            })
          })
          .then(response => {
            console.log('✅ Notification Telegram envoyée avec succès');
            return response.json();
          })
          .catch(err => {
            console.error('❌ Erreur lors de l\'envoi de la notification Telegram:', err);
          });
        } else {
          console.log('🚫 Notification Telegram non envoyée car admin(s) actif(s):', chatSessions);
        }

        // Gérer l'upload des images si présentes
        if (uploadedImages.length > 0) {
          for (const file of uploadedImages) {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            
            const { data, error } = await supabase.storage
              .from("public-images")
              .upload(`chat_images/${fileName}`, file);

            if (!error) {
              const publicURL = supabase.storage
                .from("public-images")
                .getPublicUrl(`chat_images/${fileName}`).data.publicUrl;

              console.log('✅ Image uploadée avec succès:', publicURL);

              // Ajouter l'image au chat
              setMessages(prev => [...prev, {
                id: `${Date.now()}-${fileName}`,
                type: 'user',
                content: `<img src="${publicURL}" alt="Image envoyée" class="max-w-xs rounded-lg shadow" />`,
                timestamp: new Date()
              }]);

              // Sauvegarder dans Supabase
              await supabase.from("chatbot_messages").insert([
                {
                  email: userEmail,
                  chat_id: chatId,
                  message: publicURL,
                  sender: "user",
                  timestamp: new Date().toISOString(),
                  read: false
                }
              ]);

              console.log('✅ Message image enregistré dans Supabase');

              // Vérifier si l'admin n'est pas en train de chater avec cet utilisateur
              console.log('🔍 Vérification de la session admin pour:', userEmail);

              const { data: chatSessions, error: chatSessionError } = await supabase
                .from("admin_chat_opened")
                .select("*")
                .eq("user_email", userEmail);

              if (chatSessionError) {
                console.error('❌ Erreur lors de la vérification des sessions:', chatSessionError);
              }

              console.log('📊 Résultat de la vérification:', {
                sessionsCount: chatSessions?.length || 0,
                sessions: chatSessions,
                userEmail,
                timestamp: new Date().toISOString()
              });

              if (!chatSessions || chatSessions.length === 0) {
                console.log('📤 Envoi notification Telegram car aucune session admin active');
                fetch(`https://api.telegram.org/bot7339701106:AAGq0O_0G26doiZfMu3BfxXe_ffELZ9-viE/sendMessage`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    chat_id: '5786222528',
                    text: `🖼️ ${userEmail} a envoyé une image :\n${publicURL}`
                  })
                })
                .then(response => {
                  console.log('✅ Notification Telegram envoyée avec succès pour l\'image');
                  return response.json();
                })
                .catch(err => {
                  console.error('❌ Erreur lors de l\'envoi de la notification Telegram pour l\'image:', err);
                });
              } else {
                console.log('🚫 Notification Telegram non envoyée car admin(s) actif(s):', chatSessions);
              }
            }
          }
          setUploadedImages([]);
        }
      } catch (error) {
        console.error('❌ Erreur lors de l\'enregistrement dans Supabase:', error);
        // Afficher un message d'erreur à l'utilisateur
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          type: 'bot',
          content: "❌ Une erreur est survenue lors de l'envoi de votre message. Veuillez réessayer.",
          timestamp: new Date()
        }]);
      }
    }
    console.groupEnd();
  };

  const handleChoice = async (choice: string) => {
    console.group('🎯 Choix utilisateur');
    console.log('🔍 Choix sélectionné:', choice);

    const messageId = uuidv4();

    // Mettre à jour les variables anti-spam pour les choix utilisateur
    const now = Date.now();
    setLastMessageTime(now);
    setRecentMessages(prev => prev + 1);

    setMessages(prev => [...prev, {
      id: messageId,
      type: 'user',
      content: choice,
      timestamp: new Date()
    }]);

    // Si le choix est de gérer l'abonnement
    if (choice === "⚙️ Gérer mon abonnement") {
      setMessages(prev => [...prev, {
        id: uuidv4(),
        type: 'bot',
        content: `
          <section class="space-y-2">
            <p><strong>⚙️ Pour gérer votre abonnement, nous avons besoin de votre adresse email.</strong></p>
            <p>Veuillez entrer votre email ci-dessous :</p>
          </section>
        `,
        timestamp: new Date()
      }]);
      setAwaitingEmail(true);
      setSubscriptionFlow('cancel');
    } else if (choice === "🛠️ Modifier ou résilier mon abonnement") {
      if (!userEmail) {
        setMessages(prev => [...prev, {
          id: uuidv4(),
          type: 'bot',
          content: "❌ On a besoin de ton email pour ouvrir ton espace abonnement.",
          timestamp: new Date(),
        }]);
      } else {
        await redirectToStripePortal(userEmail);
      }
    } else if (choice === "📩 Contacter le support") {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: `
          <section class="space-y-2">
            <p><strong>📩 Pour vous contacter, nous avons besoin de votre adresse email.</strong></p>
            <p>Veuillez entrer votre email ci-dessous :</p>
          </section>
        `,
        timestamp: new Date()
      }]);
      setAwaitingEmail(true);
    }
    console.groupEnd();
  };

  const formatPrice = (price: number) => {
    return price.toFixed(2).replace('.', ',') + '€';
  };

  // Ajouter l'event listener pour ouvrir le modal
  useEffect(() => {
    const handleOpenImageModal = (event: CustomEvent) => {
      setSelectedImage(event.detail);
    };

    window.addEventListener('openImageModal', handleOpenImageModal as EventListener);
    return () => {
      window.removeEventListener('openImageModal', handleOpenImageModal as EventListener);
    };
  }, []);

  // Effet pour gérer la fermeture du chat quand l'utilisateur quitte la page
  useEffect(() => {
    if (!userEmail) return;

    console.log('🔍 Mise en place du listener de fermeture pour:', userEmail);

    const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
      console.log('🔌 Fermeture détectée, mise à jour closed_at pour:', userEmail);
      try {
        const now = new Date().toISOString();
        const { error } = await supabase
          .from('client_chat_opened')
          .update({ 
            closed_at: now,
            is_user_active: false 
          })
          .eq('user_email', userEmail);
        console.log('✅ Update résultat:', { error });
      } catch (error) {
        console.error('❌ Erreur lors de la mise à jour du statut de chat:', error);
      }
    };

    // Ajouter le listener
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup
    return () => {
      console.log('🧹 Nettoyage du listener de fermeture');
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [userEmail]);

  // Effet pour mettre à jour closed_at quand le chat est fermé
  useEffect(() => {
    if (!userEmail || isOpen) return;

    console.log('🔌 Chat fermé, mise à jour closed_at pour:', userEmail);
    const now = new Date().toISOString();
    
    supabase
      .from('client_chat_opened')
      .update({ 
        closed_at: now,
        is_user_active: false 
      })
      .eq('user_email', userEmail)
      .then(({ error }) => {
        if (error) {
          console.error('❌ Erreur lors de la mise à jour du statut de chat:', error);
        } else {
          console.log('✅ closed_at mis à jour avec succès');
        }
      });
  }, [isOpen, userEmail]);

  return (
    <div
      className={cn(
        "fixed transition-all duration-500 ease-in-out chat-window",
        "md:left-24 md:bottom-32 md:w-[400px] md:h-[600px]",
        "left-0 bottom-0 w-[calc(100%-16px)] mx-2 h-[80vh]",
        isOpen 
          ? "opacity-100 translate-y-0" 
          : "opacity-0 translate-y-[120%] pointer-events-none"
      )}
    >
      {/* Backdrop sur mobile */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/20 backdrop-blur-sm transition-opacity md:hidden",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={handleCloseChat}
      />

      {/* Chat Container */}
      <div className="relative w-full h-full bg-white rounded-t-2xl md:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-primary p-4 flex items-center justify-between sticky top-0 z-10">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              🐟
            </span>
            {isAdminChat ? 'Chat avec le support' : 'Chat avec AquaBot'}
          </h3>
          <button
            onClick={handleCloseChat}
            className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
            aria-label="Fermer le chat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Messages Container */}
        <div 
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50"
        >
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex items-start gap-2 animate-fadeIn",
                message.type === 'user' && "flex-row-reverse"
              )}
            >
              {message.type === 'bot' && (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm">
                    {message.sender === 'admin' ? '👨‍💼' : '🐟'}
                  </span>
                </div>
              )}
              
              <div className={cn(
                "rounded-2xl p-3 max-w-[80%] shadow-sm",
                message.type === 'bot' 
                  ? "bg-white rounded-tl-none" 
                  : "bg-primary text-white rounded-tr-none"
              )}>
                {message.type === 'bot' ? (
                  <div 
                    className="text-sm [&_ul]:pl-4 [&_li]:flex [&_li]:items-center [&_li]:gap-2"
                    dangerouslySetInnerHTML={{ 
                      __html: message.content.includes("chat_images/") 
                        ? `<div class="relative group cursor-pointer" onclick="document.querySelector('#image-modal-${message.id}').click()">
                            <img src="${message.content}" alt="Image envoyée" class="max-w-[90vw] sm:max-w-[300px] w-full h-auto rounded-lg shadow object-contain transition-transform hover:scale-105" />
                            <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <span class="text-white text-sm">Cliquez pour agrandir</span>
                            </div>
                          </div>
                          <button id="image-modal-${message.id}" class="hidden" onclick="window.dispatchEvent(new CustomEvent('openImageModal', { detail: '${message.content}' }))"></button>`
                        : message.content 
                    }}
                  />
                ) : message.content.startsWith("http") && message.content.includes("chat_images/") ? (
                  <div 
                    className="relative group cursor-pointer"
                    onClick={() => setSelectedImage(message.content)}
                  >
                    <img
                      src={message.content}
                      alt="Image envoyée"
                      className="max-w-[200px] md:max-w-[300px] w-full h-auto rounded-lg shadow transition-transform hover:scale-105 object-contain"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <span className="text-white text-sm">Cliquez pour agrandir</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm">
                    <p>{message.content}</p>
                  </div>
                )}

                {message.choices && !awaitingEmail && !awaitingQuestion && !isAdminChat && (
                  <div className="mt-4 space-y-2">
                    {message.choices.map((choice) => (
                      <button
                        key={choice}
                        onClick={() => handleChoice(choice)}
                        className={cn(
                          "w-full text-left px-4 py-2 rounded-xl transition-colors text-sm font-medium border",
                          choice === "📩 Contacter le support"
                            ? "bg-primary text-white border-primary hover:bg-primary/90"
                            : "bg-white text-primary border-primary/20 hover:bg-primary/5"
                        )}
                      >
                        👉 {choice}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} className="h-4" />
        </div>

        {/* Input Container */}
        <div className="border-t p-4 bg-white shadow-lg sticky bottom-0">
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={
                  isSpamBlocked
                    ? "Veuillez attendre quelques secondes..."
                    : isBlocked && !awaitingEmail && !awaitingQuestion
                      ? "En attente d'une réponse..." 
                      : awaitingEmail 
                        ? "Entrez votre email..." 
                        : awaitingQuestion 
                          ? "Posez votre question..." 
                          : "Écrivez votre message..."
                }
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                disabled={isSpamBlocked || (isBlocked && !awaitingEmail && !awaitingQuestion) || (!awaitingEmail && !awaitingQuestion && !isAdminChat)}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleUserInput()}
              />
              <button
                className="bg-primary text-white px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 flex-shrink-0"
                disabled={isSpamBlocked || (!userInput.trim() && uploadedImages.length === 0) || (isBlocked && !awaitingEmail && !awaitingQuestion)}
                onClick={handleUserInput}
              >
                Envoyer
              </button>
            </div>
            {!awaitingEmail && (awaitingQuestion || isAdminChat) && (
              <div className="flex items-center gap-2">
                <label
                  htmlFor="image-upload"
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl transition-colors text-sm font-medium border cursor-pointer",
                    "bg-white text-primary border-primary/20 hover:bg-primary/5"
                  )}
                >
                  <span>📎</span>
                  <span>Ajouter des images</span>
                </label>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length + uploadedImages.length > 3) {
                      alert("Tu peux envoyer jusqu'à 3 images max !");
                      return;
                    }
                    setUploadedImages((prev) => [...prev, ...files]);
                  }}
                  className="hidden"
                />
                {uploadedImages.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      {uploadedImages.length} image{uploadedImages.length > 1 ? 's' : ''} sélectionnée{uploadedImages.length > 1 ? 's' : ''}
                    </span>
                    <button
                      onClick={() => setUploadedImages([])}
                      className="text-red-500 hover:text-red-600 text-sm"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal pour l'image en grand */}
      {selectedImage && createPortal(
        <div 
          className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setSelectedImage(null)}
        >
          <div 
            className="relative w-full h-full flex items-center justify-center cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedImage}
              alt="Image en grand"
              className="w-full h-full max-w-[95vw] max-h-[95vh] object-contain rounded-lg shadow-2xl"
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/70 rounded-full p-2 transition-colors cursor-pointer z-10"
            >
              ✕
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ChatWindow; 