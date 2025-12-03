import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
    Edit, Trash2, Send, Copy, Clock, CheckCircle2, 
    AlertCircle, FileText, Loader2, MoreVertical 
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from "sonner";

const CATEGORY_LABELS = {
    thought_leadership: '💡 Thought Leadership',
    tips: '📝 Tips',
    story: '📖 Story',
    promotion: '🎯 Promo',
    engagement: '💬 Engagement',
    other: '📌 Autre',
};

const STATUS_CONFIG = {
    draft: { label: 'Brouillon', icon: FileText, color: 'bg-gray-100 text-gray-700' },
    scheduled: { label: 'Planifié', icon: Clock, color: 'bg-blue-100 text-blue-700' },
    published: { label: 'Publié', icon: CheckCircle2, color: 'bg-green-100 text-green-700' },
    failed: { label: 'Échec', icon: AlertCircle, color: 'bg-red-100 text-red-700' },
};

export default function PostCard({ post, onEdit, onDelete, onRefresh, isLinkedInConnected }) {
    const [isPublishing, setIsPublishing] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const statusConfig = STATUS_CONFIG[post.status] || STATUS_CONFIG.draft;
    const StatusIcon = statusConfig.icon;

    const handleCopy = () => {
        navigator.clipboard.writeText(post.content);
        toast.success('Copié dans le presse-papier !');
    };

    const handleDelete = async () => {
        if (!confirm('Supprimer ce post ?')) return;
        
        setIsDeleting(true);
        try {
            await base44.entities.Post.delete(post.id);
            toast.success('Post supprimé');
            if (onDelete) onDelete();
        } catch (error) {
            toast.error('Erreur lors de la suppression');
        }
        setIsDeleting(false);
    };

    const handlePublish = async () => {
        setIsPublishing(true);
        try {
            const response = await base44.functions.invoke('publishToLinkedIn', { postId: post.id });
            
            if (response.data.success) {
                toast.success('Publié sur LinkedIn !');
                if (onRefresh) onRefresh();
            } else {
                toast.error(response.data.error || 'Erreur de publication');
            }
        } catch (error) {
            toast.error('Erreur lors de la publication');
        }
        setIsPublishing(false);
    };

    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-4">
                <div className="flex justify-between items-start mb-3">
                    <div className="flex gap-2 flex-wrap">
                        <Badge className={statusConfig.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig.label}
                        </Badge>
                        {post.category && (
                            <Badge variant="outline">
                                {CATEGORY_LABELS[post.category]}
                            </Badge>
                        )}
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit(post)}>
                                <Edit className="h-4 w-4 mr-2" /> Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleCopy}>
                                <Copy className="h-4 w-4 mr-2" /> Copier
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                                onClick={handleDelete} 
                                className="text-red-600"
                                disabled={isDeleting}
                            >
                                <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-4">
                    {post.content}
                </p>

                {post.scheduled_date && post.status !== 'published' && (
                    <p className="text-xs text-gray-500 mt-3 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Planifié pour {format(new Date(post.scheduled_date), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                    </p>
                )}
            </CardContent>
            
            {post.status !== 'published' && isLinkedInConnected && (
                <CardFooter className="pt-0">
                    <Button
                        size="sm"
                        onClick={handlePublish}
                        disabled={isPublishing}
                        className="bg-[#0077B5] hover:bg-[#006097]"
                    >
                        {isPublishing ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                            <Send className="h-4 w-4 mr-2" />
                        )}
                        Publier
                    </Button>
                </CardFooter>
            )}
        </Card>
    );
}