import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  type: 'bot' | 'user' | 'choice' | 'messenger';
  content: string;
  choices?: string[];
  timestamp: Date;
  from?: 'chat' | 'messenger';
  messengerUserId?: string;
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

// Fonction pour nettoyer les noms de produits HTML
const cleanProductName = (name: string): string => {
  // Supprimer les balises HTML et leurs attributs
  const withoutHtml = name.replace(/<[^>]+>/g, '');
  // Supprimer les caractères spéciaux et les espaces multiples
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
          // Ignorer les ID Shopify et les entrées vides
          if (!entry.content.includes("gid://shopify/Product") && entry.content.trim() !== '') {
            const priceEntry = data.find(d => d.content_key === `${entry.content_key}_product_price`);
            const price = priceEntry?.content ? parseFloat(priceEntry.content.replace(',', '.')) : 0;
            
            // N'ajouter que les produits avec un titre valide
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

    // Extraire les produits avec leurs prix stockés
    const basicProducts = extractProductsWithPrices('monthly_pack_pack_basix_note');
    const premiumProducts = extractProductsWithPrices('monthly_pack_pack_premium_note');

    const exclusiveProducts = data
      .filter(entry => 
        entry.content_key.startsWith('monthly_pack_pack_premium_gift_note') && 
        !entry.content.includes("gid://shopify/Product") &&
        entry.content.trim() !== ''
      )
      .map(entry => entry.content);

    // Récupération des descriptions des packs
    const basicDescription = data.find(
      entry => entry.content_key === 'monthly_pack_pack_basix_description'
    )?.content || '';
    const premiumDescription = data.find(
      entry => entry.content_key === 'monthly_pack_pack_premium_description'
    )?.content || '';

    // Calculer la valeur totale des produits (uniquement pour les produits avec prix > 0)
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

// Composant pour gérer l'opt-in Messenger
const MessengerOptIn = ({ messengerUserId, userEmail }: { messengerUserId: string | null, userEmail: string }) => {
  useEffect(() => {
    if (messengerUserId && userEmail) {
      // Créer un iframe caché pour l'opt-in Messenger
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.position = 'fixed';
      iframe.style.left = '-9999px';
      iframe.style.top = '-9999px';
      
      // Ajouter le paramètre ref avec l'email
      const messengerUrl = `https://m.me/${process.env.NEXT_PUBLIC_FACEBOOK_PAGE_ID}?ref=email=${encodeURIComponent(userEmail)}`;
      console.log('🔗 URL Messenger générée:', messengerUrl);
      
      iframe.src = messengerUrl;
      
      // Ajouter l'iframe au document
      document.body.appendChild(iframe);
      
      // Nettoyer après 5 secondes
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 5000);
    }
  }, [messengerUserId, userEmail]);

  return null;
};

const ChatWindow = ({ isOpen, onClose }: ChatWindowProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [boxDetails, setBoxDetails] = useState<BoxDetails | null>(null);
  const [awaitingEmail, setAwaitingEmail] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [awaitingQuestion, setAwaitingQuestion] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [messengerUserId, setMessengerUserId] = useState<string | null>(null);
  const [lastActive, setLastActive] = useState<Date | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [shouldPoll, setShouldPoll] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const processedMessagesRef = useRef<Set<string>>(new Set());

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fonction pour récupérer les détails des box depuis Supabase
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

  // Polling pour les nouveaux messages
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const fetchNewMessages = async () => {
      if (!shouldPoll || !messengerUserId) return;

      try {
        const response = await fetch('https://majemsiteteste.netlify.app/.netlify/functions/webhook/messages');
        const data = await response.json();
        
        if (Array.isArray(data)) {
          // Filtrer les messages par ID local et non traités
          const newMessages = data.filter(msg => 
            !processedMessagesRef.current.has(msg.id) && 
            msg.messengerUserId === messengerUserId
          );

          if (newMessages.length > 0) {
            lastMessageIdRef.current = newMessages[newMessages.length - 1].id;
            
            const formattedMessages = newMessages.map(msg => ({
              id: msg.id,
              type: msg.type,
              content: msg.content,
              timestamp: new Date(msg.timestamp),
              from: msg.from,
              messengerUserId: msg.messengerUserId
            }));

            newMessages.forEach(msg => processedMessagesRef.current.add(msg.id));
            setMessages(prev => [...prev, ...formattedMessages]);
            setLastActive(new Date());
          }
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des messages:", error);
      }
    };

    if (isOpen && shouldPoll) {
      fetchNewMessages();
      intervalId = setInterval(fetchNewMessages, 5000);
      setIsConnected(true);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      setIsConnected(false);
    };
  }, [isOpen, shouldPoll, messengerUserId]);

  // Initialisation du chat
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const initialMessage: Message = {
        id: '1',
        type: 'bot',
        content: "Bonjour ! 😊 Je suis AquaBot, ton assistant. Comment puis-je t'aider ?",
        choices: [
          "En quoi consiste l'abonnement mensuel ?",
          "Quels avantages ce mois-ci ?",
          "📩 Contactez-nous"
        ],
        timestamp: new Date()
      };
      setMessages([initialMessage]);
      processedMessagesRef.current.add(initialMessage.id);
    }
  }, [isOpen]);

  // Gestion de l'email et démarrage du polling
  const handleEmailSubmission = (email: string) => {
    const tempId = `temp_${require('crypto').createHash('md5').update(email).digest('hex').substring(0, 8)}`;
    setMessengerUserId(tempId);
    setShouldPoll(true);
  };

  const handleUserInput = async () => {
    if (!userInput.trim()) return;

    console.group('⌨️ Saisie utilisateur');
    console.log('📝 Texte saisi:', userInput);

    const messageId = Date.now().toString();
    processedMessagesRef.current.add(messageId);

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

      setUserEmail(userInput);
      handleEmailSubmission(userInput);
      setAwaitingEmail(false);
      setAwaitingQuestion(true);
      setUserInput("");

      setMessages(prev => [...prev, {
        id: messageId,
        type: 'bot',
        content: `
          <div class="space-y-2">
            <p>✅ Merci ! Votre email a été enregistré.</p>
            <p>✍️ Vous pouvez maintenant poser votre question. Nous vous répondrons directement ici et un email vous sera envoyé à <strong>${userInput}</strong> lorsque nous aurons répondu.</p>
          </div>
        `,
        timestamp: new Date()
      }]);
      return;
    }

    if (awaitingQuestion) {
      console.log('📩 Envoi de la question');
      const userQuestion = userInput;
      setAwaitingQuestion(false);
      setUserInput("");

      console.log('📤 Envoi à Messenger:', {
        question: userQuestion,
        email: userEmail
      });

      // Envoyer à Messenger
      await sendToMessenger(userQuestion);

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: `
          <div class="space-y-2">
            <p>✅ Merci pour votre message !</p>
            <p>Un email vous sera envoyé à <strong>${userEmail}</strong> lorsque nous aurons répondu.</p>
            <p>📲 Vous pouvez continuer la conversation ici en direct.</p>
          </div>
        `,
        choices: [
          "En quoi consiste l'abonnement mensuel ?",
          "Quels avantages ce mois-ci ?"
        ],
        timestamp: new Date()
      }]);

      // Mettre à jour la dernière activité
      setLastActive(new Date());
    }
    console.groupEnd();
  };

  const handleChoice = async (choice: string) => {
    console.group('🎯 Choix utilisateur');
    console.log('🔍 Choix sélectionné:', choice);

    const messageId = Date.now().toString();
    processedMessagesRef.current.add(messageId);

    setMessages(prev => [...prev, {
      id: messageId,
      type: 'user',
      content: choice,
      timestamp: new Date()
    }]);

    if (choice === "📩 Contactez-nous") {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: `
          <div class="space-y-2">
            <p><strong>📩 Pour vous contacter, nous avons besoin de votre adresse email.</strong></p>
            <p>Veuillez entrer votre email ci-dessous :</p>
          </div>
        `,
        timestamp: new Date()
      }]);
      setAwaitingEmail(true);
      setShouldPoll(false); // S'assurer que le polling est désactivé jusqu'à la saisie de l'email
      processedMessagesRef.current.clear(); // Réinitialiser les messages traités
    } else if (choice === "En quoi consiste l'abonnement mensuel ?") {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: `
          <div class="space-y-2">
            <p><strong>L'abonnement mensuel Aqua Rêve, c'est :</strong></p>
            <ul class="space-y-1 list-inside">
              <li>🎁 Une sélection mensuelle de nourritures adaptées</li>
              <li>🧪 Des produits d'entretien essentiels</li>
              <li>✨ Une surprise exclusive (version Premium)</li>
              <li>⭐ Des récompenses en Rêve Points</li>
            </ul>
            <p class="mt-2"><strong>Les avantages :</strong></p>
            <ul class="space-y-1 list-inside">
              <li>🔄 Sans engagement</li>
              <li>🚚 Livraison rapide incluse</li>
              <li>💙 Une expérience simple et sereine</li>
            </ul>
          </div>
        `,
        choices: [
          "Quels avantages ce mois-ci ?",
          "📩 Contactez-nous"
        ],
        timestamp: new Date()
      }]);
    } else if (choice === "Quels avantages ce mois-ci ?") {
      if (!boxDetails) {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: `
            <div class="space-y-3">
              <p class="text-red-500">Désolé, je ne parviens pas à récupérer les informations des box pour le moment. Veuillez réessayer plus tard.</p>
            </div>
          `,
          choices: [
            "En quoi consiste l'abonnement mensuel ?",
            "📩 Contactez-nous"
          ],
          timestamp: new Date()
        }]);
        return;
      }

      const { basic, premium } = boxDetails;
      const shippingCost = 5.99;
      const savingsBasic = Math.max(0, basic.totalValue - basic.price + shippingCost);
      const savingsPremium = Math.max(0, premium.totalValue - premium.price + shippingCost);

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: `
          <style>
            .product-item {
              display: flex;
              align-items: center;
              gap: 0.5rem;
            }
            .product-title {
              flex: 1;
              font-size: 0.875rem;
              line-height: 1.5;
            }
            .product-price {
              font-weight: 600;
              color: rgb(0, 113, 235);
              font-size: 0.875rem;
              margin-left: auto;
            }
            .product-bullet {
              flex-shrink: 0;
              font-size: 1.25rem;
              line-height: 1;
            }
            .total-value {
              color: rgb(0, 113, 235);
              font-weight: 600;
            }
          </style>
          <div class="space-y-3">
            <div>
              <p><strong>📦 Box Basic (${formatPrice(basic.price)}) :</strong></p>
              <p class="text-sm text-gray-600 mb-2">${basic.description}</p>
              <p class="mt-2"><em>Valeur réelle des produits : <span class="text-primary font-semibold">${formatPrice(basic.totalValue)}</span></em></p>
              <p class="text-green-500 font-bold">✨ Économie réalisée : ${formatPrice(savingsBasic)} (${formatPrice(basic.totalValue - basic.price)} + ${formatPrice(shippingCost)} de livraison gratuite)</p>
              <ul class="space-y-2 list-inside mt-2">
                ${basic.products.filter(p => !p.title.includes("Un prélèvement lors de la souscription")).map(p => `
                  <li class="product-item">
                    ${p.image ? `
                      <img src="${p.image}" alt="${p.title}" class="w-8 h-8 rounded-lg object-cover bg-gray-50" />
                    ` : '<span class="product-bullet">•</span>'}
                    <span class="product-title">${p.title}</span>
                    <strong class="text-primary">${formatPrice(p.price)}</strong>
                  </li>
                `).join('')}
              </ul>

              <div class="bg-primary/5 rounded-xl p-3 mt-4">
                <p class="font-medium">🎉 Avantages Box Basic ce mois-ci :</p>
                <ul class="space-y-2 mt-2">
                  <li class="flex items-center gap-2">
                    <span>🎯</span>
                    <span>Valeur totale des produits : <strong class="text-primary">${formatPrice(basic.totalValue)}</strong></span>
                  </li>
                  <li class="flex items-center gap-2">
                    <span>💰</span>
                    <span>Tu économises : <strong class="text-primary">${formatPrice(savingsBasic)}</strong></span>
                  </li>
                  <li class="flex items-center gap-2">
                    <span>🚚</span>
                    <span>Livraison incluse (au lieu de <strong class="text-primary">${formatPrice(shippingCost)}</strong> si acheté séparément)</span>
                  </li>
                  <li class="flex items-center gap-2">
                    <span>🔄</span>
                    <span>Sans engagement</span>
                  </li>
                  <li class="flex items-center gap-2">
                    <span>💙</span>
                    <span>Idéal pour bien nourrir ses poissons sans prise de tête !</span>
                  </li>
                </ul>
              </div>
            </div>

            <div class="mt-6">
              <p><strong>💎 Box Premium (${formatPrice(premium.price)}) :</strong></p>
              <p class="text-sm text-gray-600 mb-2">${premium.description}</p>
              <p class="mt-2"><em>Valeur réelle des produits : <span class="text-primary font-semibold">${formatPrice(premium.totalValue)}</span></em></p>
              <p class="text-green-500 font-bold">✨ Économie réalisée : ${formatPrice(savingsPremium)} (${formatPrice(premium.totalValue - premium.price)} + ${formatPrice(shippingCost)} de livraison gratuite)</p>
              <ul class="space-y-2 list-inside mt-2">
                ${premium.products.map(p => `
                  <li class="product-item">
                    ${p.image ? `
                      <img src="${p.image}" alt="${p.title}" class="w-8 h-8 rounded-lg object-cover bg-gray-50" />
                    ` : premium.exclusive.includes(p.title) ? '<span class="product-bullet">✨</span>' : '<span class="product-bullet">•</span>'}
                    <span class="product-title">
                      ${p.title}
                      ${premium.exclusive.includes(p.title) ? 
                        '<span class="text-primary font-medium ml-1">(Exclusif)</span>' : 
                        ''}
                    </span>
                    <strong class="text-primary">${formatPrice(p.price)}</strong>
                  </li>
                `).join('')}
              </ul>

              <div class="bg-primary/5 rounded-xl p-3 mt-4">
                <p class="font-medium">🎉 Avantages Box Premium ce mois-ci :</p>
                <ul class="space-y-2 mt-2">
                  <li class="flex items-center gap-2">
                    <span>🎯</span>
                    <span>Valeur totale des produits : <strong class="text-primary">${formatPrice(premium.totalValue)}</strong></span>
                  </li>
                  <li class="flex items-center gap-2">
                    <span>💰</span>
                    <span>Tu économises : <strong class="text-primary">${formatPrice(savingsPremium)}</strong></span>
                  </li>
                  <li class="flex items-center gap-2">
                    <span>🚚</span>
                    <span>Livraison incluse (au lieu de <strong class="text-primary">${formatPrice(shippingCost)}</strong> si acheté séparément)</span>
                  </li>
                  <li class="flex items-center gap-2">
                    <span>🎁</span>
                    <span>Surprise exclusive collector</span>
                  </li>
                  <li class="flex items-center gap-2">
                    <span>⭐</span>
                    <span>Produit exclusif pour les abonnés premium</span>
                  </li>
                  <li class="flex items-center gap-2">
                    <span>🔄</span>
                    <span>Sans engagement</span>
                  </li>
                  <li class="flex items-center gap-2">
                    <span>🔥</span>
                    <span>Le must pour des poissons en pleine forme !</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        `,
        choices: [
          "En quoi consiste l'abonnement mensuel ?",
          "📩 Contactez-nous"
        ],
        timestamp: new Date()
      }]);
    }
  };

  const formatPrice = (price: number) => {
    return price.toFixed(2).replace('.', ',') + '€';
  };

  // Send message to Messenger
  const sendToMessenger = async (message: string) => {
    console.group('📤 Envoi à Messenger');
    
    // Utiliser l'email comme ID temporaire si pas d'ID Messenger
    const messageId = messengerUserId || userEmail || `temp_${Date.now()}`;
    console.log('👤 ID utilisé:', messageId);
    console.log('💬 Message:', message);
    console.log('⏰ Timestamp:', new Date().toISOString());

    try {
      console.log('🌐 Envoi à l\'API Netlify...');
      const response = await fetch('https://majemsiteteste.netlify.app/.netlify/functions/webhook/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientId: messageId,
          message
        })
      });

      console.log('📥 Réponse reçue:', response.status);
      const result = await response.json();
      console.log('📦 Données de réponse:', result);

      if (result.success) {
        console.log('✅ Message envoyé avec succès');
        setMessages(prev => [...prev, {
          id: result.message.id,
          type: 'user',
          content: message,
          timestamp: new Date(result.message.timestamp),
          from: 'chat',
          messengerUserId: messageId
        }]);
      } else {
        console.error('❌ Échec de l\'envoi:', result);
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi:', error);
    }
    console.groupEnd();
  };

  return (
    <>
      <MessengerOptIn messengerUserId={messengerUserId} userEmail={userEmail} />
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
          onClick={onClose}
        />

        {/* Chat Container */}
        <div className="relative w-full h-full bg-white rounded-t-2xl md:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-primary p-4 flex items-center justify-between sticky top-0 z-10">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                🐟
              </span>
              Chat avec AquaBot
            </h3>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
              aria-label="Fermer le chat"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex items-start gap-2 animate-fadeIn",
                  (message.type === 'user' || message.from === 'chat') && "flex-row-reverse"
                )}
              >
                {(message.type === 'bot' || message.type === 'messenger') && (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm">
                      {message.type === 'messenger' ? '💬' : '🐟'}
                    </span>
                  </div>
                )}
                
                <div className={cn(
                  "rounded-2xl p-3 max-w-[80%] shadow-sm",
                  message.type === 'bot' || message.type === 'messenger' 
                    ? "bg-white rounded-tl-none" 
                    : "bg-primary text-white rounded-tr-none"
                )}>
                  {message.type === 'bot' ? (
                    <div 
                      className="text-sm [&_ul]:pl-4 [&_li]:flex [&_li]:items-center [&_li]:gap-2"
                      dangerouslySetInnerHTML={{ __html: message.content }}
                    />
                  ) : (
                    <div className="text-sm">
                      <p>{message.content}</p>
                    </div>
                  )}

                  {/* Affichage de l'heure sous chaque message */}
                  {((message.type === 'messenger' || message.from === 'messenger' || 
                     (userEmail && (message.type === 'user' || message.type === 'bot'))) && message.timestamp) && (
                    <p className={cn(
                      "text-xs mt-1",
                      message.type === 'user' || message.from === 'chat' 
                        ? "text-white/90" 
                        : "text-primary/90"
                    )}>
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  )}
                  
                  {message.choices && !awaitingEmail && !awaitingQuestion && (
                    <div className="mt-4 space-y-2">
                      {message.choices.map((choice) => (
                        <button
                          key={choice}
                          onClick={() => handleChoice(choice)}
                          className={cn(
                            "w-full text-left px-4 py-2 rounded-xl transition-colors text-sm font-medium border",
                            choice === "📩 Contactez-nous"
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
            <div ref={messagesEndRef} />
          </div>

          {/* Input Container */}
          <div className="border-t p-4 bg-white shadow-lg sticky bottom-0">
            {lastActive && (
              <p className="text-xs text-center text-gray-500 mb-2">
                Dernière activité : {lastActive.toLocaleTimeString()}
              </p>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={awaitingEmail ? "Entrez votre email..." : awaitingQuestion ? "Posez votre question..." : "Écrivez votre message..."}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                disabled={!awaitingEmail && !awaitingQuestion}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleUserInput()}
              />
              <button
                className="bg-primary text-white px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 flex-shrink-0"
                disabled={!awaitingEmail && !awaitingQuestion}
                onClick={handleUserInput}
              >
                Envoyer
              </button>
            </div>
            {!awaitingEmail && !awaitingQuestion && !isConnected && (
              <p className="text-xs text-center mt-2 text-gray-500">
                Connexion au chat en cours...
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ChatWindow; 