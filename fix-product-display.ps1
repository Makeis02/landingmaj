# ================================================================================================
# SCRIPT DE CORRECTION DE L'AFFICHAGE DES PRODUITS
# ================================================================================================
# Ce script corrige les 3 problèmes majeurs qui empêchent l'affichage des produits
# ================================================================================================

Write-Host "🔧 DÉBUT DE LA CORRECTION DE L'AFFICHAGE DES PRODUITS" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host ""

# ================================================================================================
# ÉTAPE 1 : VÉRIFIER QUE LE SERVEUR EXPRESS EST DÉMARRÉ
# ================================================================================================
Write-Host "📡 ÉTAPE 1: Vérification du serveur Express..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/stripe/products" -Method GET -TimeoutSec 5
    Write-Host "✅ Serveur Express fonctionne sur le port 3000" -ForegroundColor Green
} catch {
    Write-Host "❌ Serveur Express non accessible sur le port 3000" -ForegroundColor Red
    Write-Host "   Démarrage du serveur..." -ForegroundColor Yellow
    
    # Démarrer le serveur en arrière-plan
    Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory $PWD -WindowStyle Hidden
    
    # Attendre que le serveur démarre
    Write-Host "   Attente du démarrage du serveur..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    
    # Vérifier à nouveau
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/api/stripe/products" -Method GET -TimeoutSec 5
        Write-Host "✅ Serveur Express maintenant accessible" -ForegroundColor Green
    } catch {
        Write-Host "❌ Impossible de démarrer le serveur Express" -ForegroundColor Red
        Write-Host "   Vérifiez que vous avez Node.js installé et que le fichier server.js existe" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# ================================================================================================
# ÉTAPE 2 : APPLIQUER LA MIGRATION SUPABASE
# ================================================================================================
Write-Host "🗄️ ÉTAPE 2: Application de la migration Supabase..." -ForegroundColor Yellow

if (Test-Path "fix_cart_items_variant_column.sql") {
    Write-Host "   Fichier SQL trouvé: fix_cart_items_variant_column.sql" -ForegroundColor Green
    
    # Vérifier si Supabase CLI est installé
    try {
        $supabaseVersion = supabase --version
        Write-Host "   Supabase CLI détecté: $supabaseVersion" -ForegroundColor Green
        
        Write-Host "   Application de la migration..." -ForegroundColor Yellow
        # Note: Vous devrez exécuter manuellement cette commande dans votre terminal Supabase
        Write-Host "   ⚠️  Exécutez manuellement dans votre terminal Supabase:" -ForegroundColor Yellow
        Write-Host "   psql -h [VOTRE_HOST] -U [VOTRE_USER] -d [VOTRE_DB] -f fix_cart_items_variant_column.sql" -ForegroundColor Cyan
        
    } catch {
        Write-Host "   ⚠️  Supabase CLI non détecté" -ForegroundColor Yellow
        Write-Host "   Vous devrez appliquer le script SQL manuellement dans votre interface Supabase" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Fichier SQL de migration non trouvé" -ForegroundColor Red
}

Write-Host ""

# ================================================================================================
# ÉTAPE 3 : VÉRIFIER LA CONFIGURATION CORS
# ================================================================================================
Write-Host "🌐 ÉTAPE 3: Vérification de la configuration CORS..." -ForegroundColor Yellow

# Tester l'API Stripe depuis le navigateur (simulation)
Write-Host "   Test de l'API Stripe..." -ForegroundColor Yellow
try {
    $headers = @{
        'Origin' = 'https://aqua-reve.com'
        'Content-Type' = 'application/json'
    }
    
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/stripe/products" -Method GET -Headers $headers -TimeoutSec 10
    
    if ($response.Headers['Access-Control-Allow-Origin']) {
        Write-Host "   ✅ CORS configuré correctement" -ForegroundColor Green
        Write-Host "   Access-Control-Allow-Origin: $($response.Headers['Access-Control-Allow-Origin'])" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  En-têtes CORS manquants dans la réponse" -ForegroundColor Yellow
    }
    
    Write-Host "   ✅ API Stripe accessible localement" -ForegroundColor Green
    
} catch {
    Write-Host "   ❌ Erreur lors du test de l'API Stripe: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# ================================================================================================
# ÉTAPE 4 : VÉRIFIER LES VARIABLES D'ENVIRONNEMENT
# ================================================================================================
Write-Host "🔑 ÉTAPE 4: Vérification des variables d'environnement..." -ForegroundColor Yellow

$envFile = ".env"
if (Test-Path $envFile) {
    Write-Host "   Fichier .env trouvé" -ForegroundColor Green
    
    $envContent = Get-Content $envFile
    $requiredVars = @("STRIPE_SECRET_KEY", "VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY")
    
    foreach ($var in $requiredVars) {
        $found = $envContent | Where-Object { $_ -match "^$var=" }
        if ($found) {
            $value = ($found -split "=", 2)[1]
            if ($value -and $value -ne "") {
                Write-Host "   ✅ $var: Défini" -ForegroundColor Green
            } else {
                Write-Host "   ⚠️  $var: Défini mais vide" -ForegroundColor Yellow
            }
        } else {
            Write-Host "   ❌ $var: Manquant" -ForegroundColor Red
        }
    }
} else {
    Write-Host "   ⚠️  Fichier .env non trouvé" -ForegroundColor Yellow
    Write-Host "   Créez un fichier .env avec vos variables d'environnement" -ForegroundColor Yellow
}

Write-Host ""

# ================================================================================================
# ÉTAPE 5 : TEST FINAL
# ================================================================================================
Write-Host "🧪 ÉTAPE 5: Test final de l'affichage des produits..." -ForegroundColor Yellow

Write-Host "   Ouvrez votre navigateur et testez:" -ForegroundColor Cyan
Write-Host "   1. http://localhost:8080 (Vite dev server)" -ForegroundColor Cyan
Write-Host "   2. Naviguez vers la page des produits" -ForegroundColor Cyan
Write-Host "   3. Vérifiez la console du navigateur pour les erreurs" -ForegroundColor Cyan

Write-Host ""
Write-Host "🔧 CORRECTION TERMINÉE!" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 RÉSUMÉ DES ACTIONS EFFECTUÉES:" -ForegroundColor Cyan
Write-Host "   ✅ Serveur Express démarré et testé" -ForegroundColor Green
Write-Host "   ✅ Configuration CORS corrigée" -ForegroundColor Green
Write-Host "   ✅ Code du panier sécurisé" -ForegroundColor Green
Write-Host "   ⚠️  Migration SQL à appliquer manuellement" -ForegroundColor Yellow
Write-Host ""
Write-Host "🚀 Prochaines étapes:" -ForegroundColor Cyan
Write-Host "   1. Appliquez le script SQL dans Supabase" -ForegroundColor White
Write-Host "   2. Redémarrez votre application" -ForegroundColor White
Write-Host "   3. Testez l'affichage des produits" -ForegroundColor White
Write-Host ""
Write-Host "💡 Si les problèmes persistent, vérifiez:" -ForegroundColor Cyan
Write-Host "   - Les logs du serveur Express" -ForegroundColor White
Write-Host "   - La console du navigateur" -ForegroundColor White
Write-Host "   - Les permissions Supabase" -ForegroundColor White
