import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
    AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import { 
    Eye, Heart, MessageCircle, Share2, Users, UserPlus, RefreshCw, 
    Linkedin, BarChart3, Info, Calendar, ChevronDown, ExternalLink
} from "lucide-react";
import { format, subDays, getHours, differenceInWeeks } from 'date-fns';
import { fr } from 'date-fns/locale';
import Sidebar from '../components/dashboard/Sidebar';

// Couleurs
const COLORS = {
    primary: '#4299e1',
    blue: '#3182ce',
    green: '#48bb78',
    red: '#f56565',
    orange: '#ed8936',
    purple: '#9f7aea',
};

export default function Stats() {
    const [posts, setPosts] = useState([]);
    const [profile, setProfile] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [dateRange, setDateRange] = useState('month');
    const [previousPosts, setPreviousPosts] = useState([]);

    useEffect(() => {
        loadData();
        
        // Écouter les mises à jour de l'extension
        const handleUpdate = () => loadData();
        const handleAnalyticsUpdate = (event) => {
            if (event.detail) {
                setAnalytics(event.detail);
                console.log('[Stats] Analytics mises à jour:', event.detail);
            }
        };
        
        window.addEventListener('SPostDataUpdated', handleUpdate);
        window.addEventListener('LinkedInPlannerDataUpdated', handleUpdate);
        window.addEventListener('SPostAnalyticsUpdated', handleAnalyticsUpdate);
        
        return () => {
            window.removeEventListener('SPostDataUpdated', handleUpdate);
            window.removeEventListener('LinkedInPlannerDataUpdated', handleUpdate);
            window.removeEventListener('SPostAnalyticsUpdated', handleAnalyticsUpdate);
        };
    }, []);

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
        
        // Charger les analytics (style PerfectPost)
        const analyticsData = localStorage.getItem('spost_analytics');
        if (analyticsData) {
            try {
                const data = JSON.parse(analyticsData);
                setAnalytics(data);
                console.log('[Stats] Analytics chargées:', data);
            } catch (e) {}
        }
        
        // Charger les posts depuis plusieurs sources
        let allPosts = [];
        
        // Source 1: localStorage
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
        
        // Source 2: API Extension
        try {
            const api = window.SPost || window.LinkedInPlanner;
            if (api?.getPosts) {
                const apiPosts = await api.getPosts();
                if (apiPosts && apiPosts.length > 0) {
                    // Fusionner sans doublons
                    const existingIds = new Set(allPosts.map(p => p.id || p.urn));
                    const newPosts = apiPosts.filter(p => !existingIds.has(p.id || p.urn));
                    allPosts = [...allPosts, ...newPosts];
                }
            }
        } catch (e) {}
        
        setPosts(allPosts);
        setIsLoading(false);
    };

    // Filtrer par période
    const { filteredPosts, previousPeriodPosts } = useMemo(() => {
        const now = new Date();
        const daysMap = { week: 7, month: 30, quarter: 90, year: 365 };
        const days = daysMap[dateRange] || 30;
        const cutoff = subDays(now, days);
        const previousCutoff = subDays(now, days * 2);
        
        const current = posts.filter(post => {
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
                const date = new Date(post.createdAt);
                if (isNaN(date.getTime())) return false;
                return date >= cutoff;
            } catch {
                return false;
            }
        });
        
        const previous = posts.filter(post => {
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
                            return false;
                        }
                    } catch {
                        return false;
                    }
                } else {
                    return false;
                }
            }
            try {
                const date = new Date(post.createdAt);
                if (isNaN(date.getTime())) return false;
                return date >= previousCutoff && date < cutoff;
            } catch {
                return false;
            }
        });
        
        return { filteredPosts: current, previousPeriodPosts: previous };
    }, [posts, dateRange]);

    // Calculer les statistiques dynamiques
    const stats = useMemo(() => {
        const totalPosts = filteredPosts.length;
        const prevTotalPosts = previousPeriodPosts.length;
        
        const daysInPeriod = { week: 7, month: 30, quarter: 90, year: 365 }[dateRange] || 30;
        const weeksInPeriod = Math.max(daysInPeriod / 7, 1);
        
        // Calculer les totaux
        const totalLikes = filteredPosts.reduce((sum, p) => sum + (p.stats?.likes || 0), 0);
        const totalComments = filteredPosts.reduce((sum, p) => sum + (p.stats?.comments || 0), 0);
        const totalShares = filteredPosts.reduce((sum, p) => sum + (p.stats?.shares || 0), 0);
        const totalViews = filteredPosts.reduce((sum, p) => sum + (p.stats?.views || 0), 0);
        const totalInteractions = totalLikes + totalComments + totalShares;
        const totalNewFollowers = filteredPosts.reduce((sum, p) => sum + (p.stats?.newFollowers || 0), 0);
        const totalSaves = filteredPosts.reduce((sum, p) => sum + (p.stats?.saves || 0), 0);
        const totalProfileClicks = filteredPosts.reduce((sum, p) => sum + (p.stats?.profileClicks || 0), 0);
        
        // Période précédente
        const prevLikes = previousPeriodPosts.reduce((sum, p) => sum + (p.stats?.likes || 0), 0);
        const prevComments = previousPeriodPosts.reduce((sum, p) => sum + (p.stats?.comments || 0), 0);
        const prevShares = previousPeriodPosts.reduce((sum, p) => sum + (p.stats?.shares || 0), 0);
        const prevViews = previousPeriodPosts.reduce((sum, p) => sum + (p.stats?.views || 0), 0);
        const prevInteractions = prevLikes + prevComments + prevShares;
        
        // Calculer les tendances (% de variation)
        const calcTrend = (current, previous) => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return ((current - previous) / previous * 100).toFixed(2);
        };
        
        // Moyennes
        const postsPerWeek = (totalPosts / weeksInPeriod).toFixed(3);
        const avgImpressions = totalPosts > 0 ? Math.round(totalViews / totalPosts) : 0;
        const avgInteractions = totalPosts > 0 ? Math.round(totalInteractions / totalPosts) : 0;
        const avgLikes = totalPosts > 0 ? (totalLikes / totalPosts).toFixed(1) : 0;
        const avgComments = totalPosts > 0 ? (totalComments / totalPosts).toFixed(1) : 0;
        const avgShares = totalPosts > 0 ? (totalShares / totalPosts).toFixed(1) : 0;
        
        // Moyennes précédentes
        const prevAvgImpressions = prevTotalPosts > 0 ? Math.round(prevViews / prevTotalPosts) : 0;
        const prevAvgInteractions = prevTotalPosts > 0 ? Math.round(prevInteractions / prevTotalPosts) : 0;
        
        return {
            totalPosts,
            postsPerWeek,
            avgImpressions,
            avgInteractions,
            totalLikes,
            totalComments,
            totalShares,
            totalViews,
            totalInteractions,
            totalNewFollowers,
            totalSaves,
            totalProfileClicks,
            avgLikes,
            avgComments,
            avgShares,
            // Tendances
            postsTrend: calcTrend(totalPosts, prevTotalPosts),
            impressionsTrend: calcTrend(avgImpressions, prevAvgImpressions),
            interactionsTrend: calcTrend(avgInteractions, prevAvgInteractions),
            likesTrend: calcTrend(totalLikes, prevLikes),
            commentsTrend: calcTrend(totalComments, prevComments),
            sharesTrend: calcTrend(totalShares, prevShares),
            viewsTrend: calcTrend(totalViews, prevViews),
        };
    }, [filteredPosts, previousPeriodPosts, dateRange]);

    // Données pour les graphiques
    const chartData = useMemo(() => {
        const data = [];
        const daysToShow = Math.min({ week: 7, month: 30, quarter: 90, year: 365 }[dateRange] || 30, 30);
        
        for (let i = daysToShow - 1; i >= 0; i--) {
            const date = subDays(new Date(), i);
            const dateStr = format(date, 'dd MMM', { locale: fr });
            const dateKey = format(date, 'yyyy-MM-dd');
            
            const dayPosts = filteredPosts.filter(p => {
                if (!p.createdAt) return false;
                try {
                    return format(new Date(p.createdAt), 'yyyy-MM-dd') === dateKey;
                } catch { return false; }
            });
            
            data.push({
                date: dateStr,
                impressions: dayPosts.reduce((sum, p) => sum + (p.stats?.views || 0), 0),
                interactions: dayPosts.reduce((sum, p) => sum + (p.stats?.likes || 0) + (p.stats?.comments || 0), 0),
                likes: dayPosts.reduce((sum, p) => sum + (p.stats?.likes || 0), 0),
                comments: dayPosts.reduce((sum, p) => sum + (p.stats?.comments || 0), 0),
                shares: dayPosts.reduce((sum, p) => sum + (p.stats?.shares || 0), 0),
                posts: dayPosts.length,
            });
        }
        
        return data;
    }, [filteredPosts, dateRange]);

    // Répartition par type de posts
    const postTypeData = useMemo(() => {
        const types = { image: 0, text: 0, video: 0, document: 0 };
        const impressionsByType = { image: 0, text: 0, video: 0, document: 0 };
        
        filteredPosts.forEach(post => {
            const type = (!post.media || post.media.length === 0) ? 'text' : (post.media[0]?.type || 'text');
            types[type] = (types[type] || 0) + 1;
            impressionsByType[type] = (impressionsByType[type] || 0) + (post.stats?.views || 0);
        });
        
        return {
            distribution: [
                { name: 'Image', value: types.image, color: COLORS.orange },
                { name: 'Texte', value: types.text, color: COLORS.green },
                { name: 'Vidéo', value: types.video, color: COLORS.red },
                { name: 'Carrousel', value: types.document, color: COLORS.purple },
            ].filter(d => d.value > 0),
            impressions: [
                { name: 'Image', value: impressionsByType.image, color: COLORS.orange },
                { name: 'Texte', value: impressionsByType.text, color: COLORS.green },
                { name: 'Vidéo', value: impressionsByType.video, color: COLORS.red },
                { name: 'Carrousel', value: impressionsByType.document, color: COLORS.purple },
            ].filter(d => d.value > 0),
        };
    }, [filteredPosts]);

    // Heures de publication
    const publicationHours = useMemo(() => {
        const hours = Array(24).fill(0);
        const impressionsByHour = Array(24).fill(0);
        const postsByHour = Array(24).fill(0);
        
        filteredPosts.forEach(post => {
            if (post.createdAt) {
                try {
                    const hour = getHours(new Date(post.createdAt));
                    hours[hour]++;
                    postsByHour[hour]++;
                    impressionsByHour[hour] += post.stats?.views || 0;
                } catch {}
            }
        });
        
        return {
            publication: hours,
            avgImpressions: impressionsByHour.map((views, i) => 
                postsByHour[i] > 0 ? Math.round(views / postsByHour[i]) : 0
            ),
        };
    }, [filteredPosts]);

    // Top commentateurs et likers (extraits des données des posts)
    const topEngagers = useMemo(() => {
        // Note: Ces données ne sont pas disponibles directement depuis LinkedIn
        // On affiche un message pour guider l'utilisateur
        return { commenters: [], likers: [] };
    }, [filteredPosts]);

    // Composant carte de statistique
    const StatCard = ({ title, value, trend, showSectorComparison = true }) => (
        <Card className="bg-white">
            <CardContent className="p-4">
                <div className="flex items-start justify-between">
                    <span className="text-xs text-gray-500 uppercase tracking-wide">{title}</span>
                    <Info className="h-3 w-3 text-gray-400" />
                </div>
                <p className="text-3xl font-bold mt-2 text-gray-900">{value}</p>
                {trend !== undefined && (
                    <div className="mt-2 space-y-1">
                        <div className="flex items-center gap-1">
                            <span className={`text-xs ${parseFloat(trend) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                {parseFloat(trend) >= 0 ? '+' : ''}{trend}% Vs la période précédente
                            </span>
                        </div>
                        {showSectorComparison && (
                            <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-500">~% Sur votre secteur</span>
                                <Info className="h-3 w-3 text-gray-400" />
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );

    // Composant graphique
    const ChartCard = ({ title, value, trend, icon: Icon, children, tabs }) => (
        <Card className="bg-white">
            <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <span className="text-xs text-gray-500 uppercase tracking-wide">{title}</span>
                        {tabs && (
                            <div className="flex gap-2 mt-2">
                                {tabs.map((tab, i) => (
                                    <button 
                                        key={i}
                                        className={`text-xs px-2 py-1 rounded ${i === 0 ? 'bg-blue-100 text-blue-600' : 'text-gray-500'}`}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    {value !== undefined && (
                        <div className="text-right">
                            <div className="flex items-center gap-2">
                                {Icon && <Icon className="h-5 w-5 text-blue-500" />}
                                <span className="text-2xl font-bold">{value}</span>
                            </div>
                            {trend !== undefined && (
                                <span className={`text-xs ${parseFloat(trend) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                    {parseFloat(trend) >= 0 ? '+' : ''}{trend}% vs période préc.
                                </span>
                            )}
                        </div>
                    )}
                </div>
                {children}
            </CardContent>
        </Card>
    );

    if (isLoading) {
        return (
            <div className="flex min-h-screen bg-gray-100">
                <Sidebar activePage="stats" />
                <div className="flex-1 flex items-center justify-center">
                    <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
                </div>
            </div>
        );
    }

    if (posts.length === 0) {
        return (
            <div className="flex min-h-screen bg-gray-100">
                <Sidebar activePage="stats" user={profile} />
                <div className="flex-1 p-6 flex items-center justify-center">
                    <Card className="max-w-lg">
                        <CardContent className="p-8 text-center">
                            <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                            <h2 className="text-xl font-bold mb-2">Aucune donnée à afficher</h2>
                            <p className="text-gray-600 mb-6">
                                Synchronisez vos posts LinkedIn pour voir vos statistiques en temps réel.
                            </p>
                            <Button 
                                onClick={() => window.open('https://www.linkedin.com/in/me/recent-activity/all/', '_blank')}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                <Linkedin className="h-4 w-4 mr-2" />
                                Synchroniser depuis LinkedIn
                            </Button>
                            <p className="text-xs text-gray-500 mt-4">
                                Visitez votre page d'activité LinkedIn avec l'extension S-Post active
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-gray-100">
            <Sidebar activePage="stats" user={profile} />
            
            <div className="flex-1 p-6 overflow-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">
                            Tu as publié {stats.totalPosts} fois durant cette {dateRange === 'week' ? 'semaine' : 'période'}
                        </h1>
                        <p className="text-sm text-gray-500">
                            {stats.totalPosts > 0 ? 'Bravo héros !' : 'Continue tes efforts !'}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <select 
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value)}
                            className="border rounded-lg px-3 py-2 text-sm"
                        >
                            <option value="week">Cette semaine</option>
                            <option value="month">Ce mois</option>
                            <option value="quarter">Ce trimestre</option>
                            <option value="year">Cette année</option>
                        </select>
                        <Button variant="outline" size="sm" onClick={loadData}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Actualiser
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => window.open('https://www.linkedin.com/in/me/recent-activity/all/', '_blank')}
                        >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Sync LinkedIn
                        </Button>
                    </div>
                </div>

                {/* Stats principales comme PerfectPost - 4 colonnes */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                    {/* Impressions (avec badge) */}
                    <Card className="bg-white border-2 border-blue-200">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Badge className="bg-yellow-400 text-yellow-900 text-xs">✨ Félicitations !</Badge>
                            </div>
                            <span className="text-xs text-gray-500 uppercase tracking-wide flex items-center gap-1">
                                <Eye className="h-3 w-3" /> IMPRESSIONS
                            </span>
                            <p className="text-3xl font-bold mt-2 text-gray-900">
                                {(analytics?.totalImpressions || stats.totalViews).toLocaleString()}
                            </p>
                            <div className="mt-2 text-xs">
                                <span className="text-green-600">+{stats.viewsTrend}% Vs la période précédente</span>
                            </div>
                        </CardContent>
                    </Card>
                    
                    {/* Interactions (avec badge) */}
                    <Card className="bg-white border-2 border-blue-200">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Badge className="bg-yellow-400 text-yellow-900 text-xs">✨ Félicitations !</Badge>
                            </div>
                            <span className="text-xs text-gray-500 uppercase tracking-wide flex items-center gap-1">
                                <Users className="h-3 w-3" /> INTERACTIONS
                            </span>
                            <p className="text-3xl font-bold mt-2 text-gray-900">
                                {(analytics?.totalInteractions || stats.totalInteractions).toLocaleString()}
                            </p>
                            <div className="mt-2 text-xs">
                                <span className="text-green-600">+{stats.interactionsTrend}% Vs la période précédente</span>
                            </div>
                        </CardContent>
                    </Card>
                    
                    {/* Nouveaux abonnés */}
                    <Card className="bg-white">
                        <CardContent className="p-4">
                            <span className="text-xs text-gray-500 uppercase tracking-wide flex items-center gap-1">
                                <UserPlus className="h-3 w-3" /> NOUVEAUX ABONNÉS
                            </span>
                            <p className="text-3xl font-bold mt-2 text-gray-900">
                                {stats.totalNewFollowers > 0 ? stats.totalNewFollowers : (analytics?.newFollowers || '—')}
                            </p>
                            <div className="mt-2 text-xs text-gray-500">
                                {analytics?.totalFollowers !== undefined ? `Total: ${analytics.totalFollowers.toLocaleString()} abonnés` : 'Basé sur les posts de la période'}
                            </div>
                        </CardContent>
                    </Card>
                    
                    {/* Nombre de publications */}
                    <Card className="bg-white">
                        <CardContent className="p-4">
                            <span className="text-xs text-gray-500 uppercase tracking-wide flex items-center gap-1">
                                <Eye className="h-3 w-3" /> NOMBRE DE PUBLICATIONS
                            </span>
                            <p className="text-3xl font-bold mt-2 text-gray-900">{stats.totalPosts}</p>
                            <div className="mt-2 text-xs">
                                <span className={`${parseFloat(stats.postsTrend) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                    {parseFloat(stats.postsTrend) >= 0 ? '+' : ''}{stats.postsTrend}% Vs la période précédente
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Stats secondaires - 3 colonnes (style PerfectPost) */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <Card className="bg-white">
                        <CardContent className="p-4">
                            <span className="text-xs text-gray-500 uppercase tracking-wide">VUES UNIQUES MOYENNES</span>
                            <p className="text-3xl font-bold mt-2 text-gray-900">{stats.avgImpressions.toLocaleString()}</p>
                            <div className="mt-2 text-xs">
                                <span className={`${parseFloat(stats.impressionsTrend) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                    {parseFloat(stats.impressionsTrend) >= 0 ? '+' : ''}{stats.impressionsTrend}% Vs la période précédente
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card className="bg-white">
                        <CardContent className="p-4">
                            <span className="text-xs text-gray-500 uppercase tracking-wide">VUES DE PROFIL DEPUIS LES POSTS</span>
                            <p className="text-3xl font-bold mt-2 text-gray-900">{analytics?.profileViews || '—'}</p>
                            <div className="mt-2 text-xs text-gray-500">
                                {analytics?.uniqueViewers ? `${analytics.uniqueViewers} visiteurs uniques` : 'Visitez LinkedIn pour sync'}
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card className="bg-white">
                        <CardContent className="p-4">
                            <span className="text-xs text-gray-500 uppercase tracking-wide">ABONNÉS GAGNÉS GRÂCE AUX POSTS</span>
                            <p className="text-3xl font-bold mt-2 text-gray-900">{stats.totalNewFollowers > 0 ? stats.totalNewFollowers : '—'}</p>
                            <div className="mt-2 text-xs text-gray-500">
                                Sur {stats.totalPosts} posts de la période
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Graphiques Impressions et Interactions */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <ChartCard 
                        title="IMPRESSIONS" 
                        value={stats.totalViews.toLocaleString()}
                        trend={stats.viewsTrend}
                        icon={Eye}
                        tabs={['Cumulé', 'Moyen']}
                    >
                        <ResponsiveContainer width="100%" height={200}>
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorImpressions" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS.blue} stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor={COLORS.blue} stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#a0aec0" />
                                <YAxis tick={{ fontSize: 10 }} stroke="#a0aec0" />
                                <Tooltip />
                                <Area type="monotone" dataKey="impressions" stroke={COLORS.blue} fill="url(#colorImpressions)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard 
                        title="INTERACTIONS" 
                        value={stats.totalInteractions.toLocaleString()}
                        trend={stats.interactionsTrend}
                        icon={Users}
                        tabs={['Cumulé', 'Moyen']}
                    >
                        <ResponsiveContainer width="100%" height={200}>
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorInteractions" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS.blue} stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor={COLORS.blue} stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#a0aec0" />
                                <YAxis tick={{ fontSize: 10 }} stroke="#a0aec0" />
                                <Tooltip />
                                <Area type="monotone" dataKey="interactions" stroke={COLORS.blue} fill="url(#colorInteractions)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </div>

                {/* Likes, Commentaires, Partages */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <ChartCard 
                        title="LIKES" 
                        value={stats.totalLikes.toLocaleString()}
                        trend={stats.likesTrend}
                        icon={Heart}
                        tabs={['Cumulé', 'Moyen']}
                    >
                        <ResponsiveContainer width="100%" height={150}>
                            <BarChart data={chartData}>
                                <XAxis dataKey="date" tick={{ fontSize: 8 }} stroke="#a0aec0" />
                                <YAxis tick={{ fontSize: 8 }} stroke="#a0aec0" />
                                <Tooltip />
                                <Bar dataKey="likes" fill={COLORS.blue} radius={[2, 2, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard 
                        title="COMMENTAIRES" 
                        value={stats.totalComments.toLocaleString()}
                        trend={stats.commentsTrend}
                        icon={MessageCircle}
                        tabs={['Cumulé', 'Moyen']}
                    >
                        <ResponsiveContainer width="100%" height={150}>
                            <BarChart data={chartData}>
                                <XAxis dataKey="date" tick={{ fontSize: 8 }} stroke="#a0aec0" />
                                <YAxis tick={{ fontSize: 8 }} stroke="#a0aec0" />
                                <Tooltip />
                                <Bar dataKey="comments" fill={COLORS.blue} radius={[2, 2, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard 
                        title="PARTAGES" 
                        value={stats.totalShares.toLocaleString()}
                        trend={stats.sharesTrend}
                        icon={Share2}
                        tabs={['Cumulé', 'Moyen']}
                    >
                        <ResponsiveContainer width="100%" height={150}>
                            <BarChart data={chartData}>
                                <XAxis dataKey="date" tick={{ fontSize: 8 }} stroke="#a0aec0" />
                                <YAxis tick={{ fontSize: 8 }} stroke="#a0aec0" />
                                <Tooltip />
                                <Bar dataKey="shares" fill={COLORS.blue} radius={[2, 2, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </div>

                {/* Habitudes de publication */}
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Ton habitude de publication</h2>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                    {/* Répartition par types de posts */}
                    <Card className="bg-white">
                        <CardContent className="p-4">
                            <span className="text-xs text-gray-500 uppercase tracking-wide">RÉPARTITION PAR TYPES DE POSTS</span>
                            <div className="flex gap-2 mt-2 mb-4">
                                {postTypeData.distribution.map((type, i) => (
                                    <Badge key={i} style={{ backgroundColor: type.color + '20', color: type.color }}>
                                        {type.name}: {type.value}
                                    </Badge>
                                ))}
                            </div>
                            {postTypeData.distribution.length > 0 ? (
                                <div className="flex justify-center">
                                    <ResponsiveContainer width={200} height={200}>
                                        <PieChart>
                                            <Pie
                                                data={postTypeData.distribution}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={2}
                                                dataKey="value"
                                            >
                                                {postTypeData.distribution.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="h-48 flex items-center justify-center text-gray-400">
                                    Pas de données
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Types de posts avec le plus d'impressions */}
                    <Card className="bg-white">
                        <CardContent className="p-4">
                            <span className="text-xs text-gray-500 uppercase tracking-wide">IMPRESSIONS PAR TYPE DE POST</span>
                            <div className="flex gap-2 mt-2 mb-4">
                                {postTypeData.impressions.map((type, i) => (
                                    <Badge key={i} style={{ backgroundColor: type.color + '20', color: type.color }}>
                                        {type.name}: {type.value.toLocaleString()}
                                    </Badge>
                                ))}
                            </div>
                            {postTypeData.impressions.length > 0 ? (
                                <div className="flex justify-center">
                                    <ResponsiveContainer width={200} height={200}>
                                        <PieChart>
                                            <Pie
                                                data={postTypeData.impressions}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={2}
                                                dataKey="value"
                                            >
                                                {postTypeData.impressions.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="h-48 flex items-center justify-center text-gray-400">
                                    Pas de données
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Heures de publication */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <Card className="bg-white">
                        <CardContent className="p-4">
                            <span className="text-xs text-gray-500 uppercase tracking-wide">HEURES DE PUBLICATION</span>
                            <div className="mt-4 space-y-1">
                                {publicationHours.publication.map((count, hour) => {
                                    const maxCount = Math.max(...publicationHours.publication, 1);
                                    const width = (count / maxCount) * 100;
                                    
                                    return (
                                        <div key={hour} className="flex items-center gap-2">
                                            <span className="text-xs text-gray-500 w-6">{hour}h</span>
                                            <div className="flex-1 h-3 bg-gray-100 rounded overflow-hidden">
                                                {width > 0 && (
                                                    <div 
                                                        className="h-full bg-blue-500 rounded"
                                                        style={{ width: `${width}%` }}
                                                    />
                                                )}
                                            </div>
                                            <span className="text-xs text-gray-400 w-6">{count}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white">
                        <CardContent className="p-4">
                            <span className="text-xs text-gray-500 uppercase tracking-wide">IMPRESSIONS MOYENNES PAR HEURE</span>
                            <div className="mt-4 space-y-1">
                                {publicationHours.avgImpressions.map((avgViews, hour) => {
                                    const maxViews = Math.max(...publicationHours.avgImpressions, 1);
                                    const width = (avgViews / maxViews) * 100;
                                    
                                    return (
                                        <div key={hour} className="flex items-center gap-2">
                                            <span className="text-xs text-gray-500 w-6">{hour}h</span>
                                            <div className="flex-1 h-3 bg-gray-100 rounded overflow-hidden">
                                                {width > 0 && (
                                                    <div 
                                                        className="h-full bg-green-500 rounded"
                                                        style={{ width: `${width}%` }}
                                                    />
                                                )}
                                            </div>
                                            <span className="text-xs text-gray-400 w-8">{avgViews}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Note sur les données */}
                <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                            <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                            <div>
                                <h3 className="font-medium text-blue-900">Données dynamiques</h3>
                                <p className="text-sm text-blue-700 mt-1">
                                    Toutes les statistiques sont calculées à partir de vos {posts.length} posts synchronisés depuis LinkedIn.
                                    Pour des données plus précises, visitez régulièrement votre page d'activité LinkedIn avec l'extension S-Post active.
                                </p>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="mt-3 border-blue-300 text-blue-700 hover:bg-blue-100"
                                    onClick={() => window.open('https://www.linkedin.com/in/me/recent-activity/all/', '_blank')}
                                >
                                    <Linkedin className="h-4 w-4 mr-2" />
                                    Synchroniser maintenant
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Footer */}
                <div className="text-center py-2 text-xs text-gray-400 border-t bg-gray-50 mt-6">
                    S-PostBO v2.4.0 • Powered by S-Post Extension
                </div>
            </div>
        </div>
    );
}
