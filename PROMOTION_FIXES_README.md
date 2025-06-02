# 🎯 Correction de la Gestion des Promotions

## 🔥 Problème Initial

Les `lookup_key` des promotions pour produits sans variante étaient toujours formatés comme `prod_XYZ_main:default_promo`, ce qui générait des erreurs Stripe si une ancienne promotion existait.

## ✅ Solution Implémentée

### 1. **Lookup Keys Uniques avec Timestamp**

**Fichier modifié**: `supabase/functions/sync-stripe-variant/index.ts`

```typescript
if (isDiscount) {
  // Pour les promotions, ajouter un timestamp pour garantir l'unicité
  const timestamp = Date.now();
  lookupKey = `${stripeProductId}_${comboKey}_promo_${timestamp}`;
  nickname = `${baseOption}_promo_${timestamp}`;
  logs.push(`[SYNC-STRIPE] 🎯 Prix promotionnel: ajout timestamp ${timestamp} pour unicité`);
} else {
  // Pour les prix normaux, garder la logique existante
  lookupKey = `${stripeProductId}_${comboKey}`;
  nickname = baseOption;
}
```

### 2. **Colonne Active dans product_prices**

**Migration créée**: `supabase/migrations/add_active_column_to_product_prices.sql`

- Ajoute une colonne `active` (BOOLEAN, défaut: true)
- Optimise les requêtes avec un index sur `(product_id, is_discount, active)`
- Permet de désactiver d'anciennes promotions sans les supprimer

### 3. **Logique de Récupération Améliorée**

**Fichier modifié**: `src/stores/useCartStore.ts` - fonction `getDiscountedPrice`

```typescript
// 🎯 NOUVEAU: Récupérer le prix promotionnel depuis product_prices
const { data: activePromoData } = await supabase
  .from('product_prices')
  .select('stripe_price_id, lookup_key')
  .eq('product_id', `prod_${cleanProductId}`)
  .eq('variant_label', 'main')
  .eq('variant_value', 'default')
  .eq('is_discount', true)
  .eq('active', true)
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle();
```

## 🚀 Résultats Attendus

1. **✅ Plus de conflits Stripe** : Chaque promotion a un lookup_key unique
2. **✅ Gestion propre des promotions** : Les anciennes promotions restent en base mais deviennent inactives
3. **✅ Performance optimisée** : Index pour les requêtes fréquentes
4. **✅ Compatibilité maintenue** : Fallback vers l'ancienne méthode si besoin

## 🛠️ Instructions de Déploiement

1. **Appliquer la migration SQL** :
   ```bash
   npx supabase db push
   ```

2. **Déployer la fonction Edge** :
   ```bash
   npx supabase functions deploy sync-stripe-variant
   ```

3. **Tester la création d'une promotion** :
   - Aller sur une fiche produit sans variante
   - Appliquer une réduction
   - Vérifier que le nouveau lookup_key contient un timestamp

## 🔍 Vérifications Post-Déploiement

- [ ] Les nouveaux prix promotionnels ont des lookup_key avec timestamp
- [ ] La table `product_prices` contient la colonne `active`
- [ ] Les promotions actives sont correctement récupérées
- [ ] Pas d'erreurs Stripe lors de la création de nouvelles promotions

## 📋 Points d'Attention

- **Rétrocompatibilité** : L'ancienne méthode reste active en fallback
- **Performance** : L'index optimise les requêtes sur les promotions actives
- **Unicité** : Chaque promotion a maintenant un identifiant temporel unique 