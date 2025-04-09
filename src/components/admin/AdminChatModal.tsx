import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { ChatMessage } from "@/types/supabase";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { X } from 'lucide-react';

interface AdminChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  chatId: string;
}

const AdminChatModal: React.FC<AdminChatModalProps> = ({ isOpen, onClose, userEmail, chatId }) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen && chatId) {
      fetchMessages();
    }
  }, [isOpen, chatId]);

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

      if (error) {
        console.error('❌ Erreur lors de la récupération des messages:', error);
        return;
      }

      if (data) {
        setMessages(data);
        
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

  useEffect(() => {
    if (isOpen && chatId) {
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
                // Vérifier si le message existe déjà
                if (prev.find(m => m.id === msg.id)) {
                  console.log('⚠️ Message déjà présent, ignoré');
                  return prev;
                }
                console.log('✅ Ajout du nouveau message');
                return [...prev, msg];
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
    }
  }, [isOpen, chatId]);

  // Cleanup lors de la fermeture du chat
  useEffect(() => {
    return () => {
      const cleanup = async () => {
        if (subscriptionRef.current) {
          subscriptionRef.current.unsubscribe();
        }

        console.log('🧹 Nettoyage du chat pour:', userEmail);

        // Supprimer l'entrée de la table admin_chat_opened
        try {
          const { error } = await supabase
            .from('admin_chat_opened')
            .delete()
            .eq('user_email', userEmail)
            .select();

          if (error) {
            console.error('❌ Erreur lors de la suppression de la session de chat:', error);
          } else {
            console.log('✅ Session de chat supprimée');
          }
        } catch (error) {
          console.error('❌ Erreur lors du nettoyage:', error);
        }
      };

      cleanup();
    };
  }, [userEmail]);

  useEffect(() => {
    // Scroll vers le bas à chaque nouveau message
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() && uploadedImages.length === 0) return;

    try {
      // Envoyer le message texte à Supabase d'abord
      if (newMessage.trim()) {
        console.log('📤 Envoi du message admin:', {
          email: userEmail,
          chat_id: chatId,
          message: newMessage,
          timestamp: new Date().toISOString()
        });

        const message = {
          email: userEmail,
          chat_id: chatId,
          message: newMessage,
          timestamp: new Date().toISOString(),
          sender: 'admin',
          read: true
        };

        const { data, error } = await supabase
          .from('chatbot_messages')
          .insert([message])
          .select('*')
          .single();

        if (error) {
          console.error('❌ Erreur lors de l\'insertion du message:', error);
          throw error;
        }
        if (data) {
          console.log('🟢 Message admin inséré avec succès:', data);
          setMessages(prev => [...prev, data]);
          setNewMessage("");

          // ✅ Appel vers la fonction Edge pour déclencher Omnisend
          console.group('📤 Appel à la fonction Edge notify_user_on_admin_reply');
          
          // Attendre 1 seconde pour que Supabase ait fini la mise à jour de client_has_replied_since_last_admin
          await new Promise(res => setTimeout(res, 1000));
          
          try {
            console.log('🔍 Préparation de la requête:', {
              email: userEmail,
              chat_id: chatId,
              messageLength: newMessage.length,
              timestamp: new Date().toISOString()
            });

            // 👇 Ping activité client pour mettre à jour updated_at (évite faux positifs)
            try {
              const now = new Date().toISOString();
              const { error: pingError } = await supabase
                .from('client_chat_opened')
                .update({ updated_at: now })
                .eq('chat_id', chatId);

              if (pingError) {
                console.warn("⚠️ Ping d'activité échoué (mais on continue):", pingError);
              } else {
                console.log("📡 Ping d'activité effectué avec succès pour", userEmail);
              }
            } catch (e) {
              console.warn("⚠️ Erreur inattendue pendant le ping (ignorée):", e);
            }

            const { data: responseData, error: invokeError } = await supabase.functions.invoke('notify_user_on_admin_reply', {
              body: {
                record: {
                  email: userEmail,
                  chat_id: chatId,
                  message: newMessage,
                  sender: "admin",
                  id: data.id // On passe l'ID du message qui vient d'être créé
                }
              }
            });

            if (invokeError) {
              console.error("❌ Erreur lors de l'appel à la fonction Edge:", invokeError);
              
              toast({
                title: "❌ Échec de l'envoi d'email",
                description: "Impossible d'envoyer l'email de notification au client. Veuillez réessayer.",
                variant: "destructive",
                duration: 5000
              });
            } else {
              console.log("✅ Fonction Edge appelée avec succès:", responseData);
              
              toast({
                title: "✅ Email envoyé",
                description: "Le client a été notifié par email de votre réponse.",
                duration: 3000
              });
            }
          } catch (err) {
            console.error("❌ Erreur d'appel à la fonction Edge:", {
              error: err,
              message: err instanceof Error ? err.message : "Erreur inconnue"
            });
          } finally {
            console.groupEnd();
          }
        }
      }

      // Gérer l'upload des images si présentes
      if (uploadedImages.length > 0) {
        console.log('📤 Upload de', uploadedImages.length, 'image(s)');
        for (const file of uploadedImages) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
          
          console.log('📤 Upload de l\'image:', fileName);
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("public-images")
            .upload(`chat_images/${fileName}`, file);

          if (uploadError) {
            console.error('❌ Erreur lors de l\'upload de l\'image:', uploadError);
            throw uploadError;
          }

          const publicURL = supabase.storage
            .from("public-images")
            .getPublicUrl(`chat_images/${fileName}`).data.publicUrl;

          console.log('✅ Image uploadée avec succès:', publicURL);

          // Sauvegarder dans Supabase
          console.log('📤 Envoi du message image admin');
          const { data: messageData, error: messageError } = await supabase
            .from('chatbot_messages')
            .insert({
              email: userEmail,
              chat_id: chatId,
              message: publicURL,
              timestamp: new Date().toISOString(),
              sender: 'admin',
              read: true
            })
            .select('*')
            .single();

          if (messageError) {
            console.error('❌ Erreur lors de l\'insertion du message image:', messageError);
            throw messageError;
          }
          if (messageData) {
            console.log('🟢 Message image admin inséré avec succès:', messageData);
            setMessages(prev => [...prev, messageData]);
          }
        }
        setUploadedImages([]);
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi du message:', error);
    }
  };

  // Amélioration du scroll
  useEffect(() => {
    const shouldScroll = messagesContainerRef.current && 
      messagesContainerRef.current.scrollHeight - messagesContainerRef.current.scrollTop === messagesContainerRef.current.clientHeight;
    
    if (shouldScroll) {
      scrollToBottom();
    }
  }, [messages]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl h-[600px] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">Chat avec {userEmail}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex items-start gap-2",
                message.sender === 'admin' && "flex-row-reverse"
              )}
            >
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm">
                  {message.sender === 'admin' ? '👨‍💼' : '👤'}
                </span>
              </div>
              
              <div className={cn(
                "rounded-2xl p-3 max-w-[80%] shadow-sm space-y-1",
                message.sender === 'admin' 
                  ? "bg-primary text-white rounded-tr-none" 
                  : "bg-white rounded-tl-none"
              )}>
                {message.message.match(/\.(jpeg|jpg|png|gif|webp)$/i) && message.message.startsWith("http") ? (
                  <img
                    src={message.message}
                    alt="Image envoyée"
                    className="max-w-xs rounded-lg shadow"
                  />
                ) : (
                  <p className="text-sm">{message.message}</p>
                )}
                <p className={cn(
                  "text-xs",
                  message.sender === 'admin' 
                    ? "text-white/80" 
                    : "text-gray-500"
                )}>
                  {formatDate(message.timestamp)}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              placeholder="Écrivez votre message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!newMessage.trim() && uploadedImages.length === 0}
            >
              Envoyer
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <label
              htmlFor="admin-image-upload"
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl transition-colors text-sm font-medium border cursor-pointer",
                "bg-white text-primary border-primary/20 hover:bg-primary/5"
              )}
            >
              <span>📎</span>
              <span>Ajouter des images</span>
            </label>
            <input
              id="admin-image-upload"
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
        </div>
      </div>
    </div>
  );
};

export default AdminChatModal; 