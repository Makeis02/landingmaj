import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEditStore } from '@/stores/useEditStore';
import { ChevronLeft, ChevronRight, Upload, Trash2, ArrowUp, ArrowDown, Menu } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

interface CarouselProps {
  packName: any;
  images?: any[];
  speed: any;
  onImagesUpdate: any;
  isEditMode?: boolean;
}

const Carousel: React.FC<CarouselProps> = ({ packName, images = [], speed = 5000, onImagesUpdate, isEditMode }) => {
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
        // Générer la clé de contenu en fonction du nom du pack
        const packNameLower = packName.toLowerCase().replace(/\s+/g, '_');
        
        // Récupérer les images avec les deux formats de clé possibles
        console.log("🔍 Tentative de récupération des images pour le pack:", packName);
        console.log("🔑 Format de clé 1:", `pack_${packNameLower}_images`);
        console.log("🔑 Format de clé 2:", `pack_${packNameLower.replace('_', '-')}-image-%`);
        
        // Première requête avec le format pack_basix_images
        const { data: data1, error: error1 } = await supabase
          .from("site_content_images")
          .select("image_url")
          .eq("key_name", `pack_${packNameLower}_images`);
          
        // Deuxième requête avec le format pack_basix-image-X
        const { data: data2, error: error2 } = await supabase
          .from("site_content_images")
          .select("image_url")
          .like("key_name", `pack_${packNameLower.replace('_', '-')}-image-%`);
          
        console.log("📊 Résultats format 1:", data1?.length || 0, "images");
        console.log("📊 Résultats format 2:", data2?.length || 0, "images");

        // Gérer les erreurs de récupération
        if (error1) console.error("❌ Erreur lors de la récupération des images (format 1):", error1);
        if (error2) console.error("❌ Erreur lors de la récupération des images (format 2):", error2);
        
        if (error1 && error2) {
          console.error("❌ Échec de récupération des images avec les deux formats");
          return;
        }

        // Combiner les résultats des deux requêtes
        const allData = [...(data1 || []), ...(data2 || [])];
        
        // Vérifier si des images ont été récupérées
        if (allData.length > 0) {
          const imageUrls = allData.map((item) => item.image_url);
          console.log("🖼️ Images récupérées:", imageUrls);
          
          // Vérifier si les images sont différentes de celles déjà affichées
          const currentUrls = new Set(displayedImages);
          const hasNewImages = imageUrls.some(url => !currentUrls.has(url)) || 
                              displayedImages.length !== imageUrls.length;
                              
          if (hasNewImages) {
            console.log("🔄 Mise à jour des images affichées avec les nouvelles images");
            setDisplayedImages(imageUrls); // Mettre à jour les images affichées
            onImagesUpdate(imageUrls);      // Mettre à jour le parent si nécessaire
          } else {
            console.log("ℹ️ Aucune nouvelle image à afficher");
          }
        } else {
          console.log("⚠️ Aucune image trouvée pour ce pack.");
        }
      } catch (err) {
        console.error("❌ Erreur inattendue lors de la récupération des images:", err);
      }
    };

    // Exécuter la récupération des images seulement si displayedImages est vide
    if (displayedImages.length === 0) {
      console.log("🔍 Démarrage de la récupération des images car displayedImages est vide");
      fetchImages();
    } else {
      console.log("ℹ️ Récupération des images ignorée car displayedImages contient déjà", displayedImages.length, "images");
    }
  }, [packName, onImagesUpdate, displayedImages]);

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

    for (const file of files) {
      try {
        const packNameLower = packName.toLowerCase().replace(/\s+/g, '-');
        const filePath = `${packNameLower}/${Date.now()}-${file.name}`;
        const { data, error } = await supabase.storage
          .from('images')
          .upload(filePath, file);

        if (error) {
          console.error('Error uploading image:', error);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('images')
          .getPublicUrl(filePath);

        if (urlData && urlData.publicUrl) {
          newImageUrls.push(urlData.publicUrl);
          
          // Trouver le prochain index disponible pour ce pack
          const { data: existingImages } = await supabase
            .from("site_content_images")
            .select("key_name")
            .like("key_name", `pack_${packNameLower}-image-%`);
            
          const existingIndexes = existingImages
            ? existingImages.map(item => {
                const match = item.key_name.match(/pack_.*-image-(\d+)/);
                return match ? parseInt(match[1]) : -1;
              }).filter(index => index !== -1)
            : [];
            
          const nextIndex = existingIndexes.length > 0 
            ? Math.max(...existingIndexes) + 1 
            : 0;
            
          // Utiliser le format de clé pack_basix-image-X
          const contentKey = `pack_${packNameLower}-image-${nextIndex}`;
          console.log("🔑 Enregistrement de l'image avec la clé:", contentKey);
          
          // Enregistrer l'image dans la table site_content_images
          const { error: insertError } = await supabase
            .from("site_content_images")
            .insert({
              key_name: contentKey,
              image_url: urlData.publicUrl,
              created_at: new Date().toISOString()
            });

          if (insertError) {
            console.error('Error saving image to site_content_images:', insertError);
          } else {
            console.log('Image successfully saved to site_content_images with key:', contentKey);
          }
        }
      } catch (error) {
        console.error('Error in upload process:', error);
      }
    }

    if (newImageUrls.length > 0) {
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
    
    // Supprimer l'image de la table site_content_images
    if (imageToDelete) {
      const packNameLower = packName.toLowerCase().replace(/\s+/g, '-');
      
      // Rechercher l'entrée correspondant à cette URL d'image
      supabase
        .from("site_content_images")
        .select("key_name")
        .eq("image_url", imageToDelete)
        .then(({ data, error }) => {
          if (error) {
            console.error('Erreur lors de la recherche de l\'image à supprimer:', error);
            return;
          }
          
          if (data && data.length > 0) {
            const keyToDelete = data[0].key_name;
            console.log("🗑️ Suppression de l'image avec la clé:", keyToDelete);
            
            // Supprimer l'entrée
            supabase
              .from("site_content_images")
              .delete()
              .eq("key_name", keyToDelete)
              .eq("image_url", imageToDelete)
              .then(({ error: deleteError }) => {
                if (deleteError) {
                  console.error('Erreur lors de la suppression de l\'image:', deleteError);
                } else {
                  console.log('✅ Image supprimée avec succès de site_content_images');
                }
              });
          } else {
            console.log("⚠️ Aucune entrée trouvée pour cette URL d'image:", imageToDelete);
          }
        });
    }
    
    // Reset currentIndex if needed
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
    
    // Mettre à jour l'ordre des images dans la base de données
    const packNameLower = packName.toLowerCase().replace(/\s+/g, '-');
    
    // Approche: récupérer toutes les entrées, les supprimer, puis les réinsérer dans le nouvel ordre
    const updateImagesOrder = async () => {
      try {
        // 1. Récupérer toutes les entrées pour ce pack
        const { data: existingEntries, error: fetchError } = await supabase
          .from("site_content_images")
          .select("*")
          .like("key_name", `pack_${packNameLower}-image-%`);
          
        if (fetchError) {
          console.error('Erreur lors de la récupération des entrées pour réorganisation:', fetchError);
          return;
        }
        
        if (!existingEntries || existingEntries.length === 0) {
          console.log('Aucune entrée trouvée pour réorganisation');
          return;
        }
        
        console.log('Entrées existantes récupérées pour réorganisation:', existingEntries.length);
        
        // 2. Trier les entrées par URL d'image pour correspondre à l'ordre actuel
        const sortedEntries = [];
        for (const imageUrl of newImages) {
          const entry = existingEntries.find(e => e.image_url === imageUrl);
          if (entry) {
            sortedEntries.push(entry);
          }
        }
        
        // 3. Supprimer toutes les entrées existantes
        const { error: deleteError } = await supabase
          .from("site_content_images")
          .delete()
          .like("key_name", `pack_${packNameLower}-image-%`);
          
        if (deleteError) {
          console.error('Erreur lors de la suppression des entrées pour réorganisation:', deleteError);
          return;
        }
        
        // 4. Réinsérer les entrées dans le nouvel ordre avec des clés mises à jour
        const entriesToInsert = sortedEntries.map((entry, index) => ({
          key_name: `pack_${packNameLower}-image-${index}`,
          image_url: entry.image_url,
          created_at: new Date().toISOString()
        }));
        
        const { error: insertError } = await supabase
          .from("site_content_images")
          .insert(entriesToInsert);
          
        if (insertError) {
          console.error('Erreur lors de la réinsertion des entrées après réorganisation:', insertError);
        } else {
          console.log('Images réorganisées avec succès dans la base de données');
        }
      } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'ordre des images:', error);
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
