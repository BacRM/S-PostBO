/**
 * Helper pour communiquer avec l'extension S-Post via window.postMessage
 * Pas besoin d'injection de script - évite les erreurs CSP
 */

/**
 * Appel API Notion via l'extension
 */
export async function notionApiCall(endpoint, method = 'GET', body = null, token = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const requestId = 'notion_' + Date.now() + '_' + Math.random();
    
    const handler = (event) => {
      // Vérifier que le message vient du content script (même origine)
      if (event.data && event.data.type === 'SPOST_NOTION_API_RESPONSE' && event.data.requestId === requestId) {
        window.removeEventListener('message', handler);
        if (event.data.error) {
          reject(new Error(event.data.error));
        } else {
          resolve(event.data.response);
        }
      }
    };
    
    window.addEventListener('message', handler);
    
    // Envoyer la requête au content script
    window.postMessage({
      type: 'SPOST_NOTION_API_CALL',
      requestId: requestId,
      endpoint: endpoint,
      method: method,
      body: body,
      token: token,
      headers: headers
    }, '*');
    
    // Timeout après 30 secondes
    setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Timeout: pas de réponse pour Notion API'));
    }, 30000);
  });
}

/**
 * Vérifier si l'extension est disponible
 */
export async function checkExtensionAvailable() {
  return new Promise((resolve) => {
    const requestId = 'check_' + Date.now();
    
    const handler = (event) => {
      if (event.data && event.data.type === 'SPOST_EXTENSION_CHECK_RESPONSE' && event.data.requestId === requestId) {
        window.removeEventListener('message', handler);
        resolve(event.data.available || false);
      }
    };
    
    window.addEventListener('message', handler);
    
    window.postMessage({
      type: 'SPOST_EXTENSION_CHECK',
      requestId: requestId
    }, '*');
    
    setTimeout(() => {
      window.removeEventListener('message', handler);
      resolve(false);
    }, 2000);
  });
}

/**
 * Attendre que l'API S-Post soit disponible
 * Vérifie d'abord si disponible, puis attend l'événement ou vérifie périodiquement
 */
async function waitForSPostAPI(timeout = 10000) {
  // Vérification immédiate avec plusieurs tentatives
  let api = null;
  
  // Essayer plusieurs fois immédiatement (au cas où le script vient de s'injecter)
  for (let i = 0; i < 5; i++) {
    api = window.SPost || window.LinkedInPlanner;
    if (api && typeof api.publishNow === 'function') {
      console.log('[spost-api] ✅ API disponible immédiatement (tentative', i + 1, ')');
      return api;
    }
    if (i < 4) {
      await new Promise(resolve => setTimeout(resolve, 50)); // Attendre 50ms entre chaque tentative
    }
  }
  
  console.log('[spost-api] ⏳ API non disponible après 5 tentatives, attente...');
  console.log('[spost-api] window.SPost:', typeof window.SPost);
  if (window.SPost) {
    console.log('[spost-api] window.SPost keys:', Object.keys(window.SPost));
    console.log('[spost-api] window.SPost.publishNow:', typeof window.SPost.publishNow);
  }
  console.log('[spost-api] window.LinkedInPlanner:', typeof window.LinkedInPlanner);
  if (window.LinkedInPlanner) {
    console.log('[spost-api] window.LinkedInPlanner keys:', Object.keys(window.LinkedInPlanner));
  }
  
  // Attendre l'événement SPostReady OU vérifier périodiquement
  return new Promise((resolve, reject) => {
    let resolved = false;
    const maxAttempts = timeout / 100; // 100ms par tentative
    
    const checkAPI = () => {
      api = window.SPost || window.LinkedInPlanner;
      if (api && typeof api.publishNow === 'function') {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          clearInterval(checkInterval);
          window.removeEventListener('SPostReady', handler);
          window.removeEventListener('LinkedInPlannerReady', handler);
          console.log('[spost-api] ✅ API trouvée!');
          resolve(api);
        }
        return true;
      }
      return false;
    };
    
    const handler = () => {
      if (!resolved && checkAPI()) {
        return;
      }
    };
    
    // Écouter les événements
    window.addEventListener('SPostReady', handler, { once: true });
    window.addEventListener('LinkedInPlannerReady', handler, { once: true });
    
    // Vérifier périodiquement (au cas où l'événement est déjà passé)
    let attempts = 0;
    const checkInterval = setInterval(() => {
      if (checkAPI()) {
        return;
      }
      attempts++;
      if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
      }
    }, 100);
    
    // Timeout final
    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        clearInterval(checkInterval);
        window.removeEventListener('SPostReady', handler);
        window.removeEventListener('LinkedInPlannerReady', handler);
        console.error('[spost-api] ❌ Timeout après', timeout, 'ms');
        console.error('[spost-api] window.SPost:', window.SPost);
        console.error('[spost-api] window.LinkedInPlanner:', window.LinkedInPlanner);
        console.error('[spost-api] Vérifiez dans la console si vous voyez "[S-Post Bridge] ✅ Prêt"');
        reject(new Error(`Timeout: Extension S-Post non disponible après ${timeout}ms. Vérifiez que l'extension est active et rechargée.`));
      }
    }, timeout);
  });
}

/**
 * Publier un post directement sur LinkedIn
 * Utilise uniquement l'API directe window.SPost.publishNow (comme PerfectPost)
 */
export async function publishPostNow(post) {
  console.log('[spost-api] publishPostNow appelé avec post:', { id: post?.id, hasContent: !!post?.content });
  
  // Vérification directe avant d'attendre
  console.log('[spost-api] 🔍 Vérification directe de window.SPost...');
  console.log('[spost-api] window existe:', typeof window !== 'undefined');
  console.log('[spost-api] window.SPost:', typeof window !== 'undefined' ? typeof window.SPost : 'window non défini');
  console.log('[spost-api] window.LinkedInPlanner:', typeof window !== 'undefined' ? typeof window.LinkedInPlanner : 'window non défini');
  
  if (typeof window !== 'undefined' && window.SPost && typeof window.SPost.publishNow === 'function') {
    console.log('[spost-api] ✅ window.SPost.publishNow disponible directement, utilisation immédiate');
    try {
      const result = await window.SPost.publishNow(post);
      console.log('[spost-api] ✅ Publication réussie:', result);
      return result;
    } catch (error) {
      console.error('[spost-api] ❌ Erreur lors de l\'appel direct:', error);
      throw error;
    }
  }
  
  try {
    // Attendre que l'API soit disponible (timeout augmenté à 10s comme PerfectPost)
    console.log('[spost-api] ⏳ window.SPost non disponible, attente...');
    const api = await waitForSPostAPI(10000);
    
    console.log('[spost-api] ✅ API trouvée, utilisation de window.SPost.publishNow');
    
    const result = await api.publishNow(post);
    console.log('[spost-api] ✅ Publication réussie:', result);
    return result;
  } catch (error) {
    console.error('[spost-api] ❌ Erreur publication:', error);
    console.error('[spost-api] 🔍 Diagnostic final:');
    console.error('[spost-api] - window.SPost:', typeof window !== 'undefined' ? window.SPost : 'window non défini');
    console.error('[spost-api] - window.LinkedInPlanner:', typeof window !== 'undefined' ? window.LinkedInPlanner : 'window non défini');
    console.error('[spost-api] - Vérifiez dans la console si vous voyez "[S-Post Bridge] ✅ Prêt"');
    throw error;
  }
}

/**
 * Programmer un post sur LinkedIn
 * Utilise uniquement l'API directe window.SPost.schedulePost (comme PerfectPost)
 * @param {Object} post - Le post à programmer
 * @param {number|string} scheduledDate - Date programmée (timestamp en ms ou ISO string)
 */
export async function schedulePost(post, scheduledDate) {
  console.log('[spost-api] schedulePost appelé avec post:', { id: post?.id, scheduledDate, type: typeof scheduledDate });
  
  try {
    // Convertir la date en timestamp si c'est une chaîne ISO
    let timestamp;
    if (typeof scheduledDate === 'string') {
      const date = new Date(scheduledDate);
      if (isNaN(date.getTime())) {
        throw new Error(`Date invalide: ${scheduledDate}`);
      }
      timestamp = date.getTime();
    } else if (typeof scheduledDate === 'number') {
      timestamp = scheduledDate;
    } else {
      throw new Error(`Format de date invalide: ${scheduledDate} (type: ${typeof scheduledDate})`);
    }
    
    // Vérifier que le timestamp est valide (pas NaN ou Infinity)
    if (isNaN(timestamp) || !isFinite(timestamp)) {
      throw new Error(`Timestamp invalide: ${timestamp}`);
    }
    
    console.log('[spost-api] 📅 Timestamp calculé:', timestamp, 'Date:', new Date(timestamp).toISOString());
    
    // Vérifier que le timestamp est dans le futur
    if (timestamp <= Date.now()) {
      throw new Error('La date de publication doit être dans le futur');
    }
    
    // Ajouter scheduledAt au post (l'extension attend post.scheduledAt)
    const postWithSchedule = {
      ...post,
      scheduledAt: new Date(timestamp).toISOString(), // Format ISO pour l'extension
    };
    
    console.log('[spost-api] 📤 Post avec scheduledAt:', {
      id: postWithSchedule.id,
      scheduledAt: postWithSchedule.scheduledAt,
      timestamp: timestamp
    });
    
    // Attendre que l'API soit disponible (timeout augmenté à 10s comme PerfectPost)
    const api = await waitForSPostAPI(10000);
    
    console.log('[spost-api] ✅ API trouvée, utilisation de window.SPost.schedulePost');
    
    // L'extension attend seulement le post avec scheduledAt
    const result = await api.schedulePost(postWithSchedule);
    console.log('[spost-api] ✅ Programmation réussie:', result);
    return result;
  } catch (error) {
    console.error('[spost-api] ❌ Erreur programmation:', error);
    throw error;
  }
}

/**
 * Vérifier si LinkedIn est connecté
 */
export async function isLinkedInConnected() {
  // Méthode 1: Vérifier via l'API de l'extension
  const api = window.SPost || window.LinkedInPlanner;
  if (api && api.isConnected) {
    try {
      const connected = await api.isConnected();
      if (connected) {
        return true;
      }
    } catch (error) {
      console.warn('[spost-api] Erreur vérification API extension:', error);
    }
  }
  
  // Méthode 2: Vérifier localStorage comme fallback
  try {
    const linkedInData = localStorage.getItem('spost_linkedin_data');
    if (linkedInData) {
      const data = JSON.parse(linkedInData);
      // Considérer comme connecté si on a un csrf ou un profil
      if (data.connected === true || (data.csrf && data.profile)) {
        return true;
      }
    }
  } catch (error) {
    console.warn('[spost-api] Erreur vérification localStorage:', error);
  }
  
  return false;
}


