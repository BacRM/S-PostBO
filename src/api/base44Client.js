import { createClient } from '@base44/sdk';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Mode développement local : authentification désactivée
const isDev = window.location.hostname === 'localhost';

// Create a client
export const base44 = createClient({
  appId: "6926c00af8a14c7bb6973869", 
  requiresAuth: !isDev, // Désactivé en local
  autoInitAuth: !isDev, // Pas d'auto-redirect en local
});

// Log pour debug
if (isDev) {
  console.log('[S-PostBO] Mode développement - Auth Base44 désactivée');
}
