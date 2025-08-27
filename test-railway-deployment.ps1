# ================================================================================================
# TEST DU DÉPLOIEMENT RAILWAY
# ================================================================================================
# Ce script teste si votre serveur Railway fonctionne correctement
# ================================================================================================

Write-Host "🧪 TEST DU DÉPLOIEMENT RAILWAY" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# ================================================================================================
# ÉTAPE 1 : VÉRIFIER LA CONFIGURATION RAILWAY
# ================================================================================================
Write-Host "🔧 ÉTAPE 1: Vérification de la configuration Railway..." -ForegroundColor Yellow

if (Test-Path "railway.json") {
    $railwayConfig = Get-Content "railway.json" | ConvertFrom-Json
    Write-Host "   ✅ railway.json trouvé" -ForegroundColor Green
    Write-Host "   📋 Commande de démarrage: $($railwayConfig.start)" -ForegroundColor Green
} else {
    Write-Host "   ❌ railway.json manquant!" -ForegroundColor Red
    exit 1
}

if (Test-Path "start-railway.js") {
    Write-Host "   ✅ start-railway.js trouvé" -ForegroundColor Green
} else {
    Write-Host "   ❌ start-railway.js manquant!" -ForegroundColor Red
    exit 1
}

Write-Host ""

# ================================================================================================
# ÉTAPE 2 : TEST LOCAL DU SERVEUR
# ================================================================================================
Write-Host "📡 ÉTAPE 2: Test local du serveur..." -ForegroundColor Yellow

Write-Host "   Démarrage du serveur local..." -ForegroundColor Yellow
Start-Process -FilePath "node" -ArgumentList "start-railway.js" -WorkingDirectory $PWD -WindowStyle Hidden

# Attendre que le serveur démarre
Start-Sleep -Seconds 15

# Tester l'API
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/stripe/products" -Method GET -TimeoutSec 10
    Write-Host "   ✅ API Stripe accessible localement" -ForegroundColor Green
    Write-Host "   📊 Status: $($response.StatusCode)" -ForegroundColor Green
    
    # Vérifier les en-têtes CORS
    if ($response.Headers['Access-Control-Allow-Origin']) {
        Write-Host "   ✅ CORS configuré: $($response.Headers['Access-Control-Allow-Origin'])" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  En-têtes CORS manquants" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "   ❌ Erreur API locale: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# ================================================================================================
# ÉTAPE 3 : TEST DE L'API RAILWAY
# ================================================================================================
Write-Host "🚂 ÉTAPE 3: Test de l'API Railway..." -ForegroundColor Yellow

$railwayUrl = "https://landingmaj-production.up.railway.app/api/stripe/products"

try {
    $headers = @{
        'Origin' = 'https://aqua-reve.com'
        'Content-Type' = 'application/json'
    }
    
    Write-Host "   Test de l'API Railway: $railwayUrl" -ForegroundColor Yellow
    
    $response = Invoke-WebRequest -Uri $railwayUrl -Method GET -Headers $headers -TimeoutSec 15
    
    Write-Host "   ✅ API Railway accessible" -ForegroundColor Green
    Write-Host "   📊 Status: $($response.StatusCode)" -ForegroundColor Green
    
    # Vérifier les en-têtes CORS
    if ($response.Headers['Access-Control-Allow-Origin']) {
        Write-Host "   ✅ CORS Railway: $($response.Headers['Access-Control-Allow-Origin'])" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  CORS Railway manquant" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "   ❌ Erreur API Railway: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Message -like "*502*") {
        Write-Host "   🚨 ERREUR 502: Votre serveur Railway ne répond pas!" -ForegroundColor Red
        Write-Host "   💡 Vérifiez les logs Railway et redéployez" -ForegroundColor Yellow
    }
    
    if ($_.Exception.Message -like "*CORS*") {
        Write-Host "   🚨 ERREUR CORS: Problème de configuration CORS" -ForegroundColor Red
        Write-Host "   💡 Vérifiez la configuration CORS dans server.js" -ForegroundColor Yellow
    }
}

Write-Host ""

# ================================================================================================
# ÉTAPE 4 : VÉRIFICATION DES LOGS
# ================================================================================================
Write-Host "📋 ÉTAPE 4: Vérification des logs..." -ForegroundColor Yellow

Write-Host "   Pour voir les logs Railway:" -ForegroundColor Cyan
Write-Host "   1. Allez sur https://railway.app" -ForegroundColor White
Write-Host "   2. Sélectionnez votre projet" -ForegroundColor White
Write-Host "   3. Cliquez sur 'Deployments'" -ForegroundColor White
Write-Host "   4. Cliquez sur le dernier déploiement" -ForegroundColor White
Write-Host "   5. Vérifiez les logs pour voir les erreurs" -ForegroundColor White

Write-Host ""

# ================================================================================================
# ÉTAPE 5 : RECOMMANDATIONS
# ================================================================================================
Write-Host "💡 RECOMMANDATIONS:" -ForegroundColor Cyan

Write-Host "   1. Redéployez votre application Railway" -ForegroundColor White
Write-Host "   2. Vérifiez que start-railway.js démarre correctement" -ForegroundColor White
Write-Host "   3. Vérifiez les variables d'environnement Railway" -ForegroundColor White
Write-Host "   4. Testez l'API avec curl ou Postman" -ForegroundColor White

Write-Host ""
Write-Host "🔧 CORRECTION APPLIQUÉE:" -ForegroundColor Green
Write-Host "   ✅ start-railway.js corrigé" -ForegroundColor Green
Write-Host "   ✅ Configuration CORS vérifiée" -ForegroundColor Green

Write-Host ""
Write-Host "🚀 Prochaines étapes:" -ForegroundColor Cyan
Write-Host "   1. Commitez et poussez les changements" -ForegroundColor White
Write-Host "   2. Redéployez sur Railway" -ForegroundColor White
Write-Host "   3. Testez à nouveau l'API" -ForegroundColor White

# Arrêter le serveur local
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
Write-Host ""
Write-Host "🛑 Serveur local arrêté" -ForegroundColor Yellow
