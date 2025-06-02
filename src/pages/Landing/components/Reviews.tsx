import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EditableText } from "@/components/EditableText";
import { useEditStore } from "@/stores/useEditStore";
import { useState, useEffect } from "react";
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';

// Types pour les notifications et le rating
type NotificationType = 'success' | 'error';
type Notification = {
  type: NotificationType;
  message: string;
};

interface ReviewType {
  id: string;
  customer_name: string;
  comment: string;
  profile_picture: string;
  created_at: string;
  is_approved: boolean;
  rating?: number;
  updated_at?: string;
  admin_reply?: string;
  custom_date?: string;
  date_text?: string;
}

const relativeDate = (dateString: string) => {
  if (!dateString) return "Date inconnue";
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Date invalide";

  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  const diffInMonths = Math.floor(diffInDays / 30);

  if (diffInMinutes < 60) return "Il y a quelques minutes";
  if (diffInHours < 24) return `Il y a ${diffInHours} heures`;
  if (diffInDays < 30) return `Il y a ${diffInDays} jours`;
  return `Il y a ${diffInMonths} mois`;
};

// Composant pour les étoiles
const StarRating = ({ rating, onRatingChange, readonly = false }: { rating: number; onRatingChange?: (rating: number) => void; readonly?: boolean }) => {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex items-center space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onRatingChange?.(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          disabled={readonly}
          className={`${readonly ? 'cursor-default' : 'cursor-pointer'}`}
        >
          <svg
            className={`w-5 h-5 transition-colors ${
              star <= (hover || rating)
                ? 'text-[#0074b3] fill-[#0074b3]'
                : 'text-gray-300'
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
    </div>
  );
};

interface ReviewsProps {
  productId?: string;
}

const Reviews = ({ productId }: ReviewsProps) => {
  const { isEditMode } = useEditStore();
  const [showAddComment, setShowAddComment] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [newRating, setNewRating] = useState(5);
  const [commentText, setCommentText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const queryClient = useQueryClient();

  // Fonction pour ajouter un log de debug
  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  // Auto-hide notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showNotification = (type: NotificationType, message: string) => {
    setNotification({ type, message });
  };

  // Récupérer les avis avec le productId
  const { data: reviews, refetch } = useQuery({
    queryKey: ["customer-reviews", productId],
    queryFn: async () => {
      addDebugLog(`🔄 Fetching reviews pour le produit: ${productId}`);
      let query = supabase
        .from("customer_reviews")
        .select("*")
        .order("created_at", { ascending: false });

      if (productId) {
        query = query.eq("product_id", productId);
      }

      const { data, error } = await query;

      if (error) {
        addDebugLog(`❌ Erreur au fetch des reviews : ${error.message}`);
        throw new Error(error.message);
      }

      addDebugLog(`✅ Reviews récupérées : ${data?.length || 0} avis`);
      return data || [];
    }
  });

  const handleUpdateReview = async (id: string, field: string, newValue: string) => {
    console.log("handleUpdateReview lancé !");
    console.log("Détails update :", { id, field, newValue });

    if (!reviews?.some(r => r.id === id)) {
      console.warn("Review non trouvée pour l'id :", id);
      return;
    }

    try {
      let updatePayload: any = {};

      if (field === "date_text") {
        updatePayload = {
          date_text: newValue,
          updated_at: new Date().toISOString()
        };
      } else {
        updatePayload = {
          [field]: newValue,
          updated_at: new Date().toISOString()
        };
      }

      console.log("Payload envoyé à Supabase :", updatePayload);

      const { error } = await supabase
        .from("customer_reviews")
        .update(updatePayload)
        .eq("id", id);

      if (!error) {
        console.log("✅ Update réussi !");
        await queryClient.invalidateQueries({ queryKey: ["customer-reviews"] });
        console.log("✅ Cache invalidé !");
      } else {
        console.error("❌ Erreur Supabase :", error);
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour :", error);
    }
  };

  const handleAddReview = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const form = e.currentTarget;
    const formData = new FormData(form);
    const customer_name = formData.get("customer_name") as string;
    const comment = commentText;

    if (!customer_name || !comment) {
      setIsSubmitting(false);
      return;
    }

    try {
      addDebugLog(`💬 Envoi avis: rating=${newRating}, comment=${comment.substring(0, 50)}..., productId=${productId}`);
      const { error } = await supabase.from("customer_reviews").insert({
        customer_name,
        comment,
        is_approved: false,
        created_at: new Date().toISOString(),
        rating: newRating,
        product_id: productId
      });

      if (!error) {
        form.reset();
        setCommentText("");
        setNewRating(5);
        await refetch();
        addDebugLog("✅ Avis ajouté avec succès");
        showNotification('success', 'Commentaire ajouté avec succès ! Il sera visible après validation par notre équipe.');
        setShowAddComment(false);
      } else {
        addDebugLog(`❌ Erreur Supabase: ${error.message}`);
        showNotification('error', 'Une erreur est survenue lors de l\'envoi du commentaire. Veuillez réessayer.');
      }
    } catch (error) {
      addDebugLog(`❌ Erreur envoi commentaire : ${error.message}`);
      showNotification('error', 'Une erreur est survenue lors de l\'envoi du commentaire. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveReview = async (id: string) => {
    const { error } = await supabase
      .from("customer_reviews")
      .update({ is_approved: true })
      .eq("id", id);

    if (!error) {
      refetch();
    } else {
      console.error("Erreur validation :", error);
    }
  };

  const handleDeleteReview = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet avis ?")) return;
    
    const { error } = await supabase
      .from("customer_reviews")
      .delete()
      .eq("id", id);

    if (!error) {
      refetch();
    } else {
      console.error("Erreur suppression :", error);
    }
  };

  const reviewsToDisplay = reviews ? (isEditMode ? reviews : reviews.filter((r) => r.is_approved)) : [];

  const getDisplayDate = (review: ReviewType) => {
    const dateToUse = review.date_text || review.updated_at || review.created_at;
    return relativeDate(dateToUse);
  };

  return (
    <div>
      {/* Notification */}
      {notification && (
        <div className={`p-4 mb-4 rounded-lg ${notification.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {notification.message}
        </div>
      )}

      {/* Liste des avis */}
      <div className="space-y-6">
            {reviewsToDisplay.map((review) => (
              <Card key={review.id} className="p-8 hover:shadow-lg transition-shadow">
                <div className="flex items-start space-x-4">
                  <Avatar className="h-12 w-12 hover:scale-105 transition-transform">
                    <AvatarImage src={review.profile_picture || ""} alt={review.customer_name} />
                    <AvatarFallback>👤</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-slate-900">
                        {isEditMode ? (
                          <EditableText
                            contentKey={`review_name_${review.id}`}
                            initialContent={review.customer_name}
                            onUpdate={(newText) => handleUpdateReview(review.id, "customer_name", newText)}
                          />
                        ) : (
                          review.customer_name
                        )}
                      </h3>
                      <StarRating rating={review.rating || 0} readonly />
                    </div>
                    <p className="text-sm text-slate-500">
                      {isEditMode ? (
                        <input
                          type="date"
                          className="border rounded-md p-2 text-sm"
                          value={
                            review.date_text && !isNaN(new Date(review.date_text).getTime())
                              ? new Date(review.date_text).toISOString().substring(0, 10)
                              : ''
                          }
                          onChange={(e) => {
                            if (e.target.value) {
                              const selectedDate = new Date(e.target.value).toISOString();
                              handleUpdateReview(review.id, "date_text", selectedDate);
                            }
                          }}
                        />
                      ) : (
                        getDisplayDate(review)
                      )}
                    </p>
                    <p className="mt-2 text-slate-700">
                      {isEditMode ? (
                        <EditableText
                          contentKey={`review_comment_${review.id}`}
                          initialContent={review.comment}
                          onUpdate={(newText) => handleUpdateReview(review.id, "comment", newText)}
                        />
                      ) : (
                        review.comment
                      )}
                    </p>

                    {/* Affichage de la réponse admin */}
                    {review.admin_reply && !isEditMode && (
                      <div className="mt-4 ml-6 p-4 bg-slate-100 rounded-md text-slate-700">
                        <p className="text-sm font-semibold mb-2">Réponse de l'équipe :</p>
                        <p>{review.admin_reply}</p>
                      </div>
                    )}

                    {/* Edition de la réponse en mode admin */}
                    {isEditMode && (
                      <div className="mt-4 ml-6">
                        <p className="text-sm font-medium text-slate-600 mb-2">Réponse de l'équipe :</p>
                        <EditableText
                          contentKey={`admin_reply_${review.id}`}
                          initialContent={review.admin_reply || "Cliquez pour ajouter une réponse..."}
                          onUpdate={(newText) => handleUpdateReview(review.id, "admin_reply", newText)}
                          className="p-3 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors"
                        />
                      </div>
                    )}

                    {/* Boutons admin existants */}
                    {isEditMode && (
                      <div className="flex space-x-4 mt-4">
                        {!review.is_approved && (
                          <button
                            onClick={() => handleApproveReview(review.id)}
                            className="text-green-500 hover:underline"
                          >
                            Valider
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteReview(review.id)}
                          className="text-red-500 hover:underline"
                        >
                          Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
            {reviewsToDisplay.length === 0 && (
              <p className="text-center text-gray-500 py-8">Aucun avis pour le moment...</p>
            )}
          </div>

      {/* Formulaire d'ajout d'avis */}
        {showAddComment && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 w-full max-w-md relative">
              <button
                onClick={() => setShowAddComment(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>

              <form onSubmit={handleAddReview} className="space-y-4">
                <div className="flex flex-col items-center mb-4">
                  <p className="text-slate-700 mb-2">Votre note</p>
                  <StarRating rating={newRating} onRatingChange={setNewRating} />
                </div>
                <input
                  type="text"
                  name="customer_name"
                  placeholder="Votre nom"
                  required
                  disabled={isSubmitting}
                  className="w-full border p-3 rounded-md focus:ring-2 focus:ring-[#0074b3] focus:border-transparent disabled:opacity-50"
                />
                <div className="relative">
                  <textarea
                    name="comment"
                    placeholder="Votre commentaire (emojis autorisés ✨)"
                    required
                    disabled={isSubmitting}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="w-full border p-3 rounded-md h-28 focus:ring-2 focus:ring-[#0074b3] focus:border-transparent disabled:opacity-50"
                  />
                  
                  {/* Bouton Emoji */}
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(prev => !prev)}
                    className="absolute bottom-4 right-4 text-2xl"
                  >
                    😊
                  </button>

                  {/* Emoji Picker */}
                  {showEmojiPicker && (
                    <div className="absolute bottom-20 right-0 z-50">
                      <Picker
                        data={data}
                        onEmojiSelect={(emoji: any) => {
                          setCommentText((prev) => prev + emoji.native);
                          setShowEmojiPicker(false);
                        }}
                        theme="light"
                      />
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#0074b3] hover:bg-[#00639c] text-white font-bold px-6 py-3 rounded-md w-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Envoi en cours...
                    </span>
                  ) : "Envoyer"}
                </button>
              </form>
            </div>
          </div>
        )}

      {/* Bouton pour ajouter un avis */}
      {!showAddComment && (
        <div className="text-center mt-8">
          <button
            onClick={() => setShowAddComment(true)}
            className="bg-[#0074b3] hover:bg-[#00639c] text-white font-semibold px-6 py-3 rounded-xl transition"
          >
            Ajouter un commentaire
          </button>
        </div>
      )}

      {/* Debug Panel (visible uniquement en mode édition) */}
      {isEditMode && (
        <div className="mt-8 border border-yellow-200 bg-yellow-50 rounded-lg p-4">
          <h3 className="font-bold mb-2 text-yellow-800">🛠️ Debug Panel - Avis</h3>
          <div className="space-y-2">
            <div>
              <strong>Product ID:</strong> {productId || 'non défini'}
            </div>
            <div>
              <strong>Nombre d'avis:</strong> {reviews?.length || 0}
            </div>
            <div>
              <strong>Logs:</strong>
              <div className="mt-2 bg-yellow-100 p-3 rounded text-xs font-mono max-h-40 overflow-y-auto">
                {debugLogs.length === 0 ? (
                  <span className="text-gray-500">Aucun log disponible</span>
                ) : (
                  debugLogs.map((log, index) => (
                    <div key={index} className="mb-1">{log}</div>
                  ))
                )}
              </div>
            </div>
            <div>
              <strong>Dernier avis:</strong>
              <pre className="mt-2 bg-yellow-100 p-3 rounded text-xs font-mono max-h-40 overflow-y-auto">
                {reviews?.[0] ? JSON.stringify(reviews[0], null, 2) : 'Aucun avis'}
              </pre>
            </div>
          </div>
        </div>
      )}
      </div>
  );
};

export default Reviews;