-- 📋 REQUÊTE SQL POUR LES MENTIONS LÉGALES DU FOOTER

-- Voir tous les liens des mentions légales (Colonne 1 du footer)
SELECT 
  content_key,
  content as url_ou_titre,
  updated_at
FROM editable_content 
WHERE content_key LIKE 'footer_column1_%'
ORDER BY content_key;

-- Requête alternative si les mentions légales sont dans une autre colonne
SELECT 
  content_key,
  content,
  updated_at
FROM editable_content 
WHERE content_key IN (
  'footer_column1_title',
  'footer_column1_link_1', 
  'footer_column1_link_2',
  'footer_column1_link_3'
)
ORDER BY content_key; 