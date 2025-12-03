import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Save, Send, Loader2, X } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
    { value: 'thought_leadership', label: '💡 Thought Leadership' },
    { value: 'tips', label: '📝 Tips & Conseils' },
    { value: 'story', label: '📖 Storytelling' },
    { value: 'promotion', label: '🎯 Promotion' },
    { value: 'engagement', label: '💬 Engagement' },
    { value: 'other', label: '📌 Autre' },
];

export default function PostEditor({ post, onSave, onClose, isLinkedInConnected }) {
    const [content, setContent] = useState(post?.content || '');
    const [category, setCategory] = useState(post?.category || 'other');
    const [scheduledDate, setScheduledDate] = useState(
        post?.scheduled_date ? new Date(post.scheduled_date).toISOString().slice(0, 16) : ''
    );
    const [notes, setNotes] = useState(post?.notes || '');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);

    const characterCount = content.length;
    const maxChars = 3000;

    const generateWithAI = async () => {
        setIsGenerating(true);
        try {
            const response = await base44.integrations.Core.InvokeLLM({
                prompt: `Tu es un expert en personal branding sur LinkedIn. Génère un post LinkedIn engageant et professionnel en français.
                
Catégorie: ${CATEGORIES.find(c => c.value === category)?.label || 'Général'}
${notes ? `Notes/Idées: ${notes}` : ''}
${content ? `Améliore ce brouillon: ${content}` : 'Crée un nouveau post original'}

Règles:
- Maximum 3000 caractères
- Utilise des emojis avec modération
- Inclus un hook accrocheur au début
- Termine par un call-to-action ou une question
- Structure le texte avec des sauts de ligne pour la lisibilité`,
                response_json_schema: {
                    type: "object",
                    properties: {
                        post_content: { type: "string" }
                    }
                }
            });
            
            setContent(response.post_content);
            toast.success('Post généré !');
        } catch (error) {
            toast.error('Erreur lors de la génération');
        }
        setIsGenerating(false);
    };

    const handleSave = async (status = 'draft') => {
        if (!content.trim()) {
            toast.error('Le contenu ne peut pas être vide');
            return;
        }

        setIsSaving(true);
        try {
            const postData = {
                content,
                category,
                scheduled_date: scheduledDate || null,
                notes,
                status: scheduledDate && status === 'draft' ? 'scheduled' : status
            };

            if (post?.id) {
                await base44.entities.Post.update(post.id, postData);
            } else {
                await base44.entities.Post.create(postData);
            }

            toast.success('Post enregistré !');
            if (onSave) onSave();
        } catch (error) {
            toast.error('Erreur lors de l\'enregistrement');
        }
        setIsSaving(false);
    };

    const handlePublish = async () => {
        if (!content.trim()) {
            toast.error('Le contenu ne peut pas être vide');
            return;
        }

        setIsPublishing(true);
        try {
            let postId = post?.id;
            
            // Save first if new
            if (!postId) {
                const newPost = await base44.entities.Post.create({
                    content,
                    category,
                    notes,
                    status: 'draft'
                });
                postId = newPost.id;
            } else {
                await base44.entities.Post.update(postId, { content, category, notes });
            }

            // Publish to LinkedIn
            const response = await base44.functions.invoke('publishToLinkedIn', { postId });
            
            if (response.data.success) {
                toast.success('Publié sur LinkedIn !');
                if (onSave) onSave();
            } else {
                toast.error(response.data.error || 'Erreur de publication');
            }
        } catch (error) {
            toast.error('Erreur lors de la publication');
        }
        setIsPublishing(false);
    };

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{post?.id ? 'Modifier le post' : 'Nouveau post'}</CardTitle>
                {onClose && (
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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
                        <Label>Planifier pour</Label>
                        <Input 
                            type="datetime-local" 
                            value={scheduledDate}
                            onChange={(e) => setScheduledDate(e.target.value)}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Notes / Idées (optionnel)</Label>
                    <Input 
                        placeholder="Décrivez votre idée pour aider l'IA..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <Label>Contenu du post</Label>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={generateWithAI}
                            disabled={isGenerating}
                        >
                            {isGenerating ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Sparkles className="h-4 w-4 mr-2" />
                            )}
                            Générer avec l'IA
                        </Button>
                    </div>
                    <Textarea 
                        placeholder="Écrivez votre post LinkedIn ici..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="min-h-[250px] resize-none"
                        maxLength={maxChars}
                    />
                    <div className={`text-sm text-right ${characterCount > maxChars * 0.9 ? 'text-orange-500' : 'text-gray-500'}`}>
                        {characterCount} / {maxChars}
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-3">
                <Button
                    variant="outline"
                    onClick={() => handleSave('draft')}
                    disabled={isSaving || isPublishing}
                >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Enregistrer
                </Button>
                {isLinkedInConnected && (
                    <Button
                        onClick={handlePublish}
                        disabled={isPublishing || isSaving}
                        className="bg-[#0077B5] hover:bg-[#006097]"
                    >
                        {isPublishing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                        Publier maintenant
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}