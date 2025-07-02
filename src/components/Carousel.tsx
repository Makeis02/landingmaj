import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEditStore } from '@/stores/useEditStore';
import { ChevronLeft, ChevronRight, Upload, Trash2, ArrowUp, ArrowDown, Menu } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

interface CarouselProps {
  packName: string;
  images?: string[];
  speed: number;
  onImagesUpdate: (newImages: string[]) => void;
  isEditMode?: boolean;
  contentKey: string;
}

const Carousel: React.FC<CarouselProps> = ({ packName, images = [], speed = 5000, onImagesUpdate, isEditMode, contentKey }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [displayedImages, setDisplayedImages] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const { isEditMode: globalEditMode } = useEditStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchTimeout = useRef<NodeJS.Timeout | null>(null);
  const intervalId = useRef<NodeJS.Timeout | null>(null);
  const [showImagePanel, setShowImagePanel] = useState(false);
  
  // Assurer que speed est un nombre valide
  const safeSpeed = typeof speed === 'number' && !isNaN(speed) && speed > 0 ? speed : 5000;
  
  console.log("🔄 Carousel rendu avec speed =", speed, "(safeSpeed =", safeSpeed, ") et", images?.length || 0, "images");
  
  // Effects to manage image display
  useEffect(() => {
    console.log("🔄 useEffect [images] déclenché avec", images?.length || 0, "images");
    if (images && images.length > 0) {
      console.log("🔄 Mise à jour de displayedImages depuis les props images");
      setDisplayedImages(images);
    }
  }, [images]);
  
  // Effet pour vérifier l'état du carrousel
  useEffect(() => {
    console.log("📊 État actuel du carrousel:", {
      displayedImagesCount: displayedImages.length,
      currentIndex,
      isDragging,
      showImagePanel,
      speed: safeSpeed
    });
  }, [displayedImages, currentIndex, isDragging, showImagePanel, safeSpeed]);

  // Effet séparé pour gérer uniquement le défilement automatique
  useEffect(() => {
    // Vérifier si le défilement automatique doit être activé
    const shouldAutoScroll = displayedImages.length > 1 && !isDragging && !showImagePanel;
    
    console.log("🔄 Vérification du défilement automatique:", {
      imagesCount: displayedImages.length,
      isDragging,
      showImagePanel,
      shouldAutoScroll,
      speed: safeSpeed
    });
    
    // Nettoyer l'intervalle existant dans tous les cas
    if (intervalId.current) {
      console.log("🔄 Nettoyage de l'intervalle existant");
      clearInterval(intervalId.current);
      intervalId.current = null;
    }
    
    // Créer un nouvel intervalle si les conditions sont remplies
    if (shouldAutoScroll) {
      console.log("✅ Démarrage du défilement automatique avec vitesse:", safeSpeed);
      
      // Utiliser setTimeout au lieu de setInterval pour plus de fiabilité
      const startAutoScroll = () => {
        intervalId.current = setTimeout(() => {
          console.log("🔄 Défilement automatique: passage à l'image suivante");
          setCurrentIndex(prevIndex => {
            const newIndex = (prevIndex + 1) % displayedImages.length;
            console.log(`🔄 Index passé de ${prevIndex} à ${newIndex}`);
            return newIndex;
          });
          
          // Relancer le timeout pour la prochaine image
          if (intervalId.current) {
            startAutoScroll();
          }
        }, safeSpeed);
      };
      
      startAutoScroll();
    } else {
      console.log("⚠️ Conditions pour le défilement automatique non remplies:");
      if (displayedImages.length <= 1) console.log("  - Pas assez d'images:", displayedImages.length);
      if (isDragging) console.log("  - Glissement en cours (isDragging):", isDragging);
      if (showImagePanel) console.log("  - Panneau d'images affiché:", showImagePanel);
    }
    
    // Nettoyage lors du démontage ou lorsque les dépendances changent
    return () => {
      if (intervalId.current) {
        console.log("🔄 Nettoyage de l'intervalle lors du changement de dépendances");
        clearTimeout(intervalId.current);
        intervalId.current = null;
      }
    };
  }, [displayedImages, isDragging, showImagePanel, safeSpeed]);

  // useEffect pour récupérer les images depuis Supabase au rechargement
  useEffect(() => {
    const fetchImages = async () => {
      try {
        console.log(`🔍 Récupération des images pour ${contentKey}`);
        
        const { data: images, error } = await supabase
          .from("site_content_images")
          .select("image_url")
          .eq("key_name", contentKey)
          .order('created_at', { ascending: true });

        if (error) {
          console.error(`❌ Erreur lors de la récupération des images pour ${contentKey}:`, error);
          return;
        }

        if (images && images.length > 0) {
          const imageUrls = images.map(item => item.image_url);
          console.log(`✅ ${imageUrls.length} images récupérées pour ${contentKey}`);
          
          const currentUrls = new Set(displayedImages);
          const hasNewImages = imageUrls.some(url => !currentUrls.has(url)) || 
                             displayedImages.length !== imageUrls.length;
                              
          if (hasNewImages) {
            console.log(`🔄 Mise à jour des images pour ${contentKey}`);
            setDisplayedImages(imageUrls);
            onImagesUpdate(imageUrls);
          }
        } else {
          console.log(`ℹ️ Aucune image trouvée pour ${contentKey}`);
        }
      } catch (err) {
        console.error(`❌ Erreur inattendue pour ${contentKey}:`, err);
      }
    };

    if (displayedImages.length === 0) {
      fetchImages();
    }
  }, [contentKey, onImagesUpdate, displayedImages]);

  const goToPrevious = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (displayedImages.length > 0) {
      console.log("⬅️ Navigation manuelle vers l'image précédente");
      setCurrentIndex((prevIndex) => {
        const newIndex = (prevIndex - 1 + displayedImages.length) % displayedImages.length;
        console.log(`⬅️ Index passé de ${prevIndex} à ${newIndex}`);
        return newIndex;
      });
    }
  };

  const goToNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (displayedImages.length > 0) {
      console.log("➡️ Navigation manuelle vers l'image suivante");
      setCurrentIndex((prevIndex) => {
        const newIndex = (prevIndex + 1) % displayedImages.length;
        console.log(`➡️ Index passé de ${prevIndex} à ${newIndex}`);
        return newIndex;
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (showImagePanel) return;
    console.log("🖱️ Souris enfoncée - isDragging activé");
    setIsDragging(true);
    setDragStartX(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || showImagePanel) return;

    const dragDistance = e.clientX - dragStartX;
    const threshold = 50; // Minimum drag distance to register as a swipe

    if (Math.abs(dragDistance) > threshold) {
      console.log(`🖱️ Seuil de glissement atteint (${dragDistance}px)`);
      if (dragDistance > 0) {
        goToPrevious(e);
      } else {
        goToNext(e);
      }
      console.log("🖱️ Fin du glissement - isDragging désactivé");
      setIsDragging(false);
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      console.log("🖱️ Souris relâchée - isDragging désactivé");
      setIsDragging(false);
    }
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      console.log("🖱️ Souris sortie - isDragging désactivé");
      setIsDragging(false);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (showImagePanel) return;
    console.log("👆 Toucher démarré - isDragging activé");
    setIsDragging(true);
    setDragStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || showImagePanel) return;

    const dragDistance = e.touches[0].clientX - dragStartX;
    const threshold = 50;

    if (Math.abs(dragDistance) > threshold) {
      console.log(`👆 Seuil de glissement tactile atteint (${dragDistance}px)`);
      
      // Éviter les déclenchements multiples
      if (touchTimeout.current) return;

      touchTimeout.current = setTimeout(() => {
        if (dragDistance > 0) {
          goToPrevious(e as unknown as React.MouseEvent);
        } else {
          goToNext(e as unknown as React.MouseEvent);
        }
        console.log("👆 Fin du glissement tactile - isDragging désactivé");
        setIsDragging(false);
        touchTimeout.current = null;
      }, 100);
    }
  };

  const handleTouchEnd = () => {
    if (isDragging) {
      console.log("👆 Toucher terminé - isDragging désactivé");
      setIsDragging(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const fileList = Array.from(files);
      setUploadedFiles(fileList);
      
      // Process and upload the files
      handleUpload(fileList);
    }
  };

  const handleUpload = async (files: File[]) => {
    const newImageUrls: string[] = [];
    console.log(`🚀 Démarrage de l'upload multiple pour ${packName} avec key_name: ${contentKey}`);
    console.log("📦 Nombre de fichiers à uploader:", files.length);

    for (const file of files) {
      try {
        const filePath = `carousel/${contentKey}/${Date.now()}-${file.name}`;
        console.log("📸 Upload du fichier:", filePath);

        const { data, error } = await supabase.storage
          .from('images')
          .upload(filePath, file);

        if (error) {
          console.error('❌ Erreur lors de l\'upload:', error);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('images')
          .getPublicUrl(filePath);

        if (urlData && urlData.publicUrl) {
          newImageUrls.push(urlData.publicUrl);
          console.log("✅ URL générée:", urlData.publicUrl);

          // Utilisation du contentKey spécifique au pack
          const { error: insertError } = await supabase
            .from("site_content_images")
            .insert({
              key_name: contentKey,
              image_url: urlData.publicUrl,
              created_at: new Date().toISOString()
            });

          if (insertError) {
            console.error('❌ Erreur lors de l\'enregistrement dans la base:', insertError);
          } else {
            console.log(`✅ Image enregistrée avec succès pour ${contentKey}`);
          }
        }
      } catch (error) {
        console.error('❌ Erreur pendant le processus d\'upload:', error);
      }
    }

    if (newImageUrls.length > 0) {
      console.log(`✅ ${newImageUrls.length} images uploadées avec succès pour ${contentKey}`);
      const updatedImages = [...displayedImages, ...newImageUrls];
      setDisplayedImages(updatedImages);
      onImagesUpdate(updatedImages);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (containerRef.current) {
      containerRef.current.style.border = '2px dashed #3b82f6';
    }
  };

  const handleDragLeave = () => {
    if (containerRef.current) {
      containerRef.current.style.border = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (containerRef.current) {
      containerRef.current.style.border = '';
    }

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const fileList = Array.from(files);
      setUploadedFiles(fileList);
      handleUpload(fileList);
    }
  };

  const handleImageDelete = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    const imageToDelete = displayedImages[index];
    const newImages = [...displayedImages];
    newImages.splice(index, 1);
    setDisplayedImages(newImages);
    onImagesUpdate(newImages);
    
    if (imageToDelete) {
      console.log(`🗑️ Suppression de l'image pour ${contentKey}:`, imageToDelete);
      
      supabase
        .from("site_content_images")
        .delete()
        .match({ 
          image_url: imageToDelete,
          key_name: contentKey
        })
        .then(({ error: deleteError }) => {
          if (deleteError) {
            console.error('❌ Erreur lors de la suppression:', deleteError);
          } else {
            console.log(`✅ Image supprimée avec succès de ${contentKey}`);
          }
        });
    }
    
    if (currentIndex >= newImages.length) {
      setCurrentIndex(Math.max(0, newImages.length - 1));
    }
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const imgElement = e.target as HTMLImageElement;
    if (imgElement && imgElement.src) {
      imgElement.src = '/placeholder.svg'; // Fallback image URL
    }
  };

  const moveImage = (fromIndex: number, toIndex: number) => {
    const newImages = [...displayedImages];
    const [movedItem] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, movedItem);
    
    setDisplayedImages(newImages);
    onImagesUpdate(newImages);
    
    // Update the order of images in the database
    const updateImagesOrder = async () => {
      try {
        // 1. Get all entries for these images
        const { data: existingEntries, error: fetchError } = await supabase
          .from("site_content_images")
          .select("*")
          .in("image_url", newImages);
          
        if (fetchError) {
          console.error('❌ Error fetching entries for reordering:', fetchError);
          return;
        }
        
        if (!existingEntries || existingEntries.length === 0) {
          console.log('⚠️ No entries found for reordering');
          return;
        }
        
        console.log('✅ Existing entries retrieved for reordering:', existingEntries.length);
        
        // 2. Sort entries to match new order
        const sortedEntries = newImages.map(imageUrl => 
          existingEntries.find(entry => entry.image_url === imageUrl)
        ).filter(Boolean);
        
        // 3. Update timestamps to reflect new order
        const now = new Date();
        const updates = sortedEntries.map((entry, index) => ({
          id: entry.id,
          created_at: new Date(now.getTime() + index).toISOString() // Increment timestamps by 1ms each
        }));
        
        // 4. Update entries with new timestamps
        for (const update of updates) {
          const { error: updateError } = await supabase
            .from("site_content_images")
            .update({ created_at: update.created_at })
            .eq("id", update.id);
            
          if (updateError) {
            console.error('❌ Error updating entry order:', updateError);
          }
        }
        
        console.log('✅ Images reordered successfully in database');
      } catch (error) {
        console.error('❌ Error updating image order:', error);
      }
    };
    
    updateImagesOrder();
    
    // Update currentIndex if needed
    if (currentIndex === fromIndex) {
      setCurrentIndex(toIndex);
    } else if (currentIndex > fromIndex && currentIndex <= toIndex) {
      setCurrentIndex(currentIndex - 1);
    } else if (currentIndex < fromIndex && currentIndex >= toIndex) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    
    if (sourceIndex === destinationIndex) return;
    
    moveImage(sourceIndex, destinationIndex);
  };

  const toggleImagePanel = () => {
    setShowImagePanel(!showImagePanel);
  };

  return (
    <div 
      ref={containerRef}
      className="relative rounded-lg overflow-hidden h-60 mb-4"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {(isEditMode || globalEditMode) && (
        <button
          onClick={toggleImagePanel}
          className="absolute top-2 left-2 z-30 bg-white/80 rounded-full p-1 shadow hover:bg-white transition-colors"
          title="Gérer les images"
        >
          <Menu size={20} />
        </button>
      )}

      {displayedImages.length > 0 ? (
        <>
          <div className="h-full w-full relative p-2">
            {displayedImages.map((image, index) => (
              <div 
                key={index}
                className={`absolute top-0 left-0 w-full h-full transition-opacity duration-500 p-2 ${
                  index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
                }`}
              >
                <img
                  src={image}
                  alt={`${packName} image ${index + 1}`}
                  className="w-full h-full object-contain bg-transparent"
                  onError={handleImageError}
                />
                {!showImagePanel && (isEditMode || globalEditMode) && (
                  <button
                    onClick={(e) => handleImageDelete(e, index)}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors z-20"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {!showImagePanel && displayedImages.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80 rounded-full p-1 shadow hover:bg-white transition-colors z-20"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={goToNext}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/80 rounded-full p-1 shadow hover:bg-white transition-colors z-20"
              >
                <ChevronRight size={24} />
              </button>
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1 z-20">
                {displayedImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentIndex(index);
                    }}
                    className={`w-2 h-2 rounded-full ${
                      index === currentIndex ? 'bg-white' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            </>
          )}

          {/* Image Management Panel */}
          {showImagePanel && (
            <div className="absolute inset-0 bg-white/95 z-30 p-4 overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold">Gérer les images</h3>
                <button 
                  onClick={toggleImagePanel}
                  className="bg-gray-200 p-1 rounded-full hover:bg-gray-300 transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
              </div>
              
              {displayedImages.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  Aucune image ajoutée
                </div>
              ) : (
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="imageList">
                    {(provided) => (
                      <ul 
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-2"
                      >
                        {displayedImages.map((image, index) => (
                          <Draggable key={image} draggableId={image} index={index}>
                            {(provided) => (
                              <li
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className="flex items-center bg-gray-100 rounded p-2 gap-2"
                              >
                                <div className="w-16 h-16 flex-shrink-0 bg-gray-200 rounded overflow-hidden">
                                  <img 
                                    src={image} 
                                    alt={`Image ${index + 1}`}
                                    className="w-full h-full object-cover"
                                    onError={handleImageError}
                                  />
                                </div>
                                <div className="flex-grow text-sm truncate">
                                  {image.split('/').pop()}
                                </div>
                                <div className="flex gap-1">
                                  <button
                                    onClick={(e) => handleImageDelete(e, index)}
                                    className="bg-red-500 text-white p-1 rounded hover:bg-red-600 transition-colors"
                                    title="Supprimer"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </li>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </ul>
                    )}
                  </Droppable>
                </DragDropContext>
              )}
              
              <div className="mt-4 flex justify-center">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors flex items-center gap-2"
                >
                  <Upload size={16} />
                  Ajouter des images
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-full">
          {(isEditMode || globalEditMode) ? (
            <>
              <Upload size={32} className="text-gray-400 mb-2" />
              <p className="text-gray-500 text-sm">Déposez des images ici ou cliquez pour télécharger</p>
            </>
          ) : (
            <p className="text-gray-500">Aucune image disponible</p>
          )}
        </div>
      )}
      
      {(isEditMode || globalEditMode) && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageUpload}
          className="hidden"
        />
      )}
      
      {(isEditMode || globalEditMode) && displayedImages.length === 0 && (
        <div 
          className="absolute inset-0 cursor-pointer flex items-center justify-center"
          onClick={() => fileInputRef.current?.click()}
        ></div>
      )}
    </div>
  );
};

export default Carousel;
