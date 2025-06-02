import React, { useState, useEffect } from 'react';
import { useEditStore } from '@/stores/useEditStore';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, Upload, Save, Link as LinkIcon, Edit } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface CarouselSlide {
  index: number;
  image_url: string;
  title: string;
  subtitle: string;
  button_text: string;
  button_url: string;
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

  // Initialiser les slides par défaut
  const defaultSlides: CarouselSlide[] = [
    {
      index: 0,
      image_url: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
      title: 'Découvrez Notre Univers Aquatique',
      subtitle: 'Tout pour créer l\'aquarium de vos rêves',
      button_text: 'Découvrir',
      button_url: '/categories'
    },
    {
      index: 1,
      image_url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
      title: 'Équipements Professionnels',
      subtitle: 'Filtration, éclairage et accessoires de qualité',
      button_text: 'Voir les produits',
      button_url: '/produits'
    },
    {
      index: 2,
      image_url: 'https://images.unsplash.com/photo-1583212292454-1fe6229603b7?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
      title: 'Conseils d\'Experts',
      subtitle: 'Accompagnement personnalisé pour votre projet',
      button_text: 'Nous contacter',
      button_url: '/contact'
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
        const [titleData, subtitleData, buttonTextData, buttonUrlData] = await Promise.all([
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
            .single()
        ]);

        return {
          index,
          image_url: imagesData?.[index]?.image_url || slide.image_url,
          title: titleData.data?.content || slide.title,
          subtitle: subtitleData.data?.content || slide.subtitle,
          button_text: buttonTextData.data?.content || slide.button_text,
          button_url: buttonUrlData.data?.content || slide.button_url
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
            image_url: slide.image_url,
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
            })
        ]);
      }
    } catch (error) {
      console.error('Erreur lors de l\'initialisation:', error);
    }
  };

  const handleImageUpload = async (index: number, file: File) => {
    try {
      const filePath = `carousel/homepage/${Date.now()}-${file.name}`;
      
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

        if (existingImages && existingImages[index]) {
          await supabase
            .from('site_content_images')
            .update({ image_url: urlData.publicUrl })
            .eq('id', existingImages[index].id);
        } else {
          await supabase
            .from('site_content_images')
            .insert({
              key_name: 'homepage_carousel',
              image_url: urlData.publicUrl,
              created_at: new Date(Date.now() + index).toISOString()
            });
        }

        // Mettre à jour l'état local
        const updatedSlides = [...slides];
        updatedSlides[index].image_url = urlData.publicUrl;
        setSlides(updatedSlides);

        toast({
          title: "Image mise à jour",
          description: "L'image du carousel a été mise à jour avec succès",
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
          {slides.map((slide, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-500 ${
                index === currentSlide ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <div
                className="w-full h-full bg-cover bg-center"
                style={{ backgroundImage: `url('${slide.image_url}')` }}
              >
                <div className="absolute inset-0 bg-black bg-opacity-40"></div>
              </div>
              
              {/* Contenu superposé */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white max-w-4xl px-4">
                  {isEditMode ? (
                    /* Mode édition avec bouton modifier */
                    <div className="space-y-6">
                      <h1 className="text-4xl md:text-6xl font-bold mb-4">
                        {slide.title}
                      </h1>
                      <p className="text-xl md:text-2xl text-gray-200 mb-6">
                        {slide.subtitle}
                      </p>
                      <a
                        href={slide.button_url}
                        className="inline-flex items-center px-8 py-4 text-white font-bold rounded-lg transition-colors carousel-button mr-4"
                      >
                        <LinkIcon className="w-5 h-5 mr-2" />
                        {slide.button_text}
                      </a>
                      <Button
                        onClick={() => startEditing(index)}
                        className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Modifier ce slide
                      </Button>
                    </div>
                  ) : (
                    /* Mode normal */
                    <div className="space-y-6">
                      <h1 className="text-4xl md:text-6xl font-bold mb-4">
                        {slide.title}
                      </h1>
                      <p className="text-xl md:text-2xl text-gray-200 mb-6">
                        {slide.subtitle}
                      </p>
                      <a
                        href={slide.button_url}
                        className="inline-flex items-center px-8 py-4 text-white font-bold rounded-lg transition-colors carousel-button"
                      >
                        <LinkIcon className="w-5 h-5 mr-2" />
                        {slide.button_text}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modal d'édition (affiché par-dessus le carousel) */}
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

                  {/* Colonne droite - Image et aperçu */}
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold mb-3 text-gray-700">Image actuelle</label>
                      <div className="relative">
                        <img 
                          src={tempSlideData?.image_url} 
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

                    <div>
                      <label className="block text-sm font-semibold mb-3 text-gray-700">Changer l'image</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleImageUpload(editingSlide, file);
                          }
                        }}
                        className="hidden"
                        id={`image-upload-${editingSlide}`}
                      />
                      <label
                        htmlFor={`image-upload-${editingSlide}`}
                        className="w-full inline-flex items-center justify-center px-6 py-4 bg-gray-600 text-white rounded-lg cursor-pointer hover:bg-gray-700 transition-colors text-lg font-medium"
                      >
                        <Upload className="w-5 h-5 mr-3" />
                        Changer l'image
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer du modal */}
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                <div className="flex gap-4 justify-end">
                  <Button
                    onClick={cancelEditing}
                    variant="outline"
                    className="px-6 py-3 text-lg"
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={saveSlideChanges}
                    disabled={isSaving}
                    className="bg-green-600 hover:bg-green-700 px-8 py-3 text-lg"
                  >
                    <Save className="w-5 h-5 mr-2" />
                    {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
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
            {slides.map((_, index) => (
              <Button
                key={index}
                onClick={() => startEditing(index)}
                size="sm"
                className={`bg-yellow-500 hover:bg-yellow-600 text-black font-bold ${
                  index === currentSlide ? 'ring-2 ring-white' : ''
                }`}
              >
                <Edit className="w-3 h-3 mr-1" />
                Slide {index + 1}
              </Button>
            ))}
          </div>
        )}
      </section>
    </>
  );
};

export default EditableCarousel; 