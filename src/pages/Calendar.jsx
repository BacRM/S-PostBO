import React, { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
    ChevronLeft, ChevronRight, Plus, Loader2, Heart, MessageCircle, 
    Eye, Clock, Calendar as CalendarIcon, X, FileText, Send, Save,
    Trash2, Copy, MoreVertical, Edit, ExternalLink, Linkedin
} from "lucide-react";
import { 
    format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
    addDays, addMonths, subMonths, isSameMonth, isSameDay, parseISO 
} from 'date-fns';
import { fr } from 'date-fns/locale';
import Sidebar from '../components/dashboard/Sidebar';
import { APP_VERSION, EXTENSION_VERSION } from '@/config/version';

const STATUS_COLORS = {
    draft: 'bg-gray-200 text-gray-700 border-l-4 border-gray-400',
    scheduled: 'bg-amber-100 text-amber-700 border-l-4 border-amber-500',
    publishing: 'bg-blue-100 text-blue-700 border-l-4 border-blue-500 animate-pulse',
    published: 'bg-green-100 text-green-700 border-l-4 border-green-500',
    failed: 'bg-red-100 text-red-700 border-l-4 border-red-500',
    linkedin: 'bg-[#0077B5]/10 text-[#0077B5] border-l-4 border-[#0077B5]',
};

const STATUS_LABELS = {
    draft: 'Brouillon',
    scheduled: 'Programmé',
    publishing: 'En cours...',
    published: 'Publié',
    failed: 'Échoué',
    linkedin: 'LinkedIn',
};

// Hook pour récupérer les données depuis l'extension
function useSPostData() {
    const [drafts, setDrafts] = useState([]);
    const [scheduledPosts, setScheduledPosts] = useState([]);
    const [publishedPosts, setPublishedPosts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadData = async () => {
        setIsLoading(true);
        try {
            // Charger depuis localStorage
            const draftsData = localStorage.getItem('spost_drafts');
            const scheduledData = localStorage.getItem('spost_scheduled');
            const postsData = localStorage.getItem('spost_posts');

            if (draftsData) setDrafts(JSON.parse(draftsData));
            if (scheduledData) setScheduledPosts(JSON.parse(scheduledData));
            if (postsData) setPublishedPosts(JSON.parse(postsData));

            // Essayer de synchroniser avec l'extension
            if (window.LinkedInPlanner) {
                try {
                    const extDrafts = await window.LinkedInPlanner.getDrafts();
                    const extScheduled = await window.LinkedInPlanner.getScheduledPosts();
                    
                    if (extDrafts?.length) {
                        setDrafts(extDrafts);
                        localStorage.setItem('spost_drafts', JSON.stringify(extDrafts));
                    }
                    if (extScheduled?.length) {
                        setScheduledPosts(extScheduled);
                        localStorage.setItem('spost_scheduled', JSON.stringify(extScheduled));
                    }
                } catch (e) {
                    console.log('[Calendar] Extension non disponible');
                }
            }
        } catch (error) {
            console.error('[Calendar] Erreur chargement:', error);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        loadData();
        
        // Écouter les mises à jour
        const handleUpdate = () => loadData();
        window.addEventListener('SPostDataUpdated', handleUpdate);
        
        return () => {
            window.removeEventListener('SPostDataUpdated', handleUpdate);
        };
    }, []);

    return { drafts, scheduledPosts, publishedPosts, isLoading, refetch: loadData };
}

// Composant éditeur de post
function PostEditor({ post, onSave, onClose, onSchedule, onPublishNow }) {
    const [content, setContent] = useState(post?.content || '');
    const [scheduledDate, setScheduledDate] = useState(
        post?.scheduledAt ? format(new Date(post.scheduledAt), "yyyy-MM-dd'T'HH:mm") : ''
    );
    const [isSaving, setIsSaving] = useState(false);

    const handleSaveDraft = async () => {
        setIsSaving(true);
        try {
            const draft = {
                id: post?.id,
                content,
                status: 'draft',
                updatedAt: new Date().toISOString(),
            };
            
            // Sauvegarder localement
            const drafts = JSON.parse(localStorage.getItem('spost_drafts') || '[]');
            if (draft.id) {
                const idx = drafts.findIndex(d => d.id === draft.id);
                if (idx !== -1) drafts[idx] = { ...drafts[idx], ...draft };
                else drafts.push({ ...draft, id: Date.now().toString(), createdAt: new Date().toISOString() });
            } else {
                drafts.push({ ...draft, id: Date.now().toString(), createdAt: new Date().toISOString() });
            }
            localStorage.setItem('spost_drafts', JSON.stringify(drafts));
            
            window.dispatchEvent(new CustomEvent('SPostDataUpdated'));
            onSave && onSave(draft);
        } catch (error) {
            console.error('Erreur sauvegarde:', error);
        }
        setIsSaving(false);
    };

    const handleSchedule = async () => {
        if (!scheduledDate || !content.trim()) {
            alert('Veuillez remplir le contenu et la date de programmation');
            return;
        }

        setIsSaving(true);
        try {
            const scheduled = {
                id: post?.id || Date.now().toString(),
                content,
                scheduledAt: new Date(scheduledDate).toISOString(),
                status: 'scheduled',
                createdAt: post?.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            
            // Sauvegarder localement
            const scheduledPosts = JSON.parse(localStorage.getItem('spost_scheduled') || '[]');
            const existingIdx = scheduledPosts.findIndex(p => p.id === scheduled.id);
            if (existingIdx !== -1) {
                scheduledPosts[existingIdx] = scheduled;
            } else {
                scheduledPosts.push(scheduled);
            }
            localStorage.setItem('spost_scheduled', JSON.stringify(scheduledPosts));
            
            // Supprimer des brouillons si c'était un brouillon
            if (post?.status === 'draft') {
                const drafts = JSON.parse(localStorage.getItem('spost_drafts') || '[]');
                localStorage.setItem('spost_drafts', JSON.stringify(drafts.filter(d => d.id !== post.id)));
            }
            
            window.dispatchEvent(new CustomEvent('SPostDataUpdated'));
            onSchedule && onSchedule(scheduled);
            onClose && onClose();
        } catch (error) {
            console.error('Erreur programmation:', error);
        }
        setIsSaving(false);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl bg-white rounded-xl shadow-2xl">
                <div className="p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-gray-900">
                            {post?.id ? 'Modifier le post' : 'Nouveau post'}
                        </h2>
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    {/* Contenu */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Contenu du post
                            </label>
                            <Textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Écrivez votre post LinkedIn ici..."
                                className="min-h-[200px] resize-none"
                                maxLength={3000}
                            />
                            <div className="text-right text-sm text-gray-500 mt-1">
                                {content.length} / 3000 caractères
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Clock className="h-4 w-4 inline mr-2" />
                                Programmer pour
                            </label>
                            <Input
                                type="datetime-local"
                                value={scheduledDate}
                                onChange={(e) => setScheduledDate(e.target.value)}
                                min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between mt-6 pt-4 border-t">
                        <Button variant="outline" onClick={onClose}>
                            Annuler
                        </Button>
                        
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                onClick={handleSaveDraft}
                                disabled={isSaving || !content.trim()}
                            >
                                <Save className="h-4 w-4 mr-2" />
                                Sauvegarder
                            </Button>
                            
                            <Button
                                onClick={handleSchedule}
                                disabled={isSaving || !content.trim() || !scheduledDate}
                                className="bg-amber-500 hover:bg-amber-600 text-white"
                            >
                                {isSaving ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <Clock className="h-4 w-4 mr-2" />
                                )}
                                Programmer
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}

export default function Calendar() {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [showEditor, setShowEditor] = useState(false);
    const [editingPost, setEditingPost] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);
    
    const { drafts, scheduledPosts, publishedPosts, isLoading, refetch } = useSPostData();

    // Combiner tous les posts avec leur type
    const allPosts = useMemo(() => {
        const posts = [
            ...drafts.map(d => ({ ...d, type: 'draft', displayDate: d.updatedAt || d.createdAt })),
            ...scheduledPosts.map(p => ({ ...p, type: 'scheduled', displayDate: p.scheduledAt })),
            ...publishedPosts.map(p => ({ 
                ...p, 
                type: 'linkedin', 
                status: 'linkedin',
                displayDate: p.createdAt 
            })),
        ];
        return posts.sort((a, b) => new Date(b.displayDate) - new Date(a.displayDate));
    }, [drafts, scheduledPosts, publishedPosts]);

    const getPostsForDate = (date) => {
        return allPosts.filter(post => {
            if (!post.displayDate) return false;
            try {
                const postDate = new Date(post.displayDate);
                return isSameDay(postDate, date);
            } catch {
                return false;
            }
        });
    };

    const renderHeader = () => (
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
                <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setCurrentMonth(new Date())}
                >
                    Aujourd'hui
                </Button>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
                <h2 className="text-xl font-semibold capitalize">
                    {format(currentMonth, 'MMMM yyyy', { locale: fr })}
                </h2>
                {isLoading && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
            </div>
            <div className="flex items-center gap-2">
                <Button 
                    onClick={() => {
                        setEditingPost(null);
                        setShowEditor(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Nouveau post
                </Button>
            </div>
        </div>
    );

    const renderDays = () => {
        const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
        return (
            <div className="grid grid-cols-7 border-b bg-gray-50">
                {days.map(day => (
                    <div key={day} className="p-3 text-center text-sm font-medium text-gray-600">
                        {day}
                    </div>
                ))}
            </div>
        );
    };

    const renderCells = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

        const rows = [];
        let days = [];
        let day = startDate;

        while (day <= endDate) {
            for (let i = 0; i < 7; i++) {
                const currentDay = day;
                const dayPosts = getPostsForDate(currentDay);
                const isCurrentMonth = isSameMonth(day, monthStart);
                const isToday = isSameDay(day, new Date());
                const isSelected = selectedDate && isSameDay(day, selectedDate);

                days.push(
                    <div
                        key={day.toString()}
                        onClick={() => setSelectedDate(currentDay)}
                        className={`min-h-[120px] border-r border-b p-2 cursor-pointer transition-colors ${
                            !isCurrentMonth ? 'bg-gray-50' : 'bg-white hover:bg-blue-50/50'
                        } ${isSelected ? 'bg-blue-100' : ''}`}
                    >
                        <div className={`text-sm mb-1 ${
                            isToday 
                                ? 'bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center font-bold' 
                                : !isCurrentMonth 
                                    ? 'text-gray-400' 
                                    : 'text-gray-700 font-medium'
                        }`}>
                            {format(day, 'd')}
                        </div>
                        <div className="space-y-1">
                            {dayPosts.slice(0, 3).map((post, idx) => (
                                <div
                                    key={post.id || idx}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (post.type !== 'linkedin') {
                                            setEditingPost(post);
                                            setShowEditor(true);
                                        }
                                    }}
                                    className={`text-xs p-1.5 rounded cursor-pointer transition-all hover:scale-[1.02] ${STATUS_COLORS[post.status || post.type]}`}
                                >
                                    <div className="flex items-center gap-1">
                                        <span className="font-medium">
                                            {format(new Date(post.displayDate), 'HH:mm')}
                                        </span>
                                        {post.type === 'linkedin' && post.stats && (
                                            <div className="flex items-center gap-1 ml-auto text-[10px]">
                                                <Eye className="h-3 w-3" />
                                                <span>{post.stats.views || 0}</span>
                                            </div>
                                        )}
                                    </div>
                                    <p className="truncate text-[11px] mt-0.5">
                                        {post.content?.substring(0, 30)}...
                                    </p>
                                </div>
                            ))}
                            {dayPosts.length > 3 && (
                                <p className="text-xs text-gray-500 pl-1 font-medium">
                                    +{dayPosts.length - 3} autres
                                </p>
                            )}
                        </div>
                    </div>
                );
                day = addDays(day, 1);
            }
            rows.push(
                <div key={day.toString()} className="grid grid-cols-7">
                    {days}
                </div>
            );
            days = [];
        }
        return <div className="border-l border-t">{rows}</div>;
    };

    // Panneau latéral avec les statistiques
    const renderSidebar = () => {
        const upcomingPosts = scheduledPosts
            .filter(p => new Date(p.scheduledAt) > new Date())
            .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
            .slice(0, 5);

        return (
            <div className="w-80 border-l bg-gray-50 p-4 space-y-6">
                {/* Stats rapides */}
                <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Résumé</h3>
                    <div className="grid grid-cols-2 gap-2">
                        <Card className="p-3 bg-white">
                            <div className="text-2xl font-bold text-gray-900">{drafts.length}</div>
                            <div className="text-xs text-gray-500">Brouillons</div>
                        </Card>
                        <Card className="p-3 bg-white">
                            <div className="text-2xl font-bold text-amber-600">{scheduledPosts.length}</div>
                            <div className="text-xs text-gray-500">Programmés</div>
                        </Card>
                        <Card className="p-3 bg-white col-span-2">
                            <div className="text-2xl font-bold text-green-600">{publishedPosts.length}</div>
                            <div className="text-xs text-gray-500">Publiés ce mois</div>
                        </Card>
                    </div>
                </div>

                {/* Prochaines publications */}
                <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Prochaines publications</h3>
                    {upcomingPosts.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">Aucune publication programmée</p>
                    ) : (
                        <div className="space-y-2">
                            {upcomingPosts.map(post => (
                                <Card 
                                    key={post.id} 
                                    className="p-3 bg-white cursor-pointer hover:shadow-md transition-shadow"
                                    onClick={() => {
                                        setEditingPost(post);
                                        setShowEditor(true);
                                    }}
                                >
                                    <div className="flex items-center gap-2 text-xs text-amber-600 mb-1">
                                        <Clock className="h-3 w-3" />
                                        {format(new Date(post.scheduledAt), "dd MMM 'à' HH:mm", { locale: fr })}
                                    </div>
                                    <p className="text-sm text-gray-700 line-clamp-2">
                                        {post.content?.substring(0, 80)}...
                                    </p>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                {/* Brouillons récents */}
                {drafts.length > 0 && (
                    <div>
                        <h3 className="font-semibold text-gray-900 mb-3">Brouillons récents</h3>
                        <div className="space-y-2">
                            {drafts.slice(0, 3).map(draft => (
                                <Card 
                                    key={draft.id} 
                                    className="p-3 bg-white cursor-pointer hover:shadow-md transition-shadow"
                                    onClick={() => {
                                        setEditingPost(draft);
                                        setShowEditor(true);
                                    }}
                                >
                                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                                        <FileText className="h-3 w-3" />
                                        Modifié {format(new Date(draft.updatedAt || draft.createdAt), "dd MMM", { locale: fr })}
                                    </div>
                                    <p className="text-sm text-gray-700 line-clamp-2">
                                        {draft.content?.substring(0, 60)}...
                                    </p>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const handleEditorClose = () => {
        setShowEditor(false);
        setEditingPost(null);
        refetch();
    };

    return (
        <div className="flex min-h-screen bg-gray-100">
            {/* Sidebar */}
            <Sidebar activePage="calendar" />
            
            {/* Main content */}
            <div className="flex-1 p-6 overflow-auto">
                {renderHeader()}
                
                {/* Legend */}
                <div className="flex items-center gap-4 mb-4 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-gray-400"></div>
                        <span>Brouillon</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-amber-500"></div>
                        <span>Programmé</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-[#0077B5]"></div>
                        <span>Publié</span>
                    </div>
                </div>

                <Card className="bg-white overflow-hidden shadow-sm">
                    {renderDays()}
                    {renderCells()}
                </Card>
            </div>

            {/* Sidebar */}
            {renderSidebar()}

            {/* Editor Modal */}
            {showEditor && (
                <PostEditor
                    post={editingPost}
                    onSave={handleEditorClose}
                    onSchedule={handleEditorClose}
                    onClose={handleEditorClose}
                />
            )}

            {/* Footer */}
            <div className="fixed bottom-0 left-64 right-0 text-center py-2 text-xs text-gray-400 border-t bg-gray-50">
                S-PostBO v{APP_VERSION} • Extension S-Post v{EXTENSION_VERSION}
            </div>
        </div>
    );
}
