export type ChatMessage = {
  id: string;
  email: string;
  chat_id: string;
  message: string;
  sender: 'user' | 'admin';
  timestamp: string;
  read: boolean;
};

export type Database = {
  public: {
    Tables: {
      chatbot_messages: {
        Row: ChatMessage;
        Insert: Omit<ChatMessage, 'id'>;
        Update: Partial<Omit<ChatMessage, 'id'>>;
      };
    };
  };
}; 