-- Requête pour afficher les entrées de description existantes
SELECT content_key, content 
FROM editable_content 
WHERE content_key LIKE 'product_%_description';

-- Requête pour convertir les clés avec préfixe shopify_ vers le format sans préfixe
UPDATE editable_content
SET content_key = REPLACE(content_key, 'product_shopify_', 'product_')
WHERE content_key LIKE 'product_shopify_%_description';

-- Requête pour identifier les clés qui feront doublon après conversion
SELECT REPLACE(content_key, 'product_shopify_', 'product_') as normalized_key, 
       COUNT(*) as duplicate_count
FROM editable_content
WHERE content_key LIKE 'product_%_description'
GROUP BY normalized_key
HAVING COUNT(*) > 1;

-- Requête pour supprimer les doublons et conserver les entrées les plus récentes
DELETE FROM editable_content
WHERE id NOT IN (
  SELECT MAX(id)
  FROM editable_content
  WHERE content_key LIKE 'product_%_description'
  GROUP BY REPLACE(content_key, 'product_shopify_', 'product_')
);

-- Requête pour vérifier les résultats après nettoyage
SELECT content_key, content 
FROM editable_content 
WHERE content_key LIKE 'product_%_description'
ORDER BY content_key; 