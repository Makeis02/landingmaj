// Script de test pour vérifier l'import de Supabase
import { supabase } from './src/integrations/supabase/client.js';

async function testSupabaseConnection() {
  console.log('📌 Test de connexion à Supabase...');
  
  try {
    // Tenter une requête simple
    const { data, error } = await supabase
      .from('editable_content')
      .select('content_key')
      .limit(1);
    
    if (error) {
      console.error('❌ Erreur de connexion:', error);
      return;
    }
    
    console.log('✅ Connexion Supabase réussie!');
    console.log('📊 Données récupérées:', data);
  } catch (error) {
    console.error('❌ Exception lors de la connexion:', error);
  }
}

// Exécuter le test
testSupabaseConnection(); 