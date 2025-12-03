import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
    X, Smile, Bold, Italic, List, ListOrdered, ArrowRight, AtSign,
    Link2, Image, FileText, BarChart2, Monitor, Smartphone, 
    ThumbsUp, MessageCircle, Share2, Send, MoreHorizontal,
    ChevronDown, Sparkles, Clock, Tag, Target, Folder
} from "lucide-react";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Emoji Picker simple
const EMOJIS = ['😀', '😂', '🔥', '💡', '🎯', '🚀', '💪', '👏', '❤️', '⭐', '✅', '📌', '📊', '💼', '🤝', '👉', '🎉', '💬', '📈', '🏆'];

export default function PostEditorModal({ post, profile, onClose, onSave }) {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [firstComment, setFirstComment] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showEmojiPickerComment, setShowEmojiPickerComment] = useState(false);
    const [previewDevice, setPreviewDevice] = useState('desktop'); // desktop, mobile
    const [category, setCategory] = useState('Post');
    const [objective, setObjective] = useState('');
    const textareaRef = useRef(null);
    const commentRef = useRef(null);
    
    // Stats calculées
    const charCount = content.length;
    const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
    const hashtagCount = (content.match(/#\w+/g) || []).length;
    const mentionCount = (content.match(/@\w+/g) || []).length;
    const emojiCount = (content.match(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu) || []).length;
    
    useEffect(() => {
        if (post) {
            setContent(post.content || '');
            // Extraire le titre depuis la première ligne
            const firstLine = (post.content || '').split('\n')[0];
            if (firstLine.length < 100) {
                setTitle(firstLine);
            }
        }
    }, [post]);
    
    const insertEmoji = (emoji, isComment = false) => {
        if (isComment) {
            const textarea = commentRef.current;
            if (textarea) {
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const newValue = firstComment.substring(0, start) + emoji + firstComment.substring(end);
                setFirstComment(newValue);
            }
            setShowEmojiPickerComment(false);
        } else {
            const textarea = textareaRef.current;
            if (textarea) {
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const newValue = content.substring(0, start) + emoji + content.substring(end);
                setContent(newValue);
            }
            setShowEmojiPicker(false);
        }
    };
    
    const insertFormatting = (format) => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = content.substring(start, end);
        
        let newText = '';
        switch (format) {
            case 'bold':
                // LinkedIn ne supporte pas le markdown, utiliser des caractères Unicode
                newText = selectedText.split('').map(c => {
                    const code = c.charCodeAt(0);
                    if (code >= 65 && code <= 90) return String.fromCharCode(code + 0x1D5D4 - 65);
                    if (code >= 97 && code <= 122) return String.fromCharCode(code + 0x1D5EE - 97);
                    return c;
                }).join('');
                break;
            case 'italic':
                newText = selectedText.split('').map(c => {
                    const code = c.charCodeAt(0);
                    if (code >= 65 && code <= 90) return String.fromCharCode(code + 0x1D608 - 65);
                    if (code >= 97 && code <= 122) return String.fromCharCode(code + 0x1D622 - 97);
                    return c;
                }).join('');
                break;
            case 'bullet':
                newText = '• ' + selectedText;
                break;
            case 'number':
                newText = '1. ' + selectedText;
                break;
            default:
                newText = selectedText;
        }
        
        const newContent = content.substring(0, start) + newText + content.substring(end);
        setContent(newContent);
    };
    
    const handleSave = () => {
        const updatedPost = {
            ...post,
            content,
            title,
            firstComment,
            category,
            objective,
            updatedAt: new Date().toISOString(),
        };
        onSave?.(updatedPost);
    };
    
    // Formater le contenu pour l'aperçu (avec hashtags colorés)
    const formatPreviewContent = (text) => {
        if (!text) return null;
        
        // Limiter à 3 lignes pour l'aperçu
        const lines = text.split('\n');
        const preview = lines.slice(0, 5).join('\n');
        const hasMore = lines.length > 5;
        
        return (
            <>
                {preview.split(/(\s+)/).map((word, i) => {
                    if (word.startsWith('#')) {
                        return <span key={i} className="text-blue-600">{word}</span>;
                    }
                    if (word.startsWith('@')) {
                        return <span key={i} className="text-blue-600 font-medium">{word}</span>;
                    }
                    return <span key={i}>{word}</span>;
                })}
                {hasMore && <span className="text-gray-500">... plus</span>}
            </>
        );
    };
    
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto py-8">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl mx-4 my-auto">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            {profile?.picture ? (
                                <img src={profile.picture} alt="" className="w-8 h-8 rounded-full" />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                    <span className="text-blue-600 font-medium text-sm">
                                        {(profile?.firstName || 'U')[0]}
                                    </span>
                                </div>
                            )}
                            <span className="font-medium text-gray-900">
                                {profile?.firstName} {profile?.lastName}
                            </span>
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">Lance ta IA</span>
                        <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={onClose}
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
                
                {/* Main content */}
                <div className="flex">
                    {/* Left: Editor */}
                    <div className="flex-1 p-6 border-r">
                        {/* Title */}
                        <div className="mb-4">
                            <Input
                                placeholder="Titre (optionnel)"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="border-0 border-b rounded-none px-0 text-lg font-medium focus-visible:ring-0 focus-visible:border-blue-500"
                            />
                        </div>
                        
                        {/* Toolbar */}
                        <div className="flex items-center gap-1 mb-4 pb-3 border-b">
                            <select className="text-sm border rounded px-2 py-1.5 text-gray-600">
                                <option>normal</option>
                                <option>titre</option>
                            </select>
                            
                            <div className="h-5 w-px bg-gray-200 mx-2" />
                            
                            <button 
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                className="p-2 hover:bg-gray-100 rounded relative"
                            >
                                <Smile className="h-4 w-4 text-gray-500" />
                                {showEmojiPicker && (
                                    <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg p-2 z-10 flex flex-wrap gap-1 w-64">
                                        {EMOJIS.map(emoji => (
                                            <button 
                                                key={emoji}
                                                onClick={(e) => { e.stopPropagation(); insertEmoji(emoji); }}
                                                className="p-1 hover:bg-gray-100 rounded text-xl"
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </button>
                            
                            <button 
                                onClick={() => insertFormatting('bold')}
                                className="p-2 hover:bg-gray-100 rounded"
                                title="Gras"
                            >
                                <Bold className="h-4 w-4 text-gray-500" />
                            </button>
                            
                            <button 
                                onClick={() => insertFormatting('italic')}
                                className="p-2 hover:bg-gray-100 rounded"
                                title="Italique"
                            >
                                <Italic className="h-4 w-4 text-gray-500" />
                            </button>
                            
                            <button 
                                onClick={() => insertFormatting('bullet')}
                                className="p-2 hover:bg-gray-100 rounded"
                                title="Liste à puces"
                            >
                                <List className="h-4 w-4 text-gray-500" />
                            </button>
                            
                            <button 
                                onClick={() => insertFormatting('number')}
                                className="p-2 hover:bg-gray-100 rounded"
                                title="Liste numérotée"
                            >
                                <ListOrdered className="h-4 w-4 text-gray-500" />
                            </button>
                            
                            <button className="p-2 hover:bg-gray-100 rounded">
                                <ArrowRight className="h-4 w-4 text-gray-500" />
                            </button>
                            
                            <button className="p-2 hover:bg-gray-100 rounded text-blue-500 font-medium text-sm">
                                Mention
                            </button>
                            
                            <div className="ml-auto flex items-center gap-2">
                                <button className="text-sm text-blue-500 hover:underline flex items-center gap-1">
                                    <Link2 className="h-4 w-4" />
                                    Insérer un lien surveillé
                                </button>
                                <button className="text-sm text-blue-500 hover:underline">
                                    Accroche
                                </button>
                                <button className="text-sm text-blue-500 hover:underline">
                                    Signature de post
                                </button>
                            </div>
                        </div>
                        
                        {/* Content textarea */}
                        <textarea
                            ref={textareaRef}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Écris un post parfait..."
                            className="w-full h-64 resize-none border-0 focus:ring-0 focus:outline-none text-gray-800 leading-relaxed"
                        />
                        
                        {/* Stats */}
                        <div className="flex items-center gap-4 text-xs text-gray-400 border-t pt-3 mt-4">
                            <span>{charCount} Lettre</span>
                            <span>{wordCount} Mots</span>
                            <span>{mentionCount} Mention</span>
                        </div>
                        
                        {/* Warning if extension not detected */}
                        <div className="mt-4 text-sm text-orange-600 bg-orange-50 p-3 rounded">
                            L'extension n'a pas été trouvée. Vous ne pourrez pas rechercher de personnes à mentionner.
                        </div>
                        
                        {/* Media buttons */}
                        <div className="mt-4 flex items-center gap-3">
                            <button className="flex items-center gap-2 text-blue-500 hover:bg-blue-50 px-3 py-2 rounded">
                                <Image className="h-4 w-4" />
                                <span className="text-sm">+ Ajouter un média ou un sondage</span>
                            </button>
                            
                            <button className="flex items-center gap-2 text-green-600 hover:bg-green-50 px-3 py-2 rounded border border-green-200">
                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
                                </svg>
                                <span className="text-sm">Importer un design Canva</span>
                            </button>
                        </div>
                        
                        {/* First comment section */}
                        <div className="mt-6 pt-6 border-t">
                            <h3 className="text-sm font-medium text-gray-700 mb-3">Rédiger le premier commentaire</h3>
                            
                            <div className="flex items-center gap-1 mb-2">
                                <select className="text-sm border rounded px-2 py-1 text-gray-600">
                                    <option>normal</option>
                                </select>
                                <button 
                                    onClick={() => setShowEmojiPickerComment(!showEmojiPickerComment)}
                                    className="p-1.5 hover:bg-gray-100 rounded relative"
                                >
                                    <Smile className="h-4 w-4 text-gray-500" />
                                </button>
                                <button className="p-1.5 hover:bg-gray-100 rounded">
                                    <Bold className="h-4 w-4 text-gray-500" />
                                </button>
                                <button className="p-1.5 hover:bg-gray-100 rounded">
                                    <List className="h-4 w-4 text-gray-500" />
                                </button>
                                <button className="p-1.5 hover:bg-gray-100 rounded">
                                    <ArrowRight className="h-4 w-4 text-gray-500" />
                                </button>
                                <button className="p-1.5 hover:bg-gray-100 rounded text-blue-500 text-sm">
                                    Mention
                                </button>
                                <button className="ml-auto text-sm text-blue-500 hover:underline flex items-center gap-1">
                                    <Link2 className="h-4 w-4" />
                                    Insérer un lien surveillé
                                </button>
                            </div>
                            
                            <textarea
                                ref={commentRef}
                                value={firstComment}
                                onChange={(e) => setFirstComment(e.target.value)}
                                placeholder="Votre premier commentaire..."
                                className="w-full h-24 p-3 border rounded-lg resize-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            />
                            
                            <p className="text-xs text-gray-400 mt-2">
                                Le commentaire sera envoyé 10 min après la publication
                            </p>
                        </div>
                        
                        {/* Tips */}
                        <div className="mt-4 text-sm text-gray-500 bg-gray-50 p-3 rounded">
                            <p className="font-medium text-gray-700">HOP HOP HOP, ON RANGE SON POST AVANT DE PUBLIER ;)</p>
                            <p className="mt-1">Organise ta BDD de posts en les taguant, pratique pour retrouver ce qui marche (ou pas) plus tard ;)</p>
                        </div>
                        
                        {/* Objectives & Category */}
                        <div className="mt-6 space-y-4">
                            <div className="flex items-center gap-4">
                                <label className="text-sm text-gray-600 w-24">Objectifs</label>
                                <select 
                                    value={objective}
                                    onChange={(e) => setObjective(e.target.value)}
                                    className="flex-1 border rounded px-3 py-2 text-sm"
                                >
                                    <option value="">Sélectionner un objectif</option>
                                    <option value="engagement">Engagement</option>
                                    <option value="visibility">Visibilité</option>
                                    <option value="leads">Génération de leads</option>
                                    <option value="branding">Personal branding</option>
                                </select>
                            </div>
                            
                            <div className="flex items-center gap-4">
                                <label className="text-sm text-gray-600 w-24">Catégorie</label>
                                <div className="flex-1">
                                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 cursor-pointer">
                                        {category} ✕
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Right: Preview */}
                    <div className="w-96 bg-gray-50 p-6">
                        {/* Preview tabs */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex gap-4">
                                <button className="text-sm font-medium text-blue-600 border-b-2 border-blue-600 pb-1">
                                    Aperçu
                                </button>
                                <button className="text-sm text-gray-500 pb-1">
                                    Assistant
                                </button>
                            </div>
                            <button onClick={onClose}>
                                <X className="h-5 w-5 text-gray-400" />
                            </button>
                        </div>
                        
                        {/* Device toggle */}
                        <div className="flex items-center justify-center gap-2 mb-4">
                            <button 
                                onClick={() => setPreviewDevice('desktop')}
                                className={`p-2 rounded ${previewDevice === 'desktop' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}
                            >
                                <Monitor className="h-5 w-5" />
                            </button>
                            <button 
                                onClick={() => setPreviewDevice('mobile')}
                                className={`p-2 rounded ${previewDevice === 'mobile' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}
                            >
                                <Smartphone className="h-5 w-5" />
                            </button>
                        </div>
                        
                        {/* LinkedIn Preview Card */}
                        <div className={`bg-white rounded-lg shadow border ${previewDevice === 'mobile' ? 'max-w-xs mx-auto' : ''}`}>
                            {/* Post header */}
                            <div className="p-4 flex items-start gap-3">
                                <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden">
                                    {profile?.picture ? (
                                        <img src={profile.picture} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-blue-100 flex items-center justify-center">
                                            <span className="text-blue-600 font-medium">
                                                {(profile?.firstName || 'U')[0]}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-1">
                                        <span className="font-semibold text-sm">
                                            {profile?.firstName} {profile?.lastName}
                                        </span>
                                        <span className="text-gray-500 text-sm">• Vous</span>
                                    </div>
                                    <p className="text-xs text-gray-500 line-clamp-1">
                                        {profile?.headline || 'Votre titre professionnel'}
                                    </p>
                                    <p className="text-xs text-gray-400 flex items-center gap-1">
                                        1 jour • 🌐
                                    </p>
                                </div>
                                <button className="text-gray-400">
                                    <MoreHorizontal className="h-5 w-5" />
                                </button>
                            </div>
                            
                            {/* Post content preview */}
                            <div className="px-4 pb-3">
                                <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                                    {formatPreviewContent(content) || (
                                        <span className="text-gray-400 italic">Votre post apparaîtra ici...</span>
                                    )}
                                </div>
                            </div>
                            
                            {/* Engagement stats */}
                            <div className="px-4 py-2 flex items-center gap-1 text-xs text-gray-500">
                                <span className="flex items-center">
                                    <span className="bg-blue-500 text-white rounded-full p-0.5 text-xs">👍</span>
                                    <span className="bg-red-500 text-white rounded-full p-0.5 text-xs -ml-1">❤️</span>
                                </span>
                                <span className="ml-1">{post?.stats?.likes || 0} autres</span>
                                <span className="ml-auto">{post?.stats?.comments || 0} commentaires</span>
                            </div>
                            
                            {/* Divider */}
                            <div className="border-t mx-4" />
                            
                            {/* Action buttons */}
                            <div className="px-4 py-2 flex items-center justify-around">
                                <button className="flex items-center gap-1 text-gray-500 hover:bg-gray-100 px-3 py-2 rounded">
                                    <ThumbsUp className="h-4 w-4" />
                                    <span className="text-xs">J'aime</span>
                                </button>
                                <button className="flex items-center gap-1 text-gray-500 hover:bg-gray-100 px-3 py-2 rounded">
                                    <MessageCircle className="h-4 w-4" />
                                    <span className="text-xs">Commenter</span>
                                </button>
                                <button className="flex items-center gap-1 text-gray-500 hover:bg-gray-100 px-3 py-2 rounded">
                                    <Share2 className="h-4 w-4" />
                                    <span className="text-xs">Republier</span>
                                </button>
                                <button className="flex items-center gap-1 text-gray-500 hover:bg-gray-100 px-3 py-2 rounded">
                                    <Send className="h-4 w-4" />
                                    <span className="text-xs">Envoyer</span>
                                </button>
                            </div>
                        </div>
                        
                        {/* Quality indicators (placeholders) */}
                        <div className="mt-4 space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
                            <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
                            <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse" />
                        </div>
                    </div>
                </div>
                
                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
                    <div className="text-sm text-gray-500">
                        {post?.createdAt && (
                            <span>Publié {format(new Date(post.createdAt), "dd MMMM yyyy 'à' HH:mm", { locale: fr })}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" onClick={onClose}>
                            Annuler
                        </Button>
                        <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                            Enregistrer les modifications
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}



