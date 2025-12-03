import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Eye, Heart, MessageCircle, Share2, Bookmark, Link2, Users, 
    BarChart3, RefreshCw, Search, Filter, LayoutGrid, List,
    Star, MoreHorizontal, ExternalLink, ChevronDown, Send,
    Linkedin, Calendar, Clock, ChevronLeft, ChevronRight, Percent, Repeat2, MousePointer,
    Upload, X
} from "lucide-react";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { format, formatDistanceToNow, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import Sidebar from '../components/dashboard/Sidebar';
import PostEditorModal from '../components/PostEditorModal';

export default function AllPosts() {
    const [posts, setPosts] = useState([]);
    const [profile, setProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('date');
    const [sortOrder, setSortOrder] = useState('desc');
    const [selectedPosts, setSelectedPosts] = useState(new Set());
    const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
    const [editingPost, setEditingPost] = useState(null);
    const [lastSync, setLastSync] = useState(null);
    const [periodFilter, setPeriodFilter] = useState('all'); // all, week, month, quarter, year
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [importingStatsPost, setImportingStatsPost] = useState(null);
    const [statsJson, setStatsJson] = useState('');

    useEffect(() => {
        loadData();
        
        const handleUpdate = () => loadData();
        window.addEventListener('SPostDataUpdated', handleUpdate);
        window.addEventListener('LinkedInPlannerDataUpdated', handleUpdate);
        
        return () => {
            window.removeEventListener('SPostDataUpdated', handleUpdate);
            window.removeEventListener('LinkedInPlannerDataUpdated', handleUpdate);
        };
    }, []);

    // Fonction pour calculer la date depuis l'URN
    const calculateDateFromUrn = (post) => {
        if (post.createdAt) {
            try {
                const date = new Date(post.createdAt);
                if (!isNaN(date.getTime())) {
                    return post; // Date valide
                }
            } catch (e) {
                // Date invalide, on va la recalculer
            }
        }
        
        // Essayer d'extraire la date depuis l'URN
        const urn = post.urn || post.id || '';
        const match = urn.match(/activity:(\d+)/) || urn.match(/ugcPost:(\d+)/) || urn.match(/share:(\d+)/);
        if (match && match[1]) {
            try {
                const bigId = BigInt(match[1]);
                const timestamp = Number(bigId >> 22n);
                if (timestamp > 1400000000000 && timestamp < Date.now() + 86400000) {
                    return {
                        ...post,
                        createdAt: new Date(timestamp).toISOString()
                    };
                }
            } catch (e) {
                // Erreur de parsing
            }
        }
        
        return post;
    };

    const loadData = async () => {
        setIsLoading(true);
        
        // Charger le profil
        const profileData = localStorage.getItem('spost_linkedin_data');
        if (profileData) {
            try {
                const data = JSON.parse(profileData);
                setProfile(data.profile || data);
            } catch (e) {}
        }
        
        // Charger la date de dernière sync
        const lastSyncDate = localStorage.getItem('spost_last_sync');
        if (lastSyncDate) {
            setLastSync(new Date(lastSyncDate));
        }
        
        // Charger les posts
        let allPosts = [];
        const keys = ['spost_posts', 'pp_posts', 'linkedin_posts'];
        for (const key of keys) {
            const postsData = localStorage.getItem(key);
            if (postsData) {
                try {
                    const parsed = JSON.parse(postsData);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        allPosts = parsed;
                        break;
                    }
                } catch (e) {}
            }
        }
        
        // API Extension
        try {
            const api = window.SPost || window.LinkedInPlanner;
            if (api?.getPosts) {
                const apiPosts = await api.getPosts();
                if (apiPosts && apiPosts.length > 0) {
                    const existingIds = new Set(allPosts.map(p => p.id || p.urn));
                    const newPosts = apiPosts.filter(p => !existingIds.has(p.id || p.urn));
                    allPosts = [...allPosts, ...newPosts];
                }
            }
        } catch (e) {}
        
        // Calculer les dates manquantes depuis les URNs
        allPosts = allPosts.map(calculateDateFromUrn);
        
        // Sauvegarder les posts avec les dates calculées
        if (allPosts.length > 0) {
            try {
                localStorage.setItem('spost_posts', JSON.stringify(allPosts));
            } catch (e) {
                console.warn('[AllPosts] Erreur sauvegarde posts:', e);
            }
        }
        
        setPosts(allPosts);
        setIsLoading(false);
    };

    // Filtrer et trier les posts
    const filteredPosts = useMemo(() => {
        let result = [...posts];
        
        // Filtrer par période
        if (periodFilter !== 'all') {
            const now = new Date();
            const daysMap = { week: 7, month: 30, quarter: 90, year: 365 };
            const days = daysMap[periodFilter] || 0;
            const cutoffDate = subDays(now, days);
            
            result = result.filter(post => {
                if (!post.createdAt) {
                    // Essayer d'extraire la date depuis l'URN si elle manque
                    const urn = post.urn || post.id || '';
                    const match = urn.match(/activity:(\d+)/) || urn.match(/ugcPost:(\d+)/) || urn.match(/share:(\d+)/);
                    if (match && match[1]) {
                        try {
                            const bigId = BigInt(match[1]);
                            const timestamp = Number(bigId >> 22n);
                            if (timestamp > 1400000000000 && timestamp < Date.now() + 86400000) {
                                post.createdAt = new Date(timestamp).toISOString();
                            } else {
                                return false; // Timestamp invalide
                            }
                        } catch {
                            return false; // Impossible de parser l'URN
                        }
                    } else {
                        return false; // Pas de date et pas d'URN
                    }
                }
                try {
                    const postDate = new Date(post.createdAt);
                    if (isNaN(postDate.getTime())) return false;
                    return postDate >= cutoffDate;
                } catch {
                    return false;
                }
            });
        }
        
        // Filtrer par recherche
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(post => 
                post.content?.toLowerCase().includes(query)
            );
        }
        
        // Trier
        result.sort((a, b) => {
            let comparison = 0;
            
            switch (sortBy) {
                case 'date':
                    const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
                    const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
                    comparison = dateB - dateA;
                    break;
                case 'views':
                    comparison = (b.stats?.views || 0) - (a.stats?.views || 0);
                    break;
                case 'likes':
                    comparison = (b.stats?.likes || 0) - (a.stats?.likes || 0);
                    break;
                case 'comments':
                    comparison = (b.stats?.comments || 0) - (a.stats?.comments || 0);
                    break;
                case 'engagement':
                    const engA = (a.stats?.likes || 0) + (a.stats?.comments || 0) + (a.stats?.shares || 0);
                    const engB = (b.stats?.likes || 0) + (b.stats?.comments || 0) + (b.stats?.shares || 0);
                    comparison = engB - engA;
                    break;
                default:
                    comparison = 0;
            }
            
            return sortOrder === 'asc' ? -comparison : comparison;
        });
        
        return result;
    }, [posts, searchQuery, sortBy, sortOrder, periodFilter]);

    // Pagination
    const totalPages = Math.ceil(filteredPosts.length / itemsPerPage);
    const paginatedPosts = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredPosts.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredPosts, currentPage, itemsPerPage]);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, periodFilter, itemsPerPage]);

    const goToPage = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    // Importer les stats d'un post
    const handleImportStats = () => {
        if (!importingStatsPost || !statsJson.trim()) return;
        
        try {
            const statsData = JSON.parse(statsJson);
            const allPosts = JSON.parse(localStorage.getItem('spost_posts') || '[]');
            const postIndex = allPosts.findIndex(p => 
                (p.urn || p.id) === (importingStatsPost.urn || importingStatsPost.id)
            );
            
            if (postIndex !== -1) {
                // Fusionner les stats
                allPosts[postIndex].stats = {
                    ...allPosts[postIndex].stats,
                    views: statsData.impressions || statsData.views || allPosts[postIndex].stats?.views || 0,
                    uniqueViews: statsData.uniqueViews || statsData.membersTouched || allPosts[postIndex].stats?.uniqueViews || 0,
                    likes: statsData.likes || statsData.reactions || allPosts[postIndex].stats?.likes || 0,
                    comments: statsData.comments || allPosts[postIndex].stats?.comments || 0,
                    shares: statsData.shares || statsData.republications || allPosts[postIndex].stats?.shares || 0,
                    saves: statsData.saves || statsData.enregistrements || allPosts[postIndex].stats?.saves || 0,
                    sends: statsData.sends || statsData.envois || allPosts[postIndex].stats?.sends || 0,
                    profileClicks: statsData.profileViews || statsData.profileClicks || allPosts[postIndex].stats?.profileClicks || 0,
                    newFollowers: statsData.newFollowers || statsData.abonnesAcquis || allPosts[postIndex].stats?.newFollowers || 0,
                };
                
                localStorage.setItem('spost_posts', JSON.stringify(allPosts));
                setPosts(allPosts);
                setImportingStatsPost(null);
                setStatsJson('');
                alert('✅ Stats importées avec succès !');
            } else {
                alert('❌ Post non trouvé');
            }
        } catch (e) {
            alert('❌ JSON invalide: ' + e.message);
        }
    };

    const toggleSelectAll = () => {
        if (selectedPosts.size === paginatedPosts.length) {
            setSelectedPosts(new Set());
        } else {
            setSelectedPosts(new Set(paginatedPosts.map(p => p.id || p.urn)));
        }
    };

    const toggleSelect = (postId) => {
        const newSelected = new Set(selectedPosts);
        if (newSelected.has(postId)) {
            newSelected.delete(postId);
        } else {
            newSelected.add(postId);
        }
        setSelectedPosts(newSelected);
    };

    // Fonction pour obtenir la date d'un post (calcule depuis URN si nécessaire)
    const getPostDate = (post) => {
        // Vérifier si le post a déjà une date valide
        if (post.createdAt) {
            try {
                const date = new Date(post.createdAt);
                if (!isNaN(date.getTime())) {
                    return post.createdAt;
                }
            } catch (e) {
                // Date invalide, on va la recalculer
            }
        }
        
        // Essayer d'extraire la date depuis l'URN
        const urn = post.urn || post.id || '';
        if (urn) {
            const match = urn.match(/activity:(\d+)/) || urn.match(/ugcPost:(\d+)/) || urn.match(/share:(\d+)/);
            if (match && match[1]) {
                try {
                    const bigId = BigInt(match[1]);
                    const timestamp = Number(bigId >> 22n);
                    // Vérifier que le timestamp est raisonnable
                    if (timestamp > 1400000000000 && timestamp < Date.now() + 86400000) {
                        const calculatedDate = new Date(timestamp).toISOString();
                        // Mettre à jour le post avec la date calculée pour la prochaine fois
                        if (!post.createdAt) {
                            post.createdAt = calculatedDate;
                        }
                        return calculatedDate;
                    }
                } catch (e) {
                    console.warn('[AllPosts] Erreur calcul date depuis URN:', e);
                }
            }
        }
        
        return null;
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'Date inconnue';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) {
                return 'Date invalide';
            }
            return formatDistanceToNow(date, { addSuffix: true, locale: fr });
        } catch (e) {
            return 'Date inconnue';
        }
    };

    const getPostImage = (post) => {
        if (post.media && post.media.length > 0 && post.media[0].url) {
            return post.media[0].url;
        }
        // Placeholder avec les initiales du contenu
        return null;
    };

    const truncateContent = (content, maxLength = 150) => {
        if (!content) return '';
        if (content.length <= maxLength) return content;
        return content.substring(0, maxLength) + '...';
    };

    const openPostOnLinkedIn = (post) => {
        if (post.url) {
            window.open(post.url, '_blank');
        } else if (post.urn) {
            const activityId = post.urn.split(':').pop();
            window.open(`https://www.linkedin.com/feed/update/urn:li:activity:${activityId}`, '_blank');
        }
    };

    // Icônes de colonnes (style PerfectPost)
    const ColumnHeader = ({ icon: Icon, tooltip, onClick, active }) => (
        <div 
            className={`flex items-center justify-center cursor-pointer hover:bg-gray-100 rounded p-1 ${active ? 'text-blue-600' : 'text-gray-400'}`}
            title={tooltip}
            onClick={onClick}
        >
            <Icon className="h-4 w-4" />
        </div>
    );

    if (isLoading) {
        return (
            <div className="flex min-h-screen bg-gray-50">
                <Sidebar activePage="allposts" user={profile} />
                <div className="flex-1 flex items-center justify-center">
                    <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar activePage="allposts" user={profile} />
            
            <div className="flex-1 flex flex-col">
                {/* Header avec date de sync */}
                <div className="bg-white border-b px-4 py-2">
                    <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-500">
                            Dernière mise à jour : {lastSync ? format(lastSync, "dd MMMM yyyy 'à' HH:mm", { locale: fr }) : 'Jamais'}
                        </div>
                        <Button 
                            variant="outline" 
                            size="sm"
                            className="bg-blue-500 text-white hover:bg-blue-600 border-0 h-7 text-xs"
                            onClick={() => setIsMultiSelectMode(!isMultiSelectMode)}
                        >
                            {isMultiSelectMode ? 'Annuler' : 'Mode sélection multiple'}
                        </Button>
                    </div>
                </div>

                {/* Barre de recherche et filtres */}
                <div className="bg-white border-b px-4 py-2">
                    <div className="flex items-center gap-4">
                        {/* Champ de recherche */}
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                type="text"
                                placeholder="Rechercher dans les posts..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 bg-gray-50 border-gray-200"
                            />
                            {searchQuery && (
                                <button 
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    onClick={() => setSearchQuery('')}
                                >
                                    ×
                                </button>
                            )}
                        </div>
                        
                        {/* Filtre par période */}
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-gray-500" />
                            <select
                                value={periodFilter}
                                onChange={(e) => setPeriodFilter(e.target.value)}
                                className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">Toutes les périodes</option>
                                <option value="week">7 derniers jours</option>
                                <option value="month">30 derniers jours</option>
                                <option value="quarter">90 derniers jours</option>
                                <option value="year">Cette année</option>
                            </select>
                        </div>
                        
                        {/* Sélecteur d'éléments par page */}
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">Afficher</span>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                className="border border-gray-200 rounded-lg px-2 py-1 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value={10}>10</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                            <span className="text-sm text-gray-500">par page</span>
                        </div>
                        
                        {/* Compteur de résultats */}
                        <div className="text-sm text-gray-500">
                            {filteredPosts.length} post{filteredPosts.length > 1 ? 's' : ''} 
                            {(searchQuery || periodFilter !== 'all') && ` sur ${posts.length}`}
                        </div>
                        
                        {/* Bouton actualiser */}
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={loadData}
                            className="ml-auto"
                        >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Actualiser
                        </Button>
                    </div>
                </div>

                {/* Tableau des posts */}
                <div className="flex-1 overflow-auto">
                    {posts.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center p-12">
                            <Card className="max-w-lg">
                                <CardContent className="p-8 text-center">
                                    <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                                    <h2 className="text-xl font-bold mb-2">Aucun post synchronisé</h2>
                                    <p className="text-gray-600 mb-6">
                                        Visitez votre page d'activité LinkedIn avec l'extension S-Post active pour synchroniser vos posts.
                                    </p>
                                    <Button 
                                        onClick={() => window.open('https://www.linkedin.com/in/me/recent-activity/all/', '_blank')}
                                        className="bg-blue-600 hover:bg-blue-700"
                                    >
                                        <Linkedin className="h-4 w-4 mr-2" />
                                        Synchroniser depuis LinkedIn
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    ) : (
                        <table className="w-full">
                            {/* En-tête du tableau */}
                            <thead className="bg-white border-b sticky top-0 z-10">
                                <tr>
                                    {/* Case à cocher */}
                                    <th className="w-10 px-3 py-3">
                                        {isMultiSelectMode && (
                                            <Checkbox 
                                                checked={selectedPosts.size === paginatedPosts.length && paginatedPosts.length > 0}
                                                onCheckedChange={toggleSelectAll}
                                            />
                                        )}
                                    </th>
                                    {/* Favori */}
                                    <th className="w-10 px-2 py-3">
                                        <Star className="h-4 w-4 text-gray-400" />
                                    </th>
                                    {/* Image */}
                                    <th className="w-16 px-2 py-3"></th>
                                    {/* Date et contenu */}
                                    <th className="text-left px-3 py-3">
                                        <button 
                                            className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900"
                                            onClick={() => {
                                                if (sortBy === 'date') {
                                                    setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                                                } else {
                                                    setSortBy('date');
                                                    setSortOrder('desc');
                                                }
                                            }}
                                        >
                                            Date de publication
                                            <ChevronDown className={`h-4 w-4 transition-transform ${sortBy === 'date' && sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                                        </button>
                                    </th>
                                    {/* Stats colonnes */}
                                    <th className="w-14 px-1 py-2 text-center" title="Impressions">
                                        <ColumnHeader icon={Eye} tooltip="Impressions" onClick={() => setSortBy('views')} active={sortBy === 'views'} />
                                    </th>
                                    <th className="w-14 px-1 py-2 text-center" title="Likes">
                                        <ColumnHeader icon={Heart} tooltip="Likes" onClick={() => setSortBy('likes')} active={sortBy === 'likes'} />
                                    </th>
                                    <th className="w-14 px-1 py-2 text-center" title="Commentaires">
                                        <ColumnHeader icon={MessageCircle} tooltip="Commentaires" onClick={() => setSortBy('comments')} active={sortBy === 'comments'} />
                                    </th>
                                    <th className="w-14 px-1 py-2 text-center" title="Repartages">
                                        <ColumnHeader icon={Repeat2} tooltip="Repartages" />
                                    </th>
                                    <th className="w-14 px-1 py-2 text-center" title="Enregistrements">
                                        <ColumnHeader icon={Bookmark} tooltip="Enregistrements" />
                                    </th>
                                    <th className="w-14 px-1 py-2 text-center" title="Clics profil">
                                        <ColumnHeader icon={MousePointer} tooltip="Clics profil" />
                                    </th>
                                    <th className="w-14 px-1 py-2 text-center" title="Taux d'engagement">
                                        <ColumnHeader icon={Percent} tooltip="Taux d'engagement %" onClick={() => setSortBy('engagement')} active={sortBy === 'engagement'} />
                                    </th>
                                    <th className="w-14 px-1 py-2 text-center" title="Clics liens">
                                        <ColumnHeader icon={Link2} tooltip="Clics liens" />
                                    </th>
                                    {/* Menu */}
                                    <th className="w-10 px-2 py-3"></th>
                                </tr>
                            </thead>
                            
                            {/* Corps du tableau */}
                            <tbody>
                                {paginatedPosts.map((post, index) => {
                                    const postId = post.id || post.urn || `post-${index}`;
                                    const postImage = getPostImage(post);
                                    const hasMedia = post.media && post.media.length > 0;
                                    
                                    return (
                                        <tr 
                                            key={postId}
                                            className="bg-white border-b hover:bg-gray-50 cursor-pointer"
                                            onClick={() => setEditingPost(post)}
                                        >
                                            {/* Case à cocher */}
                                            <td className="px-2 py-1" onClick={(e) => e.stopPropagation()}>
                                                {isMultiSelectMode && (
                                                    <Checkbox 
                                                        checked={selectedPosts.has(postId)}
                                                        onCheckedChange={() => toggleSelect(postId)}
                                                    />
                                                )}
                                            </td>
                                            
                                            {/* Favori */}
                                            <td className="px-1 py-1" onClick={(e) => e.stopPropagation()}>
                                                <Star className="h-4 w-4 text-gray-300 hover:text-yellow-400 cursor-pointer" />
                                            </td>
                                            
                                            {/* Image */}
                                            <td className="px-1 py-1">
                                                <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                                                    {postImage ? (
                                                        <img src={postImage} alt="" className="w-full h-full object-cover" />
                                                    ) : hasMedia ? (
                                                        <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs">
                                                            {post.media[0]?.type === 'video' ? '🎬' : '📄'}
                                                        </div>
                                                    ) : (
                                                        <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-gray-500 text-xs font-bold">
                                                            Aa
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            
                                            {/* Date et contenu */}
                                            <td className="px-2 py-1">
                                                <div className="text-xs text-gray-500">
                                                    {formatDate(getPostDate(post))}
                                                </div>
                                                <div className="text-sm text-gray-900 line-clamp-1">
                                                    {truncateContent(post.content, 120)}
                                                </div>
                                                {hasMedia && (
                                                    <Badge variant="secondary" className="text-xs py-0">
                                                        {post.media[0]?.type === 'image' ? 'Post' : 
                                                         post.media[0]?.type === 'video' ? 'Vidéo' : 
                                                         post.media[0]?.type === 'document' ? 'Carrousel' : 'Post'}
                                                    </Badge>
                                                )}
                                            </td>
                                            
                                            {/* Impressions */}
                                            <td className="px-1 py-1 text-center">
                                                <span className="text-sm font-medium text-gray-900">
                                                    {(post.stats?.views || 0).toLocaleString()}
                                                </span>
                                            </td>
                                            
                                            {/* Likes */}
                                            <td className="px-1 py-1 text-center">
                                                <span className="text-sm font-medium text-gray-900">
                                                    {post.stats?.likes || 0}
                                                </span>
                                            </td>
                                            
                                            {/* Commentaires */}
                                            <td className="px-1 py-1 text-center">
                                                <span className="text-sm text-gray-500">
                                                    {post.stats?.comments || 0}
                                                </span>
                                            </td>
                                            
                                            {/* Repartages */}
                                            <td className="px-1 py-1 text-center">
                                                <span className="text-sm text-gray-500">
                                                    {post.stats?.shares || 0}
                                                </span>
                                            </td>
                                            
                                            {/* Enregistrements */}
                                            <td className="px-1 py-1 text-center">
                                                <span className="text-sm text-gray-500">
                                                    {post.stats?.saves || 0}
                                                </span>
                                            </td>
                                            
                                            {/* Clics profil */}
                                            <td className="px-1 py-1 text-center">
                                                <span className="text-sm text-gray-500">
                                                    {post.stats?.profileClicks || 0}
                                                </span>
                                            </td>
                                            
                                            {/* Taux d'engagement */}
                                            <td className="px-1 py-1 text-center">
                                                <span className="text-sm font-medium text-blue-600" title={post.statsSource === 'auto_sync' ? '✅ Sync auto' : ''}>
                                                    {post.stats?.engagementRate > 0 
                                                        ? post.stats.engagementRate.toFixed(1) + '%'
                                                        : post.stats?.views > 0 
                                                            ? (((post.stats?.likes || 0) + (post.stats?.comments || 0) + (post.stats?.shares || 0)) / post.stats.views * 100).toFixed(1) + '%'
                                                            : '—'
                                                    }
                                                </span>
                                            </td>
                                            
                                            {/* Clics liens */}
                                            <td className="px-1 py-1 text-center">
                                                <span className="text-sm text-gray-500">
                                                    {post.stats?.linkClicks || 0}
                                                </span>
                                            </td>
                                            
                                            {/* Menu */}
                                            <td className="px-1 py-1" onClick={(e) => e.stopPropagation()}>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => setEditingPost(post)}>
                                                            Modifier
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => openPostOnLinkedIn(post)}>
                                                            <ExternalLink className="h-4 w-4 mr-2" />
                                                            Voir sur LinkedIn
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => setImportingStatsPost(post)}>
                                                            <Upload className="h-4 w-4 mr-2" />
                                                            Importer stats
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem>
                                                            Dupliquer
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="text-red-600">
                                                            Supprimer
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination */}
                {filteredPosts.length > 0 && (
                    <div className="border-t bg-white px-4 py-2">
                        <div className="flex items-center justify-between">
                            {/* Info pagination */}
                            <div className="text-sm text-gray-500">
                                Affichage {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredPosts.length)} sur {filteredPosts.length} posts
                            </div>
                            
                            {/* Contrôles de pagination */}
                            <div className="flex items-center gap-2">
                                {/* Bouton Précédent */}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => goToPage(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="h-8"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    Précédent
                                </Button>
                                
                                {/* Numéros de page */}
                                <div className="flex items-center gap-1">
                                    {/* Première page */}
                                    {currentPage > 3 && (
                                        <>
                                            <Button
                                                variant={currentPage === 1 ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => goToPage(1)}
                                                className="h-8 w-8 p-0"
                                            >
                                                1
                                            </Button>
                                            {currentPage > 4 && <span className="text-gray-400 px-1">...</span>}
                                        </>
                                    )}
                                    
                                    {/* Pages autour de la page actuelle */}
                                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                                        .filter(page => page >= currentPage - 2 && page <= currentPage + 2)
                                        .map(page => (
                                            <Button
                                                key={page}
                                                variant={currentPage === page ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => goToPage(page)}
                                                className={`h-8 w-8 p-0 ${currentPage === page ? 'bg-blue-600 text-white' : ''}`}
                                            >
                                                {page}
                                            </Button>
                                        ))
                                    }
                                    
                                    {/* Dernière page */}
                                    {currentPage < totalPages - 2 && (
                                        <>
                                            {currentPage < totalPages - 3 && <span className="text-gray-400 px-1">...</span>}
                                            <Button
                                                variant={currentPage === totalPages ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => goToPage(totalPages)}
                                                className="h-8 w-8 p-0"
                                            >
                                                {totalPages}
                                            </Button>
                                        </>
                                    )}
                                </div>
                                
                                {/* Bouton Suivant */}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => goToPage(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="h-8"
                                >
                                    Suivant
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                            
                            {/* Aller à la page */}
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500">Aller à</span>
                                <Input
                                    type="number"
                                    min={1}
                                    max={totalPages}
                                    value={currentPage}
                                    onChange={(e) => {
                                        const page = parseInt(e.target.value);
                                        if (page >= 1 && page <= totalPages) {
                                            setCurrentPage(page);
                                        }
                                    }}
                                    className="w-16 h-8 text-center"
                                />
                                <span className="text-sm text-gray-500">/ {totalPages}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="text-center py-2 text-xs text-gray-400 border-t bg-gray-50">
                    S-PostBO v2.4.0 • Powered by S-Post Extension
                </div>
            </div>

            {/* Modal d'édition */}
            {editingPost && (
                <PostEditorModal 
                    isOpen={!!editingPost}
                    onClose={() => setEditingPost(null)}
                    post={editingPost}
                    onSave={(updatedPost) => {
                        console.log('Post mis à jour:', updatedPost);
                        setEditingPost(null);
                    }}
                />
            )}

            {/* Modal d'import de stats */}
            {importingStatsPost && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h3 className="text-lg font-semibold">Importer les statistiques</h3>
                            <button onClick={() => setImportingStatsPost(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-4">
                            <p className="text-sm text-gray-600 mb-3">
                                1. Allez sur la page "Statistiques" du post sur LinkedIn<br/>
                                2. Exécutez le script d'extraction dans la console<br/>
                                3. Collez le JSON ci-dessous
                            </p>
                            <div className="text-xs text-gray-500 mb-2">
                                Post: {importingStatsPost.content?.substring(0, 50)}...
                            </div>
                            <textarea
                                className="w-full h-32 p-3 border rounded-lg text-sm font-mono"
                                placeholder='{"impressions": 451, "likes": 6, "comments": 0, "shares": 0, "saves": 1, "sends": 0, "profileViews": 0}'
                                value={statsJson}
                                onChange={(e) => setStatsJson(e.target.value)}
                            />
                            <div className="text-xs text-gray-400 mt-2">
                                Format: impressions, likes, comments, shares, saves, sends, profileViews
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 p-4 border-t">
                            <Button variant="outline" onClick={() => setImportingStatsPost(null)}>
                                Annuler
                            </Button>
                            <Button onClick={handleImportStats} className="bg-blue-600 hover:bg-blue-700 text-white">
                                Importer
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
