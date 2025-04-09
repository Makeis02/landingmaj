import { Button } from "@/components/ui/button";
import { ArrowRight, Copy, CheckCheck } from "lucide-react";
import { EditableText } from "@/components/EditableText";
import { EditableURL } from "@/components/EditableURL";
import { useState, FormEvent, useEffect } from "react";
import { useEditStore } from "@/stores/useEditStore";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { subscribeToNewsletter } from "@/integrations/shopify/client";
import { useQuery } from "@tanstack/react-query";

const Cta = () => {
  const { isEditMode } = useEditStore();
  const [buttonUrl, setButtonUrl] = useState("#subscribe");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPromoCode, setShowPromoCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isLocalSuccess, setIsLocalSuccess] = useState(false);
  const { toast } = useToast();

  const [promoCode, setPromoCode] = useState("AQUA20");

  // Récupération des URLs des boutons depuis Supabase
  const { data: buttonData } = useQuery({
    queryKey: ["button-content"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("editable_content")
        .select("content_key, content")
        .in("content_key", [
          "pricing_button_1_text",
          "pricing_button_1_url",
          "pricing_button_2_text",
          "pricing_button_2_url",
          "cta_button_text_discovery",
          "pricing_button_3_url"
        ]);

      if (error) {
        console.error("❌ Erreur de récupération des boutons :", error);
        return {};
      }

      return data?.reduce((acc, item) => {
        acc[item.content_key] = item.content;
        return acc;
      }, {}) || {};
    },
  });

  // Log l'état du composant au chargement pour le débogage
  useEffect(() => {
    console.log("📋 CTA component mounted", {
      isEditMode,
      showPromoCode,
      isLocalSuccess,
      url: window.location.href
    });
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Log le début de l'action avec timestamp
    const startTime = Date.now();
    console.log(`⏱️ [${new Date().toISOString()}] DÉBUT soumission du formulaire d'inscription`);
    console.log(`Informations de contexte:`, {
      email,
      isEditMode,
      url: window.location.href,
      userAgent: navigator.userAgent
    });
    
    if (!email || !email.includes('@') || !email.includes('.')) {
      console.log(`❌ Validation email échouée: ${email}`);
      toast({
        title: "Email invalide",
        description: "Veuillez entrer une adresse email valide",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    console.log(`✅ Email validé: ${email}`);

    try {
      // 1. Log l'email pour le debug avec timestamp
      console.log(`📧 [${new Date().toISOString()}] Tentative d'inscription newsletter pour: ${email}`);
      
      // Vérification de l'état de la connexion
      console.log("État de la connexion:", navigator.onLine ? "En ligne" : "Hors ligne");
      
      // 2. Utilisation du service d'intégration Shopify via l'Edge Function
      console.log("⚡ Appel du service d'intégration Shopify...");
      const callStartTime = Date.now();
      
      const result = await subscribeToNewsletter(email);
      
      const callEndTime = Date.now();
      console.log(`⏱️ Appel à subscribeToNewsletter terminé en ${callEndTime - callStartTime}ms`);
      console.log("📊 Résultat de l'inscription:", result);
      
      // 3. Si l'inscription a réussi ou que l'email a été au moins enregistré localement
      if (result.success || result.message?.includes("localement") || result.message?.includes("déjà enregistré")) {
        // Ajout d'un enregistrement de succès au niveau local
        try {
          console.log("📝 Enregistrement du succès dans Supabase");
          const { error } = await supabase
            .from('newsletter_subscribers')
            .upsert([{ 
              email, 
              status: 'success_from_form',
              updated_at: new Date().toISOString() 
            }], {
              onConflict: 'email'
            });
            
          if (error) {
            console.error("❌ Erreur lors de l'enregistrement du succès:", error);
          } else {
            console.log("✅ Succès enregistré dans Supabase");
            setIsLocalSuccess(true);
          }
        } catch (error) {
          console.error("❌ Exception lors de l'enregistrement du succès:", error);
        }
        
        console.log("🎉 Affichage du toast de succès et du code promo");
        toast({
          title: "Inscription réussie !",
          description: "Votre code promo est disponible ci-dessous.",
        });
        
        setShowPromoCode(true);
        setEmail("");
      } else {
        console.error("❌ Échec de l'inscription:", result.message);
        
        // Tentative d'enregistrement local comme filet de sécurité
        try {
          console.log("🔄 Tentative d'enregistrement local comme filet de sécurité");
          const { error } = await supabase
            .from('newsletter_subscribers')
            .upsert([{ 
              email, 
              status: 'fallback_save',
              updated_at: new Date().toISOString() 
            }], {
              onConflict: 'email'
            });
            
          if (error) {
            console.error("❌ Erreur lors de l'enregistrement de secours:", error);
          } else {
            console.log("✅ Email enregistré localement malgré l'erreur");
            toast({
              title: "Votre email a été enregistré",
              description: "Voici votre code promo",
            });
            
            setShowPromoCode(true);
            setEmail("");
            return;
          }
        } catch (fallbackError) {
          console.error("❌ Exception lors de l'enregistrement de secours:", fallbackError);
        }
        
        console.log("❌ Affichage du toast d'erreur");
        toast({
          title: "Erreur lors de l'inscription",
          description: result.message || "Veuillez réessayer ultérieurement",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("❌ ERREUR GLOBALE lors de l'inscription:", error);
      console.error("Message:", error instanceof Error ? error.message : String(error));
      console.error("Stack:", error instanceof Error ? error.stack : "Non disponible");
      
      // Tentative d'enregistrement local comme dernière chance
      try {
        console.log("🆘 Tentative d'enregistrement local comme dernière chance");
        await supabase
          .from('newsletter_subscribers')
          .upsert([{ 
            email, 
            status: 'last_chance_save',
            error_message: error instanceof Error ? error.message : String(error),
            updated_at: new Date().toISOString() 
          }], {
            onConflict: 'email'
          });
          
        console.log("✅ Email enregistré localement en dernier recours");
        toast({
          title: "Votre email a été enregistré",
          description: "Voici votre code promo",
        });
        
        setShowPromoCode(true);
        setEmail("");
      } catch (lastChanceError) {
        console.error("❌ Erreur lors de l'enregistrement de dernier recours:", lastChanceError);
        
        toast({
          title: "Erreur lors de l'inscription",
          description: "Une erreur s'est produite. Veuillez réessayer ultérieurement",
          variant: "destructive"
        });
      }
    } finally {
      const endTime = Date.now();
      console.log(`⏱️ [${new Date().toISOString()}] FIN du processus d'inscription (durée: ${endTime - startTime}ms)`);
      console.log(`État final:`, {
        showPromoCode,
        isLocalSuccess
      });
      setIsLoading(false);
    }
  };

  const copyPromoCode = () => {
    navigator.clipboard.writeText(promoCode);
    setCopied(true);
    toast({
      title: "Code copié !",
      description: "Le code promo a été copié dans votre presse-papiers",
    });
    
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  // En mode développement, permettre de basculer facilement l'affichage
  const togglePromoDisplay = () => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔄 Basculement manuel de l'affichage promo: ${!showPromoCode}`);
      setShowPromoCode(!showPromoCode);
    }
  };

  // Callback pour mettre à jour le code promo lorsqu'il est modifié via EditableText
  const handlePromoCodeUpdate = (newPromoCode: string) => {
    setPromoCode(newPromoCode);
  };

  // Define the buttons array for cleaner rendering
  const ctaButtons = [
    {
      key: "cta_button_text_survie",
      urlKey: "pricing_button_1_url",
      defaultText: "Choisir Pack Survie",
      testid: "subscribe-button-survie",
      logText: "Pack Survie"
    },
    {
      key: "cta_button_text_basic",
      urlKey: "pricing_button_2_url",
      defaultText: "Choisir Pack Basic",
      testid: "subscribe-button-basic",
      logText: "Pack Basic"
    },
    {
      key: "cta_button_text_premium",
      urlKey: "pricing_button_3_url",
      defaultText: "Choisir Pack Premium",
      testid: "subscribe-button-premium",
      logText: "Pack Premium"
    }
  ];

  return (
    <section className="py-20 px-4 bg-primary text-white" id="subscribe">
      <div className="container mx-auto max-w-4xl text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-6" onClick={togglePromoDisplay}>
          <EditableText
            contentKey="cta_title"
            initialContent="Rejoins les passionnés, reçois ton pack dès maintenant ! 🎁"
            className="inline"
          />
        </h2>
        <p className="text-xl mb-8 text-primary-foreground/90">
          <EditableText
            contentKey="cta_subtitle"
            initialContent="Profite de -20% sur ton premier mois avec le code AQUA20"
            className="inline"
          />
        </p>
        
        {!showPromoCode ? (
          <div className="max-w-md mx-auto">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  type="email"
                  placeholder="Ton email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/60 h-12"
                  data-testid="newsletter-email-input"
                />
              </div>
              <Button 
                type="submit"
                size="lg" 
                variant="secondary" 
                className="text-lg px-8 w-full"
                disabled={isLoading}
                data-testid="newsletter-submit-button"
              >
                {isLoading ? "Inscription en cours..." : "Obtenir mon code promo"}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </form>
            {/* Statut de debug en développement - uniquement visible en mode édition */}
            {isEditMode && (
              <div className="mt-4 text-sm text-white/70 p-2 bg-white/10 rounded">
                <p>Status: {isLoading ? "Chargement" : "Prêt"}</p>
                <p>Local success: {isLocalSuccess ? "Oui" : "Non"}</p>
                <p>URL: {window.location.href}</p>
                <button 
                  className="text-xs underline mt-1" 
                  onClick={() => setShowPromoCode(true)}
                  data-testid="dev-show-promo"
                >
                  [DEV] Afficher code promo
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white/10 p-6 rounded-lg max-w-md mx-auto">
            <p className="text-lg mb-2">Votre code promo :</p>
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="bg-white/20 py-3 px-6 rounded-lg text-2xl font-bold tracking-wider">
                {isEditMode ? (
                  <EditableText
                    contentKey="promo_code"
                    initialContent={promoCode}
                    className="inline bg-primary/50 px-1 rounded"
                    onUpdate={handlePromoCodeUpdate}
                  />
                ) : (
                  promoCode
                )}
              </div>
              <Button
                variant="secondary"
                size="icon"
                onClick={copyPromoCode}
                className="h-12 w-12"
                data-testid="copy-promo-button"
              >
                {copied ? <CheckCheck className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
              </Button>
            </div>
            <p className="text-sm opacity-80 mb-4">
              <EditableText
                contentKey="promo_description"
                initialContent="Utilisez ce code lors de votre achat pour bénéficier de -20% sur votre premier mois."
                className={isEditMode ? "inline bg-primary/50 px-1 rounded" : "inline"}
              />
            </p>
            {/* Use map to render buttons dynamically and add flex-wrap */}
            <div className="flex flex-wrap justify-center gap-3 w-full animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
              {ctaButtons.map(({ key, urlKey, defaultText, testid, logText }) => (
                <Button
                  key={key}
                  size="default"
                  variant="secondary"
                  className="inline-flex items-center justify-center px-4 py-2 text-base whitespace-nowrap hover:scale-105 transition-transform duration-300"
                  onClick={() => {
                    if (!isEditMode) {
                      console.log(`🔗 Navigation vers ${logText}`);
                      const url = buttonData?.[urlKey]?.startsWith("http")
                        ? buttonData[urlKey]
                        : `http://${buttonData?.[urlKey] || "#"}`;
                      window.location.href = url;
                    }
                  }}
                  data-testid={testid}
                >
                  <EditableText
                    contentKey={key}
                    initialContent={defaultText}
                    className={isEditMode ? "inline bg-primary/50 px-1 rounded" : "inline"}
                  />
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ))}
            </div>
            
            {/* Option pour revenir en arrière en mode dev - uniquement visible en mode édition */}
            {isEditMode && (
              <button 
                className="text-xs underline mt-4 block mx-auto" 
                onClick={() => {
                  console.log("🔄 Retour au formulaire");
                  setShowPromoCode(false);
                }}
                data-testid="dev-back-to-form"
              >
                [DEV] Retour au formulaire
              </button>
            )}
          </div>
        )}
        
        {isEditMode && (
          <EditableURL
            contentKey="cta_button_url"
            initialContent={buttonUrl}
            onUpdate={setButtonUrl}
            className="mt-2"
          />
        )}
      </div>
    </section>
  );
};

export default Cta;
