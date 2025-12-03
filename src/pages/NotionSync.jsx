import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
    RefreshCw, Database, Link2, Check, X, AlertCircle, 
    FileText, Calendar, Clock, Loader2, ExternalLink,
    Settings, ChevronRight, Trash2, Plus, Info
} from "lucide-react";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import Sidebar from '../components/dashboard/Sidebar';
import { notionApiCall, checkExtensionAvailable } from '@/utils/spost-api';

// Logo Notion SVG
const NotionLogo = ({ className }) => (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6.017 4.313l55.333 -4.087c6.797 -0.583 8.543 -0.19 12.817 2.917l17.663 12.443c2.913 2.14 3.883 2.723 3.883 5.053v68.243c0 4.277 -1.553 6.807 -6.99 7.193L24.467 99.967c-4.08 0.193 -6.023 -0.39 -8.16 -3.113L3.3 79.94c-2.333 -3.113 -3.3 -5.443 -3.3 -8.167V11.113c0 -3.497 1.553 -6.413 6.017 -6.8z" fill="#fff"/>
        <path fillRule="evenodd" clipRule="evenodd" d="M61.35 0.227l-55.333 4.087C1.553 4.7 0 7.617 0 11.113v60.66c0 2.723 0.967 5.053 3.3 8.167l13.007 16.913c2.137 2.723 4.08 3.307 8.16 3.113l64.257 -3.89c5.433 -0.387 6.99 -2.917 6.99 -7.193V20.64c0 -2.21 -0.873 -2.847 -3.443 -4.733L74.167 3.143c-4.273 -3.107 -6.02 -3.5 -12.817 -2.917zM25.92 19.523c-5.247 0.353 -6.437 0.433 -9.417 -1.99L8.927 11.507c-0.77 -0.78 -0.383 -1.753 1.557 -1.947l53.193 -3.887c4.467 -0.39 6.793 1.167 8.54 2.527l9.123 6.61c0.39 0.197 1.36 1.36 0.193 1.36l-54.933 3.307 -0.68 0.047zM19.803 88.3V30.367c0 -2.53 0.777 -3.697 3.103 -3.893L86 22.78c2.14 -0.193 3.107 1.167 3.107 3.693v57.547c0 2.53 -0.39 4.67 -3.883 4.863l-60.377 3.5c-3.493 0.193 -5.043 -0.97 -5.043 -4.083zm59.6 -54.827c0.387 1.75 0 3.5 -1.75 3.7l-2.91 0.577v42.773c-2.527 1.36 -4.853 2.137 -6.797 2.137 -3.107 0 -3.883 -0.973 -6.21 -3.887l-19.03 -29.94v28.967l6.02 1.363s0 3.5 -4.857 3.5l-13.39 0.777c-0.39 -0.78 0 -2.723 1.357 -3.11l3.497 -0.97v-38.3L30.48 40.667c-0.39 -1.75 0.58 -4.277 3.3 -4.473l14.367 -0.967 19.8 30.327v-26.83l-5.047 -0.58c-0.39 -2.143 1.163 -3.7 3.103 -3.89l13.4 -0.78z" fill="#000"/>
    </svg>
);

export default function NotionSync() {
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingDatabases, setIsLoadingDatabases] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [notionToken, setNotionToken] = useState('');
    const [notionConfig, setNotionConfig] = useState({
        accessToken: '',
        databaseId: '',
        workspaceName: '',
        lastSync: null,
        autoSync: false,
        syncInterval: 30, // minutes
    });
    const [databases, setDatabases] = useState([]);
    const [selectedDatabase, setSelectedDatabase] = useState(null);
    const [syncedPosts, setSyncedPosts] = useState([]);
    const [syncStats, setSyncStats] = useState({
        totalPosts: 0,
        drafts: 0,
        scheduled: 0,
        published: 0,
    });
    const [error, setError] = useState(null);

    useEffect(() => {
        loadNotionConfig().catch(console.error);
    }, []);

    const loadNotionConfig = async () => {
        const saved = localStorage.getItem('spost_notion_config');
        if (saved) {
            try {
                const config = JSON.parse(saved);
                setNotionConfig(config);
                setNotionToken(config.accessToken || '');
                setIsConnected(!!config.accessToken);
                if (config.accessToken) {
                    await loadDatabases(config.accessToken);
                    // Restaurer la base sélectionnée après le chargement
                    if (config.databaseId) {
                        const db = databases.find(d => d.id === config.databaseId);
                        if (db) {
                            setSelectedDatabase(db);
                        }
                    }
                }
                if (config.databaseId) {
                    loadSyncedPosts();
                }
            } catch (e) {
                console.error('Erreur lors du chargement de la config Notion:', e);
            }
        }
    };

    const saveNotionConfig = (config) => {
        localStorage.setItem('spost_notion_config', JSON.stringify(config));
        setNotionConfig(config);
    };

    const handleConnect = async () => {
        if (!notionToken || !notionToken.trim()) {
            toast.error('Veuillez entrer un token d\'intégration Notion');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Tester la connexion en récupérant les bases de données
            await loadDatabases(notionToken);
            
            setIsConnected(true);
            const newConfig = {
                ...notionConfig,
                accessToken: notionToken,
                workspaceName: 'Mon Workspace Notion',
            };
            saveNotionConfig(newConfig);
            toast.success('Connecté à Notion avec succès !');
        } catch (error) {
            console.error('Erreur de connexion Notion:', error);
            setError(error.message || 'Erreur de connexion à Notion');
            toast.error(error.message || 'Erreur de connexion à Notion');
            setIsConnected(false);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDisconnect = () => {
        setIsConnected(false);
        setNotionToken('');
        setSelectedDatabase(null);
        setDatabases([]);
        setSyncedPosts([]);
        setError(null);
        localStorage.removeItem('spost_notion_config');
        setNotionConfig({
            accessToken: '',
            databaseId: '',
            workspaceName: '',
            lastSync: null,
            autoSync: false,
            syncInterval: 30,
        });
        toast.success('Déconnecté de Notion');
    };


    const loadDatabases = async (token = notionToken || notionConfig.accessToken) => {
        if (!token) {
            throw new Error('Token d\'intégration manquant');
        }

        setIsLoadingDatabases(true);
        setError(null);

        try {
            // Vérifier que l'extension est disponible
            const extensionAvailable = await checkExtensionAvailable();
            if (!extensionAvailable) {
                throw new Error('Extension S-Post non détectée. Assurez-vous que l\'extension est installée et active, puis rechargez la page.');
            }
            
            // Appel API Notion via window.postMessage (pas d'injection de script)
            console.log('[NotionSync] Appel API Notion via window.postMessage...');
            
            const response = await notionApiCall(
                'search',
                'POST',
                {
                    filter: {
                        property: 'object',
                        value: 'database'
                    }
                },
                token
            );
            
            if (!response || !response.success) {
                const errorMsg = response?.error || 'Erreur lors de l\'appel à l\'API Notion';
                throw new Error(errorMsg);
            }
            
            const data = response.data;
            
            if (!data.results || data.results.length === 0) {
                setDatabases([]);
                toast.warning('Aucune base de données trouvée. Partagez une base avec votre intégration Notion.');
                return;
            }

            const dbList = data.results.map(db => {
                // Extraire le titre de la base de données
                let title = 'Base sans titre';
                let icon = '📄';
                
                if (db.title && db.title.length > 0) {
                    const titlePart = db.title[0];
                    if (titlePart.plain_text) {
                        title = titlePart.plain_text;
                    }
                }
                
                // Extraire l'icône si disponible
                if (db.icon) {
                    if (db.icon.type === 'emoji') {
                        icon = db.icon.emoji;
                    } else if (db.icon.type === 'external' || db.icon.type === 'file') {
                        icon = '🔗';
                    }
                }

                return {
                    id: db.id,
                    title: title,
                    icon: icon,
                    url: db.url,
                    lastEdited: db.last_edited_time,
                };
            });

            setDatabases(dbList);
            
            // Si une base était déjà sélectionnée, la retrouver
            const savedConfig = JSON.parse(localStorage.getItem('spost_notion_config') || '{}');
            if (savedConfig.databaseId) {
                const savedDb = dbList.find(d => d.id === savedConfig.databaseId);
                if (savedDb) {
                    setSelectedDatabase(savedDb);
                }
            }

            if (dbList.length > 0) {
                toast.success(`${dbList.length} base(s) de données trouvée(s)`);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des bases de données:', error);
            let errorMessage = error.message || 'Erreur lors de la récupération des bases de données';
            
            // Messages d'erreur plus clairs
            if (errorMessage.includes('Extension context invalidated') || errorMessage.includes('chrome.runtime')) {
                errorMessage = 'Extension S-Post non détectée. Assurez-vous que l\'extension est installée et active, puis rechargez la page.';
            } else if (errorMessage.includes('Failed to fetch') || (error.name === 'TypeError' && error.message.includes('fetch'))) {
                errorMessage = 'Erreur de connexion. Vérifiez votre connexion internet et que l\'extension S-Post est active.';
            } else if (errorMessage.includes('401') || errorMessage.includes('invalide')) {
                errorMessage = 'Token d\'intégration invalide. Vérifiez votre token sur notion.so/my-integrations';
            } else if (errorMessage.includes('403') || errorMessage.includes('refusé')) {
                errorMessage = 'Accès refusé. Assurez-vous que votre intégration Notion a accès aux bases de données.';
            }
            
            setError(errorMessage);
            setDatabases([]);
            throw error;
        } finally {
            setIsLoadingDatabases(false);
        }
    };

    const selectDatabase = (db) => {
        setSelectedDatabase(db);
        const newConfig = {
            ...notionConfig,
            databaseId: db.id,
        };
        saveNotionConfig(newConfig);
        loadSyncedPosts();
    };

    const loadSyncedPosts = () => {
        // Charger les posts depuis localStorage ou Notion
        const posts = JSON.parse(localStorage.getItem('spost_posts') || '[]');
        setSyncedPosts(posts.slice(0, 10));
        setSyncStats({
            totalPosts: posts.length,
            drafts: posts.filter(p => p.status === 'draft').length,
            scheduled: posts.filter(p => p.status === 'scheduled').length,
            published: posts.filter(p => !p.status || p.status === 'published').length,
        });
    };

    const handleSync = async () => {
        setIsSyncing(true);
        
        // Simuler la synchronisation
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const newConfig = {
            ...notionConfig,
            lastSync: new Date().toISOString(),
        };
        saveNotionConfig(newConfig);
        loadSyncedPosts();
        
        setIsSyncing(false);
    };

    const handleAutoSyncToggle = (checked) => {
        const newConfig = {
            ...notionConfig,
            autoSync: checked,
        };
        saveNotionConfig(newConfig);
    };

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar activePage="notion" />
            
            <div className="flex-1 p-6 overflow-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <NotionLogo className="w-8 h-8" />
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Synchronisation Notion</h1>
                            <p className="text-sm text-gray-500">
                                Connectez votre base Notion pour gérer vos posts et brouillons
                            </p>
                        </div>
                    </div>
                    
                    {isConnected && (
                        <Button 
                            onClick={handleSync} 
                            disabled={isSyncing || !selectedDatabase}
                            className="bg-black hover:bg-gray-800"
                        >
                            {isSyncing ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <RefreshCw className="h-4 w-4 mr-2" />
                            )}
                            Synchroniser
                        </Button>
                    )}
                </div>

                <div className="grid gap-6">
                    {/* Connexion Notion */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Link2 className="h-5 w-5" />
                                Connexion à Notion
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {!isConnected ? (
                                <div className="space-y-6">
                                    <div className="text-center">
                                        <NotionLogo className="w-16 h-16 mx-auto mb-4" />
                                        <h3 className="text-lg font-semibold mb-2">
                                            Connectez votre espace Notion
                                        </h3>
                                        <p className="text-gray-500 mb-6 max-w-md mx-auto">
                                            Synchronisez vos posts LinkedIn avec une base de données Notion 
                                            pour gérer votre contenu depuis votre espace de travail préféré.
                                        </p>
                                    </div>

                                    <div className="space-y-2 max-w-md mx-auto">
                                        <Label htmlFor="notion-token">Token d'intégration Notion</Label>
                                        <Input
                                            id="notion-token"
                                            type="password"
                                            placeholder="secret_..."
                                            value={notionToken}
                                            onChange={(e) => setNotionToken(e.target.value)}
                                            disabled={isLoading}
                                            className="font-mono text-sm"
                                        />
                                        <p className="text-xs text-gray-500">
                                            Créez un token sur <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">notion.so/my-integrations</a>
                                        </p>
                                    </div>

                                    {error && (
                                        <div className="max-w-md mx-auto p-3 bg-red-50 border border-red-200 rounded-lg">
                                            <div className="flex gap-2">
                                                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                                                <div className="flex-1">
                                                    <p className="text-sm text-red-700 font-medium">{error}</p>
                                                    {(error.includes('Extension') || error.includes('CORS') || error.includes('Failed to fetch')) && (
                                                        <div className="text-xs text-red-600 mt-2 space-y-1">
                                                            <p className="font-semibold">Solution :</p>
                                                            <ol className="list-decimal ml-4 space-y-1">
                                                                <li>Allez sur <code className="bg-red-100 px-1 rounded">chrome://extensions/</code></li>
                                                                <li>Activez le "Mode développeur"</li>
                                                                <li>Trouvez "S-Post" et cliquez sur l'icône de rechargement 🔄</li>
                                                                <li>Revenez ici et actualisez la page (Ctrl+Shift+R)</li>
                                                            </ol>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="text-center space-y-3">
                                        <Button 
                                            onClick={handleConnect}
                                            disabled={isLoading || !notionToken.trim()}
                                            className="bg-black hover:bg-gray-800"
                                        >
                                            {isLoading ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                    Connexion...
                                                </>
                                            ) : (
                                                <>
                                                    <NotionLogo className="w-4 h-4 mr-2" />
                                                    Connecter Notion
                                                </>
                                            )}
                                        </Button>
                                        
                                        <div className="text-xs text-gray-500 space-y-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={async () => {
                                                    try {
                                                        const available = await checkExtensionAvailable();
                                                        let message = '=== DIAGNOSTIC EXTENSION ===\n\n';
                                                        
                                                        if (available) {
                                                            message += '✅ Extension S-Post détectée et active\n';
                                                            message += '\n✅ Vous pouvez vous connecter à Notion !';
                                                        } else {
                                                            message += '❌ Extension non détectée\n\n';
                                                            message += 'Vérifiez que:\n';
                                                            message += '1. L\'extension S-Post est installée\n';
                                                            message += '2. L\'extension est activée (chrome://extensions/)\n';
                                                            message += '3. Rechargez l\'extension (icône 🔄)\n';
                                                            message += '4. Actualisez cette page (Ctrl+Shift+R)';
                                                        }
                                                        
                                                        alert(message);
                                                    } catch (error) {
                                                        alert(`Erreur lors du test: ${error.message}`);
                                                    }
                                                }}
                                                className="text-xs w-full"
                                            >
                                                🧪 Tester l'extension
                                            </Button>
                                            <p className="text-xs text-gray-400 text-center">
                                                Si l'extension n'est pas détectée, rechargez-la dans chrome://extensions/
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-6 p-4 bg-blue-50 rounded-lg text-left max-w-md mx-auto">
                                        <div className="flex gap-2">
                                            <Info className="h-5 w-5 text-blue-500 flex-shrink-0" />
                                            <div className="text-sm text-blue-700">
                                                <p className="font-medium mb-1">Configuration requise :</p>
                                                <ol className="list-decimal ml-4 space-y-1">
                                                    <li>Créez une intégration sur <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer" className="underline">notion.so/my-integrations</a></li>
                                                    <li>Partagez votre base de données avec l'intégration</li>
                                                    <li>Copiez le token d'intégration (commence par "secret_")</li>
                                                </ol>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                                <Check className="h-5 w-5 text-green-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-green-900">Connecté à Notion</p>
                                                <p className="text-sm text-green-700">{notionConfig.workspaceName}</p>
                                            </div>
                                        </div>
                                        <Button variant="outline" size="sm" onClick={handleDisconnect}>
                                            <X className="h-4 w-4 mr-1" />
                                            Déconnecter
                                        </Button>
                                    </div>
                                    
                                    {notionConfig.lastSync && (
                                        <p className="text-sm text-gray-500">
                                            Dernière synchronisation : {format(new Date(notionConfig.lastSync), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                                        </p>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Sélection de la base de données */}
                    {isConnected && (
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2">
                                        <Database className="h-5 w-5" />
                                        Base de données
                                    </CardTitle>
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => loadDatabases()}
                                        disabled={isLoadingDatabases}
                                    >
                                        {isLoadingDatabases ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <RefreshCw className="h-4 w-4 mr-2" />
                                        )}
                                        Actualiser
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {isLoadingDatabases ? (
                                    <div className="text-center py-6">
                                        <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin text-gray-400" />
                                        <p className="text-gray-500">Chargement des bases de données...</p>
                                    </div>
                                ) : databases.length === 0 ? (
                                    <div className="text-center py-6 text-gray-500">
                                        <Database className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                        <p className="font-medium mb-1">Aucune base de données trouvée</p>
                                        <p className="text-sm">Partagez une base avec votre intégration Notion</p>
                                        {error && (
                                            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-left max-w-md mx-auto">
                                                <div className="flex gap-2">
                                                    <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                                                    <p className="text-xs text-red-700">{error}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {databases.map((db) => (
                                            <button
                                                key={db.id}
                                                onClick={() => selectDatabase(db)}
                                                className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                                                    selectedDatabase?.id === db.id
                                                        ? 'border-black bg-gray-50'
                                                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="text-2xl">{db.icon}</span>
                                                    <span className="font-medium">{db.title}</span>
                                                </div>
                                                {selectedDatabase?.id === db.id && (
                                                    <Check className="h-5 w-5 text-green-600" />
                                                )}
                                            </button>
                                        ))}
                                        
                                        <Button variant="outline" className="w-full mt-3">
                                            <Plus className="h-4 w-4 mr-2" />
                                            Créer une nouvelle base
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Paramètres de synchronisation */}
                    {isConnected && selectedDatabase && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Settings className="h-5 w-5" />
                                    Paramètres de synchronisation
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium">Synchronisation automatique</p>
                                        <p className="text-sm text-gray-500">
                                            Synchroniser automatiquement toutes les {notionConfig.syncInterval} minutes
                                        </p>
                                    </div>
                                    <Switch
                                        checked={notionConfig.autoSync}
                                        onCheckedChange={handleAutoSyncToggle}
                                    />
                                </div>
                                
                                <div className="border-t pt-4">
                                    <Label className="text-sm font-medium">Mapping des champs</Label>
                                    <div className="mt-3 space-y-2">
                                        <div className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                                            <span className="text-gray-600">Titre</span>
                                            <ChevronRight className="h-4 w-4 text-gray-400" />
                                            <span className="font-medium">Name (Title)</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                                            <span className="text-gray-600">Contenu</span>
                                            <ChevronRight className="h-4 w-4 text-gray-400" />
                                            <span className="font-medium">Content (Text)</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                                            <span className="text-gray-600">Statut</span>
                                            <ChevronRight className="h-4 w-4 text-gray-400" />
                                            <span className="font-medium">Status (Select)</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                                            <span className="text-gray-600">Date de publication</span>
                                            <ChevronRight className="h-4 w-4 text-gray-400" />
                                            <span className="font-medium">Publish Date (Date)</span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Statistiques de synchronisation */}
                    {isConnected && selectedDatabase && (
                        <div className="grid grid-cols-4 gap-4">
                            <Card>
                                <CardContent className="p-4 text-center">
                                    <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                    <p className="text-2xl font-bold">{syncStats.totalPosts}</p>
                                    <p className="text-sm text-gray-500">Total posts</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4 text-center">
                                    <FileText className="h-8 w-8 mx-auto mb-2 text-amber-500" />
                                    <p className="text-2xl font-bold">{syncStats.drafts}</p>
                                    <p className="text-sm text-gray-500">Brouillons</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4 text-center">
                                    <Clock className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                                    <p className="text-2xl font-bold">{syncStats.scheduled}</p>
                                    <p className="text-sm text-gray-500">Programmés</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4 text-center">
                                    <Check className="h-8 w-8 mx-auto mb-2 text-green-500" />
                                    <p className="text-2xl font-bold">{syncStats.published}</p>
                                    <p className="text-sm text-gray-500">Publiés</p>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Posts synchronisés */}
                    {isConnected && selectedDatabase && syncedPosts.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        <FileText className="h-5 w-5" />
                                        Posts synchronisés
                                    </span>
                                    <Button variant="outline" size="sm" asChild>
                                        <a href="/allposts">
                                            Voir tous les posts
                                            <ExternalLink className="h-4 w-4 ml-2" />
                                        </a>
                                    </Button>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {syncedPosts.map((post, index) => (
                                        <div 
                                            key={post.id || index}
                                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium truncate">
                                                    {post.content?.substring(0, 60) || 'Sans titre'}...
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    {post.createdAt ? format(new Date(post.createdAt), "d MMM yyyy", { locale: fr }) : 'Date inconnue'}
                                                </p>
                                            </div>
                                            <Badge variant={
                                                post.status === 'draft' ? 'secondary' :
                                                post.status === 'scheduled' ? 'outline' : 'default'
                                            }>
                                                {post.status === 'draft' ? 'Brouillon' :
                                                 post.status === 'scheduled' ? 'Programmé' : 'Publié'}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Footer */}
                <div className="text-center py-4 text-xs text-gray-400 border-t bg-gray-50 mt-6">
                    S-PostBO v2.4.0 • Powered by S-Post Extension
                </div>
            </div>
        </div>
    );
}


