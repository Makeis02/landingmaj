const axios = require("axios");

// Configuration CORS
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json"
};

// Stockage temporaire des messages
let messages = [
  {
    id: "1",
    type: "bot",
    content: "Bonjour ! 😊 Je suis AquaBot, ton assistant. Comment puis-je t'aider ?",
    timestamp: new Date().toISOString(),
    from: "chat"
  }
];

// Stockage des associations email-ID Messenger
const messengerLinks = {};

// Fonction utilitaire pour les logs
const log = {
  request: (event) => {
    console.log("REQUEST: New incoming request");
    console.log("Method:", event.httpMethod);
    console.log("Path:", event.path);
    console.log("Query Params:", event.queryStringParameters);
    console.log("Headers:", JSON.stringify(event.headers, null, 2));
    if (event.body) {
      try {
        const parsedBody = JSON.parse(event.body);
        console.log("Body:", JSON.stringify(parsedBody, null, 2));
        
        // Log spécifique pour les messages Facebook
        if (parsedBody.object === 'page') {
          console.log("Facebook Message:");
          console.log("Type:", parsedBody.object);
          console.log("Entries:", parsedBody.entry.length);
          parsedBody.entry.forEach((entry, index) => {
            console.log(`Entry ${index + 1}:`);
            console.log("Timestamp:", entry.time);
            console.log("Messaging:", entry.messaging[0]);
          });
        }
      } catch (e) {
        console.log("Body (raw):", event.body);
      }
    }
  },
  
  error: (error, context = '') => {
    console.error("ERROR:", context);
    console.error("Message:", error.message);
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", JSON.stringify(error.response.data, null, 2));
      console.error("Headers:", JSON.stringify(error.response.headers, null, 2));
    }
    console.error("Stack:", error.stack);
  },

  success: (message, data = null) => {
    console.log("SUCCESS:", message);
    if (data) {
      console.log("Data:", JSON.stringify(data, null, 2));
    }
  }
};

// Fonction utilitaire pour les réponses
const createResponse = (statusCode, body, headers = {}) => {
  const response = {
    statusCode,
    headers: { ...corsHeaders, ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body)
  };
  
  log.success(`Response created: ${statusCode}`, response);
  return response;
};

// Fonction pour générer un ID temporaire
function generateTemporaryId(email) {
  const hash = require('crypto').createHash('md5').update(email).digest('hex');
  return `temp_${hash.substring(0, 8)}`;
}

// Fonction pour envoyer un message à Messenger
async function sendMessageToMessenger(recipientId, messageText) {
  console.log("Messenger: Starting message send");
  console.log("Messenger: Recipient ID:", recipientId);
  console.log("Messenger: Message:", messageText);

  const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
  const PAGE_ID = process.env.NEXT_PUBLIC_FACEBOOK_PAGE_ID;

  console.log("Messenger: Environment variables check");
  console.log("Messenger: PAGE_ACCESS_TOKEN present:", !!PAGE_ACCESS_TOKEN);
  console.log("Messenger: PAGE_ID present:", !!PAGE_ID);

  if (!PAGE_ACCESS_TOKEN) {
    console.error("Messenger: PAGE_ACCESS_TOKEN is missing!");
    log.error(new Error('PAGE_ACCESS_TOKEN missing'), 'Configuration');
    return false;
  }

  if (!PAGE_ID) {
    console.error("Messenger: PAGE_ID is missing!");
    console.log("Messenger: WARNING: PAGE_ID not defined in environment variables");
  }

  // Vérifie l'association email-tempID avec sender ID
  const finalRecipientId = messengerLinks[recipientId] || 
    (recipientId.startsWith('temp_') ? PAGE_ID : recipientId);

  console.log("Messenger: Final recipient ID:", finalRecipientId);

  if (messengerLinks[recipientId]) {
    console.log(`Messenger: Mapping found: ${recipientId} → ${finalRecipientId}`);
  } else if (recipientId.startsWith('temp_')) {
    console.log(`Messenger: WARNING: No mapping found for ${recipientId}, falling back to PAGE_ID`);
  }

  const url = `https://graph.facebook.com/v13.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;
  const payload = {
    recipient: { id: finalRecipientId },
    message: { text: messageText }
  };

  console.log("Messenger: Preparing API request");
  console.log("Messenger: URL:", url);
  console.log("Messenger: Payload:", JSON.stringify(payload, null, 2));

  // Debug logs pour les variables d'environnement et données
  console.log('🔐 PAGE_ACCESS_TOKEN:', process.env.PAGE_ACCESS_TOKEN);
  console.log('📘 PAGE_ID (NEXT_PUBLIC_FACEBOOK_PAGE_ID):', process.env.NEXT_PUBLIC_FACEBOOK_PAGE_ID);
  console.log('🎯 Recipient utilisé (finalRecipientId):', finalRecipientId);
  console.log('📦 Payload envoyé à l\'API Messenger:', JSON.stringify(payload, null, 2));

  // Logs de débogage supplémentaires
  console.log('🧪 DEBUG: PAGE_ACCESS_TOKEN:', PAGE_ACCESS_TOKEN);
  console.log('🧪 DEBUG: PAGE_ID:', PAGE_ID);
  console.log('🧪 DEBUG: Final recipient ID:', finalRecipientId);
  console.log('🧪 DEBUG: Payload:', JSON.stringify(payload, null, 2));

  try {
    console.log("Messenger: Sending request to Facebook API...");
    const response = await axios.post(url, payload);
    console.log("Messenger: Response received");
    console.log("Messenger: Status:", response.status, response.statusText);
    console.log("Messenger: Data:", JSON.stringify(response.data, null, 2));

    log.success(`Message sent to ${finalRecipientId}`);
    return true;
  } catch (error) {
    console.error("Messenger: Axios POST failed");
    if (error.response) {
      console.error("Messenger: HTTP Code:", error.response.status);
      console.error("Messenger: Error response:", JSON.stringify(error.response.data, null, 2));
      console.error("Messenger: Error headers:", JSON.stringify(error.response.headers, null, 2));
    } else {
      console.error("Messenger: Unknown error (no response)");
    }

    log.error(error, 'sendMessageToMessenger');
    return false;
  }
}

exports.handler = async function (event) {
  // Log de la requête entrante
  log.request(event);

  // Gestion des requêtes OPTIONS pour CORS
  if (event.httpMethod === "OPTIONS") {
    log.success('OPTIONS request handled');
    return createResponse(200, "");
  }

  try {
    // Route GET /messages pour récupérer les messages
    if (event.httpMethod === "GET" && event.path.endsWith("/messages")) {
      console.log("Messages retrieval:");
      console.log("Number of messages:", messages.length);
      console.log("Messages:", JSON.stringify(messages, null, 2));
      return createResponse(200, messages);
    }

    // Vérification du webhook Facebook
    if (event.httpMethod === "GET") {
      console.log("Facebook Webhook verification");
      const params = new URLSearchParams(event.queryStringParameters);
      const mode = params.get("hub.mode");
      const token = params.get("hub.verify_token");
      const challenge = params.get("hub.challenge");

      console.log("Parameters:", { mode, token, challenge });
      console.log("VERIFY_TOKEN configured:", !!process.env.VERIFY_TOKEN);

      if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
        log.success('Webhook validated successfully');
        return createResponse(200, challenge);
      } else {
        log.error(new Error('Webhook validation failed'), 'Verification');
        return createResponse(403, "Verification failed");
      }
    }

    // Traitement des messages Facebook
    if (event.httpMethod === "POST") {
      console.log("POST: Starting message processing");
      console.log("POST: Raw body:", event.body);
      
      let body;
      try {
        body = JSON.parse(event.body);
        console.log("POST: Body parsed successfully");
        console.log("POST: Parsed body:", JSON.stringify(body, null, 2));
        console.log("POST: Body type:", typeof body);
        console.log("POST: Body keys:", Object.keys(body));
        console.log("POST: recipientId present:", !!body.recipientId);
        console.log("POST: message present:", !!body.message);
        console.log("POST: recipientId value:", body.recipientId);
        console.log("POST: message value:", body.message);
      } catch (parseError) {
        console.error("POST: Error parsing body:", parseError);
        console.error("POST: Raw body that failed:", event.body);
        return createResponse(400, { error: "Invalid JSON body" });
      }

      // Gestion des messages du frontend
      if (body.recipientId && body.message) {
        console.log("POST: Frontend message detected");
        console.log("POST: Recipient ID:", body.recipientId);
        console.log("POST: Message content:", body.message);

        // Générer un ID temporaire si nécessaire
        const messageId = body.recipientId.startsWith('temp_') 
          ? body.recipientId 
          : generateTemporaryId(body.recipientId);

        console.log("POST: Generated/Using message ID:", messageId);

        const newMessage = {
          id: Date.now().toString(),
          type: "user",
          content: body.message,
          timestamp: new Date().toISOString(),
          from: "chat",
          messengerUserId: messageId
        };

        console.log("POST: Storing message:", JSON.stringify(newMessage, null, 2));
        messages.push(newMessage);

        console.log("POST: Calling sendMessageToMessenger...");
        const success = await sendMessageToMessenger(messageId, body.message);
        console.log("POST: sendMessageToMessenger completed. Success:", success);
        
        if (!success) {
          console.error("POST: Message send failed");
          log.error(new Error('Message send failed'), 'Frontend Message');
          return createResponse(500, { success: false, error: "Error sending message" });
        }

        console.log("POST: Message processed successfully");
        log.success('Frontend message processed successfully');
        return createResponse(200, { 
          success: true, 
          message: newMessage 
        });
      }

      // Gestion des messages Facebook
      if (body.object === "page") {
        for (const entry of body.entry) {
          const webhookEvent = entry.messaging[0];
          if (!webhookEvent) {
            console.log("WARNING: No message in entry");
            continue;
          }

          // Traitement des referrals pour l'association email-ID
          if (webhookEvent.referral && webhookEvent.referral.ref) {
            const ref = webhookEvent.referral.ref;
            console.log("Referral detected:", ref);
            
            if (ref.startsWith("email=")) {
              const email = ref.split("email=")[1];
              const tempId = `temp_${require('crypto').createHash('md5').update(email).digest('hex').substring(0, 8)}`;
              messengerLinks[tempId] = webhookEvent.sender.id;
              console.log(`Messenger link associated: ${tempId} ↔ ${webhookEvent.sender.id}`);
              console.log("Email associated:", email);
            }
          }

          const senderId = webhookEvent.sender.id;
          const messageText = webhookEvent.message?.text;

          console.log("Sender ID:", senderId);
          console.log("Message received:", messageText);
          console.log("Complete event:", JSON.stringify(webhookEvent, null, 2));

          if (messageText) {
            const newMessage = {
              id: Date.now().toString(),
              type: "messenger",
              content: messageText,
              timestamp: new Date().toISOString(),
              from: "messenger",
              messengerUserId: senderId
            };

            console.log("Message stored with Messenger ID:", senderId);
            console.log("New message:", JSON.stringify(newMessage, null, 2));
            messages.push(newMessage);

            if (messages.length > 100) {
              console.log("Cleaning up old messages");
              messages = messages.slice(-100);
            }

            log.success('Message processed successfully');
            return createResponse(200, "EVENT_RECEIVED");
          }
        }
        log.success('Processing completed without message');
        return createResponse(200, "EVENT_RECEIVED");
      }
    }

    log.error(new Error('Method not allowed'), 'Validation');
    return createResponse(405, "Method not allowed");

  } catch (error) {
    log.error(error, 'General Processing');
    return createResponse(500, "Internal server error");
  }
};
