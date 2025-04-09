import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import AdminChatModal from "./AdminChatModal";
import { Badge } from "@/components/ui/badge";
import { ChatMessage } from "@/types/supabase";

export const MessagesPanel = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [unreadMessages, setUnreadMessages] = useState<Set<string>>(new Set());

  const handleDelete = async (email: string) => {
    try {
      const { error } = await supabase
        .from("chatbot_messages")
        .delete()
        .eq("email", email);

      if (error) throw error;

      // Mettre à jour l'interface après la suppression
      setMessages((prev) => prev.filter((msg) => msg.email !== email));
      setUnreadMessages(prev => {
        const newSet = new Set(prev);
        newSet.delete(email);
        return newSet;
      });
    } catch (error) {
      console.error("Erreur lors de la suppression :", error);
    }
  };

  const handleChatClick = async (email: string) => {
    console.log('🔍 Recherche du chat_id pour:', email);
    
    try {
      // Récupérer le chat_id depuis client_chat_opened
      const { data: chatData, error: chatError } = await supabase
        .from('client_chat_opened')
        .select('chat_id')
        .eq('user_email', email)
        .maybeSingle();

      if (chatError) {
        console.error('❌ Erreur lors de la récupération du chat_id:', chatError);
        return;
      }

      if (!chatData?.chat_id) {
        console.error('❌ Pas de chat_id trouvé pour:', email);
        return;
      }

      console.log('✅ chat_id trouvé:', chatData.chat_id);
      setSelectedEmail(email);
      setSelectedChatId(chatData.chat_id);
      
      // Marquer les messages comme lus
      const { error } = await supabase
        .from("chatbot_messages")
        .update({ read: true })
        .eq("email", email)
        .eq("sender", "user")
        .eq("read", false);

      if (!error) {
        // Mettre à jour l'état local
        setUnreadMessages(prev => {
          const newSet = new Set(prev);
          newSet.delete(email);
          return newSet;
        });
      }
    } catch (error) {
      console.error("❌ Erreur lors de la mise à jour des messages :", error);
    }
  };

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from("chatbot_messages")
          .select("*")
          .order("timestamp", { ascending: false });

        if (error) throw error;

        if (data) {
          // Regrouper les messages par email et garder le plus récent
          const latestMessages = data.reduce((acc: ChatMessage[], curr) => {
            // Si on n'a pas encore de message pour cet email, on l'ajoute
            if (!acc.find(msg => msg.email === curr.email)) {
              acc.push(curr);
            }
            return acc;
          }, []);

          setMessages(latestMessages);

          // Identifier les messages non lus
          const unread = new Set<string>(
            data
              .filter(msg => msg.sender === 'user' && !msg.read)
              .map(msg => msg.email)
          );
          setUnreadMessages(unread);
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des messages :", error);
      }
    };

    fetchMessages();

    // Souscrire aux changements en temps réel
    const channel = supabase
      .channel('messages_panel_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chatbot_messages'
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  return (
    <Card className="mt-8">
      <CardContent>
        <h2 className="text-xl font-semibold mb-4">Messages reçus via chatbot 🤖</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Dernier message</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {messages.map((msg) => (
              <TableRow key={msg.id}>
                <TableCell className="flex items-center gap-2">
                  {msg.email}
                  {unreadMessages.has(msg.email) && (
                    <Badge variant="destructive" className="ml-2">
                      Nouveau
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{msg.message}</TableCell>
                <TableCell>{new Date(msg.timestamp).toLocaleString()}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleChatClick(msg.email)}
                  >
                    Chat 💬
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => handleDelete(msg.email)}
                  >
                    Supprimer 🗑
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      {selectedEmail && selectedChatId && (
        <AdminChatModal
          isOpen={true}
          onClose={() => {
            setSelectedEmail(null);
            setSelectedChatId(null);
          }}
          userEmail={selectedEmail}
          chatId={selectedChatId}
        />
      )}
    </Card>
  );
};
