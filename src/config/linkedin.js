// Configuration LinkedIn OAuth 2.0
// Utilise les mêmes credentials que S-Plugin (localhost:3000)
export const LINKEDIN_CONFIG = {
  CLIENT_ID: '788o101klmxmq4', // Même que S-Plugin
  CLIENT_SECRET: 'WPL_AP1.jvwuoOV4tcRnWMHK.Y2m+fA==', // Même que S-Plugin
  REDIRECT_URI: 'http://localhost:5174/callback', // Port 5174 pour S-PostBO
  
  // Scopes disponibles avec les produits activés
  SCOPES: [
    'openid',           // OpenID Connect
    'profile',          // Profil de base
    'email',            // Email
    'w_member_social',  // Publier des posts
  ],
  
  // URLs OAuth LinkedIn
  AUTH_URL: 'https://www.linkedin.com/oauth/v2/authorization',
  TOKEN_URL: 'https://www.linkedin.com/oauth/v2/accessToken',
  
  // API URLs
  API_BASE: 'https://api.linkedin.com/v2',
  USERINFO_URL: 'https://api.linkedin.com/v2/userinfo',
};

// Générer l'URL d'autorisation
export function getAuthorizationUrl() {
  const state = generateState();
  localStorage.setItem('linkedin_oauth_state', state);
  
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: LINKEDIN_CONFIG.CLIENT_ID,
    redirect_uri: LINKEDIN_CONFIG.REDIRECT_URI,
    state: state,
    scope: LINKEDIN_CONFIG.SCOPES.join(' '),
  });
  
  return `${LINKEDIN_CONFIG.AUTH_URL}?${params.toString()}`;
}

// Générer un state aléatoire pour la sécurité CSRF
function generateState() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

// Échanger le code contre un token (côté serveur normalement, mais pour le dev local)
export async function exchangeCodeForToken(code) {
  // Note: En production, ceci devrait être fait côté serveur
  // car le Client Secret ne doit pas être exposé côté client
  
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: LINKEDIN_CONFIG.REDIRECT_URI,
    client_id: LINKEDIN_CONFIG.CLIENT_ID,
    client_secret: LINKEDIN_CONFIG.CLIENT_SECRET,
  });

  try {
    // Utiliser un proxy CORS pour le développement
    const response = await fetch('https://corsproxy.io/?' + encodeURIComponent(LINKEDIN_CONFIG.TOKEN_URL), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[LinkedIn OAuth] Token exchange error:', error);
    throw error;
  }
}

// Récupérer les infos utilisateur avec le token
export async function getUserInfo(accessToken) {
  try {
    const response = await fetch('https://corsproxy.io/?' + encodeURIComponent(LINKEDIN_CONFIG.USERINFO_URL), {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`UserInfo failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[LinkedIn OAuth] UserInfo error:', error);
    throw error;
  }
}

// Sauvegarder le token
export function saveToken(tokenData) {
  const expiresAt = Date.now() + (tokenData.expires_in * 1000);
  const data = {
    access_token: tokenData.access_token,
    expires_at: expiresAt,
    refresh_token: tokenData.refresh_token,
  };
  localStorage.setItem('linkedin_token', JSON.stringify(data));
  return data;
}

// Récupérer le token
export function getToken() {
  const data = localStorage.getItem('linkedin_token');
  if (!data) return null;
  
  const parsed = JSON.parse(data);
  
  // Vérifier si le token est expiré
  if (parsed.expires_at && Date.now() > parsed.expires_at) {
    localStorage.removeItem('linkedin_token');
    return null;
  }
  
  return parsed;
}

// Supprimer le token (logout)
export function clearToken() {
  localStorage.removeItem('linkedin_token');
  localStorage.removeItem('linkedin_user');
}

// Sauvegarder les infos utilisateur
export function saveUser(userInfo) {
  localStorage.setItem('linkedin_user', JSON.stringify(userInfo));
}

// Récupérer les infos utilisateur
export function getUser() {
  const data = localStorage.getItem('linkedin_user');
  return data ? JSON.parse(data) : null;
}




