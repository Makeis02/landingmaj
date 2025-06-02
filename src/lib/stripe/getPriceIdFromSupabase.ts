import { supabase } from "@/integrations/supabase/client";

export async function getPriceIdForProduct(productId: string, variant?: string) {
  let priceKey = `product_${productId}_stripe_price_id`;

  // Si variante, on tente d'abord la clé variante
  if (variant) {
    const [label, option] = variant.split(":");
    const variantIndexData = await supabase
      .from('editable_content')
      .select('content_key')
      .like('content_key', `product_${productId}_variant_%_label`)
      .eq('content', label)
      .single();

    const match = variantIndexData?.data?.content_key?.match(/variant_(\d+)_label/);
    if (match) {
      const idx = match[1];
      priceKey = `product_${productId}_variant_${idx}_option_${option}_stripe_price_id`;
      // On tente la clé variante
      const { data } = await supabase
        .from('editable_content')
        .select('content')
        .eq('content_key', priceKey)
        .single();
      if (data?.content) return data.content;
    }
    // Si pas trouvé, on retombe sur la clé de base
    priceKey = `product_${productId}_stripe_price_id`;
  }

  // On tente la clé de base
  const { data } = await supabase
    .from('editable_content')
    .select('content')
    .eq('content_key', priceKey)
    .single();

  return data?.content || null;
} 