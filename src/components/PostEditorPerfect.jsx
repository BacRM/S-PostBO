/**
 * S-Post Editor - Style PerfectPost
 * Éditeur de posts LinkedIn avec preview en temps réel
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
    Sparkles, Save, Send, Loader2, X, Image, Hash, Smile, 
    AtSign, Clock, Eye, ThumbsUp, MessageSquare, Share2,
    Globe, MoreHorizontal, Lightbulb, Wand2, Copy, Check
} from "lucide-react";
import { toast } from "sonner";

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
const LinkedInPreview = ({ content, profile }) => {
    const formattedContent = useMemo(() => {
        if (!content) return '';
        // Convertir les hashtags en liens stylés
        return content.replace(/#(\w+)/g, '<span class="text-blue-600 font-medium">#$1</span>');
    }, [content]);

    return (
        <Card className="border-0 shadow-lg">
            <CardContent className="p-0">
                {/* Header du post LinkedIn */}
                <div className="p-4 flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                        {profile?.firstName?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1">
                        <p className="font-semibold text-gray-900">
                            {profile?.name || profile?.firstName || 'Votre Nom'}
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

                {/* Contenu du post */}
                <div className="px-4 pb-3">
                    <div 
                        className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: formattedContent || '<span class="text-gray-400 italic">Votre texte apparaîtra ici...</span>' }}
                    />
                </div>

                {/* Barre d'engagement */}
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

                {/* Actions */}
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
export default function PostEditorPerfect({ post, profile, onSave, onClose }) {
    const [content, setContent] = useState(post?.content || '');
    const [category, setCategory] = useState(post?.category || 'other');
    const [scheduledDate, setScheduledDate] = useState(
        post?.scheduled_date ? new Date(post.scheduled_date).toISOString().slice(0, 16) : ''
    );
    const [notes, setNotes] = useState(post?.notes || '');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState('edit');

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

        // Longueur optimale
        if (stats.chars >= 200 && stats.chars <= OPTIMAL_CHARS) {
            score += 30;
        } else if (stats.chars < 200) {
            tips.push('Ajoutez plus de contenu (200+ caractères recommandés)');
        } else if (stats.chars > OPTIMAL_CHARS) {
            tips.push('Essayez de raccourcir votre post pour plus d\'engagement');
        }

        // Hashtags
        if (stats.hashtags >= 3 && stats.hashtags <= 5) {
            score += 20;
        } else if (stats.hashtags < 3) {
            tips.push('Ajoutez 3-5 hashtags pertinents');
        } else {
            tips.push('Réduisez le nombre de hashtags (3-5 max)');
        }

        // Emojis
        if (stats.emojis >= 1 && stats.emojis <= 5) {
            score += 15;
        } else if (stats.emojis === 0) {
            tips.push('Ajoutez quelques emojis pour plus d\'impact');
        }

        // Structure (sauts de ligne)
        if (stats.lines >= 3) {
            score += 20;
        } else {
            tips.push('Structurez avec des sauts de ligne');
        }

        // Hook (première ligne percutante)
        const firstLine = content.split('\n')[0];
        if (firstLine && firstLine.length > 10 && firstLine.length < 100) {
            score += 15;
        } else {
            tips.push('Commencez par un hook accrocheur');
        }

        return { score: Math.min(score, 100), tips };
    }, [content, stats]);

    // Insérer un emoji
    const insertEmoji = (emoji) => {
        setContent(prev => prev + emoji);
    };

    // Insérer un hashtag
    const insertHashtag = (hashtag) => {
        setContent(prev => prev + (prev.endsWith(' ') || prev === '' ? '' : ' ') + hashtag + ' ');
    };

    // Copier le contenu
    const copyContent = () => {
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success('Copié !');
    };

    // Sauvegarder en brouillon (localStorage)
    const handleSave = async () => {
        if (!content.trim()) {
            toast.error('Le contenu ne peut pas être vide');
            return;
        }

        setIsSaving(true);
        try {
            const draft = {
                id: post?.id || Date.now().toString(),
                content,
                category,
                scheduledDate,
                notes,
                createdAt: post?.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            // Sauvegarder via l'extension si disponible
            const api = window.SPost || window.LinkedInPlanner;
            if (api?.saveDraft) {
                await api.saveDraft(draft);
            } else {
                // Fallback localStorage
                const drafts = JSON.parse(localStorage.getItem('spost_drafts') || '[]');
                const existingIndex = drafts.findIndex(d => d.id === draft.id);
                if (existingIndex >= 0) {
                    drafts[existingIndex] = draft;
                } else {
                    drafts.push(draft);
                }
                localStorage.setItem('spost_drafts', JSON.stringify(drafts));
            }

            toast.success('Brouillon enregistré !');
            if (onSave) onSave(draft);
        } catch (error) {
            toast.error('Erreur lors de l\'enregistrement');
        }
        setIsSaving(false);
    };

    // Génération IA (simulation)
    const generateWithAI = async () => {
        setIsGenerating(true);
        
        // Simulation - en production, connecter à une vraie API
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const templates = [
            `🚀 ${notes || 'Une réflexion qui me tient à cœur'}

Ces derniers temps, j'ai beaucoup réfléchi à ce sujet.

Voici ce que j'ai appris :

✅ Point clé #1
✅ Point clé #2  
✅ Point clé #3

Et vous, qu'en pensez-vous ?

#LinkedIn #PersonalBranding #Success`,

            `💡 Arrêtez de faire cette erreur sur LinkedIn

${notes || 'Beaucoup de gens négligent ce point crucial.'}

La vérité, c'est que :

→ L'authenticité gagne toujours
→ La régularité bat l'intensité
→ L'engagement crée la visibilité

Commentez "OUI" si vous êtes d'accord 👇

#LinkedIn #Marketing #Growth`,
        ];

        setContent(templates[Math.floor(Math.random() * templates.length)]);
        setIsGenerating(false);
        toast.success('Post généré !');
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <CardHeader className="flex-shrink-0 flex flex-row items-center justify-between border-b">
                    <div className="flex items-center gap-3">
                        <CardTitle>{post?.id ? 'Modifier le post' : 'Nouveau post'}</CardTitle>
                        <Badge className={CATEGORIES.find(c => c.value === category)?.color}>
                            {CATEGORIES.find(c => c.value === category)?.label}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Score de qualité */}
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

                {/* Content */}
                <div className="flex-1 overflow-hidden flex">
                    {/* Éditeur */}
                    <div className="flex-1 flex flex-col border-r overflow-hidden">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                            <TabsList className="mx-4 mt-4 grid grid-cols-2 w-fit">
                                <TabsTrigger value="edit">Éditer</TabsTrigger>
                                <TabsTrigger value="settings">Options</TabsTrigger>
                            </TabsList>

                            <TabsContent value="edit" className="flex-1 p-4 flex flex-col overflow-hidden">
                                {/* Toolbar */}
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

                                {/* Textarea */}
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

                                {/* Tips */}
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
                            </TabsContent>

                            <TabsContent value="settings" className="flex-1 p-4 space-y-4 overflow-y-auto">
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
                                        <Clock className="h-4 w-4" />
                                        Programmer la publication
                                    </Label>
                                    <Input 
                                        type="datetime-local" 
                                        value={scheduledDate}
                                        onChange={(e) => setScheduledDate(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Notes / Idées</Label>
                                    <Textarea 
                                        placeholder="Décrivez votre idée pour l'IA..."
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        className="min-h-[100px]"
                                    />
                                </div>

                                {/* Stats du post */}
                                <Card className="bg-slate-50">
                                    <CardContent className="p-4">
                                        <p className="font-medium text-sm mb-3">Statistiques du post</p>
                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Caractères</span>
                                                <span className="font-medium">{stats.chars}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Mots</span>
                                                <span className="font-medium">{stats.words}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Hashtags</span>
                                                <span className="font-medium">{stats.hashtags}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Emojis</span>
                                                <span className="font-medium">{stats.emojis}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* Preview */}
                    <div className="w-[400px] flex-shrink-0 bg-slate-100 p-4 overflow-y-auto hidden lg:block">
                        <div className="flex items-center gap-2 mb-4">
                            <Eye className="h-4 w-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">Aperçu LinkedIn</span>
                        </div>
                        <LinkedInPreview content={content} profile={profile} />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 p-4 border-t bg-gray-50 flex justify-between items-center">
                    <div className="text-xs text-gray-500">
                        Les posts publiés entre 8h-9h ont 2x plus d'engagement
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={handleSave} disabled={isSaving}>
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                            Sauvegarder
                        </Button>
                        <Button className="bg-[#0077B5] hover:bg-[#006097]">
                            <Send className="h-4 w-4 mr-2" />
                            Publier
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}



