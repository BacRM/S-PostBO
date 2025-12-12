import React, { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    Linkedin, RefreshCw, CheckCircle2, XCircle, AlertCircle,
    User, FileText, ThumbsUp, MessageSquare, Eye, TrendingUp,
    TrendingDown, Calendar, Target, Zap, PenSquare, Clock,
    BarChart3, Users, Sparkles, Send, BookMarked
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';
import { APP_VERSION } from "@/config/version";

// ============================================
// Hook S-Post Extension
// ============================================
function useSPost() {
    const [isInstalled, setIsInstalled] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [profile, setProfile] = useState(null);
    const [posts, setPosts] = useState([]);
    const [drafts, setDrafts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const checkExtension = async () => {
        console.log('[S-PostBO] Vérification de l\'extension...');
        
        // Méthode 1: Vérifier localStorage d'abord (plus fiable)
        const storedData = localStorage.getItem('spost_linkedin_data');
        if (storedData) {
            try {
                const data = JSON.parse(storedData);
                console.log('[S-PostBO] Données localStorage:', data);
                
                // Si on a des données avec csrf ou profile, l'extension fonctionne
                if (data.csrf || data.profile || data.connected) {
                    console.log('[S-PostBO] ✅ Extension détectée via localStorage!');
                    setIsInstalled(true);
                    setIsConnected(data.connected || false);
                    setProfile(data.profile || null);
                    setIsLoading(false);
                    return; // Succès !
                }
            } catch (e) {
                console.error('[S-PostBO] Erreur parsing localStorage:', e);
            }
        }
        
        // Méthode 2: Vérifier l'API window (si le bridge s'injecte)
        const api = window.SPost || window.LinkedInPlanner;
        if (api && typeof api.getData === 'function') {
            console.log('[S-PostBO] ✅ API Extension détectée! Version:', api.version);
            setIsInstalled(true);
            
            try {
                const data = await api.getData();
                console.log('[S-PostBO] Données API:', data);
                
                if (data) {
                    setIsConnected(data.connected || false);
                    setProfile(data.profile || null);
                }
            } catch (err) {
                console.error('[S-PostBO] Erreur API:', err);
            }
        } else {
            console.log('[S-PostBO] ❌ Extension non détectée (ni localStorage, ni API window)');
        }
        
        setIsLoading(false);
    };

    const refresh = async () => {
        setIsLoading(true);
        setError(null);
        await checkExtension();
    };

    const fetchFromLinkedIn = async () => {
        const api = window.SPost || window.LinkedInPlanner;
        if (api?.fetchPosts) {
            setIsLoading(true);
            try {
                const result = await api.fetchPosts();
                if (result.posts) {
                    setPosts(result.posts);
                } else if (result.error) {
                    setError(result.error);
                }
            } catch (err) {
                setError(err.message);
            }
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // Vérifier plusieurs fois car le content script peut prendre du temps
        const timers = [
            setTimeout(checkExtension, 100),
            setTimeout(checkExtension, 500),
            setTimeout(checkExtension, 1000),
            setTimeout(checkExtension, 2000),
        ];
        
        window.addEventListener('SPostReady', checkExtension);
        window.addEventListener('LinkedInPlannerReady', checkExtension);
        
        return () => {
            timers.forEach(clearTimeout);
            window.removeEventListener('SPostReady', checkExtension);
            window.removeEventListener('LinkedInPlannerReady', checkExtension);
        };
    }, []);

    return { isInstalled, isConnected, profile, posts, drafts, isLoading, error, refresh, fetchFromLinkedIn };
}

// ============================================
// Composants Stats
// ============================================
const StatCard = ({ icon: Icon, label, value, change, color, bgColor }) => (
    <Card className="overflow-hidden">
        <CardContent className="p-0">
            <div className={`p-4 ${bgColor}`}>
                <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-lg bg-white/20`}>
                        <Icon className={`h-5 w-5 ${color}`} />
                    </div>
                    {change !== undefined && (
                        <div className={`flex items-center gap-1 text-xs font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {change >= 0 ? '+' : ''}{change}%
                        </div>
                    )}
                </div>
                <p className="text-3xl font-bold mt-3 text-gray-900">{value.toLocaleString()}</p>
                <p className="text-sm text-gray-600 mt-1">{label}</p>
            </div>
        </CardContent>
    </Card>
);

// ============================================
// Dashboard Principal
// ============================================
export default function Home() {
    const { isInstalled, isConnected, profile, posts, drafts, isLoading, error, refresh, fetchFromLinkedIn } = useSPost();
    const [activeTab, setActiveTab] = useState('overview');

    // Calculer les statistiques
    const stats = useMemo(() => {
        const totalLikes = posts.reduce((sum, p) => sum + (p.stats?.likes || 0), 0);
        const totalComments = posts.reduce((sum, p) => sum + (p.stats?.comments || 0), 0);
        const totalViews = posts.reduce((sum, p) => sum + (p.stats?.views || 0), 0);
        const totalPosts = posts.length;
        const avgEngagement = totalPosts > 0 ? ((totalLikes + totalComments) / totalPosts).toFixed(1) : 0;
        
        return {
            totalPosts,
            totalLikes,
            totalComments,
            totalViews,
            avgEngagement,
            totalInteractions: totalLikes + totalComments,
        };
    }, [posts]);

    // Données pour les graphiques
    const chartData = useMemo(() => {
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dayName = date.toLocaleDateString('fr-FR', { weekday: 'short' });
            
            // Simuler des données basées sur les posts
            const dayPosts = posts.filter(p => {
                if (!p.createdAt) return false;
                const postDate = new Date(p.createdAt);
                return postDate.toDateString() === date.toDateString();
            });
            
            last7Days.push({
                day: dayName,
                posts: dayPosts.length,
                likes: dayPosts.reduce((sum, p) => sum + (p.stats?.likes || 0), 0),
                comments: dayPosts.reduce((sum, p) => sum + (p.stats?.comments || 0), 0),
                impressions: Math.floor(Math.random() * 500) + 100, // Demo data
            });
        }
        return last7Days;
    }, [posts]);

    // Objectifs hebdomadaires (style PerfectPost)
    const objectives = {
        postsGoal: 3,
        postsActual: stats.totalPosts,
        engagementGoal: 50,
        engagementActual: stats.totalInteractions,
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                                    <Linkedin className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-slate-800">S-Post</h1>
                                    <p className="text-xs text-slate-500">LinkedIn Manager</p>
                                </div>
                            </div>
                            
                            {/* Status badges */}
                            <div className="hidden md:flex items-center gap-2 ml-6">
                                <Badge variant={isInstalled ? "default" : "destructive"} className="gap-1">
                                    {isInstalled ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                    Extension
                                </Badge>
                                <Badge variant={isConnected ? "default" : "secondary"} className="gap-1">
                                    {isConnected ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                                    LinkedIn
                                </Badge>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <Button variant="outline" size="sm" onClick={refresh} disabled={isLoading}>
                                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                                Actualiser
                            </Button>
                            <Button size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                                <PenSquare className="h-4 w-4 mr-2" />
                                Nouveau post
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
                {/* Bloc de Debug */}
                <Card className="border-slate-300 bg-slate-900 text-slate-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2 text-slate-300">
                            🐛 Debug - Statut Extension S-Post
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="font-mono text-xs space-y-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-slate-400">Extension installée:</p>
                                <p className={isInstalled ? "text-green-400" : "text-red-400"}>
                                    {isInstalled ? "✅ OUI" : "❌ NON"}
                                </p>
                            </div>
                            <div>
                                <p className="text-slate-400">LinkedIn connecté:</p>
                                <p className={isConnected ? "text-green-400" : "text-yellow-400"}>
                                    {isConnected ? "✅ OUI" : "⚠️ NON"}
                                </p>
                            </div>
                        </div>
                        
                        <div className="border-t border-slate-700 pt-2 mt-2">
                            <p className="text-slate-400 mb-1">Profil LinkedIn:</p>
                            {profile ? (
                                <div className="bg-slate-800 p-2 rounded">
                                    <p className="text-green-400">👤 {profile.name || (profile.firstName && profile.lastName ? profile.firstName + ' ' + profile.lastName : null) || 'Nom inconnu'}</p>
                                    {profile.headline && <p className="text-slate-400 text-xs mt-1">📝 {profile.headline}</p>}
                                    {profile.occupation && <p className="text-slate-400 text-xs mt-1">📝 {profile.occupation}</p>}
                                    {profile.publicIdentifier && <p className="text-blue-400 text-xs mt-1">🔗 linkedin.com/in/{profile.publicIdentifier}</p>}
                                    {profile.entityUrn && <p className="text-slate-500 text-xs mt-1">ID: {profile.entityUrn}</p>}
                                </div>
                            ) : (
                                <div className="bg-yellow-900/30 p-2 rounded border border-yellow-700">
                                    <p className="text-yellow-400">⚠️ Aucun profil détecté</p>
                                    <p className="text-yellow-300/70 text-xs mt-1">
                                        Pour synchroniser votre profil, ouvrez LinkedIn dans un autre onglet :
                                    </p>
                                    <a 
                                        href="https://www.linkedin.com/feed/" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-block mt-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                    >
                                        🔗 Ouvrir LinkedIn
                                    </a>
                                    <p className="text-slate-500 text-xs mt-2">
                                        Puis revenez ici et cliquez sur "Rafraîchir"
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="border-t border-slate-700 pt-2 mt-2">
                            <p className="text-slate-400 mb-1">Mode de communication:</p>
                            <p className="text-green-400">
                                {typeof window !== 'undefined' && (window.SPost || window.LinkedInPlanner) 
                                    ? `✅ API directe (v${(window.SPost || window.LinkedInPlanner)?.version || '?'})` 
                                    : profile 
                                        ? "✅ Via localStorage (données synchronisées)" 
                                        : "⏳ En attente de données..."}
                            </p>
                        </div>
                        
                        {!isInstalled && (
                            <div className="border-t border-slate-700 pt-2 mt-2 bg-red-900/20 p-2 rounded">
                                <p className="text-red-400 text-xs font-bold mb-2">⚠️ Extension non détectée :</p>
                                <ol className="text-slate-400 text-xs list-decimal list-inside space-y-1">
                                    <li>Allez sur <code className="bg-slate-800 px-1">chrome://extensions/</code></li>
                                    <li>Chargez l'extension <strong>S-Post</strong></li>
                                    <li>Visitez <a href="https://www.linkedin.com/feed/" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">LinkedIn</a></li>
                                    <li>Revenez ici et <strong>rafraîchissez</strong></li>
                                </ol>
                            </div>
                        )}

                        <div className="border-t border-slate-700 pt-2 mt-2">
                            <p className="text-slate-400 mb-1">localStorage (spost_linkedin_data):</p>
                            <pre className="bg-slate-800 p-2 rounded text-xs overflow-auto max-h-32">
                                {typeof window !== 'undefined' && localStorage.getItem('spost_linkedin_data') 
                                    ? JSON.stringify(JSON.parse(localStorage.getItem('spost_linkedin_data') || '{}'), null, 2)
                                    : 'Aucune donnée'}
                            </pre>
                        </div>

                        <div className="border-t border-slate-700 pt-2 mt-2 flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" className="text-xs" onClick={refresh}>
                                🔄 Rafraîchir
                            </Button>
                            <Button size="sm" variant="outline" className="text-xs" onClick={() => {
                                console.log('=== DEBUG S-POST ===');
                                console.log('window.SPost:', window.SPost);
                                console.log('window.LinkedInPlanner:', window.LinkedInPlanner);
                                console.log('localStorage:', localStorage.getItem('spost_linkedin_data'));
                                alert('Vérifiez la console (F12)');
                            }}>
                                📋 Log Console
                            </Button>
                            <Button size="sm" variant="outline" className="text-xs bg-blue-900" onClick={async () => {
                                console.log('=== TEST API EXTENSION ===');
                                const api = window.SPost || window.LinkedInPlanner;
                                if (!api) {
                                    alert('❌ Extension non détectée!\n\nwindow.SPost = ' + typeof window.SPost);
                                    return;
                                }
                                try {
                                    console.log('Appel api.getData()...');
                                    const data = await api.getData();
                                    console.log('Réponse getData():', data);
                                    alert('✅ Réponse reçue!\n\n' + JSON.stringify(data, null, 2));
                                } catch (err) {
                                    console.error('Erreur:', err);
                                    alert('❌ Erreur: ' + err.message);
                                }
                            }}>
                                🧪 Test API
                            </Button>
                            <Button size="sm" variant="outline" className="text-xs bg-green-900" onClick={async () => {
                                const api = window.SPost || window.LinkedInPlanner;
                                if (!api) {
                                    alert('Extension non détectée');
                                    return;
                                }
                                try {
                                    const profile = await api.getProfile();
                                    console.log('Profile:', profile);
                                    alert('Profile:\n' + JSON.stringify(profile, null, 2));
                                } catch (err) {
                                    alert('Erreur: ' + err.message);
                                }
                            }}>
                                👤 Get Profile
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Alerte si extension non installée */}
                {!isInstalled && (
                    <Card className="border-orange-200 bg-orange-50">
                        <CardContent className="p-4 flex items-center gap-4">
                            <AlertCircle className="h-8 w-8 text-orange-500 flex-shrink-0" />
                            <div>
                                <p className="font-medium text-orange-800">Extension S-Post non détectée</p>
                                <p className="text-sm text-orange-600">Installez l'extension et ouvrez LinkedIn pour synchroniser vos données.</p>
                            </div>
                            <Button variant="outline" className="ml-auto border-orange-300 text-orange-700 hover:bg-orange-100">
                                Installer
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Profil connecté */}
                {profile && (
                    <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
                                {profile.firstName?.charAt(0) || profile.name?.charAt(0) || 'U'}
                            </div>
                            <div>
                                <p className="font-semibold text-slate-800">{profile.name || `${profile.firstName} ${profile.lastName}`}</p>
                                <p className="text-sm text-slate-500">{profile.headline || 'Profil LinkedIn connecté'}</p>
                            </div>
                            <Badge className="ml-auto bg-green-100 text-green-700 hover:bg-green-100">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Connecté
                            </Badge>
                        </CardContent>
                    </Card>
                )}

                {/* Tabs Navigation */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="bg-white border">
                        <TabsTrigger value="overview" className="gap-2">
                            <BarChart3 className="h-4 w-4" />
                            Vue d'ensemble
                        </TabsTrigger>
                        <TabsTrigger value="posts" className="gap-2">
                            <FileText className="h-4 w-4" />
                            Mes Posts
                        </TabsTrigger>
                        <TabsTrigger value="drafts" className="gap-2">
                            <BookMarked className="h-4 w-4" />
                            Brouillons
                        </TabsTrigger>
                        <TabsTrigger value="calendar" className="gap-2">
                            <Calendar className="h-4 w-4" />
                            Calendrier
                        </TabsTrigger>
                    </TabsList>

                    {/* TAB: Vue d'ensemble */}
                    <TabsContent value="overview" className="space-y-6">
                        {/* Stats Cards - Style PerfectPost */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <StatCard
                                icon={Eye}
                                label="Impressions"
                                value={stats.totalViews}
                                change={12}
                                color="text-blue-600"
                                bgColor="bg-gradient-to-br from-blue-50 to-blue-100"
                            />
                            <StatCard
                                icon={ThumbsUp}
                                label="Likes"
                                value={stats.totalLikes}
                                change={8}
                                color="text-rose-600"
                                bgColor="bg-gradient-to-br from-rose-50 to-rose-100"
                            />
                            <StatCard
                                icon={MessageSquare}
                                label="Commentaires"
                                value={stats.totalComments}
                                change={-3}
                                color="text-purple-600"
                                bgColor="bg-gradient-to-br from-purple-50 to-purple-100"
                            />
                            <StatCard
                                icon={FileText}
                                label="Publications"
                                value={stats.totalPosts}
                                change={15}
                                color="text-emerald-600"
                                bgColor="bg-gradient-to-br from-emerald-50 to-emerald-100"
                            />
                        </div>

                        {/* Graphiques et Objectifs */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Graphique principal */}
                            <Card className="lg:col-span-2">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <TrendingUp className="h-5 w-5 text-blue-600" />
                                        Performance sur 7 jours
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={280}>
                                        <AreaChart data={chartData}>
                                            <defs>
                                                <linearGradient id="colorLikes" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                                </linearGradient>
                                                <linearGradient id="colorComments" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                            <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
                                            <YAxis stroke="#94a3b8" fontSize={12} />
                                            <Tooltip 
                                                contentStyle={{ 
                                                    backgroundColor: 'white', 
                                                    border: '1px solid #e2e8f0',
                                                    borderRadius: '8px',
                                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                                }} 
                                            />
                                            <Area type="monotone" dataKey="likes" stroke="#3b82f6" fillOpacity={1} fill="url(#colorLikes)" name="Likes" />
                                            <Area type="monotone" dataKey="comments" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorComments)" name="Commentaires" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            {/* Objectifs hebdomadaires - Style PerfectPost */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Target className="h-5 w-5 text-orange-500" />
                                        Objectifs hebdo
                                    </CardTitle>
                                    <CardDescription>Atteignez vos objectifs de publication</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <span className="text-sm font-medium">Publications</span>
                                            <span className="text-sm text-slate-500">
                                                {objectives.postsActual}/{objectives.postsGoal}
                                            </span>
                                        </div>
                                        <Progress 
                                            value={(objectives.postsActual / objectives.postsGoal) * 100} 
                                            className="h-2"
                                        />
                                        <p className="text-xs text-slate-500 mt-1">
                                            {objectives.postsGoal - objectives.postsActual > 0 
                                                ? `${objectives.postsGoal - objectives.postsActual} post(s) restant(s)`
                                                : '✅ Objectif atteint !'}
                                        </p>
                                    </div>
                                    
                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <span className="text-sm font-medium">Engagements</span>
                                            <span className="text-sm text-slate-500">
                                                {objectives.engagementActual}/{objectives.engagementGoal}
                                            </span>
                                        </div>
                                        <Progress 
                                            value={(objectives.engagementActual / objectives.engagementGoal) * 100} 
                                            className="h-2"
                                        />
                                    </div>

                                    <div className="pt-4 border-t">
                                        <div className="flex items-center gap-2 text-sm">
                                            <Sparkles className="h-4 w-4 text-yellow-500" />
                                            <span className="font-medium">Conseil IA</span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-2">
                                            Publiez le mardi et jeudi entre 8h-9h pour maximiser votre portée.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Actions rapides */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Card className="cursor-pointer hover:shadow-md transition-shadow hover:border-blue-300">
                                <CardContent className="p-4 flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <PenSquare className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">Créer un post</p>
                                        <p className="text-xs text-slate-500">Nouveau contenu</p>
                                    </div>
                                </CardContent>
                            </Card>
                            
                            <Card className="cursor-pointer hover:shadow-md transition-shadow hover:border-purple-300">
                                <CardContent className="p-4 flex items-center gap-3">
                                    <div className="p-2 bg-purple-100 rounded-lg">
                                        <Clock className="h-5 w-5 text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">Programmer</p>
                                        <p className="text-xs text-slate-500">Planifier un post</p>
                                    </div>
                                </CardContent>
                            </Card>
                            
                            <Card className="cursor-pointer hover:shadow-md transition-shadow hover:border-emerald-300">
                                <CardContent className="p-4 flex items-center gap-3">
                                    <div className="p-2 bg-emerald-100 rounded-lg">
                                        <Sparkles className="h-5 w-5 text-emerald-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">Générer avec IA</p>
                                        <p className="text-xs text-slate-500">Idées de posts</p>
                                    </div>
                                </CardContent>
                            </Card>
                            
                            <Card className="cursor-pointer hover:shadow-md transition-shadow hover:border-orange-300" onClick={fetchFromLinkedIn}>
                                <CardContent className="p-4 flex items-center gap-3">
                                    <div className="p-2 bg-orange-100 rounded-lg">
                                        <RefreshCw className="h-5 w-5 text-orange-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">Synchroniser</p>
                                        <p className="text-xs text-slate-500">Depuis LinkedIn</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* TAB: Mes Posts */}
                    <TabsContent value="posts" className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Mes publications LinkedIn</h2>
                            <Button variant="outline" size="sm" onClick={fetchFromLinkedIn} disabled={isLoading}>
                                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                                Récupérer de LinkedIn
                            </Button>
                        </div>
                        
                        {posts.length === 0 ? (
                            <Card>
                                <CardContent className="p-12 text-center">
                                    <FileText className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                                    <p className="text-slate-500">Aucun post récupéré</p>
                                    <p className="text-sm text-slate-400 mt-1">
                                        Ouvrez LinkedIn et cliquez sur "Récupérer de LinkedIn"
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid gap-4">
                                {posts.map((post, index) => (
                                    <Card key={post.id || index} className="hover:shadow-md transition-shadow">
                                        <CardContent className="p-4">
                                            <p className="text-slate-700 line-clamp-3 mb-3">
                                                {post.content || post.text || 'Contenu non disponible'}
                                            </p>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4 text-sm text-slate-500">
                                                    <span className="flex items-center gap-1">
                                                        <ThumbsUp className="h-4 w-4" />
                                                        {post.stats?.likes || 0}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <MessageSquare className="h-4 w-4" />
                                                        {post.stats?.comments || 0}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Eye className="h-4 w-4" />
                                                        {post.stats?.views || 0}
                                                    </span>
                                                </div>
                                                {post.createdAt && (
                                                    <span className="text-xs text-slate-400">
                                                        {new Date(post.createdAt).toLocaleDateString('fr-FR')}
                                                    </span>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    {/* TAB: Brouillons */}
                    <TabsContent value="drafts" className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Mes brouillons</h2>
                            <Button size="sm">
                                <PenSquare className="h-4 w-4 mr-2" />
                                Nouveau brouillon
                            </Button>
                        </div>
                        
                        {drafts.length === 0 ? (
                            <Card>
                                <CardContent className="p-12 text-center">
                                    <BookMarked className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                                    <p className="text-slate-500">Aucun brouillon</p>
                                    <p className="text-sm text-slate-400 mt-1">
                                        Créez un brouillon pour préparer vos posts
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid gap-4">
                                {drafts.map((draft, index) => (
                                    <Card key={draft.id || index}>
                                        <CardContent className="p-4">
                                            <p className="text-slate-700 line-clamp-2">{draft.content}</p>
                                            <div className="flex items-center gap-2 mt-3">
                                                <Badge variant="secondary">Brouillon</Badge>
                                                {draft.scheduledAt && (
                                                    <Badge variant="outline">
                                                        <Clock className="h-3 w-3 mr-1" />
                                                        Programmé
                                                    </Badge>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    {/* TAB: Calendrier */}
                    <TabsContent value="calendar">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Calendar className="h-5 w-5" />
                                    Calendrier de publication
                                </CardTitle>
                                <CardDescription>
                                    Planifiez et visualisez vos publications à venir
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-12 text-center">
                                <Calendar className="h-16 w-16 mx-auto text-slate-300 mb-4" />
                                <p className="text-slate-500">Calendrier en cours de développement</p>
                                <p className="text-sm text-slate-400 mt-1">
                                    Bientôt disponible : planification visuelle des posts
                                </p>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </main>

            {/* Footer */}
            <footer className="border-t bg-white mt-8">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between text-xs text-slate-400">
                    <span>S-PostBO v{APP_VERSION} • Inspiré par PerfectPost</span>
                    <span>Mode développement local</span>
                </div>
            </footer>
        </div>
    );
}
