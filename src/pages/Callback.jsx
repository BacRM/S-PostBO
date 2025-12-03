import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { exchangeCodeForToken, getUserInfo, saveToken, saveUser } from '@/config/linkedin';

export default function Callback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('Processing...');
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const errorParam = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      // Vérifier les erreurs
      if (errorParam) {
        setError(`LinkedIn Error: ${errorParam} - ${errorDescription}`);
        return;
      }

      // Vérifier le code
      if (!code) {
        setError('No authorization code received');
        return;
      }

      // Vérifier le state pour la sécurité CSRF
      const savedState = localStorage.getItem('linkedin_oauth_state');
      if (state !== savedState) {
        setError('Invalid state parameter - possible CSRF attack');
        return;
      }

      try {
        setStatus('Exchanging code for token...');
        
        // Échanger le code contre un token
        const tokenData = await exchangeCodeForToken(code);
        saveToken(tokenData);
        
        setStatus('Fetching user profile...');
        
        // Récupérer les infos utilisateur
        const userInfo = await getUserInfo(tokenData.access_token);
        saveUser(userInfo);
        
        setStatus('Success! Redirecting...');
        
        // Nettoyer le state
        localStorage.removeItem('linkedin_oauth_state');
        
        // Rediriger vers la page principale
        setTimeout(() => {
          navigate('/allposts');
        }, 1000);
        
      } catch (err) {
        console.error('[Callback] Error:', err);
        setError(err.message || 'Authentication failed');
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full mx-4 border border-white/20">
        <div className="text-center">
          {/* Logo */}
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">
            Connexion LinkedIn
          </h1>

          {error ? (
            <>
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-4">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
              >
                Retour à l'accueil
              </button>
            </>
          ) : (
            <>
              <p className="text-white/70 mb-6">{status}</p>
              <div className="flex justify-center">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}



