import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
    User, Linkedin, Save, Loader2, Settings as SettingsIcon, 
    CreditCard, Database, MapPin, RefreshCw,
    Check, X, AlertCircle, Info, ExternalLink,
    Link2, ChevronRight, Plus
} from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import Sidebar from '../components/dashboard/Sidebar';
import LinkedInConnect from '../components/LinkedInConnect';
import { notionApiCall, checkExtensionAvailable } from '@/utils/spost-api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Logo Notion SVG
const NotionLogo = ({ className }) => (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6.017 4.313l55.333 -4.087c6.797 -0.583 8.543 -0.19 12.817 2.917l17.663 12.443c2.913 2.14 3.883 2.723 3.883 5.053v68.243c0 4.277 -1.553 6.807 -6.99 7.193L24.467 99.967c-4.08 0.193 -6.023 -0.39 -8.16 -3.113L3.3 79.94c-2.333 -3.113 -3.3 -5.443 -3.3 -8.167V11.113c0 -3.497 1.553 -6.413 6.017 -6.8z" fill="#fff"/>
        <path fillRule="evenodd" clipRule="evenodd" d="M61.35 0.227l-55.333 4.087C1.553 4.7 0 7.617 0 11.113v60.66c0 2.723 0.967 5.053 3.3 8.167l13.007 16.913c2.137 2.723 4.08 3.307 8.16 3.113l64.257 -3.89c5.433 -0.387 6.99 -2.917 6.99 -7.193V20.64c0 -2.21 -0.873 -2.847 -3.443 -4.733L74.167 3.143c-4.273 -3.107 -6.02 -3.5 -12.817 -2.917zM25.92 19.523c-5.247 0.353 -6.437 0.433 -9.417 -1.99L8.927 11.507c-0.77 -0.78 -0.383 -1.753 1.557 -1.947l53.193 -3.887c4.467 -0.39 6.793 1.167 8.54 2.527l9.123 6.61c0.39 0.197 1.36 1.36 0.193 1.36l-54.933 3.307 -0.68 0.047zM19.803 88.3V30.367c0 -2.53 0.777 -3.697 3.103 -3.893L86 22.78c2.14 -0.193 3.107 1.167 3.107 3.693v57.547c0 2.53 -0.39 4.67 -3.883 4.863l-60.377 3.5c-3.493 0.193 -5.043 -0.97 -5.043 -4.083zm59.6 -54.827c0.387 1.75 0 3.5 -1.75 3.7l-2.91 0.577v42.773c-2.527 1.36 -4.853 2.137 -6.797 2.137 -3.107 0 -3.883 -0.973 -6.21 -3.887l-19.03 -29.94v28.967l6.02 1.363s0 3.5 -4.857 3.5l-13.39 0.777c-0.39 -0.78 0 -2.723 1.357 -3.11l3.497 -0.97v-38.3L30.48 40.667c-0.39 -1.75 0.58 -4.277 3.3 -4.473l14.367 -0.967 19.8 30.327v-26.83l-5.047 -0.58c-0.39 -2.143 1.163 -3.7 3.103 -3.89l13.4 -0.78z" fill="#000"/>
    </svg>
);

export default function Settings() {
    const [searchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profil');
    const [user, setUser] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        bio: '',
        website: '',
        company: '',
        position: '',
    });

    // Notion Integration State
    const [isConnected, setIsConnected] = useState(false);
    const [isLoadingNotion, setIsLoadingNotion] = useState(false);
    const [isLoadingDatabases, setIsLoadingDatabases] = useState(false);
    const [notionToken, setNotionToken] = useState('');
    const [notionConfig, setNotionConfig] = useState({
        accessToken: '',
        databaseId: '',
        workspaceName: '',
        lastSync: null,
        autoSync: false,
        syncInterval: 30,
        fieldMapping: {
            title: '',
            content: '',
            status: '',
            publishDate: '',
        },
    });
    const [databases, setDatabases] = useState([]);
    const [selectedDatabase, setSelectedDatabase] = useState(null);
    const [databaseProperties, setDatabaseProperties] = useState([]);
    const [isLoadingProperties, setIsLoadingProperties] = useState(false);
    const [showMapping, setShowMapping] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadUser();
        loadNotionConfig();
    }, []);

    const loadUser = async () => {
        try {
            // Simuler le chargement du profil depuis localStorage
            const profileData = localStorage.getItem('spost_linkedin_data');
            if (profileData) {
                const data = JSON.parse(profileData);
                setUser({
                    full_name: data.profile ? `${data.profile.firstName} ${data.profile.lastName}` : 'Utilisateur',
                    email: data.profile?.email || 'user@example.com',
                    bio: '',
                    website: '',
                    company: data.profile?.company || '',
                    position: data.profile?.occupation || '',
                });
                setFormData({
                    bio: '',
                    website: '',
                    company: data.profile?.company || '',
                    position: data.profile?.occupation || '',
                });
            }
        } catch (error) {
            console.error('Erreur chargement utilisateur:', error);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Sauvegarder dans localStorage
            localStorage.setItem('spost_user_profile', JSON.stringify(formData));
            toast.success('Profil mis à jour !');
        } catch (error) {
            toast.error('Erreur lors de la sauvegarde');
        }
        setIsSaving(false);
    };

    // Notion Integration Functions
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
                    if (config.databaseId) {
                        const db = databases.find(d => d.id === config.databaseId);
                        if (db) {
                            setSelectedDatabase(db);
                        }
                    }
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

    const handleAutoSyncToggle = (checked) => {
        const newConfig = { ...notionConfig, autoSync: checked };
        saveNotionConfig(newConfig);
    };

    const loadDatabases = async (token) => {
        if (!token) return;
        setIsLoadingNotion(true);
        setIsLoadingDatabases(true);
        setError(null);
        try {
            const extensionAvailable = await checkExtensionAvailable();
            if (!extensionAvailable) {
                throw new Error('Extension S-Post non détectée');
            }
            
            const response = await notionApiCall('search', 'POST', {
                filter: {
                    property: 'object',
                    value: 'database'
                }
            }, token);
            
            if (!response || !response.success) {
                throw new Error(response?.error || 'Erreur lors de l\'appel à l\'API Notion');
            }
            
            const data = response.data;
            if (!data.results || data.results.length === 0) {
                setDatabases([]);
                return;
            }

            const dbList = data.results.map(db => {
                let title = 'Base sans titre';
                let icon = '📄';
                
                if (db.title && db.title.length > 0) {
                    title = db.title.map(t => t.plain_text || t.text?.content || '').join('');
                }
                if (db.icon) {
                    if (db.icon.type === 'emoji') {
                        icon = db.icon.emoji || '📄';
                    }
                }
                
                return {
                    id: db.id,
                    title: title,
                    icon: icon,
                };
            });

            setDatabases(dbList);
        } catch (error) {
            console.error('Erreur lors du chargement des bases de données:', error);
            setError(error.message);
        } finally {
            setIsLoadingNotion(false);
            setIsLoadingDatabases(false);
        }
    };

    const loadDatabaseSchema = async (databaseId, token) => {
        if (!databaseId || !token) return;
        setIsLoadingProperties(true);
        setError(null);
        try {
            const extensionAvailable = await checkExtensionAvailable();
            if (!extensionAvailable) {
                throw new Error('Extension S-Post non détectée');
            }
            
            const response = await notionApiCall(
                `databases/${databaseId}`,
                'GET',
                null,
                token
            );

            if (!response || !response.success) {
                throw new Error(response?.error || 'Erreur lors du chargement du schéma');
            }

            const database = response.data;
            if (!database || !database.properties) {
                setDatabaseProperties([]);
                return;
            }

            const properties = [];
            for (const [key, prop] of Object.entries(database.properties)) {
                if (!key || !prop) continue;
                properties.push({
                    id: key,
                    name: key,
                    type: prop.type || 'unknown',
                });
            }

            setDatabaseProperties(properties);
        } catch (error) {
            console.error('Erreur lors du chargement du schéma:', error);
            setError(error.message);
            toast.error(error.message);
        } finally {
            setIsLoadingProperties(false);
        }
    };

    const handleConnect = async () => {
        if (!notionToken || !notionToken.trim()) {
            toast.error('Veuillez entrer un token d\'intégration Notion');
            return;
        }

        setIsLoadingNotion(true);
        setError(null);

        try {
            const extensionAvailable = await checkExtensionAvailable();
            if (!extensionAvailable) {
                throw new Error('Extension S-Post non détectée');
            }

            await loadDatabases(notionToken);
            
            const newConfig = {
                accessToken: notionToken,
                databaseId: '',
                workspaceName: '',
                lastSync: null,
                autoSync: false,
                syncInterval: 30,
                fieldMapping: {
                    title: '',
                    content: '',
                    status: '',
                    publishDate: '',
                },
            };
            saveNotionConfig(newConfig);
            setIsConnected(true);
            toast.success('Connecté à Notion avec succès !');
        } catch (error) {
            console.error('Erreur lors de la connexion:', error);
            setError(error.message);
            toast.error('Erreur lors de la connexion: ' + error.message);
        } finally {
            setIsLoadingNotion(false);
        }
    };

    const handleDisconnect = () => {
        setIsConnected(false);
        setNotionToken('');
        setSelectedDatabase(null);
        setDatabases([]);
        setError(null);
        localStorage.removeItem('spost_notion_config');
        setNotionConfig({
            accessToken: '',
            databaseId: '',
            workspaceName: '',
            lastSync: null,
            autoSync: false,
            syncInterval: 30,
            fieldMapping: {
                title: '',
                content: '',
                status: '',
                publishDate: '',
            },
        });
        toast.success('Déconnecté de Notion');
    };

    const selectDatabase = (db) => {
        setSelectedDatabase(db);
        const newConfig = {
            ...notionConfig,
            databaseId: db.id,
            workspaceName: db.title,
        };
        saveNotionConfig(newConfig);
        loadDatabaseSchema(db.id, notionConfig.accessToken).catch(console.error);
        toast.success(`Base de données "${db.title}" sélectionnée`);
    };

    const isLinkedInConnected = user?.linkedin_access_token && 
        (!user.linkedin_token_expires || Date.now() < user.linkedin_token_expires);

    const tabs = [
        { id: 'profil', label: 'Profil', icon: User },
        { id: 'abonnement', label: 'Abonnement', icon: CreditCard },
        { id: 'integration', label: 'Intégration', icon: Database },
    ];

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar activePage="settings" />
            <div className="flex-1 p-6">
                <div className="max-w-5xl mx-auto">
                    <h1 className="text-3xl font-bold mb-2">Paramètres</h1>
                    <p className="text-gray-600 mb-6">Gérez vos préférences et intégrations</p>

                    {/* Tabs */}
                    <div className="border-b border-gray-200 mb-6">
                        <nav className="flex space-x-8">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`
                                            flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                                            ${activeTab === tab.id
                                                ? 'border-blue-600 text-blue-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                            }
                                        `}
                                    >
                                        <Icon className="h-4 w-4" />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Tab Content */}
                    <div>
                        {/* Profil Tab */}
                        {activeTab === 'profil' && (
                            <div className="space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <User className="h-5 w-5" />
                                            Informations personnelles
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                                                {user?.full_name?.charAt(0) || 'U'}
                                            </div>
                                            <div>
                                                <p className="text-xl font-semibold">{user?.full_name || 'Utilisateur'}</p>
                                                <p className="text-gray-500">{user?.email || 'user@example.com'}</p>
                                            </div>
                                        </div>

                                        <div className="grid gap-4 mt-6">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Entreprise</Label>
                                                    <Input 
                                                        value={formData.company}
                                                        onChange={(e) => setFormData({...formData, company: e.target.value})}
                                                        placeholder="Votre entreprise"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Poste</Label>
                                                    <Input 
                                                        value={formData.position}
                                                        onChange={(e) => setFormData({...formData, position: e.target.value})}
                                                        placeholder="Votre poste"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Site web</Label>
                                                <Input 
                                                    value={formData.website}
                                                    onChange={(e) => setFormData({...formData, website: e.target.value})}
                                                    placeholder="https://..."
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Bio</Label>
                                                <Textarea 
                                                    value={formData.bio}
                                                    onChange={(e) => setFormData({...formData, bio: e.target.value})}
                                                    placeholder="Parlez-nous de vous..."
                                                    className="h-24"
                                                />
                                            </div>

                                            <Button onClick={handleSave} disabled={isSaving}>
                                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                                Enregistrer
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Linkedin className="h-5 w-5 text-[#0077B5]" />
                                            Connexion LinkedIn
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <LinkedInConnect user={user} onConnected={loadUser} />
                                        
                                        {isLinkedInConnected && (
                                            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                                                <p className="text-sm text-gray-600">
                                                    Connecté en tant que : <strong>{user?.linkedin_name}</strong>
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Token expire le : {user?.linkedin_token_expires ? new Date(user.linkedin_token_expires).toLocaleDateString('fr-FR') : 'N/A'}
                                                </p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* Abonnement Tab */}
                        {activeTab === 'abonnement' && (
                            <div className="space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <CreditCard className="h-5 w-5" />
                                            Plan actuel
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
                                            <div>
                                                <h3 className="text-xl font-semibold text-gray-900">Plan Gratuit</h3>
                                                <p className="text-gray-600 mt-1">Accès aux fonctionnalités de base</p>
                                            </div>
                                            <Badge className="bg-blue-600 text-white px-4 py-2">Actif</Badge>
                                        </div>

                                        <div className="grid grid-cols-3 gap-4 mt-6">
                                            <div className="p-4 border rounded-lg">
                                                <p className="text-sm text-gray-600">Posts analysés</p>
                                                <p className="text-2xl font-bold mt-2">Illimité</p>
                                            </div>
                                            <div className="p-4 border rounded-lg">
                                                <p className="text-sm text-gray-600">Synchronisation</p>
                                                <p className="text-2xl font-bold mt-2">Automatique</p>
                                            </div>
                                            <div className="p-4 border rounded-lg">
                                                <p className="text-sm text-gray-600">Support</p>
                                                <p className="text-2xl font-bold mt-2">Communauté</p>
                                            </div>
                                        </div>

                                        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                            <div className="flex items-start gap-3">
                                                <Info className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-sm font-medium text-yellow-800">Plans premium à venir</p>
                                                    <p className="text-xs text-yellow-700 mt-1">
                                                        Des plans premium avec des fonctionnalités avancées seront bientôt disponibles.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* Intégration Tab */}
                        {activeTab === 'integration' && (
                            <div className="space-y-6">
                                {/* Connexion à Notion */}
                                {!isConnected ? (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <NotionLogo className="h-5 w-5" />
                                                Service associé à S-Post
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-gray-600 mb-6">
                                                Connectez votre compte Notion à S-Post pour synchroniser vos bases de données Notion avec vos posts LinkedIn.
                                            </p>
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label>Token d'intégration Notion</Label>
                                                    <Input
                                                        type="password"
                                                        value={notionToken}
                                                        onChange={(e) => setNotionToken(e.target.value)}
                                                        placeholder="secret_..."
                                                        className="font-mono"
                                                    />
                                                    <p className="text-xs text-gray-500">
                                                        Obtenez votre token sur{' '}
                                                        <a 
                                                            href="https://www.notion.so/my-integrations" 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="text-blue-600 hover:underline"
                                                        >
                                                            notion.so/my-integrations
                                                        </a>
                                                    </p>
                                                </div>
                                                <Button 
                                                    onClick={handleConnect} 
                                                    disabled={isLoadingNotion || !notionToken}
                                                >
                                                    {isLoadingNotion ? (
                                                        <>
                                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                            Connexion...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Link2 className="h-4 w-4 mr-2" />
                                                            Se connecter à Notion
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <div className="space-y-6">
                                                {/* 1. Connexion à Notion */}
                                                <Card>
                                                    <CardContent className="pt-6">
                                                        <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                                                    <Check className="h-5 w-5 text-green-600" />
                                                                </div>
                                                                <div>
                                                                    <p className="font-medium text-green-900">Connecté à Notion</p>
                                                                    <p className="text-sm text-green-700">Mon Workspace Notion</p>
                                                                </div>
                                                            </div>
                                                            <Button variant="outline" size="sm" onClick={handleDisconnect}>
                                                                <X className="h-4 w-4 mr-1" />
                                                                Déconnecter
                                                            </Button>
                                                        </div>
                                                        {notionConfig.lastSync && (
                                                            <p className="text-sm text-gray-500 mt-3">
                                                                Dernière synchronisation : {format(new Date(notionConfig.lastSync), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                                                            </p>
                                                        )}
                                                    </CardContent>
                                                </Card>

                                                {/* 2. Base de données */}
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
                                                                    onClick={() => loadDatabases(notionConfig.accessToken)}
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
                                                                                <Link2 className="h-4 w-4 text-gray-400" />
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

                                                {/* 3. Paramètres de synchronisation */}
                                                {isConnected && selectedDatabase && (
                                                    <Card>
                                                        <CardHeader>
                                                            <CardTitle className="flex items-center gap-2">
                                                                <SettingsIcon className="h-5 w-5" />
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
                                                                <div className="flex items-center justify-between mb-3">
                                                                    <Label className="text-sm font-medium">Mapping des champs</Label>
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={async (e) => {
                                                                            e.preventDefault();
                                                                            e.stopPropagation();
                                                                            
                                                                            if (showMapping) {
                                                                                setShowMapping(false);
                                                                                return;
                                                                            }
                                                                            
                                                                            if (!selectedDatabase || !notionConfig.accessToken) {
                                                                                toast.error('Veuillez d\'abord sélectionner une base de données');
                                                                                return;
                                                                            }
                                                                            
                                                                            if (databaseProperties.length === 0) {
                                                                                setIsLoadingProperties(true);
                                                                                setTimeout(async () => {
                                                                                    try {
                                                                                        await loadDatabaseSchema(selectedDatabase.id, notionConfig.accessToken);
                                                                                        setShowMapping(true);
                                                                                    } catch (err) {
                                                                                        console.error('[Settings] Erreur chargement schéma:', err);
                                                                                        toast.error('Erreur lors du chargement du schéma: ' + (err.message || 'Erreur inconnue'));
                                                                                    } finally {
                                                                                        setIsLoadingProperties(false);
                                                                                    }
                                                                                }, 100);
                                                                            } else {
                                                                                setShowMapping(true);
                                                                            }
                                                                        }}
                                                                        disabled={isLoadingProperties || !selectedDatabase}
                                                                    >
                                                                        {isLoadingProperties ? (
                                                                            <>
                                                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                                                Chargement...
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <MapPin className="h-4 w-4 mr-2" />
                                                                                {showMapping ? 'Masquer' : 'Configurer'}
                                                                            </>
                                                                        )}
                                                                    </Button>
                                                                </div>
                                                                
                                                                {!showMapping && (
                                                                    <div className="mt-3 space-y-2">
                                                                        {notionConfig.fieldMapping?.title && (
                                                                            <div className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                                                                                <span className="text-gray-600">Titre</span>
                                                                                <ChevronRight className="h-4 w-4 text-gray-400" />
                                                                                <span className="font-medium">
                                                                                    {databaseProperties.find(p => p.id === notionConfig.fieldMapping.title)?.name || notionConfig.fieldMapping.title}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                        {notionConfig.fieldMapping?.content && (
                                                                            <div className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                                                                                <span className="text-gray-600">Contenu</span>
                                                                                <ChevronRight className="h-4 w-4 text-gray-400" />
                                                                                <span className="font-medium">
                                                                                    {databaseProperties.find(p => p.id === notionConfig.fieldMapping.content)?.name || notionConfig.fieldMapping.content}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                        {notionConfig.fieldMapping?.status && (
                                                                            <div className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                                                                                <span className="text-gray-600">Statut</span>
                                                                                <ChevronRight className="h-4 w-4 text-gray-400" />
                                                                                <span className="font-medium">
                                                                                    {databaseProperties.find(p => p.id === notionConfig.fieldMapping.status)?.name || notionConfig.fieldMapping.status}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                        {notionConfig.fieldMapping?.publishDate && (
                                                                            <div className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                                                                                <span className="text-gray-600">Date de publication</span>
                                                                                <ChevronRight className="h-4 w-4 text-gray-400" />
                                                                                <span className="font-medium">
                                                                                    {databaseProperties.find(p => p.id === notionConfig.fieldMapping.publishDate)?.name || notionConfig.fieldMapping.publishDate}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {isLoadingProperties ? (
                                                                    <div className="text-center py-4">
                                                                        <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin text-gray-400" />
                                                                        <p className="text-xs text-gray-500">Détection des attributs...</p>
                                                                    </div>
                                                                ) : showMapping && databaseProperties.length > 0 ? (
                                                                    <div className="mt-3 space-y-3 p-4 bg-gray-50 rounded-lg">
                                                                        <div className="space-y-3">
                                                                            <div>
                                                                                <Label className="text-xs text-gray-600 mb-1 block">Titre</Label>
                                                                                <Select
                                                                                    value={notionConfig.fieldMapping?.title || '__none__'}
                                                                                    onValueChange={(value) => {
                                                                                        const newConfig = {
                                                                                            ...notionConfig,
                                                                                            fieldMapping: {
                                                                                                ...notionConfig.fieldMapping,
                                                                                                title: value === '__none__' ? '' : value,
                                                                                            },
                                                                                        };
                                                                                        saveNotionConfig(newConfig);
                                                                                    }}
                                                                                >
                                                                                    <SelectTrigger className="h-8">
                                                                                        <SelectValue placeholder="Sélectionner un champ" />
                                                                                    </SelectTrigger>
                                                                                    <SelectContent>
                                                                                        <SelectItem value="__none__">Aucun</SelectItem>
                                                                                        {databaseProperties
                                                                                            .filter(p => p.type === 'title')
                                                                                            .map(prop => (
                                                                                                <SelectItem key={prop.id} value={prop.id}>
                                                                                                    {prop.name} ({prop.type})
                                                                                                </SelectItem>
                                                                                            ))}
                                                                                    </SelectContent>
                                                                                </Select>
                                                                            </div>
                                                                            
                                                                            <div>
                                                                                <Label className="text-xs text-gray-600 mb-1 block">Contenu</Label>
                                                                                <Select
                                                                                    value={notionConfig.fieldMapping?.content || '__none__'}
                                                                                    onValueChange={(value) => {
                                                                                        const newConfig = {
                                                                                            ...notionConfig,
                                                                                            fieldMapping: {
                                                                                                ...notionConfig.fieldMapping,
                                                                                                content: value === '__none__' ? '' : value,
                                                                                            },
                                                                                        };
                                                                                        saveNotionConfig(newConfig);
                                                                                    }}
                                                                                >
                                                                                    <SelectTrigger className="h-8">
                                                                                        <SelectValue placeholder="Sélectionner un champ (ex: Post)" />
                                                                                    </SelectTrigger>
                                                                                    <SelectContent>
                                                                                        <SelectItem value="__none__">Aucun</SelectItem>
                                                                                        {databaseProperties
                                                                                            .filter(p => 
                                                                                                p.type === 'rich_text' || 
                                                                                                p.type === 'title' || 
                                                                                                p.type === 'text' ||
                                                                                                p.name.toLowerCase() === 'post' ||
                                                                                                p.name.toLowerCase() === 'contenu' ||
                                                                                                p.name.toLowerCase() === 'content'
                                                                                            )
                                                                                            .sort((a, b) => {
                                                                                                const priorityA = ['post', 'contenu', 'content'].includes(a.name.toLowerCase()) ? 0 : 1;
                                                                                                const priorityB = ['post', 'contenu', 'content'].includes(b.name.toLowerCase()) ? 0 : 1;
                                                                                                return priorityA - priorityB;
                                                                                            })
                                                                                            .map(prop => (
                                                                                                <SelectItem key={prop.id} value={prop.id}>
                                                                                                    {prop.name} ({prop.type})
                                                                                                    {['post', 'contenu', 'content'].includes(prop.name.toLowerCase()) && ' ⭐'}
                                                                                                </SelectItem>
                                                                                            ))}
                                                                                    </SelectContent>
                                                                                </Select>
                                                                                <p className="text-xs text-gray-500 mt-1">
                                                                                    💡 Mappez votre champ "Post" avec le champ "Contenu"
                                                                                </p>
                                                                            </div>
                                                                            
                                                                            <div>
                                                                                <Label className="text-xs text-gray-600 mb-1 block">Statut</Label>
                                                                                <Select
                                                                                    value={notionConfig.fieldMapping?.status || '__none__'}
                                                                                    onValueChange={(value) => {
                                                                                        const newConfig = {
                                                                                            ...notionConfig,
                                                                                            fieldMapping: {
                                                                                                ...notionConfig.fieldMapping,
                                                                                                status: value === '__none__' ? '' : value,
                                                                                            },
                                                                                        };
                                                                                        saveNotionConfig(newConfig);
                                                                                    }}
                                                                                >
                                                                                    <SelectTrigger className="h-8">
                                                                                        <SelectValue placeholder="Sélectionner un champ" />
                                                                                    </SelectTrigger>
                                                                                    <SelectContent>
                                                                                        <SelectItem value="__none__">Aucun</SelectItem>
                                                                                        {databaseProperties
                                                                                            .filter(p => p.type === 'select' || p.type === 'multi_select')
                                                                                            .map(prop => (
                                                                                                <SelectItem key={prop.id} value={prop.id}>
                                                                                                    {prop.name} ({prop.type})
                                                                                                </SelectItem>
                                                                                            ))}
                                                                                    </SelectContent>
                                                                                </Select>
                                                                            </div>
                                                                            
                                                                            <div>
                                                                                <Label className="text-xs text-gray-600 mb-1 block">Date de publication</Label>
                                                                                <Select
                                                                                    value={notionConfig.fieldMapping?.publishDate || '__none__'}
                                                                                    onValueChange={(value) => {
                                                                                        const newConfig = {
                                                                                            ...notionConfig,
                                                                                            fieldMapping: {
                                                                                                ...notionConfig.fieldMapping,
                                                                                                publishDate: value === '__none__' ? '' : value,
                                                                                            },
                                                                                        };
                                                                                        saveNotionConfig(newConfig);
                                                                                    }}
                                                                                >
                                                                                    <SelectTrigger className="h-8">
                                                                                        <SelectValue placeholder="Sélectionner un champ" />
                                                                                    </SelectTrigger>
                                                                                    <SelectContent>
                                                                                        <SelectItem value="__none__">Aucun</SelectItem>
                                                                                        {databaseProperties
                                                                                            .filter(p => p.type === 'date')
                                                                                            .map(prop => (
                                                                                                <SelectItem key={prop.id} value={prop.id}>
                                                                                                    {prop.name} ({prop.type})
                                                                                                </SelectItem>
                                                                                            ))}
                                                                                    </SelectContent>
                                                                                </Select>
                                                                            </div>
                                                                        </div>
                                                                        
                                                                        <div className="mt-4 pt-3 border-t">
                                                                            <p className="text-xs text-gray-500">
                                                                                💡 Les champs sont détectés automatiquement. Vous pouvez les modifier selon votre structure Notion.
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                ) : showMapping && databaseProperties.length === 0 && !isLoadingProperties ? (
                                                                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                                                        <p className="text-xs text-yellow-700">
                                                                            Aucune propriété détectée. Assurez-vous que votre base de données est bien partagée avec l'intégration Notion.
                                                                        </p>
                                                                    </div>
                                                                ) : null}
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                )}
                                            </div>
                                        )}

                                        {error && (
                                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                                <div className="flex gap-2">
                                                    <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                                                    <p className="text-xs text-red-700">{error}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                    </div>
                </div>
            </div>
        </div>
    );
}

