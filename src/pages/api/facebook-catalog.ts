import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchStripeProducts } from '@/lib/api/stripe';
import { supabase } from '@/integrations/supabase/client';
import { Parser } from 'json2csv';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // 1. Récupère tous les produits
    const products = await fetchStripeProducts();
    const productIds = products.map(p => p.id);

    // 2. Récupère toutes les infos éditables Supabase utiles
    const keys = [
      ...productIds.map(id => `product_${id}_stock`),
      ...productIds.map(id => `product_${id}_discount_percentage`),
      ...productIds.map(id => `product_${id}_discount_price`),
      ...productIds.map(id => `product_${id}_brand`),
      ...productIds.map(id => `product_${id}_category`),
      ...productIds.map(id => `product_${id}_description`),
      ...productIds.map(id => `product_${id}_reference`),
      ...productIds.map(id => `product_${id}_gtin`),
      ...productIds.map(id => `product_${id}_mpn`),
    ];
    const { data: editableData } = await supabase
      .from('editable_content')
      .select('content_key, content')
      .in('content_key', keys);
    const editableMap = Object.fromEntries((editableData || []).map(item => [item.content_key, item.content]));

    // 3. Construit le tableau pour le CSV
    const rows = products.map(prod => {
      const id = prod.id;
      const title = prod.title;
      const description = editableMap[`product_${id}_description`] || prod.description || '';
      const price = prod.price?.toFixed(2) + ' EUR';
      const sale_price = editableMap[`product_${id}_discount_price`] ? (parseFloat(editableMap[`product_${id}_discount_price`]).toFixed(2) + ' EUR') : '';
      const availability = (parseInt(editableMap[`product_${id}_stock`] || prod.stock || '0', 10) > 0) ? 'in stock' : 'out of stock';
      const condition = 'new';
      const link = `https://aqua-reve.com/produits/${encodeURIComponent(title)}?id=${id}`;
      const image_link = prod.image || '';
      const brand = editableMap[`product_${id}_brand`] || prod.metadata?.brand || '';
      const category = editableMap[`product_${id}_category`] || prod.metadata?.category || '';
      const reference = editableMap[`product_${id}_reference`] || prod.metadata?.reference || '';
      const gtin = editableMap[`product_${id}_gtin`] || prod.metadata?.gtin || '';
      const mpn = editableMap[`product_${id}_mpn`] || prod.metadata?.mpn || '';
      return {
        id,
        title,
        description,
        availability,
        condition,
        price,
        sale_price,
        link,
        image_link,
        brand,
        category,
        reference,
        gtin,
        mpn,
      };
    });

    // 4. Génère le CSV
    const fields = [
      'id', 'title', 'description', 'availability', 'condition',
      'price', 'sale_price', 'link', 'image_link', 'brand', 'category', 'reference', 'gtin', 'mpn'
    ];
    const parser = new Parser({ fields });
    const csv = parser.parse(rows);

    // 5. Envoie la réponse CSV
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="facebook-catalog.csv"');
    res.status(200).send(csv);
  } catch (error: any) {
    console.error('Erreur génération catalogue Facebook:', error);
    res.status(500).json({ error: 'Erreur génération catalogue Facebook', details: error.message });
  }
} 