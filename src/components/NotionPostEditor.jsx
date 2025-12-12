/**
 * Éditeur de posts Notion - Style PerfectPost
 * Permet d'éditer un post Notion et de le publier/programmer sur LinkedIn
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
    Sparkles, Save, Send, Loader2, X, Hash, Smile, 
    Clock, Eye, ThumbsUp, MessageSquare, Share2,
    Globe, MoreHorizontal, Lightbulb, Wand2, Copy, Check, Calendar,
    Linkedin, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { publishPostNow, schedulePost, isLinkedInConnected } from '@/utils/spost-api';
import { publishPostToLinkedInAPI, hasValidLinkedInToken } from '@/api/linkedinPublishApi';

// ============================================
// Constantes
// ============================================
const CATEGORIES = [
    { value: 'thought_leadership', label: '💡 Thought Leadership', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'tips', label: '📝 Tips & Conseils', color: 'bg-blue-100 text-blue-800' },
    { value: 'story', label: '📖 Storytelling', color: 'bg-purple-100 text-purple-800' },
    { value: 'promotion', label: '🎯 Promotion', color: 'bg-green-100 text-green-800' },
    { value: 'engagement', label: '💬 Engagement', color: 'bg-pink-100 text-pink-800' },
    { value: 'carousel', label: '🎠 Carrousel', color: 'bg-indigo-100 text-indigo-800' },
    { value: 'other', label: '📌 Autre', color: 'bg-gray-100 text-gray-800' },
];

const POPULAR_EMOJIS = ['👋', '🚀', '💡', '✨', '🎯', '💪', '🔥', '❤️', '👏', '🙌', '💬', '📈', '✅', '⭐', '🎉', '💼'];

const HASHTAG_SUGGESTIONS = [
    '#LinkedIn', '#PersonalBranding', '#Entrepreneuriat', '#Leadership', 
    '#Marketing', '#Business', '#Success', '#Motivation', '#Career',
    '#Innovation', '#Tech', '#DigitalMarketing', '#Networking'
];

const MAX_CHARS = 3000;
const OPTIMAL_CHARS = 1500;

// ============================================
// Composant Preview LinkedIn
// ============================================
const LinkedInPreview = ({ title, content, profile }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const MAX_PREVIEW_LENGTH = 300; // Nombre de caractères avant le "Voir plus"
    
    // Combiner titre et contenu pour l'aperçu
    const displayContent = title ? `${title}\n\n${content}` : content;
    
    const shouldTruncate = displayContent && displayContent.length > MAX_PREVIEW_LENGTH;
    const truncatedContent = shouldTruncate && !isExpanded 
        ? displayContent.substring(0, MAX_PREVIEW_LENGTH) 
        : displayContent;
    
    const formattedDisplayContent = useMemo(() => {
        if (!truncatedContent) return '';
        return truncatedContent.replace(/#(\w+)/g, '<span class="text-blue-600 font-medium">#$1</span>');
    }, [truncatedContent]);

    // Nom complet du profil
    const fullName = profile?.name || 
                    (profile?.firstName && profile?.lastName 
                        ? `${profile.firstName} ${profile.lastName}`.trim()
                        : profile?.firstName || 'Votre Nom');

    return (
        <Card className="border-0 shadow-lg">
            <CardContent className="p-0">
                <div className="p-4 flex items-start gap-3">
                    {profile?.picture ? (
                        <img 
                            src={profile.picture} 
                            alt={fullName}
                            className="w-12 h-12 rounded-full object-cover"
                            onError={(e) => {
                                // Fallback si l'image ne charge pas
                                e.target.style.display = 'none';
                                e.target.nextElementSibling.style.display = 'flex';
                            }}
                        />
                    ) : null}
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold ${profile?.picture ? 'hidden' : ''}`}>
                        {fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                        <p className="font-semibold text-gray-900">
                            {fullName}
                        </p>
                        <p className="text-xs text-gray-500 line-clamp-1">
                            {profile?.headline || 'Votre titre professionnel'}
                        </p>
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            À l'instant • <Globe className="h-3 w-3" />
                        </p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </div>

                <div className="px-4 pb-3">
                    <div 
                        className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: formattedDisplayContent || '<span class="text-gray-400 italic">Votre texte apparaîtra ici...</span>' }}
                    />
                    {shouldTruncate && (
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="text-sm text-gray-500 hover:text-gray-700 font-medium mt-1"
                        >
                            {isExpanded ? 'Voir moins' : '...Voir plus'}
                        </button>
                    )}
                </div>

                <div className="px-4 py-2 border-t border-gray-100">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                            <span className="flex items-center">
                                <span className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                                    <ThumbsUp className="h-2.5 w-2.5 text-white" />
                                </span>
                            </span>
                            <span>24</span>
                        </div>
                        <div className="flex gap-2">
                            <span>3 commentaires</span>
                            <span>•</span>
                            <span>1 partage</span>
                        </div>
                    </div>
                </div>

                <div className="px-2 py-1 border-t border-gray-100 flex justify-around">
                    {[
                        { icon: ThumbsUp, label: 'J\'aime' },
                        { icon: MessageSquare, label: 'Commenter' },
                        { icon: Share2, label: 'Partager' },
                        { icon: Send, label: 'Envoyer' },
                    ].map((action, i) => (
                        <button key={i} className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                            <action.icon className="h-4 w-4" />
                            <span className="text-xs font-medium">{action.label}</span>
                        </button>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};

// ============================================
// Composant Principal
// ============================================
export default function NotionPostEditor({ notionPost, profile, onSave, onClose, onUpdateNotion }) {
    const [title, setTitle] = useState(notionPost?.title || '');
    const [content, setContent] = useState(notionPost?.content || '');
    const [category, setCategory] = useState(notionPost?.category || 'other');
    const [scheduledDate, setScheduledDate] = useState('');
    const [isLinkedInConnectedState, setIsLinkedInConnectedState] = useState(false);
    const [hasOAuthToken, setHasOAuthToken] = useState(false);
    const [linkedInProfile, setLinkedInProfile] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [isScheduling, setIsScheduling] = useState(false);
    const [copied, setCopied] = useState(false);

    // Charger les données LinkedIn au montage
    React.useEffect(() => {
        const loadLinkedInData = async () => {
            try {
                // Méthode 1: Vérifier via l'API de l'extension
                const api = window.SPost || window.LinkedInPlanner;
                let connected = false;
                let profileData = null;
                
                if (api && api.getData) {
                    try {
                        const data = await api.getData();
                        if (data) {
                            connected = data.connected === true || (data.csrf && data.profile);
                            // getLinkedInData() retourne déjà data.profile formaté
                            profileData = data.profile || null;
                        }
                    } catch (e) {
                        console.warn('[NotionPostEditor] Erreur API extension:', e);
                    }
                }
                
                // Méthode 2: Fallback localStorage
                if (!connected || !profileData) {
                    const linkedInData = localStorage.getItem('spost_linkedin_data');
                    if (linkedInData) {
                        try {
                            const data = JSON.parse(linkedInData);
                            if (!connected) {
                                connected = data.connected === true || (data.csrf && data.profile);
                            }
                            if (!profileData && data.profile) {
                                profileData = data.profile;
                            }
                        } catch (e) {
                            console.error('[NotionPostEditor] Erreur parsing localStorage:', e);
                        }
                    }
                }
                
                setIsLinkedInConnectedState(connected);
                
                // Vérifier aussi le token OAuth
                const oauthToken = hasValidLinkedInToken();
                setHasOAuthToken(oauthToken);
                console.log('[NotionPostEditor] 🔑 Token OAuth disponible:', oauthToken);
                
                // Formater le profil pour l'affichage avec photo et nom complet
                if (profileData) {
                    // profileData est déjà formaté par getLinkedInData() ou syncToLocalStorage()
                    const profile = profileData;
                    
                    const formattedProfile = {
                        firstName: profile.firstName || '',
                        lastName: profile.lastName || '',
                        headline: profile.headline || profile.occupation || '',
                        publicIdentifier: profile.publicIdentifier || '',
                        // Nom complet : utiliser name si disponible, sinon construire depuis firstName/lastName
                        name: profile.name || (profile.firstName && profile.lastName 
                            ? `${profile.firstName} ${profile.lastName}`.trim()
                            : profile.firstName || profile.lastName || ''),
                        // Photo : utiliser picture si disponible (déjà formatée par getLinkedInData)
                        picture: profile.picture || null,
                        profileUrl: profile.profileUrl || null,
                    };
                    
                    console.log('[NotionPostEditor] ✅ Profil LinkedIn formaté:', {
                        name: formattedProfile.name,
                        hasPicture: !!formattedProfile.picture,
                        pictureUrl: formattedProfile.picture?.substring(0, 50) + '...',
                    });
                    
                    setLinkedInProfile(formattedProfile);
                }
            } catch (error) {
                console.error('[NotionPostEditor] Erreur chargement LinkedIn:', error);
                setIsLinkedInConnectedState(false);
            }
        };
        
        loadLinkedInData();
        
        // Écouter les mises à jour de données LinkedIn
        const handleDataUpdate = () => {
            loadLinkedInData();
        };
        
        window.addEventListener('SPostDataUpdated', handleDataUpdate);
        window.addEventListener('LinkedInPlannerDataUpdated', handleDataUpdate);
        
        // Recharger périodiquement pour s'assurer que les données sont à jour
        const refreshInterval = setInterval(() => {
            loadLinkedInData();
        }, 30000); // Toutes les 30 secondes
        
        return () => {
            window.removeEventListener('SPostDataUpdated', handleDataUpdate);
            window.removeEventListener('LinkedInPlannerDataUpdated', handleDataUpdate);
            clearInterval(refreshInterval);
        };
    }, []);

    // Stats du contenu
    const stats = useMemo(() => {
        const chars = content.length;
        const words = content.trim() ? content.trim().split(/\s+/).length : 0;
        const hashtags = (content.match(/#\w+/g) || []).length;
        const emojis = (content.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
        const lines = content.split('\n').length;
        
        return { chars, words, hashtags, emojis, lines };
    }, [content]);

    // Qualité du post
    const quality = useMemo(() => {
        let score = 0;
        const tips = [];

        if (stats.chars >= 200 && stats.chars <= OPTIMAL_CHARS) {
            score += 30;
        } else if (stats.chars < 200) {
            tips.push('Ajoutez plus de contenu (200+ caractères recommandés)');
        }

        if (stats.hashtags >= 3 && stats.hashtags <= 5) {
            score += 20;
        } else if (stats.hashtags < 3) {
            tips.push('Ajoutez 3-5 hashtags pertinents');
        }

        if (stats.emojis >= 1 && stats.emojis <= 5) {
            score += 15;
        }

        if (stats.lines >= 3) {
            score += 20;
        } else {
            tips.push('Structurez avec des sauts de ligne');
        }

        const firstLine = content.split('\n')[0];
        if (firstLine && firstLine.length > 10 && firstLine.length < 100) {
            score += 15;
        } else {
            tips.push('Commencez par un hook accrocheur');
        }

        return { score: Math.min(score, 100), tips };
    }, [content, stats]);

    const insertEmoji = (emoji) => {
        setContent(prev => prev + emoji);
    };

    const insertHashtag = (hashtag) => {
        setContent(prev => prev + (prev.endsWith(' ') || prev === '' ? '' : ' ') + hashtag + ' ');
    };

    const copyContent = () => {
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success('Copié !');
    };

    // Sauvegarder dans Notion (mise à jour via callback)
    const handleSave = async () => {
        if (!content.trim() && !title.trim()) {
            toast.error('Le titre ou le contenu ne peut pas être vide');
            return;
        }

        setIsSaving(true);
        try {
            console.log('[NotionPostEditor] 💾 Sauvegarde dans Notion...');
            console.log('[NotionPostEditor] Post original:', notionPost);
            
            const updatedPost = {
                ...notionPost,
                title: title || content.split('\n')[0].substring(0, 100) || 'Sans titre',
                content: content,
                category: category,
                updatedAt: new Date().toISOString(),
            };

            console.log('[NotionPostEditor] Post mis à jour:', updatedPost);

            // Mettre à jour dans Notion via le callback
            if (onUpdateNotion) {
                console.log('[NotionPostEditor] 📤 Appel onUpdateNotion...');
                try {
                    await onUpdateNotion(updatedPost);
                    console.log('[NotionPostEditor] ✅ Mise à jour Notion réussie');
                } catch (notionError) {
                    console.error('[NotionPostEditor] ❌ Erreur mise à jour Notion:', notionError);
                    // Continuer quand même pour sauvegarder localement
                    toast.warning('Erreur mise à jour Notion, sauvegarde locale effectuée');
                }
            } else {
                console.warn('[NotionPostEditor] ⚠️ onUpdateNotion non disponible');
            }

            // Mettre à jour dans localStorage (toujours, même si Notion échoue)
            try {
                const savedPosts = JSON.parse(localStorage.getItem('spost_notion_posts') || '[]');
                const index = savedPosts.findIndex(p => p.id === notionPost.id);
                if (index !== -1) {
                    savedPosts[index] = updatedPost;
                    localStorage.setItem('spost_notion_posts', JSON.stringify(savedPosts));
                    console.log('[NotionPostEditor] ✅ Sauvegarde locale réussie');
                } else {
                    // Si le post n'existe pas, l'ajouter
                    savedPosts.push(updatedPost);
                    localStorage.setItem('spost_notion_posts', JSON.stringify(savedPosts));
                    console.log('[NotionPostEditor] ✅ Post ajouté localement');
                }
            } catch (localError) {
                console.error('[NotionPostEditor] ❌ Erreur sauvegarde locale:', localError);
            }

            toast.success('Post sauvegardé !');
            if (onSave) {
                onSave(updatedPost);
            }
        } catch (error) {
            console.error('[NotionPostEditor] ❌ Erreur sauvegarde Notion:', error);
            console.error('[NotionPostEditor] Stack:', error.stack);
            toast.error(`Erreur lors de la sauvegarde: ${error.message || 'Erreur inconnue'}`);
        }
        setIsSaving(false);
    };

    // Publier directement sur LinkedIn (même mécanisme que create-post)
    const handlePublishNow = async () => {
        if (!content.trim()) {
            toast.error('Le contenu ne peut pas être vide');
            return;
        }

        // Vérifier la connexion (OAuth ou extension)
        const hasOAuth = hasValidLinkedInToken();
        if (!isLinkedInConnectedState && !hasOAuth) {
            toast.error('Vous devez être connecté à LinkedIn. Utilisez le bouton OAuth ou ouvrez LinkedIn dans un onglet.');
            return;
        }

        setIsPublishing(true);
        try {
            console.log('[NotionPostEditor] 📤 Publication du contenu uniquement...');
            console.log('[NotionPostEditor] Contenu:', content.trim().substring(0, 100) + '...');
            
            let result;

            // Essayer d'abord avec l'API LinkedIn directe (comme create-post)
            if (hasOAuth) {
                console.log('[NotionPostEditor] ✅ Token OAuth disponible, utilisation API LinkedIn directe');
                try {
                    // Publier uniquement le contenu (champ "Contenu")
                    result = await publishPostToLinkedInAPI(content.trim());
                    console.log('[NotionPostEditor] ✅ Publication via API LinkedIn réussie:', result);
                    
                    if (!result || result.success === false) {
                        throw new Error(result?.error || result?.message || 'Publication échouée sans erreur explicite');
                    }
                    
                    toast.success('Post publié avec succès sur LinkedIn !');
                } catch (apiError) {
                    console.error('[NotionPostEditor] ❌ Erreur API LinkedIn directe:', apiError);
                    
                    // Si c'est une erreur CORS, ne pas essayer l'extension
                    if (apiError.message && apiError.message.includes('CORS')) {
                        throw apiError;
                    }
                    
                    // Fallback vers l'extension si l'API échoue
                    console.warn('[NotionPostEditor] ⚠️ Fallback vers extension...');
                    try {
                        const post = {
                            id: notionPost?.id || Date.now().toString(),
                            content: content.trim(), // Uniquement le contenu
                            title: title,
                            category: category,
                            createdAt: notionPost?.createdAt || new Date().toISOString(),
                        };
                        result = await publishPostNow(post);
                        console.log('[NotionPostEditor] ✅ Résultat publication extension:', result);
                        
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
                console.log('[NotionPostEditor] ⚠️ Pas de token OAuth, utilisation extension');
                const post = {
                    id: notionPost?.id || Date.now().toString(),
                    content: content.trim(), // Uniquement le contenu
                    title: title,
                    category: category,
                    createdAt: notionPost?.createdAt || new Date().toISOString(),
                };
                result = await publishPostNow(post);
                console.log('[NotionPostEditor] ✅ Résultat publication extension:', result);
                
                if (result && result.success === false) {
                    throw new Error(result.error || result.message || 'Erreur lors de la publication');
                }
                toast.success('Post publié avec succès !');
            }
            
            // Mettre à jour le statut dans Notion si disponible
            if (result && (result.success !== false) && onUpdateNotion) {
                await onUpdateNotion({
                    ...notionPost,
                    status: 'published',
                    linkedInUrn: result.postUrn || result.id || result.postId,
                });
            }
            if (onSave) onSave(notionPost);
        } catch (error) {
            console.error('[NotionPostEditor] ❌ Erreur publication:', error);
            toast.error(error.message || 'Erreur lors de la publication');
        }
        setIsPublishing(false);
    };

    // Programmer la publication sur LinkedIn
    const handleSchedule = async () => {
        if (!content.trim()) {
            toast.error('Le contenu ne peut pas être vide');
            return;
        }

        if (!scheduledDate) {
            toast.error('Veuillez sélectionner une date de publication');
            return;
        }

        if (!isLinkedInConnectedState) {
            toast.error('Vous devez être connecté à LinkedIn. Ouvrez LinkedIn dans un onglet.');
            return;
        }

        setIsScheduling(true);
        try {
            // Envoyer uniquement le contenu (champ "Post") à LinkedIn, sans le titre
            const post = {
                id: notionPost?.id || Date.now().toString(),
                title: title,
                content: content.trim(), // Uniquement le champ "Post" mappé depuis Notion
                category: category,
                scheduledAt: new Date(scheduledDate).toISOString(),
                createdAt: notionPost?.createdAt || new Date().toISOString(),
            };

            const result = await schedulePost(post);
            
            if (result.success) {
                toast.success(`Post programmé pour le ${new Date(scheduledDate).toLocaleString('fr-FR')}`);
                // Mettre à jour le statut dans Notion
                if (onUpdateNotion) {
                    await onUpdateNotion({
                        ...notionPost,
                        status: 'scheduled',
                        scheduledDate: scheduledDate,
                    });
                }
                if (onSave) onSave(notionPost);
            } else {
                toast.error(result.error || 'Erreur lors de la programmation');
            }
        } catch (error) {
            console.error('Erreur programmation:', error);
            toast.error(error.message || 'Erreur lors de la programmation');
        }
        setIsScheduling(false);
    };

    const generateWithAI = async () => {
        setIsGenerating(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const templates = [
            `🚀 ${notionPost?.title || 'Une réflexion qui me tient à cœur'}

Ces derniers temps, j'ai beaucoup réfléchi à ce sujet.

Voici ce que j'ai appris :

✅ Point clé #1
✅ Point clé #2  
✅ Point clé #3

Et vous, qu'en pensez-vous ?

#LinkedIn #PersonalBranding #Success`,
        ];

        setContent(templates[Math.floor(Math.random() * templates.length)]);
        setIsGenerating(false);
        toast.success('Post généré !');
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
                <CardHeader className="flex-shrink-0 flex flex-row items-center justify-between border-b">
                    <div className="flex items-center gap-3">
                        <CardTitle>{notionPost?.id ? 'Éditer le post Notion' : 'Nouveau post'}</CardTitle>
                        <Badge className={CATEGORIES.find(c => c.value === category)?.color}>
                            {CATEGORIES.find(c => c.value === category)?.label}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                            quality.score >= 70 ? 'bg-green-100 text-green-700' :
                            quality.score >= 40 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                        }`}>
                            Score: {quality.score}%
                        </div>
                        {onClose && (
                            <Button variant="ghost" size="icon" onClick={onClose}>
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </CardHeader>

                <div className="flex-1 overflow-hidden flex">
                    <div className="flex-1 flex flex-col border-r overflow-hidden">
                        <div className="flex-1 p-4 flex flex-col overflow-hidden">
                            {/* Champ Titre */}
                            <div className="mb-4">
                                <Label htmlFor="post-title">Titre</Label>
                                <Input
                                    id="post-title"
                                    type="text"
                                    placeholder="Titre du post..."
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="mt-1"
                                />
                            </div>

                            {/* Statut LinkedIn - Afficher seulement si non connecté */}
                            {!isLinkedInConnectedState && !hasOAuthToken && (
                                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                                        <p className="text-xs text-yellow-800">
                                            Connectez-vous à LinkedIn pour publier (via OAuth ou extension)
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Barre d'outils */}
                            <div className="flex items-center gap-2 mb-3 flex-wrap">
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={generateWithAI}
                                        disabled={isGenerating}
                                        className="gap-2"
                                    >
                                        {isGenerating ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Wand2 className="h-4 w-4" />
                                        )}
                                        Générer IA
                                    </Button>

                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" size="sm">
                                                <Smile className="h-4 w-4" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-64 p-2">
                                            <div className="grid grid-cols-8 gap-1">
                                                {POPULAR_EMOJIS.map(emoji => (
                                                    <button
                                                        key={emoji}
                                                        onClick={() => insertEmoji(emoji)}
                                                        className="p-2 hover:bg-gray-100 rounded text-lg"
                                                    >
                                                        {emoji}
                                                    </button>
                                                ))}
                                            </div>
                                        </PopoverContent>
                                    </Popover>

                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" size="sm">
                                                <Hash className="h-4 w-4" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-64 p-2">
                                            <p className="text-xs text-gray-500 mb-2">Hashtags populaires</p>
                                            <div className="flex flex-wrap gap-1">
                                                {HASHTAG_SUGGESTIONS.map(tag => (
                                                    <button
                                                        key={tag}
                                                        onClick={() => insertHashtag(tag)}
                                                        className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                                                    >
                                                        {tag}
                                                    </button>
                                                ))}
                                            </div>
                                        </PopoverContent>
                                    </Popover>

                                    <Button variant="outline" size="sm" onClick={copyContent}>
                                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                    </Button>

                                    <div className="ml-auto flex items-center gap-2 text-xs text-gray-500">
                                        <span>{stats.chars}/{MAX_CHARS}</span>
                                        <span>•</span>
                                        <span>{stats.words} mots</span>
                                    </div>
                                </div>

                                <Textarea 
                                    placeholder="Commencez par un hook accrocheur...

Puis développez votre idée principale.

Terminez par un appel à l'action ou une question.

#VosHashtags"
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    className="flex-1 resize-none text-base leading-relaxed"
                                    maxLength={MAX_CHARS}
                                />

                                {/* Catégorie et date de programmation sous le champ de texte */}
                                <div className="grid grid-cols-2 gap-4 mt-4">
                                    <div className="space-y-2">
                                        <Label>Catégorie</Label>
                                        <Select value={category} onValueChange={setCategory}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {CATEGORIES.map(cat => (
                                                    <SelectItem key={cat.value} value={cat.value}>
                                                        {cat.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4" />
                                            Date de publication programmée
                                        </Label>
                                        <Input 
                                            type="datetime-local" 
                                            value={scheduledDate}
                                            onChange={(e) => setScheduledDate(e.target.value)}
                                            min={new Date().toISOString().slice(0, 16)}
                                        />
                                    </div>
                                </div>

                                {quality.tips.length > 0 && (
                                    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                        <div className="flex items-center gap-2 text-amber-800 font-medium text-sm mb-2">
                                            <Lightbulb className="h-4 w-4" />
                                            Conseils pour améliorer
                                        </div>
                                        <ul className="text-xs text-amber-700 space-y-1">
                                            {quality.tips.map((tip, i) => (
                                                <li key={i}>• {tip}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                        </div>
                    </div>

                    <div className="w-[400px] flex-shrink-0 bg-slate-100 p-4 overflow-y-auto hidden lg:block">
                        <div className="flex items-center gap-2 mb-4">
                            <Eye className="h-4 w-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">Aperçu LinkedIn</span>
                        </div>
                        <LinkedInPreview title={title} content={content} profile={linkedInProfile || profile} />
                    </div>
                </div>

                <div className="flex-shrink-0 p-4 border-t bg-gray-50 flex justify-between items-center">
                    <div className="text-xs text-gray-500">
                        Les posts publiés entre 8h-9h ont 2x plus d'engagement
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={handleSave} disabled={isSaving}>
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                            Sauvegarder dans Notion
                        </Button>
                        <Button 
                            onClick={handlePublishNow}
                            disabled={isPublishing || (!isLinkedInConnectedState && !hasOAuthToken)}
                            className="bg-[#0077B5] hover:bg-[#006097]"
                        >
                            {isPublishing ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Publication...
                                </>
                            ) : (
                                <>
                                    <Send className="h-4 w-4 mr-2" />
                                    Publier maintenant
                                </>
                            )}
                        </Button>
                        <Button 
                            onClick={handleSchedule}
                            disabled={isScheduling || !scheduledDate || (!isLinkedInConnectedState && !hasOAuthToken)}
                            className="bg-purple-600 hover:bg-purple-700"
                        >
                            {isScheduling ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Programmation...
                                </>
                            ) : (
                                <>
                                    <Clock className="h-4 w-4 mr-2" />
                                    Programmer
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}

