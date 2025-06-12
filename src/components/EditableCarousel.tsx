import React, { useState, useEffect } from 'react';
import { useEditStore } from '@/stores/useEditStore';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, Upload, Save, Link as LinkIcon, Edit } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface CarouselSlide {
  index: number;
  image_url_desktop: string;
  image_url_mobile: string;
  title: string;
  subtitle: string;
  button_text: string;
  button_url: string;
  is_active: boolean;
}

const EditableCarousel = () => {
  const { isEditMode } = useEditStore();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingSlide, setEditingSlide] = useState<number | null>(null);
  const [tempSlideData, setTempSlideData] = useState<CarouselSlide | null>(null);
  const { toast } = useToast();
  const isMobile = useMediaQuery({ maxWidth: 767 });

  // Initialiser les slides par défaut
  const defaultSlides: CarouselSlide[] = [
    {
      index: 0,
      image_url_desktop: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
      image_url_mobile: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
      title: 'Découvrez Notre Univers Aquatique',
      subtitle: 'Tout pour créer l\'aquarium de vos rêves',
      button_text: 'Découvrir',
      button_url: '/categories',
      is_active: true
    },
    {
      index: 1,
      image_url_desktop: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
      image_url_mobile: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
      title: 'Équipements Professionnels',
      subtitle: 'Filtration, éclairage et accessoires de qualité',
      button_text: 'Voir les produits',
      button_url: '/produits',
      is_active: true
    },
    {
      index: 2,
      image_url_desktop: 'https://images.unsplash.com/photo-1583212292454-1fe6229603b7?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
      image_url_mobile: 'https://images.unsplash.com/photo-1583212292454-1fe6229603b7?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
      title: 'Conseils d\'Experts',
      subtitle: 'Accompagnement personnalisé pour votre projet',
      button_text: 'Nous contacter',
      button_url: '/contact',
      is_active: true
    }
  ];

  // Charger les données du carousel
  useEffect(() => {
    loadCarouselData();
  }, []);

  const loadCarouselData = async () => {
    try {
      setIsLoading(true);
      
      // Charger les images depuis site_content_images
      const { data: imagesData, error: imagesError } = await supabase
        .from('site_content_images')
        .select('*')
        .eq('key_name', 'homepage_carousel')
        .order('created_at', { ascending: true });

      if (imagesError) throw imagesError;

      // Charger les textes depuis editable_content
      const textPromises = defaultSlides.map(async (slide, index) => {
        const [titleData, subtitleData, buttonTextData, buttonUrlData, activeData] = await Promise.all([
          supabase
            .from('editable_content')
            .select('content')
            .eq('content_key', `homepage_carousel_title_${index}`)
            .single(),
          supabase
            .from('editable_content')
            .select('content')
            .eq('content_key', `homepage_carousel_subtitle_${index}`)
            .single(),
          supabase
            .from('editable_content')
            .select('content')
            .eq('content_key', `homepage_carousel_button_text_${index}`)
            .single(),
          supabase
            .from('editable_content')
            .select('content')
            .eq('content_key', `homepage_carousel_button_url_${index}`)
            .single(),
          supabase
            .from('editable_content')
            .select('content')
            .eq('content_key', `homepage_carousel_active_${index}`)
            .single()
        ]);

        return {
          index,
          image_url_desktop: imagesData?.[index]?.image_url_desktop || slide.image_url_desktop,
          image_url_mobile: imagesData?.[index]?.image_url_mobile || slide.image_url_mobile,
          title: titleData.data?.content || slide.title,
          subtitle: subtitleData.data?.content || slide.subtitle,
          button_text: buttonTextData.data?.content || slide.button_text,
          button_url: buttonUrlData.data?.content || slide.button_url,
          is_active: activeData.data?.content === 'true' ? true : (activeData.data?.content === 'false' ? false : slide.is_active)
        };
      });

      const loadedSlides = await Promise.all(textPromises);
      setSlides(loadedSlides);

      // Si aucune image n'existe, initialiser avec les données par défaut
      if (!imagesData || imagesData.length === 0) {
        await initializeDefaultData();
      }

    } catch (error) {
      console.error('Erreur lors du chargement du carousel:', error);
      setSlides(defaultSlides);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeDefaultData = async () => {
    try {
      // Insérer les images par défaut
      for (const slide of defaultSlides) {
        await supabase
          .from('site_content_images')
          .insert({
            key_name: 'homepage_carousel',
            image_url_desktop: slide.image_url_desktop,
            image_url_mobile: slide.image_url_mobile,
            created_at: new Date(Date.now() + slide.index).toISOString()
          });

        // Insérer les textes par défaut
        await Promise.all([
          supabase
            .from('editable_content')
            .insert({
              content_key: `homepage_carousel_title_${slide.index}`,
              content: slide.title
            }),
          supabase
            .from('editable_content')
            .insert({
              content_key: `homepage_carousel_subtitle_${slide.index}`,
              content: slide.subtitle
            }),
          supabase
            .from('editable_content')
            .insert({
              content_key: `homepage_carousel_button_text_${slide.index}`,
              content: slide.button_text
            }),
          supabase
            .from('editable_content')
            .insert({
              content_key: `homepage_carousel_button_url_${slide.index}`,
              content: slide.button_url
            }),
          supabase
            .from('editable_content')
            .insert({
              content_key: `homepage_carousel_active_${slide.index}`,
              content: slide.is_active.toString()
            })
        ]);
      }
    } catch (error) {
      console.error('Erreur lors de l\'initialisation:', error);
    }
  };

  const handleImageUpload = async (index: number, file: File, type: 'desktop' | 'mobile') => {
    try {
      const filePath = `carousel/homepage/${type}/${Date.now()}-${file.name}`;
      
      const { data, error } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      if (urlData?.publicUrl) {
        // Mettre à jour l'image dans la base de données
        const { data: existingImages } = await supabase
          .from('site_content_images')
          .select('*')
          .eq('key_name', 'homepage_carousel')
          .order('created_at', { ascending: true });

        const imageField = type === 'desktop' ? 'image_url_desktop' : 'image_url_mobile';

        if (existingImages && existingImages[index]) {
          await supabase
            .from('site_content_images')
            .update({ [imageField]: urlData.publicUrl })
            .eq('id', existingImages[index].id);
        } else {
          await supabase
            .from('site_content_images')
            .insert({
              key_name: 'homepage_carousel',
              [imageField]: urlData.publicUrl,
              created_at: new Date(Date.now() + index).toISOString()
            });
        }

        // Mettre à jour l'état local
        const updatedSlides = [...slides];
        updatedSlides[index][imageField] = urlData.publicUrl;
        setSlides(updatedSlides);

        toast({
          title: "Image mise à jour",
          description: `L'image ${type} du carousel a été mise à jour avec succès`,
        });
      }
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'upload de l'image",
        variant: "destructive",
      });
    }
  };

  const startEditing = (index: number) => {
    setEditingSlide(index);
    setTempSlideData({ ...slides[index] });
  };

  const cancelEditing = () => {
    setEditingSlide(null);
    setTempSlideData(null);
  };

  const saveSlideChanges = async () => {
    if (editingSlide === null || !tempSlideData) return;

    try {
      setIsSaving(true);

      // Sauvegarder tous les champs modifiés
      await Promise.all([
        supabase
          .from('editable_content')
          .upsert({
            content_key: `homepage_carousel_title_${editingSlide}`,
            content: tempSlideData.title
          }, { onConflict: 'content_key' }),
        supabase
          .from('editable_content')
          .upsert({
            content_key: `homepage_carousel_subtitle_${editingSlide}`,
            content: tempSlideData.subtitle
          }, { onConflict: 'content_key' }),
        supabase
          .from('editable_content')
          .upsert({
            content_key: `homepage_carousel_button_text_${editingSlide}`,
            content: tempSlideData.button_text
          }, { onConflict: 'content_key' }),
        supabase
          .from('editable_content')
          .upsert({
            content_key: `homepage_carousel_button_url_${editingSlide}`,
            content: tempSlideData.button_url
          }, { onConflict: 'content_key' })
      ]);

      // Mettre à jour l'état local
      const updatedSlides = [...slides];
      updatedSlides[editingSlide] = { ...tempSlideData };
      setSlides(updatedSlides);

      setEditingSlide(null);
      setTempSlideData(null);

      toast({
        title: "Slide mis à jour",
        description: "Les modifications ont été sauvegardées avec succès",
      });

    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la sauvegarde",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const toggleSlideActive = async (index: number) => {
    try {
      const updatedSlides = [...slides];
      updatedSlides[index].is_active = !updatedSlides[index].is_active;
      
      // Mettre à jour dans la base de données
      await supabase
        .from('editable_content')
        .upsert({
          content_key: `homepage_carousel_active_${index}`,
          content: updatedSlides[index].is_active.toString()
        }, { onConflict: 'content_key' });

      setSlides(updatedSlides);
      
      toast({
        title: "Slide mis à jour",
        description: `Le slide a été ${updatedSlides[index].is_active ? 'activé' : 'désactivé'}`,
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la mise à jour du statut",
        variant: "destructive",
      });
    }
  };

  // Auto-play du carousel (seulement si pas en mode édition)
  useEffect(() => {
    if (!isEditMode && slides.length > 0) {
      const interval = setInterval(nextSlide, 5000);
      return () => clearInterval(interval);
    }
  }, [isEditMode, slides.length]);

  if (isLoading) {
    return (
      <div className="relative h-[500px] bg-gray-100 animate-pulse">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-gray-500">Chargement du carousel...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>
        {`
          .carousel-button {
            background-color: #0074b3;
          }
          .carousel-button:hover {
            background-color: #005a8a;
          }
        `}
      </style>
      <section className="relative h-[500px] overflow-hidden">
        {/* Images du carousel */}
        <div className="relative h-full">
          {slides.filter(slide => isEditMode || slide.is_active).map((slide, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-500 ${
                index === currentSlide ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <div
                className="w-full h-full bg-cover bg-center"
                style={{ 
                  backgroundImage: `url('${isMobile ? slide.image_url_mobile : slide.image_url_desktop}')` 
                }}
              >
                <div className="absolute inset-0 bg-black bg-opacity-40"></div>
              </div>
              
              {/* Contenu superposé */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white max-w-4xl px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16">
                  {isEditMode ? (
                    /* Mode édition avec bouton modifier */
                    <div className="space-y-4 md:space-y-6">
                      <h1 className="text-3xl md:text-6xl font-bold mb-2 md:mb-4 leading-tight">
                        {slide.title}
                      </h1>
                      <p className="text-lg md:text-2xl text-gray-200 mb-4 md:mb-6 line-clamp-3">
                        {slide.subtitle}
                      </p>
                      <a
                        href={slide.button_url}
                        className="inline-flex items-center px-6 py-3 md:px-8 md:py-4 text-white font-bold rounded-lg transition-colors carousel-button mr-2 md:mr-4 text-sm md:text-base"
                      >
                        <LinkIcon className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                        {slide.button_text}
                      </a>
                      <Button
                        onClick={() => startEditing(index)}
                        className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-6 py-3 md:px-8 md:py-4 text-sm md:text-base"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Modifier ce slide
                      </Button>
                    </div>
                  ) : (
                    /* Mode normal */
                    <div className="space-y-4 md:space-y-6">
                      <h1 className="text-3xl md:text-6xl font-bold mb-2 md:mb-4 leading-tight">
                        {slide.title}
                      </h1>
                      <p className="text-lg md:text-2xl text-gray-200 mb-4 md:mb-6 line-clamp-3">
                        {slide.subtitle}
                      </p>
                      <a
                        href={slide.button_url}
                        className="inline-flex items-center px-6 py-3 md:px-8 md:py-4 text-white font-bold rounded-lg transition-colors carousel-button text-sm md:text-base"
                      >
                        <LinkIcon className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                        {slide.button_text}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modal d'édition */}
        {isEditMode && editingSlide !== null && (
          <div className="absolute inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden">
              {/* Header du modal */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold">Modifier le slide {editingSlide + 1}</h3>
                  <Button
                    onClick={cancelEditing}
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20 rounded-full"
                  >
                    ✕
                  </Button>
                </div>
              </div>

              {/* Contenu du modal */}
              <div className="p-6 overflow-y-auto max-h-[calc(85vh-120px)]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Colonne gauche - Textes */}
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold mb-3 text-gray-700">Titre</label>
                      <Input
                        value={tempSlideData?.title || ''}
                        onChange={(e) => setTempSlideData(prev => prev ? {...prev, title: e.target.value} : null)}
                        className="bg-gray-50 text-black border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-lg p-4"
                        placeholder="Titre du slide"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-3 text-gray-700">Sous-titre</label>
                      <Input
                        value={tempSlideData?.subtitle || ''}
                        onChange={(e) => setTempSlideData(prev => prev ? {...prev, subtitle: e.target.value} : null)}
                        className="bg-gray-50 text-black border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-lg p-4"
                        placeholder="Sous-titre du slide"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-3 text-gray-700">Texte du bouton</label>
                      <Input
                        value={tempSlideData?.button_text || ''}
                        onChange={(e) => setTempSlideData(prev => prev ? {...prev, button_text: e.target.value} : null)}
                        className="bg-gray-50 text-black border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-lg p-4"
                        placeholder="Texte du bouton"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-3 text-gray-700">URL du bouton</label>
                      <Input
                        value={tempSlideData?.button_url || ''}
                        onChange={(e) => setTempSlideData(prev => prev ? {...prev, button_url: e.target.value} : null)}
                        className="bg-gray-50 text-black border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-lg p-4"
                        placeholder="/chemin-vers-page"
                      />
                    </div>
                  </div>

                  {/* Colonne droite - Images et aperçu */}
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold mb-3 text-gray-700">Image Desktop</label>
                      <div className="relative">
                        <img 
                          src={tempSlideData?.image_url_desktop} 
                          alt="Aperçu Desktop" 
                          className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
                        />
                        <label
                          htmlFor={`desktop-upload-${editingSlide}`}
                          className="absolute inset-0 bg-black bg-opacity-40 rounded-lg flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          <div className="text-white text-center">
                            <Upload className="w-8 h-8 mx-auto mb-2" />
                            <span className="text-sm">Cliquez pour changer l'image</span>
                          </div>
                        </label>
                        <input
                          type="file"
                          id={`desktop-upload-${editingSlide}`}
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(editingSlide, file, 'desktop');
                          }}
                          className="hidden"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-3 text-gray-700">Image Mobile</label>
                      <div className="relative">
                        <img 
                          src={tempSlideData?.image_url_mobile} 
                          alt="Aperçu Mobile" 
                          className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
                        />
                        <label
                          htmlFor={`mobile-upload-${editingSlide}`}
                          className="absolute inset-0 bg-black bg-opacity-40 rounded-lg flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          <div className="text-white text-center">
                            <Upload className="w-8 h-8 mx-auto mb-2" />
                            <span className="text-sm">Cliquez pour changer l'image</span>
                          </div>
                        </label>
                        <input
                          type="file"
                          id={`mobile-upload-${editingSlide}`}
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(editingSlide, file, 'mobile');
                          }}
                          className="hidden"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-3 text-gray-700">Aperçu</label>
                      <div className="relative">
                        <img 
                          src={isMobile ? tempSlideData?.image_url_mobile : tempSlideData?.image_url_desktop} 
                          alt="Aperçu" 
                          className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-40 rounded-lg flex items-center justify-center">
                          <div className="text-center text-white">
                            <h4 className="text-lg font-bold mb-2">{tempSlideData?.title}</h4>
                            <p className="text-sm mb-3">{tempSlideData?.subtitle}</p>
                            <div className="inline-block px-4 py-2 carousel-button text-white rounded-lg text-sm">
                              {tempSlideData?.button_text}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Boutons d'action */}
                <div className="mt-6 flex justify-end gap-4">
                  <Button
                    onClick={cancelEditing}
                    variant="outline"
                    className="px-6"
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={saveSlideChanges}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Save className="w-4 h-4 mr-2 animate-spin" />
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Enregistrer
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contrôles de navigation */}
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full flex items-center justify-center text-white transition-all duration-300"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full flex items-center justify-center text-white transition-all duration-300"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Indicateurs */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex space-x-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? 'bg-white'
                  : 'bg-white bg-opacity-50 hover:bg-opacity-75'
              }`}
            />
          ))}
        </div>

        {/* Boutons d'édition rapide (en mode édition) */}
        {isEditMode && (
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            {slides.map((slide, index) => (
              <div key={index} className="flex gap-2">
                <Button
                  onClick={() => startEditing(index)}
                  size="sm"
                  className={`bg-yellow-500 hover:bg-yellow-600 text-black font-bold ${
                    index === currentSlide ? 'ring-2 ring-white' : ''
                  }`}
                >
                  <Edit className="w-3 h-3 mr-1" />
                  Slide {index + 1}
                </Button>
                <Button
                  onClick={() => toggleSlideActive(index)}
                  size="sm"
                  variant={slide.is_active ? "default" : "destructive"}
                  className="min-w-[100px]"
                >
                  {slide.is_active ? 'Actif' : 'Inactif'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
};

export default EditableCarousel; 