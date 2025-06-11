-- 📊 REQUÊTES SQL POUR VISUALISER LE CONTENU DU FOOTER

-- 1. 🏷️ Voir tous les éléments du footer dans editable_content
SELECT 
  content_key,
  content,
  created_at,
  updated_at
FROM editable_content 
WHERE content_key LIKE '%footer%' 
   OR content_key LIKE '%social%'
   OR content_key LIKE '%newsletter%'
   OR content_key LIKE '%trustpilot%'
   OR content_key LIKE '%logo%'
ORDER BY content_key;

-- 2. 🔗 Liens du footer (Mentions Légales, Liens Utiles, etc.)
SELECT 
  content_key,
  content,
  updated_at
FROM editable_content 
WHERE content_key LIKE 'footer_%_link_%'
   OR content_key LIKE 'footer_%_title'
ORDER BY content_key;

-- 3. 📱 Réseaux sociaux
SELECT 
  content_key,
  content,
  updated_at
FROM editable_content 
WHERE content_key LIKE '%social_%'
ORDER BY content_key;

-- 4. 📧 Newsletter et abonnements
SELECT 
  content_key,
  content,
  updated_at
FROM editable_content 
WHERE content_key LIKE '%newsletter%'
ORDER BY content_key;

-- 5. ⭐ Trustpilot
SELECT 
  content_key,
  content,
  updated_at
FROM editable_content 
WHERE content_key LIKE '%trustpilot%'
ORDER BY content_key;

-- 6. 🖼️ Logo du footer
SELECT 
  content_key,
  content,
  updated_at
FROM editable_content 
WHERE content_key LIKE '%logo%'
ORDER BY content_key;

-- 7. 📊 REQUÊTE GLOBALE - Tout le contenu du footer
SELECT 
  content_key,
  CASE 
    WHEN LENGTH(content) > 100 THEN SUBSTRING(content, 1, 100) || '...'
    ELSE content
  END as content_preview,
  LENGTH(content) as content_length,
  updated_at
FROM editable_content 
WHERE content_key IN (
  'footer_description',
  'footer_column1_title',
  'footer_column2_title', 
  'footer_column3_title',
  'footer_newsletter_title',
  'footer_newsletter_description',
  'footer_logo',
  'social_facebook',
  'social_instagram', 
  'social_twitter',
  'social_linkedin',
  'social_youtube',
  'social_tiktok',
  'trustpilot_url'
)
OR content_key LIKE 'footer_%_link_%'
ORDER BY 
  CASE 
    WHEN content_key LIKE 'footer_description%' THEN 1
    WHEN content_key LIKE 'footer_column%' THEN 2
    WHEN content_key LIKE 'footer_newsletter%' THEN 3
    WHEN content_key LIKE 'social_%' THEN 4
    WHEN content_key LIKE 'trustpilot%' THEN 5
    ELSE 6
  END,
  content_key;

-- 8. 📈 Statistiques du footer
SELECT 
  COUNT(*) as total_elements,
  COUNT(CASE WHEN content_key LIKE 'footer_%' THEN 1 END) as footer_elements,
  COUNT(CASE WHEN content_key LIKE 'social_%' THEN 1 END) as social_elements,
  COUNT(CASE WHEN content_key LIKE '%newsletter%' THEN 1 END) as newsletter_elements,
  COUNT(CASE WHEN content IS NULL OR content = '' THEN 1 END) as empty_elements
FROM editable_content 
WHERE content_key LIKE '%footer%' 
   OR content_key LIKE '%social%'
   OR content_key LIKE '%newsletter%'
   OR content_key LIKE '%trustpilot%'
   OR content_key LIKE '%logo%';

-- 9. 🔍 Rechercher un élément spécifique du footer
-- SELECT * FROM editable_content WHERE content_key = 'REMPLACER_PAR_CLE_RECHERCHEE';

-- 10. 📅 Dernières modifications du footer
SELECT 
  content_key,
  content,
  updated_at
FROM editable_content 
WHERE (content_key LIKE '%footer%' 
   OR content_key LIKE '%social%'
   OR content_key LIKE '%newsletter%'
   OR content_key LIKE '%trustpilot%')
   AND updated_at IS NOT NULL
ORDER BY updated_at DESC
LIMIT 10;

-- 11. 🎯 REQUÊTE SPÉCIFIQUE - Éléments visibles dans le footer en ce moment
SELECT 
  content_key,
  content
FROM editable_content 
WHERE content_key IN (
  'footer_description',
  'footer_column1_title',
  'footer_column1_link_1',
  'footer_column1_link_2', 
  'footer_column1_link_3',
  'footer_column2_title',
  'footer_column2_link_1',
  'footer_column2_link_2',
  'footer_column2_link_3',
  'footer_column3_title',
  'footer_newsletter_title',
  'footer_newsletter_description',
  'social_facebook',
  'social_instagram'
)
ORDER BY content_key;

-- 12. 🆔 Table newsletter_subscribers (si elle existe)
-- SELECT email, status, source, created_at FROM newsletter_subscribers ORDER BY created_at DESC LIMIT 20;

-- 13. 🔧 REQUÊTE DE MAINTENANCE - Trouver les clés orphelines
SELECT content_key, content 
FROM editable_content 
WHERE (content_key LIKE '%footer%' OR content_key LIKE '%social%')
  AND content_key NOT IN (
    'footer_description', 'footer_column1_title', 'footer_column2_title', 
    'footer_column3_title', 'footer_newsletter_title', 'footer_newsletter_description',
    'footer_column1_link_1', 'footer_column1_link_2', 'footer_column1_link_3',
    'footer_column2_link_1', 'footer_column2_link_2', 'footer_column2_link_3',
    'social_facebook', 'social_instagram', 'social_twitter', 'social_linkedin',
    'social_youtube', 'social_tiktok', 'trustpilot_url', 'footer_logo'
  )
ORDER BY content_key; 