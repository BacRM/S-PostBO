/**
 * API pour publier directement sur LinkedIn via l'API OAuth
 * Similaire à S-Plugin (localhost:3000) qui utilise l'API LinkedIn directement
 */

import { getToken, getUser } from '../config/linkedin';

/**
 * Publier un post directement sur LinkedIn via l'API OAuth
 * Utilise le même format que S-Plugin pour garantir la compatibilité
 */
export async function publishPostToLinkedInAPI(text) {
  console.log('[LinkedIn API] 📤 Publication via API LinkedIn...');
  
  // Récupérer le token depuis localStorage
  const tokenData = getToken();
  if (!tokenData || !tokenData.access_token) {
    throw new Error('Token LinkedIn non disponible. Veuillez vous connecter via les paramètres.');
  }

  const accessToken = tokenData.access_token;
  console.log('[LinkedIn API] ✅ Token récupéré');

  // Utiliser l'endpoint proxy Vite pour éviter les problèmes CORS
  // Le proxy gère la récupération du profil et la publication
  console.log('[LinkedIn API] 📤 Publication via endpoint proxy Vite...');
  
  try {
    const postResponse = await fetch('/api/linkedin/publish', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text.trim(),
        accessToken: accessToken,
      }),
    });

    console.log('[LinkedIn API] 📥 Réponse reçue:', postResponse.status, postResponse.statusText);

    // Lire la réponse
    const responseData = await postResponse.json().catch(async () => {
      // Si JSON échoue, essayer de lire le texte
      const text = await postResponse.text();
      return { error: text || 'Unknown error' };
    });

    console.log('[LinkedIn API] 📥 Données réponse:', responseData);

    if (!postResponse.ok) {
      console.error('[LinkedIn API] ❌ Erreur publication:', {
        status: postResponse.status,
        statusText: postResponse.statusText,
        data: responseData
      });
      
      // Gérer les erreurs spécifiques
      if (postResponse.status === 403) {
        const errorCode = responseData.errorCode || responseData.error || '';
        const errorMessage = responseData.message || responseData.error_description || responseData.details?.message || '';
        if (errorCode.includes('INSUFFICIENT_PERMISSIONS') || errorMessage.includes('insufficient_scope') || errorMessage.includes('w_member_social')) {
          throw new Error('Permission w_member_social requise. Vérifiez vos permissions LinkedIn dans les paramètres et reconnectez-vous.');
        }
        throw new Error(`Permission refusée (403): ${errorMessage || 'Vérifiez vos permissions LinkedIn'}`);
      }
      
      if (postResponse.status === 401) {
        throw new Error('Token expiré ou invalide. Veuillez vous reconnecter via le bouton OAuth.');
      }

      if (postResponse.status === 400) {
        throw new Error(responseData.error || responseData.message || 'Erreur de requête (400)');
      }

      const errorMsg = responseData.error || responseData.message || responseData.details?.message || 'Erreur inconnue';
      throw new Error(`Erreur publication (${postResponse.status}): ${errorMsg}`);
    }

    // Vérifier que la réponse contient les données attendues
    if (!responseData.success && !responseData.postUrn && !responseData.id) {
      throw new Error('Réponse invalide du serveur');
    }

    console.log('[LinkedIn API] ✅ Post créé avec succès:', responseData.postUrn || responseData.id);
    
    return {
      success: true,
      postUrn: responseData.postUrn || responseData.id,
      postId: responseData.postId || responseData.id,
      id: responseData.id,
      data: responseData.data || responseData,
    };
  } catch (error) {
    console.error('[LinkedIn API] ❌ Erreur lors de la publication:', error);
    
    // Si c'est déjà une erreur avec message, la relancer
    if (error.message) {
      throw error;
    }
    
    throw new Error(`Erreur lors de la publication: ${error.toString()}`);
  }
}

/**
 * Vérifier si un token LinkedIn valide est disponible
 */
export function hasValidLinkedInToken() {
  const tokenData = getToken();
  if (!tokenData || !tokenData.access_token) {
    return false;
  }
  
  // Vérifier si le token est expiré
  if (tokenData.expires_at && Date.now() > tokenData.expires_at) {
    return false;
  }
  
  return true;
}

