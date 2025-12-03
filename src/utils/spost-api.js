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

