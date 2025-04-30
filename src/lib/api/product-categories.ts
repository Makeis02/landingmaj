import { supabase } from "@/integrations/supabase/client";

/**
 * Récupérer les catégories liées à un produit donné
 */
export async function fetchProductCategories(productId: string) {
  const { data, error } = await supabase
    .from('product_categories')
    .select('category_id')
    .eq('product_id', productId);

  if (error) throw error;

  return data.map((d) => d.category_id);
}

/**
 * Mettre à jour les catégories d'un produit
 */
export async function updateProductCategories(productId: string, categoryIds: string[]) {
  // Supprimer les anciennes catégories
  const { error: deleteError } = await supabase
    .from('product_categories')
    .delete()
    .eq('product_id', productId);

  if (deleteError) throw deleteError;

  // Si aucune catégorie n'est sélectionnée, pas besoin d'insérer
  if (categoryIds.length === 0) return;

  // Insérer les nouvelles catégories
  const inserts = categoryIds.map((categoryId) => ({
    product_id: productId,
    category_id: categoryId,
  }));

  const { error: insertError } = await supabase
    .from('product_categories')
    .insert(inserts);

  if (insertError) throw insertError;
}

/**
 * Récupérer les catégories pour plusieurs produits en une seule requête
 */
export async function fetchCategoriesForProducts(productIds: string[]) {
  if (productIds.length === 0) return {};

  const { data, error } = await supabase
    .from('product_categories')
    .select('product_id, category_id')
    .in('product_id', productIds);

  if (error) throw error;

  // Organiser les résultats par product_id
  const result: Record<string, string[]> = {};
  
  productIds.forEach(id => {
    result[id] = [];
  });

  data.forEach((item) => {
    if (!result[item.product_id]) {
      result[item.product_id] = [];
    }
    result[item.product_id].push(item.category_id);
  });

  return result;
} 