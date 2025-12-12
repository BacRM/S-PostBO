import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/dashboard/Sidebar';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { FileText, Send, AlertCircle, CheckCircle, Loader2, Clock } from 'lucide-react';
import { publishPostNow, schedulePost, isLinkedInConnected } from '../utils/spost-api';
import { getUser, getToken } from '../config/linkedin';
import { publishPostToLinkedInAPI, hasValidLinkedInToken } from '../api/linkedinPublishApi';
import LinkedInOAuthConnect from '../components/LinkedInOAuthConnect';
import { toast } from 'sonner';

export default function CreatePost() {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [postId, setPostId] = useState(null);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [scheduledInfo, setScheduledInfo] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [profile, setProfile] = useState(null);
  const [hasOAuthToken, setHasOAuthToken] = useState(false);

  const maxLength = 3000;
  const remainingChars = maxLength - text.length;

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      // Vérifier si window.SPost est disponible
      console.log('[CreatePost] 🔍 Vérification window.SPost:', typeof window !== 'undefined' ? typeof window.SPost : 'window undefined');
      
      if (typeof window !== 'undefined' && window.SPost) {
        console.log('[CreatePost] ✅ window.SPost disponible');
        console.log('[CreatePost] window.SPost.publishNow:', typeof window.SPost.publishNow);
      } else {
        console.warn('[CreatePost] ⚠️ window.SPost non disponible');
      }
      
      // Vérifier via l'API de l'extension
      const connected = await isLinkedInConnected();
      setIsConnected(connected);
      console.log('[CreatePost] 🔗 LinkedIn connecté:', connected);

      // Récupérer le profil depuis localStorage
      const userData = getUser();
      if (userData) {
        setProfile(userData);
        console.log('[CreatePost] 👤 Profil chargé:', userData);
      } else {
        console.warn('[CreatePost] ⚠️ Aucun profil trouvé dans localStorage');
      }

      // Vérifier le token OAuth
      const oauthToken = hasValidLinkedInToken();
      setHasOAuthToken(oauthToken);
      console.log('[CreatePost] 🔑 Token OAuth disponible:', oauthToken);

      if (!connected && !oauthToken) {
        console.warn('[CreatePost] ⚠️ LinkedIn non connecté (ni extension ni OAuth)');
      }
    } catch (error) {
      console.error('[CreatePost] ❌ Erreur vérification connexion:', error);
      setIsConnected(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!text.trim()) {
      setError('Veuillez saisir un texte pour votre post');
      return;
    }

    if (text.length > maxLength) {
      setError(`Le texte ne peut pas dépasser ${maxLength} caractères`);
      return;
    }

    if (!isConnected && !hasOAuthToken) {
      setError('Vous devez être connecté à LinkedIn pour publier un post. Utilisez le bouton de connexion OAuth ci-dessous.');
      return;
    }

    // Vérifier la date et l'heure si la publication est programmée
    if (isScheduled) {
      if (!scheduledDate || !scheduledTime) {
        setError('Veuillez sélectionner une date et une heure pour la publication programmée');
        return;
      }

      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
      const now = new Date();

      if (scheduledDateTime <= now) {
        setError('La date et l\'heure de publication doivent être dans le futur');
        return;
      }
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Format du post attendu par window.SPost.publishNow
      const postData = {
        id: `create_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: text.trim(),
        title: '', // Pas de titre pour un post simple
        category: 'other',
        createdAt: new Date().toISOString(),
        status: isScheduled ? 'scheduled' : 'published',
      };

      let result;

      if (isScheduled) {
        // Publication programmée
        const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
        
        // Vérifier que la date est valide
        if (isNaN(scheduledDateTime.getTime())) {
          throw new Error('Date de publication invalide');
        }
        
        // Convertir en timestamp (millisecondes) pour l'extension Chrome
        const timestamp = scheduledDateTime.getTime();
        console.log('[CreatePost] 📅 Date programmée:', {
          date: scheduledDate,
          time: scheduledTime,
          datetime: scheduledDateTime.toISOString(),
          timestamp: timestamp
        });
        
        result = await schedulePost(postData, timestamp);
        
        setScheduledInfo({ date: scheduledDate, time: scheduledTime });
        toast.success('Post programmé avec succès !');
      } else {
        // Publication immédiate
        console.log('[CreatePost] 📤 Publication immédiate avec postData:', postData);
        
        // Essayer d'abord avec l'API LinkedIn directe (comme S-Plugin)
        // Si un token OAuth est disponible, utiliser l'API directe
        if (hasValidLinkedInToken()) {
          console.log('[CreatePost] ✅ Token OAuth disponible, utilisation API LinkedIn directe');
          try {
            result = await publishPostToLinkedInAPI(text.trim());
            console.log('[CreatePost] ✅ Publication via API LinkedIn réussie:', result);
            
            // Vérifier que le résultat est valide
            if (!result || result.success === false) {
              throw new Error(result?.error || result?.message || 'Publication échouée sans erreur explicite');
            }
            
            toast.success('Post publié avec succès sur LinkedIn !');
          } catch (apiError) {
            console.error('[CreatePost] ❌ Erreur API LinkedIn directe:', apiError);
            console.error('[CreatePost] ❌ Détails erreur:', {
              message: apiError.message,
              stack: apiError.stack,
              name: apiError.name
            });
            
            // Si c'est une erreur CORS, ne pas essayer l'extension (elle ne fonctionnera pas non plus)
            if (apiError.message && apiError.message.includes('CORS')) {
              throw new Error('Erreur CORS: L\'API LinkedIn ne peut pas être appelée directement depuis le navigateur. Veuillez utiliser l\'extension S-Post ou configurer un proxy serveur.');
            }
            
            // Fallback vers l'extension si l'API échoue (sauf pour CORS)
            console.warn('[CreatePost] ⚠️ Fallback vers extension...');
            try {
              result = await publishPostNow(postData);
              console.log('[CreatePost] ✅ Résultat publication extension:', result);
              
              if (result && result.success === false) {
                throw new Error(result.error || result.message || 'Erreur lors de la publication via extension');
              }
              toast.success('Post publié avec succès via l\'extension !');
            } catch (extensionError) {
              // Si l'extension échoue aussi, lancer l'erreur de l'API (plus informative)
              throw apiError;
            }
          }
        } else {
          // Pas de token OAuth, utiliser l'extension
          console.log('[CreatePost] ⚠️ Pas de token OAuth, utilisation extension');
          result = await publishPostNow(postData);
          console.log('[CreatePost] ✅ Résultat publication extension:', result);
          
          if (result && result.success === false) {
            throw new Error(result.error || result.message || 'Erreur lors de la publication');
          }
          toast.success('Post publié avec succès !');
        }
      }

      // Vérifier le résultat
      console.log('[CreatePost] 📋 Résultat final:', result);
      
      // Si result est null/undefined mais qu'on arrive ici sans erreur, considérer comme succès
      // (certaines APIs peuvent retourner undefined en cas de succès)
      if (result && result.success === false) {
        // Vérifier si c'est une erreur explicite
        throw new Error(result.error || result.message || 'Erreur lors de la publication');
      }

      // Marquer comme succès (rester sur la page)
      setSuccess(true);
      setPostId(result?.postUrn || result?.id || result?.postId || result?.urn || result?.data?.id || 'N/A');

      // Réinitialiser le formulaire
      setText('');
      setIsScheduled(false);
      setScheduledDate('');
      setScheduledTime('');

      console.log('[CreatePost] ✅ Publication réussie, reste sur la page');
    } catch (error) {
      console.error('[CreatePost] ❌ Erreur lors de la création du post:', error);
      console.error('[CreatePost] Stack:', error.stack);
      
      let errorMessage = 'Erreur lors de la publication du post';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error.toString) {
        errorMessage = error.toString();
      }
      
      // Messages d'erreur spécifiques
      if (errorMessage.includes('Extension') || errorMessage.includes('window.SPost')) {
        errorMessage = 'Extension S-Post non disponible. Assurez-vous que l\'extension est installée et active.';
      } else if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
        errorMessage = 'Timeout: L\'extension S-Post n\'a pas répondu. Vérifiez que l\'extension est active.';
      } else if (errorMessage.includes('connecté') || errorMessage.includes('connected')) {
        errorMessage = 'Vous devez être connecté à LinkedIn. Visitez LinkedIn dans un onglet pour vous connecter.';
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Calculer la date minimale (aujourd'hui) et l'heure minimale
  const getMinDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getMinTime = () => {
    if (!scheduledDate) return '';
    const selectedDate = new Date(`${scheduledDate}T00:00`);
    const now = new Date();

    // Si la date sélectionnée est aujourd'hui, retourner l'heure actuelle + 1 minute
    if (selectedDate.toDateString() === now.toDateString()) {
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes() + 1).padStart(2, '0');
      return `${hours}:${minutes}`;
    }
    return '00:00';
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar activePage="create-post" user={profile} />

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center">
              <FileText className="w-6 h-6 text-blue-600 mr-2" />
              <h1 className="text-2xl font-bold text-gray-900">Créer une publication</h1>
            </div>
            <p className="text-gray-600 mt-2">
              Rédigez et publiez directement un post sur votre compte LinkedIn
            </p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                <div>
                  <p className="text-sm font-medium text-green-800">
                    {scheduledInfo ? 'Post programmé avec succès !' : 'Post publié avec succès !'}
                  </p>
                  {postId && (
                    <p className="text-xs text-green-600 mt-1">
                      ID du post: {postId}
                    </p>
                  )}
                  {scheduledInfo && (
                    <p className="text-xs text-green-600 mt-1">
                      Publication prévue le {new Date(`${scheduledInfo.date}T${scheduledInfo.time}`).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  )}
                  <p className="text-xs text-green-600 mt-1">
                    Vous pouvez continuer à publier d'autres posts
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800">
                    Erreur lors de la publication
                  </p>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                  {error.includes('w_member_social') && (
                    <p className="text-xs text-red-600 mt-2">
                      Activez la permission <code className="bg-red-100 px-1 rounded">w_member_social</code> dans LinkedIn Developer pour pouvoir publier des posts.
                    </p>
                  )}
                  {!isConnected && (
                    <p className="text-xs text-red-600 mt-2">
                      <a href="/settings" className="underline">Connectez-vous à LinkedIn</a> pour publier des posts.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow">
            <div className="p-6">
              <label htmlFor="post-text" className="block text-sm font-medium text-gray-700 mb-2">
                Contenu du post
              </label>
              <Textarea
                id="post-text"
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setError(null);
                }}
                placeholder="Quoi de neuf ? Partagez vos pensées avec votre réseau..."
                className="w-full min-h-[200px] resize-none"
                rows={10}
                maxLength={maxLength}
                disabled={loading || success || !isConnected}
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-gray-500">
                  {remainingChars >= 0 ? (
                    <span className={remainingChars < 100 ? 'text-orange-600' : 'text-gray-500'}>
                      {remainingChars} caractères restants
                    </span>
                  ) : (
                    <span className="text-red-600">
                      {Math.abs(remainingChars)} caractères en trop
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-500">
                  Maximum {maxLength} caractères
                </p>
              </div>
            </div>

            {/* Publication programmée */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  id="schedule-post"
                  checked={isScheduled}
                  onChange={(e) => {
                    setIsScheduled(e.target.checked);
                    setError(null);
                    if (!e.target.checked) {
                      setScheduledDate('');
                      setScheduledTime('');
                    }
                  }}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  disabled={loading || success || !isConnected}
                />
                <label htmlFor="schedule-post" className="ml-2 flex items-center text-sm font-medium text-gray-700 cursor-pointer">
                  <Clock className="w-4 h-4 mr-2 text-blue-600" />
                  Publication programmée
                </label>
              </div>

              {isScheduled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label htmlFor="scheduled-date" className="block text-sm font-medium text-gray-700 mb-2">
                      Date de publication
                    </label>
                    <input
                      type="date"
                      id="scheduled-date"
                      value={scheduledDate}
                      onChange={(e) => {
                        setScheduledDate(e.target.value);
                        setError(null);
                        // Réinitialiser l'heure si la date change
                        if (e.target.value !== scheduledDate) {
                          setScheduledTime('');
                        }
                      }}
                      min={getMinDateTime()}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={loading || success || !isConnected}
                      required={isScheduled}
                    />
                  </div>
                  <div>
                    <label htmlFor="scheduled-time" className="block text-sm font-medium text-gray-700 mb-2">
                      Heure de publication
                    </label>
                    <input
                      type="time"
                      id="scheduled-time"
                      value={scheduledTime}
                      onChange={(e) => {
                        setScheduledTime(e.target.value);
                        setError(null);
                      }}
                      min={getMinTime()}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={loading || success || !isConnected || !scheduledDate}
                      required={isScheduled}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                disabled={loading || success}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={loading || success || !text.trim() || text.length > maxLength || (!isConnected && !hasOAuthToken)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Publication en cours...
                  </>
                ) : success ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Publié !
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Publier
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Connexion OAuth LinkedIn - Seulement si pas de token OAuth */}
          {!hasOAuthToken && (
            <div className="mt-6">
              <LinkedInOAuthConnect 
                onConnected={() => {
                  checkConnection();
                  toast.success('Connexion LinkedIn OAuth réussie !');
                }}
              />
            </div>
          )}

          {/* Info Box */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Conseils pour votre post :</p>
                <ul className="list-disc list-inside space-y-1 text-blue-700">
                  <li>Utilisez un langage professionnel et engageant</li>
                  <li>Ajoutez des hashtags pertinents pour augmenter la visibilité</li>
                  <li>Posez des questions pour encourager les interactions</li>
                  <li>Partagez des insights ou des expériences personnelles</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

