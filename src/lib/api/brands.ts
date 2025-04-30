import { supabase } from "@/integrations/supabase/client";

export interface Brand {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  created_at: string;
}

export async function fetchBrands() {
  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return data as Brand[];
}

export async function createBrand(brand: {
  name: string;
  slug: string;
  image_url?: string | null;
}) {
  const { data, error } = await supabase
    .from("brands")
    .insert([brand])
    .select()
    .single();

  if (error) throw error;
  return data as Brand;
}

export async function updateBrand(id: string, brand: Partial<Brand>) {
  const { data, error } = await supabase
    .from("brands")
    .update(brand)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Brand;
}

export async function deleteBrand(id: string) {
  const { error } = await supabase
    .from("brands")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

/**
 * Récupérer la marque liée à un produit
 */
export async function fetchProductBrand(productId: string) {
  const { data, error } = await supabase
    .from('product_brands')
    .select('brand_id')
    .eq('product_id', productId)
    .maybeSingle();

  if (error) throw error;

  return data?.brand_id || null;
}

/**
 * Mettre à jour la marque d'un produit
 */
export async function updateProductBrand(productId: string, brandId: string | null) {
  // Supprimer l'ancienne relation si elle existe
  const { error: deleteError } = await supabase
    .from('product_brands')
    .delete()
    .eq('product_id', productId);

  if (deleteError) throw deleteError;

  // Si aucune marque n'est sélectionnée, pas besoin d'insérer
  if (!brandId) return;

  // Insérer la nouvelle relation
  const { error: insertError } = await supabase
    .from('product_brands')
    .insert({
      product_id: productId,
      brand_id: brandId,
    });

  if (insertError) throw insertError;
}

/**
 * Récupérer les marques pour plusieurs produits en une seule requête
 */
export async function fetchBrandsForProducts(productIds: string[]) {
  if (productIds.length === 0) return {};

  const { data, error } = await supabase
    .from('product_brands')
    .select('product_id, brand_id')
    .in('product_id', productIds);

  if (error) throw error;

  // Organiser les résultats par product_id
  const result: Record<string, string | null> = {};
  
  productIds.forEach(id => {
    result[id] = null;
  });

  data.forEach((item) => {
    result[item.product_id] = item.brand_id;
  });

  return result;
} 