import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingHeader from "@/components/admin/FloatingHeader";
import { AdminHeader } from "@/components/admin/layout/AdminHeader";
import EditableCarousel from "@/components/EditableCarousel";
import DynamicUniverseGrid from "@/components/DynamicUniverseGrid";
import PopularProducts from "@/components/PopularProducts";
import PacksSection from "@/components/PacksSection";
import { useEditStore } from "@/stores/useEditStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Truck, RotateCcw, Shield, ChevronLeft, ChevronRight, Mail, ArrowRight, Award, CreditCard, MessageCircle } from "lucide-react";
import { useState, useEffect, FormEvent } from "react";
import EditorialProductCard, { EditorialCategoryCard, EditorialPackCard } from '@/components/EditorialProductCard';
import { EditableText } from '@/components/EditableText';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { subscribeToNewsletter } from "@/integrations/shopify/client";
import { useMediaQuery } from 'react-responsive';

const Index = () => {
  const { isEditMode: isEditing, isAdmin, checkAdminStatus } = useEditStore();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPromoCode, setShowPromoCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const [homepagePacksUrl, setHomepagePacksUrl] = useState("");

  // Vérifier le statut admin au chargement
  useEffect(() => {
    checkAdminStatus();
  }, [checkAdminStatus]);

  useEffect(() => {
    const fetchHomepagePacksUrl = async () => {
      const { data } = await supabase
        .from('editable_content')
        .select('content')
        .eq('content_key', 'homepage_packs_global_url')
        .maybeSingle();
      if (data?.content) setHomepagePacksUrl(data.content);
    };
    fetchHomepagePacksUrl();
  }, []);

  const editorialCards = [
    {
      id: 1,
      category: "NOUVEAUTÉS",
      categoryColor: "bg-green-500",
      title: "Nouvelles pompes de bassin 2024",
      image: "/placeholder.svg",
      cta: "Voir les produits"
    },
    {
      id: 2,
      category: "ENTRETIEN",
      categoryColor: "bg-orange-500",
      title: "Entretien hivernal de votre bassin",
      image: "/placeholder.svg",
      cta: "Lire le guide"
    },
    {
      id: 3,
      category: "CATÉGORIE",
      categoryColor: "bg-indigo-500",
      title: "Découvrez nos pompes et filtration",
      image: "/placeholder.svg",
      cta: "Voir la catégorie"
    },
    {
      id: 4,
      category: "PACKS",
      categoryColor: "bg-teal-500",
      title: "Découvrez nos packs mensuels",
      image: "/placeholder.svg",
      cta: "Voir les packs"
    },
    {
      id: 5,
      category: "NOUVEAUTÉS",
      categoryColor: "bg-green-500",
      title: "Nouvelle gamme de chauffages",
      image: "/placeholder.svg",
      cta: "Voir les produits"
    },
    {
      id: 6,
      category: "DÉCORATION",
      categoryColor: "bg-pink-500",
      title: "Choisir ses plantes aquatiques",
      image: "/placeholder.svg",
      cta: "Lire le guide"
    },
    {
      id: 7,
      category: "ENTRETIEN",
      categoryColor: "bg-orange-500",
      title: "Produits d'entretien écologiques",
      image: "/placeholder.svg",
      cta: "Voir les produits"
    },
    {
      id: 8,
      category: "GUIDE PRATIQUE",
      categoryColor: "bg-blue-500",
      title: "Maintenance préventive de l'aquarium",
      image: "/placeholder.svg",
      cta: "Lire le guide"
    },
    {
      id: 9,
      category: "CATÉGORIE",
      categoryColor: "bg-indigo-500",
      title: "Explorez nos décorations aquatiques",
      image: "/placeholder.svg",
      cta: "Voir la catégorie"
    }
  ];

  const [editorialTitle, setEditorialTitle] = useState<string>("Conseils & Inspiration");
  const [editorialSubtitle, setEditorialSubtitle] = useState<string>("Explorez nos guides et découvrez les dernières tendances");

  useEffect(() => {
    const fetchEditorialContent = async () => {
      const { data } = await supabase
        .from('editable_content')
        .select('content_key, content')
        .in('content_key', ['editorial_section_title', 'editorial_section_subtitle']);
      if (data) {
        const title = data.find(d => d.content_key === 'editorial_section_title');
        const subtitle = data.find(d => d.content_key === 'editorial_section_subtitle');
        if (title) setEditorialTitle(title.content);
        if (subtitle) setEditorialSubtitle(subtitle.content);
      }
    };
    fetchEditorialContent();
  }, []);

  const [loyaltyTitle, setLoyaltyTitle] = useState<string>("1€ dépensé = 1 point de fidélité");
  const [loyaltySubtitle, setLoyaltySubtitle] = useState<string>("Cumulez des points et obtenez des réductions sur vos prochains achats");

  useEffect(() => {
    const fetchLoyaltyContent = async () => {
      const { data } = await supabase
        .from('editable_content')
        .select('content_key, content')
        .in('content_key', ['loyalty_section_title', 'loyalty_section_subtitle']);
      if (data) {
        const title = data.find(d => d.content_key === 'loyalty_section_title');
        const subtitle = data.find(d => d.content_key === 'loyalty_section_subtitle');
        if (title) setLoyaltyTitle(title.content);
        if (subtitle) setLoyaltySubtitle(subtitle.content);
      }
    };
    fetchLoyaltyContent();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@') || !email.includes('.')) {
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
        // Tentative d'enregistrement local comme filet de sécurité
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

  // Ajout d'un utilitaire pour détecter le mobile
  const isMobile = useMediaQuery({ maxWidth: 767 });

  // Séparer les cartes en produits et spéciales (catégorie/pack)
  const productCards = editorialCards.filter(card => card.category !== 'CATÉGORIE' && card.category !== 'PACKS');
  const specialCards = editorialCards.filter(card => card.category === 'CATÉGORIE' || card.category === 'PACKS');

  // Réordonner pour mobile : 2 produits, 1 spéciale, 2 produits, 1 spéciale, ...
  let orderedCards = editorialCards;
  if (isMobile) {
    orderedCards = [];
    let prodIdx = 0, specIdx = 0;
    while (prodIdx < productCards.length || specIdx < specialCards.length) {
      // Ajoute 2 produits
      for (let i = 0; i < 2 && prodIdx < productCards.length; i++) {
        orderedCards.push(productCards[prodIdx++]);
      }
      // Ajoute 1 spéciale si dispo
      if (specIdx < specialCards.length) {
        orderedCards.push(specialCards[specIdx++]);
      }
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <AdminHeader />
      <FloatingHeader />
      <EditableCarousel />
      
      <main className="flex-grow">
        {/* Univers Grid - Dynamique depuis Supabase */}
        <DynamicUniverseGrid />

        {/* Popular Products - Dynamique depuis Supabase avec sélection en mode édition */}
        <PopularProducts />
            
        {/* Packs Section - Choisis le pack qui te correspond */}
        <section className="relative">
          {isEditing && (
            <div className="absolute right-0 top-0 z-10 bg-white/80 p-2 rounded shadow">
              <span className="text-xs font-semibold mr-2">Lien global packs :</span>
              <EditableText
                contentKey="homepage_packs_global_url"
                initialContent={homepagePacksUrl}
                onUpdate={setHomepagePacksUrl}
                className="inline-block min-w-[120px]"
              />
                      </div>
                    )}
          <PacksSection homepageGlobalUrl={homepagePacksUrl} />
        </section>

        {/* Editorial Grid */}
        <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-slate-900 mb-4">
                <EditableText
                  contentKey="editorial_section_title"
                  initialContent={editorialTitle}
                  onUpdate={setEditorialTitle}
                />
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                <EditableText
                  contentKey="editorial_section_subtitle"
                  initialContent={editorialSubtitle}
                  onUpdate={setEditorialSubtitle}
                />
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {orderedCards.map((card, idx) => {
                if (card.category === "CATÉGORIE") {
                  return (
                    <EditorialCategoryCard
                      key={card.id}
                      cardIndex={idx + 1}
                      editorialData={card}
                    />
                  );
                }
                if (card.category === "PACKS") {
                  return (
                    <EditorialPackCard
                      key={card.id}
                      cardIndex={idx + 1}
                      editorialData={card}
                    />
                  );
                }
                return (
                  <EditorialProductCard
                    key={card.id}
                    cardIndex={idx + 1}
                    isSpecialCard={false}
                    editorialData={card}
                  />
                );
              })}
            </div>
          </div>
        </section>

        {/* Loyalty Banner */}
        <section className="py-12 bg-gradient-to-r from-purple-600 to-blue-600">
          <div className="container mx-auto px-4 text-center">
            <div className="flex items-center justify-center gap-4 text-white">
              <Award className="w-8 h-8" />
              <h3 className="text-2xl font-bold">
                <EditableText
                  contentKey="loyalty_section_title"
                  initialContent={loyaltyTitle}
                  onUpdate={setLoyaltyTitle}
                />
              </h3>
              <Award className="w-8 h-8" />
            </div>
            <p className="text-blue-100 mt-2">
              <EditableText
                contentKey="loyalty_section_subtitle"
                initialContent={loyaltySubtitle}
                onUpdate={setLoyaltySubtitle}
              />
            </p>
          </div>
        </section>

        {/* Trust Bar */}
        <section className="py-16 bg-white border-t">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="flex items-center justify-center text-center group">
                <Truck className="w-12 h-12 mr-4 group-hover:scale-110 transition-transform duration-300" style={{ color: '#0074b3' }} />
                <div>
                  <h3 className="font-bold text-lg text-slate-900 mb-1">
                    <EditableText
                      contentKey="trustbar_title_1"
                      initialContent="Livraison Gratuite"
                    />
                  </h3>
                  <p className="text-gray-600 text-sm">
                    <EditableText
                      contentKey="trustbar_desc_1"
                      initialContent="À partir de 49€"
                    />
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-center text-center group">
                <RotateCcw className="w-12 h-12 mr-4 group-hover:scale-110 transition-transform duration-300" style={{ color: '#0074b3' }} />
                <div>
                  <h3 className="font-bold text-lg text-slate-900 mb-1">
                    <EditableText
                      contentKey="trustbar_title_2"
                      initialContent="SAV Expert"
                    />
                  </h3>
                  <p className="text-gray-600 text-sm">
                    <EditableText
                      contentKey="trustbar_desc_2"
                      initialContent="Conseils spécialisés"
                    />
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-center text-center group">
                <MessageCircle className="w-12 h-12 mr-4 group-hover:scale-110 transition-transform duration-300" style={{ color: '#0074b3' }} />
                <div>
                  <h3 className="font-bold text-lg text-slate-900 mb-1">
                    <EditableText
                      contentKey="trustbar_title_3"
                      initialContent="Contact"
                    />
                  </h3>
                  <p className="text-gray-600 text-sm">
                    <EditableText
                      contentKey="trustbar_desc_3"
                      initialContent="Support réactif"
                    />
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-center text-center group">
                <CreditCard className="w-12 h-12 mr-4 group-hover:scale-110 transition-transform duration-300" style={{ color: '#0074b3' }} />
                <div>
                  <h3 className="font-bold text-lg text-slate-900 mb-1">
                    <EditableText
                      contentKey="trustbar_title_4"
                      initialContent="PayPal & Avis Vérifiés"
                    />
                  </h3>
                  <p className="text-gray-600 text-sm">
                    <EditableText
                      contentKey="trustbar_desc_4"
                      initialContent="Paiement sécurisé"
                    />
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Newsletter Section */}
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
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;