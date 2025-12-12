import React, { useState } from 'react';
import { Linkedin, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { getAuthorizationUrl } from '../config/linkedin';
import { toast } from 'sonner';

/**
 * Composant de connexion OAuth LinkedIn
 * Utilise les mêmes credentials que S-Plugin (localhost:3000)
 * Isolé pour ne pas impacter les autres pages
 */
export default function LinkedInOAuthConnect({ onConnected, className = '' }) {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = () => {
    try {
      setIsConnecting(true);
      console.log('[LinkedIn OAuth] 🔗 Démarrage connexion OAuth...');
      
      // Sauvegarder la page de retour pour rediriger après connexion
      localStorage.setItem('oauth_return_to', window.location.pathname);
      
      // Générer l'URL d'autorisation
      const authUrl = getAuthorizationUrl();
      console.log('[LinkedIn OAuth] 🔗 URL d\'autorisation:', authUrl);
      
      // Rediriger vers LinkedIn
      window.location.href = authUrl;
    } catch (error) {
      console.error('[LinkedIn OAuth] ❌ Erreur:', error);
      toast.error('Erreur lors de la connexion LinkedIn');
      setIsConnecting(false);
    }
  };

  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-[#0077B5] flex items-center justify-center">
            <Linkedin className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Connexion LinkedIn OAuth</h3>
            <p className="text-sm text-gray-600">
              Connectez-vous pour publier directement via l'API LinkedIn
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full bg-[#0077B5] hover:bg-[#005885] text-white"
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Connexion en cours...
              </>
            ) : (
              <>
                <Linkedin className="w-4 h-4 mr-2" />
                Se connecter avec LinkedIn OAuth
              </>
            )}
          </Button>

          <div className="text-xs text-gray-500 space-y-1">
            <p>• Utilise les mêmes credentials que S-Plugin</p>
            <p>• Permet de publier directement via l'API LinkedIn</p>
            <p>• N'impacte pas les autres méthodes de connexion</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

