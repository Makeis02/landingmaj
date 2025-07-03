import { useState, FormEvent } from "react";
import { Mail, ArrowRight } from "lucide-react";
import { Button } from "./ui/button";
import { EditableText } from "./EditableText";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { subscribeToNewsletter } from "@/integrations/shopify/client";

const NewsletterSection = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !validateEmail(email)) {
      toast({
        title: "Email invalide",
        description: "Veuillez entrer une adresse email valide",
        variant: "destructive"
      });
      return;
    }
    setIsLoading(true);
    try {
      const result = await subscribeToNewsletter(email);
      if (result.success || result.message?.includes("localement") || result.message?.includes("déjà enregistré")) {
        try {
          await supabase
            .from('newsletter_subscribers')
            .upsert([{ 
              email, 
              status: 'success_from_form',
              updated_at: new Date().toISOString() 
            }], {
              onConflict: 'email'
            });
          toast({
            title: "Inscription réussie !",
            description: "Merci de vous être inscrit à notre newsletter.",
          });
          setEmail("");
        } catch (error) {
          console.error("Erreur lors de l'enregistrement:", error);
        }
      } else {
        try {
          await supabase
            .from('newsletter_subscribers')
            .upsert([{ 
              email, 
              status: 'fallback_save',
              updated_at: new Date().toISOString() 
            }], {
              onConflict: 'email'
            });
          toast({
            title: "Votre email a été enregistré",
            description: "Merci de vous être inscrit à notre newsletter.",
          });
          setEmail("");
        } catch (error) {
          console.error("Erreur lors de l'enregistrement de secours:", error);
          toast({
            title: "Erreur lors de l'inscription",
            description: "Veuillez réessayer ultérieurement",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error("Erreur lors de l'inscription:", error);
      toast({
        title: "Erreur lors de l'inscription",
        description: "Une erreur s'est produite. Veuillez réessayer ultérieurement",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="py-20 bg-gradient-to-br from-[#0074b3] via-[#005a8c] to-[#004d77] relative overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-20"></div>
      <div className="absolute inset-0 bg-cover bg-center opacity-10" 
           style={{backgroundImage: "url('https://images.unsplash.com/photo-1559827260-dc66d52bef19?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')"}}></div>
      <div className="relative container mx-auto px-4 text-center">
        <div className="max-w-4xl mx-auto text-white">
          <Mail className="w-16 h-16 mx-auto mb-6" style={{ color: '#ffffff' }} />
          <h2 className="text-4xl font-bold mb-6">
            <EditableText
              contentKey="newsletter_title"
              initialContent="Restez Connecté à l'Univers Aquatique"
              className="text-white"
            />
          </h2>
          <p className="text-xl mb-10 text-blue-100 leading-relaxed">
            <EditableText
              contentKey="newsletter_subtitle"
              initialContent="Recevez nos conseils d'experts, offres exclusives et nouveautés directement dans votre boîte mail"
              className="text-blue-100"
            />
          </p>
          <div className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto mb-6">
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 w-full">
              <input 
                type="email" 
                placeholder="Votre adresse email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-6 py-4 rounded-xl text-gray-900 placeholder-gray-500 text-lg focus:outline-none focus:ring-2 focus:ring-[#0074b3] focus:ring-opacity-50 transition-all duration-300"
              />
              <Button 
                type="submit"
                className="bg-white text-[#0074b3] hover:bg-blue-50 px-8 py-4 text-lg rounded-xl transition-all duration-300 hover:scale-105"
                disabled={isLoading}
              >
                {isLoading ? "Inscription en cours..." : (
                  <>
                    <EditableText
                      contentKey="newsletter_button"
                      initialContent="S'inscrire"
                      className="text-[#0074b3] font-semibold"
                    />
                    <ArrowRight className="ml-2 h-5 w-5" style={{ color: '#0074b3' }} />
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default NewsletterSection; 