import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
    RefreshCw, Database, Link2, Check, X, AlertCircle, 
    FileText, Calendar, Clock, Loader2, ExternalLink,
    Settings, ChevronRight, Trash2, Plus, Info, MapPin,
    Search, Filter, ChevronLeft, ChevronDown, Edit2
} from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { format, formatDistanceToNow, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import Sidebar from '../components/dashboard/Sidebar';
import { notionApiCall, checkExtensionAvailable, publishPostNow } from '@/utils/spost-api';
import NotionPostEditor from '../components/NotionPostEditor';

// Logo Notion SVG
const NotionLogo = ({ className }) => (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6.017 4.313l55.333 -4.087c6.797 -0.583 8.543 -0.19 12.817 2.917l17.663 12.443c2.913 2.14 3.883 2.723 3.883 5.053v68.243c0 4.277 -1.553 6.807 -6.99 7.193L24.467 99.967c-4.08 0.193 -6.023 -0.39 -8.16 -3.113L3.3 79.94c-2.333 -3.113 -3.3 -5.443 -3.3 -8.167V11.113c0 -3.497 1.553 -6.413 6.017 -6.8z" fill="#fff"/>
        <path fillRule="evenodd" clipRule="evenodd" d="M61.35 0.227l-55.333 4.087C1.553 4.7 0 7.617 0 11.113v60.66c0 2.723 0.967 5.053 3.3 8.167l13.007 16.913c2.137 2.723 4.08 3.307 8.16 3.113l64.257 -3.89c5.433 -0.387 6.99 -2.917 6.99 -7.193V20.64c0 -2.21 -0.873 -2.847 -3.443 -4.733L74.167 3.143c-4.273 -3.107 -6.02 -3.5 -12.817 -2.917zM25.92 19.523c-5.247 0.353 -6.437 0.433 -9.417 -1.99L8.927 11.507c-0.77 -0.78 -0.383 -1.753 1.557 -1.947l53.193 -3.887c4.467 -0.39 6.793 1.167 8.54 2.527l9.123 6.61c0.39 0.197 1.36 1.36 0.193 1.36l-54.933 3.307 -0.68 0.047zM19.803 88.3V30.367c0 -2.53 0.777 -3.697 3.103 -3.893L86 22.78c2.14 -0.193 3.107 1.167 3.107 3.693v57.547c0 2.53 -0.39 4.67 -3.883 4.863l-60.377 3.5c-3.493 0.193 -5.043 -0.97 -5.043 -4.083zm59.6 -54.827c0.387 1.75 0 3.5 -1.75 3.7l-2.91 0.577v42.773c-2.527 1.36 -4.853 2.137 -6.797 2.137 -3.107 0 -3.883 -0.973 -6.21 -3.887l-19.03 -29.94v28.967l6.02 1.363s0 3.5 -4.857 3.5l-13.39 0.777c-0.39 -0.78 0 -2.723 1.357 -3.11l3.497 -0.97v-38.3L30.48 40.667c-0.39 -1.75 0.58 -4.277 3.3 -4.473l14.367 -0.967 19.8 30.327v-26.83l-5.047 -0.58c-0.39 -2.143 1.163 -3.7 3.103 -3.89l13.4 -0.78z" fill="#000"/>
    </svg>
);

export default function NotionSync() {
    const navigate = useNavigate();
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingPosts, setIsLoadingPosts] = useState(false);
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
    const [syncedPosts, setSyncedPosts] = useState([]);
    const [allNotionPosts, setAllNotionPosts] = useState([]); // Tous les posts pour la liste complète
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('date');
    const [sortOrder, setSortOrder] = useState('desc');
    const [periodFilter, setPeriodFilter] = useState('all'); // all, week, month, quarter, year
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [statusFilter, setStatusFilter] = useState('all'); // all, draft, scheduled, published
    const [syncStats, setSyncStats] = useState({
        totalPosts: 0,
        drafts: 0,
        scheduled: 0,
        published: 0,
    });
    const [error, setError] = useState(null);
    const [editingPost, setEditingPost] = useState(null);
    const [profile, setProfile] = useState(null);
    const [isTestPublishing, setIsTestPublishing] = useState(false);

    useEffect(() => {
        loadNotionConfig().catch(console.error);
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            // Méthode 1: Vérifier via l'API de l'extension
            const api = window.SPost || window.LinkedInPlanner;
            if (api && api.getData) {
                try {
                    const data = await api.getData();
                    if (data && data.profile) {
                        const profileData = data.profile;
                        // Le profil est déjà formaté par getLinkedInData() dans background.js
                        setProfile({
                            firstName: profileData.firstName || '',
                            lastName: profileData.lastName || '',
                            headline: profileData.headline || profileData.occupation || '',
                            publicIdentifier: profileData.publicIdentifier || '',
                            picture: profileData.picture || null,
                            name: profileData.name || (profileData.firstName && profileData.lastName 
                                ? `${profileData.firstName} ${profileData.lastName}`.trim()
                                : profileData.firstName || profileData.lastName || ''),
                            profileUrl: profileData.profileUrl || null,
                        });
                        console.log('[NotionSync] ✅ Profil LinkedIn chargé depuis l\'extension:', {
                            name: profileData.name || `${profileData.firstName} ${profileData.lastName}`.trim(),
                            hasPicture: !!profileData.picture,
                        });
                        return;
                    }
                } catch (e) {
                    console.warn('[NotionSync] Erreur API extension pour profil:', e);
                }
            }
            
            // Méthode 2: Fallback localStorage
            const profileData = localStorage.getItem('spost_linkedin_data');
            if (profileData) {
                const data = JSON.parse(profileData);
                const profile = data.profile || data;
                if (profile) {
                    setProfile({
                        firstName: profile.firstName || '',
                        lastName: profile.lastName || '',
                        headline: profile.headline || profile.occupation || '',
                        publicIdentifier: profile.publicIdentifier || '',
                        picture: profile.picture || null,
                        name: profile.name || (profile.firstName && profile.lastName 
                            ? `${profile.firstName} ${profile.lastName}`.trim()
                            : profile.firstName || profile.lastName || ''),
                        profileUrl: profile.profileUrl || null,
                    });
                    console.log('[NotionSync] ✅ Profil LinkedIn chargé depuis localStorage');
                }
            }
        } catch (e) {
            console.error('Erreur chargement profil:', e);
        }
    };

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
                    // Charger les posts Notion sauvegardés depuis localStorage
                    loadNotionPostsFromStorage();
                    // Charger le schéma de la base de données (sans bloquer)
                    setTimeout(() => {
                        loadDatabaseSchema(config.databaseId, config.accessToken).catch((err) => {
                            console.error('[NotionSync] Erreur chargement schéma au démarrage:', err);
                            // Ne pas bloquer si le schéma ne se charge pas
                        });
                        loadSyncedPosts().catch(console.error);
                    }, 1000);
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

    // Charger les posts Notion depuis localStorage
    const loadNotionPostsFromStorage = () => {
        try {
            const saved = localStorage.getItem('spost_notion_posts');
            if (saved) {
                const posts = JSON.parse(saved);
                setAllNotionPosts(posts);
                setSyncedPosts(posts.slice(0, 10)); // Pour la vue d'aperçu
                setSyncStats({
                    totalPosts: posts.length,
                    drafts: posts.filter(p => p.status === 'draft').length,
                    scheduled: posts.filter(p => p.status === 'scheduled').length,
                    published: posts.filter(p => p.status === 'published').length,
                });
            }
        } catch (e) {
            console.error('Erreur lors du chargement des posts Notion:', e);
        }
    };

    // Filtrer et trier les posts Notion
    const filteredNotionPosts = useMemo(() => {
        let result = [...allNotionPosts];
        
        // Filtrer par statut
        if (statusFilter !== 'all') {
            result = result.filter(post => post.status === statusFilter);
        }
        
        // Filtrer par période
        if (periodFilter !== 'all') {
            const now = new Date();
            const daysMap = { week: 7, month: 30, quarter: 90, year: 365 };
            const days = daysMap[periodFilter] || 0;
            const cutoffDate = subDays(now, days);
            
            result = result.filter(post => {
                if (!post.createdAt) return false;
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
                (post.content?.toLowerCase().includes(query) ||
                 post.title?.toLowerCase().includes(query))
            );
        }
        
        // Trier
        result.sort((a, b) => {
            let comparison = 0;
            
            switch (sortBy) {
                case 'date':
                    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                    comparison = dateB - dateA;
                    break;
                case 'title':
                    comparison = (a.title || '').localeCompare(b.title || '');
                    break;
                case 'status':
                    const statusOrder = { draft: 1, scheduled: 2, published: 3 };
                    comparison = (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
                    break;
                default:
                    comparison = 0;
            }
            
            return sortOrder === 'asc' ? -comparison : comparison;
        });
        
        return result;
    }, [allNotionPosts, searchQuery, sortBy, sortOrder, periodFilter, statusFilter]);

    // Pagination
    const totalPages = Math.ceil(filteredNotionPosts.length / itemsPerPage);
    const paginatedNotionPosts = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredNotionPosts.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredNotionPosts, currentPage, itemsPerPage]);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, periodFilter, statusFilter, itemsPerPage]);

    const goToPage = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    // Sauvegarder les posts Notion dans localStorage
    const saveNotionPostsToStorage = (posts) => {
        try {
            localStorage.setItem('spost_notion_posts', JSON.stringify(posts));
        } catch (e) {
            console.error('Erreur lors de la sauvegarde des posts Notion:', e);
        }
    };

    // Charger le schéma de la base de données Notion
    const loadDatabaseSchema = async (databaseId, token = null) => {
        const accessToken = token || notionConfig.accessToken;
        if (!databaseId || !accessToken) {
            console.warn('[NotionSync] Impossible de charger le schéma: databaseId ou token manquant');
            return;
        }

        setIsLoadingProperties(true);
        setError(null);

        try {
            const extensionAvailable = await checkExtensionAvailable();
            if (!extensionAvailable) {
                throw new Error('Extension S-Post non détectée. Rechargez l\'extension et actualisez la page.');
            }

            console.log('[NotionSync] Chargement du schéma de la base de données...');
            
            const response = await notionApiCall(
                `databases/${databaseId}`,
                'GET',
                null,
                accessToken
            );

            if (!response || !response.success) {
                const errorMsg = response?.error || 'Erreur lors du chargement du schéma';
                console.error('[NotionSync] Erreur API:', errorMsg);
                throw new Error(errorMsg);
            }

            const database = response.data;
            if (!database || !database.properties) {
                console.warn('[NotionSync] Base de données sans propriétés');
                setDatabaseProperties([]);
                return;
            }

            const properties = [];

            // Extraire toutes les propriétés de la base de données
            try {
                for (const [key, prop] of Object.entries(database.properties)) {
                    if (!key || !prop) continue;
                    properties.push({
                        id: key,
                        name: key,
                        type: prop.type || 'unknown',
                        options: prop.type === 'select' ? (prop.select?.options || []) : 
                                 prop.type === 'multi_select' ? (prop.multi_select?.options || []) : [],
                    });
                }
            } catch (parseError) {
                console.error('[NotionSync] Erreur lors du parsing des propriétés:', parseError);
                throw new Error('Erreur lors de l\'extraction des propriétés de la base de données');
            }

            setDatabaseProperties(properties);
            console.log(`[NotionSync] ${properties.length} propriétés détectées`);

            // Si pas de mapping sauvegardé, proposer des mappings par défaut
            try {
                const currentConfig = JSON.parse(localStorage.getItem('spost_notion_config') || '{}');
                if (!currentConfig.fieldMapping || !currentConfig.fieldMapping.title) {
                    // Chercher le champ "Post" en priorité pour le contenu
                    const postField = properties.find(p => 
                        p.name.toLowerCase() === 'post' || 
                        p.name.toLowerCase() === 'contenu' ||
                        p.name.toLowerCase() === 'content'
                    );
                    
                    const defaultMapping = {
                        title: properties.find(p => p.type === 'title')?.id || '',
                        content: postField?.id || properties.find(p => 
                            p.type === 'rich_text' || 
                            (p.type === 'title' && !properties.find(t => t.type === 'title' && t.id === p.id))
                        )?.id || '',
                        status: properties.find(p => p.type === 'select' && 
                            (p.name.toLowerCase().includes('status') || 
                             p.name.toLowerCase().includes('statut')))?.id || '',
                        publishDate: properties.find(p => p.type === 'date' && 
                            (p.name.toLowerCase().includes('date') || 
                             p.name.toLowerCase().includes('publish')))?.id || '',
                    };
                    
                    if (defaultMapping.title || defaultMapping.content) {
                        const newConfig = {
                            ...currentConfig,
                            fieldMapping: defaultMapping,
                        };
                        saveNotionConfig(newConfig);
                    }
                }
            } catch (configError) {
                console.error('[NotionSync] Erreur lors de la configuration du mapping:', configError);
                // Ne pas bloquer si le mapping par défaut échoue
            }
        } catch (error) {
            console.error('[NotionSync] Erreur lors du chargement du schéma:', error);
            const errorMessage = error.message || 'Erreur lors du chargement du schéma';
            setError(errorMessage);
            toast.error(errorMessage);
            // Ne pas vider les propriétés existantes en cas d'erreur
        } finally {
            setIsLoadingProperties(false);
        }
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

    const selectDatabase = async (db) => {
        setSelectedDatabase(db);
        const newConfig = {
            ...notionConfig,
            databaseId: db.id,
        };
        saveNotionConfig(newConfig);
        // Charger le schéma de la base de données
        await loadDatabaseSchema(db.id, newConfig.accessToken);
        // Charger les posts sauvegardés
        loadNotionPostsFromStorage();
        // Synchroniser avec Notion
        await loadSyncedPosts();
    };

    const loadSyncedPosts = async () => {
        // Récupérer uniquement les posts depuis Notion (pas depuis LinkedIn)
        if (!selectedDatabase || !notionConfig.accessToken) {
            setSyncedPosts([]);
            setSyncStats({
                totalPosts: 0,
                drafts: 0,
                scheduled: 0,
                published: 0,
            });
            return;
        }

        try {
            setIsLoadingPosts(true);
            setError(null);
            
            // Recharger le profil LinkedIn à chaque chargement
            await loadProfile();

            // Vérifier que l'extension est disponible
            const extensionAvailable = await checkExtensionAvailable();
            if (!extensionAvailable) {
                throw new Error('Extension S-Post non détectée');
            }

            // Interroger la base de données Notion pour récupérer les pages
            console.log('[NotionSync] Récupération des pages depuis Notion...');
            
            const response = await notionApiCall(
                `databases/${selectedDatabase.id}/query`,
                'POST',
                {
                    page_size: 100, // Récupérer jusqu'à 100 pages
                },
                notionConfig.accessToken
            );

            if (!response || !response.success) {
                const errorMsg = response?.error || 'Erreur lors de la récupération des pages Notion';
                throw new Error(errorMsg);
            }

            const data = response.data;
            const notionPages = data.results || [];
            const mapping = notionConfig.fieldMapping || {};

            // Transformer les pages Notion en format de posts en utilisant le mapping
            const posts = notionPages.map(page => {
                let title = 'Sans titre';
                let content = '';
                let status = 'draft';
                let publishDate = null;

                // Utiliser le mapping pour extraire les valeurs
                if (page.properties) {
                    // Titre
                    if (mapping.title && page.properties[mapping.title]) {
                        const prop = page.properties[mapping.title];
                        if (prop.type === 'title' && prop.title) {
                            title = prop.title.map(t => t.plain_text).join('');
                        }
                    }

                    // Contenu - supporter différents types
                    if (mapping.content && page.properties[mapping.content]) {
                        const prop = page.properties[mapping.content];
                        if (prop.type === 'rich_text' && prop.rich_text) {
                            content = prop.rich_text.map(t => t.plain_text || t.text?.content || '').join('');
                        } else if (prop.type === 'title' && prop.title) {
                            content = prop.title.map(t => t.plain_text || t.text?.content || '').join('');
                        } else if (prop.type === 'text' && prop.text) {
                            content = prop.text.map(t => t.plain_text || t.text?.content || '').join('');
                        }
                    }

                    // Statut
                    if (mapping.status && page.properties[mapping.status]) {
                        const prop = page.properties[mapping.status];
                        if (prop.type === 'select' && prop.select) {
                            const statusValue = prop.select.name?.toLowerCase() || '';
                            if (statusValue.includes('draft') || statusValue.includes('brouillon')) {
                                status = 'draft';
                            } else if (statusValue.includes('scheduled') || statusValue.includes('programmé')) {
                                status = 'scheduled';
                            } else if (statusValue.includes('published') || statusValue.includes('publié')) {
                                status = 'published';
                            }
                        }
                    }

                    // Date de publication
                    if (mapping.publishDate && page.properties[mapping.publishDate]) {
                        const prop = page.properties[mapping.publishDate];
                        if (prop.type === 'date' && prop.date) {
                            publishDate = prop.date.start;
                        }
                    }

                    // Si pas de mapping, essayer de détecter automatiquement
                    if (!mapping.title || !mapping.content) {
                        for (const [key, prop] of Object.entries(page.properties)) {
                            // Détecter le titre
                            if (!title && prop.type === 'title' && prop.title && prop.title.length > 0) {
                                title = prop.title.map(t => t.plain_text || t.text?.content || '').join('');
                            }
                            // Détecter le contenu - chercher "Post" en priorité
                            if (!content) {
                                const propName = key.toLowerCase();
                                if (propName === 'post' || propName === 'contenu' || propName === 'content') {
                                    if (prop.type === 'rich_text' && prop.rich_text) {
                                        content = prop.rich_text.map(t => t.plain_text || t.text?.content || '').join('');
                                    } else if (prop.type === 'title' && prop.title) {
                                        content = prop.title.map(t => t.plain_text || t.text?.content || '').join('');
                                    } else if (prop.type === 'text' && prop.text) {
                                        content = prop.text.map(t => t.plain_text || t.text?.content || '').join('');
                                    }
                                }
                            }
                            // Fallback: n'importe quel rich_text
                            if (!content && prop.type === 'rich_text' && prop.rich_text && prop.rich_text.length > 0) {
                                content = prop.rich_text.map(t => t.plain_text || t.text?.content || '').join('');
                            }
                        }
                    }
                }

                // Utiliser le titre comme contenu si pas de contenu
                if (!content && title !== 'Sans titre') {
                    content = title;
                }

                return {
                    id: page.id,
                    notionId: page.id,
                    content: content || title,
                    title: title,
                    status: status,
                    createdAt: publishDate || page.created_time || page.last_edited_time,
                    lastEdited: page.last_edited_time,
                    url: page.url,
                    source: 'notion',
                };
            });

            // Trier par date de création (plus récent en premier)
            posts.sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return dateB - dateA;
            });

            // Sauvegarder tous les posts dans localStorage
            saveNotionPostsToStorage(posts);
            
            setAllNotionPosts(posts); // Tous les posts pour la liste complète
            setSyncedPosts(posts.slice(0, 10)); // Pour la vue d'aperçu
            setSyncStats({
                totalPosts: posts.length,
                drafts: posts.filter(p => p.status === 'draft').length,
                scheduled: posts.filter(p => p.status === 'scheduled').length,
                published: posts.filter(p => p.status === 'published').length,
            });

            console.log(`[NotionSync] ${posts.length} posts récupérés depuis Notion et sauvegardés`);
        } catch (error) {
            console.error('Erreur lors du chargement des posts Notion:', error);
            setError(error.message || 'Erreur lors de la récupération des posts Notion');
            setSyncedPosts([]);
            setSyncStats({
                totalPosts: 0,
                drafts: 0,
                scheduled: 0,
                published: 0,
            });
        } finally {
            setIsLoadingPosts(false);
        }
    };

    const handleSync = async () => {
        setIsSyncing(true);
        setError(null);
        
        try {
            // Recharger le profil LinkedIn à chaque synchronisation
            await loadProfile();
            // Recharger les posts depuis Notion
            await loadSyncedPosts();
            
            const newConfig = {
                ...notionConfig,
                lastSync: new Date().toISOString(),
            };
            saveNotionConfig(newConfig);
            
            toast.success('Synchronisation terminée');
        } catch (error) {
            console.error('Erreur lors de la synchronisation:', error);
            toast.error(error.message || 'Erreur lors de la synchronisation');
        } finally {
            setIsSyncing(false);
        }
    };

    const handleAutoSyncToggle = (checked) => {
        const newConfig = {
            ...notionConfig,
            autoSync: checked,
        };
        saveNotionConfig(newConfig);
    };

    // Mettre à jour un post dans Notion
    const updateNotionPost = async (updatedPost) => {
        console.log('[NotionSync] 💾 updateNotionPost appelé avec:', updatedPost);
        
        if (!selectedDatabase || !notionConfig.accessToken) {
            const errorMsg = !selectedDatabase 
                ? 'Base de données Notion non sélectionnée' 
                : 'Token Notion non configuré';
            console.error('[NotionSync] ❌', errorMsg);
            throw new Error(errorMsg);
        }

        try {
            console.log('[NotionSync] 📤 Mise à jour via API Notion...');
            console.log('[NotionSync] Page ID:', updatedPost.id);
            console.log('[NotionSync] Field mapping:', notionConfig.fieldMapping);
            
            // Construire les propriétés à mettre à jour
            const properties = {};
            
            if (notionConfig.fieldMapping?.title) {
                properties[notionConfig.fieldMapping.title] = {
                    title: [
                        {
                            text: {
                                content: updatedPost.title || updatedPost.content?.split('\n')[0]?.substring(0, 100) || 'Sans titre'
                            }
                        }
                    ]
                };
            }
            
            if (notionConfig.fieldMapping?.content) {
                properties[notionConfig.fieldMapping.content] = {
                    rich_text: [
                        {
                            text: {
                                content: updatedPost.content || ''
                            }
                        }
                    ]
                };
            }
            
            if (notionConfig.fieldMapping?.status && updatedPost.status) {
                const statusName = updatedPost.status === 'draft' ? 'Draft' : 
                                  updatedPost.status === 'scheduled' ? 'Scheduled' : 'Published';
                properties[notionConfig.fieldMapping.status] = {
                    select: {
                        name: statusName
                    }
                };
            }
            
            console.log('[NotionSync] 📤 Propriétés à mettre à jour:', properties);
            
            // Mettre à jour via l'API Notion
            const response = await notionApiCall(
                `pages/${updatedPost.id}`,
                'PATCH',
                {
                    properties: properties
                },
                notionConfig.accessToken
            );

            console.log('[NotionSync] 📥 Réponse Notion:', response);

            if (!response || !response.success) {
                const errorMsg = response?.error || response?.message || 'Erreur lors de la mise à jour';
                console.error('[NotionSync] ❌ Erreur réponse:', errorMsg);
                throw new Error(errorMsg);
            }

            // Mettre à jour dans localStorage
            try {
                const savedPosts = JSON.parse(localStorage.getItem('spost_notion_posts') || '[]');
                const index = savedPosts.findIndex(p => p.id === updatedPost.id);
                if (index !== -1) {
                    savedPosts[index] = updatedPost;
                    localStorage.setItem('spost_notion_posts', JSON.stringify(savedPosts));
                    setAllNotionPosts([...savedPosts]);
                    console.log('[NotionSync] ✅ Post mis à jour dans localStorage');
                } else {
                    console.warn('[NotionSync] ⚠️ Post non trouvé dans localStorage, ajout...');
                    savedPosts.push(updatedPost);
                    localStorage.setItem('spost_notion_posts', JSON.stringify(savedPosts));
                    setAllNotionPosts([...savedPosts]);
                }
            } catch (localError) {
                console.error('[NotionSync] ❌ Erreur sauvegarde localStorage:', localError);
                // Ne pas bloquer si localStorage échoue
            }

            console.log('[NotionSync] ✅ Mise à jour Notion réussie');
            return response;
        } catch (error) {
            console.error('[NotionSync] ❌ Erreur mise à jour Notion:', error);
            console.error('[NotionSync] Stack:', error.stack);
            throw error;
        }
    };

    const handlePostSave = (updatedPost) => {
        // Mettre à jour la liste locale
        const savedPosts = JSON.parse(localStorage.getItem('spost_notion_posts') || '[]');
        const index = savedPosts.findIndex(p => p.id === updatedPost.id);
        if (index !== -1) {
            savedPosts[index] = updatedPost;
            localStorage.setItem('spost_notion_posts', JSON.stringify(savedPosts));
            setAllNotionPosts([...savedPosts]);
            loadNotionPostsFromStorage();
        }
        setEditingPost(null);
    };

    // Test de publication avec un texte simple
    const handleTestPublish = async () => {
        setIsTestPublishing(true);
        try {
            console.log('[NotionSync] 🧪 TEST: Publication avec "Lorem ipsum"');
            
            const testPost = {
                id: 'test_' + Date.now(),
                title: 'Test',
                content: 'Lorem ipsum',
                category: 'other',
                createdAt: new Date().toISOString(),
            };

            console.log('[NotionSync] 🧪 TEST: Post créé:', testPost);
            
            const result = await publishPostNow(testPost);
            
            console.log('[NotionSync] 🧪 TEST: Résultat:', result);
            
            if (result.success) {
                toast.success('✅ Test réussi ! Le texte "Lorem ipsum" a été envoyé pour publication.');
            } else {
                toast.error(`❌ Test échoué: ${result.error || 'Erreur inconnue'}`);
            }
        } catch (error) {
            console.error('[NotionSync] 🧪 TEST: Erreur:', error);
            toast.error(`❌ Erreur test: ${error.message || 'Erreur inconnue'}`);
        }
        setIsTestPublishing(false);
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
                        <div className="flex gap-2">
                            <Button 
                                onClick={handleTestPublish} 
                                disabled={isTestPublishing}
                                variant="outline"
                                className="border-orange-500 text-orange-600 hover:bg-orange-50"
                            >
                                {isTestPublishing ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <span className="mr-2">🧪</span>
                                )}
                                Test Publication
                            </Button>
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
                        </div>
                    )}
                </div>

                {!isConnected || !selectedDatabase ? (
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-center py-8">
                                <NotionLogo className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                <h3 className="text-lg font-semibold mb-2 text-gray-700">
                                    Configuration requise
                                </h3>
                                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                                    Pour utiliser la synchronisation Notion, veuillez configurer votre connexion dans les paramètres.
                                </p>
                                <Button 
                                    onClick={() => navigate('/settings')}
                                    className="bg-black hover:bg-gray-800"
                                >
                                    <Settings className="h-4 w-4 mr-2" />
                                    Aller aux paramètres
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-6">
                        {/* Notifications pour configuration manquante */}
                        {(!notionConfig.fieldMapping || !notionConfig.fieldMapping.content) && (
                            <Alert className="border-amber-500 bg-amber-50">
                                <AlertCircle className="h-4 w-4 text-amber-600" />
                                <AlertTitle className="text-amber-900">Configuration du mapping des champs requise</AlertTitle>
                                <AlertDescription className="text-amber-800">
                                    Le mapping des champs n'est pas configuré. Veuillez configurer le mapping des champs pour synchroniser vos posts Notion.
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="ml-4 mt-2"
                                        onClick={() => navigate('/settings?tab=integration')}
                                    >
                                        <MapPin className="h-4 w-4 mr-2" />
                                        Configurer le mapping
                                    </Button>
                                </AlertDescription>
                            </Alert>
                        )}
                        
                        {/* Statistiques de synchronisation */}
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

                        {/* Posts synchronisés avec filtres et pagination */}
                        <Card>
                            <CardContent className="p-0">
                                {/* Barre de recherche et filtres */}
                                <div className="border-b px-6 py-4 bg-gray-50">
                                    <div className="flex flex-wrap items-center gap-4">
                                        {/* Champ de recherche */}
                                        <div className="relative flex-1 min-w-[200px] max-w-md">
                                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <Input
                                                type="text"
                                                placeholder="Rechercher un article..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="pl-10 bg-white border-gray-200"
                                            />
                                            {searchQuery && (
                                                <button 
                                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                    onClick={() => setSearchQuery('')}
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                        
                                        {/* Filtre par statut */}
                                        <div className="flex items-center gap-2">
                                            <Filter className="h-4 w-4 text-gray-500" />
                                            <select
                                                value={statusFilter}
                                                onChange={(e) => setStatusFilter(e.target.value)}
                                                className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="all">Tous les statuts</option>
                                                <option value="draft">Brouillons</option>
                                                <option value="scheduled">Programmés</option>
                                                <option value="published">Publiés</option>
                                            </select>
                                        </div>
                                        
                                        {/* Filtre par période */}
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-gray-500" />
                                            <select
                                                value={periodFilter}
                                                onChange={(e) => setPeriodFilter(e.target.value)}
                                                className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="all">Toutes les périodes</option>
                                                <option value="week">7 derniers jours</option>
                                                <option value="month">30 derniers jours</option>
                                                <option value="quarter">90 derniers jours</option>
                                                <option value="year">Cette année</option>
                                            </select>
                                        </div>
                                        
                                        {/* Tri */}
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={sortBy}
                                                onChange={(e) => setSortBy(e.target.value)}
                                                className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="date">Date</option>
                                                <option value="title">Titre</option>
                                                <option value="status">Statut</option>
                                            </select>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                                                className="px-2"
                                            >
                                                <ChevronDown className={`h-4 w-4 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                                            </Button>
                                        </div>
                                        
                                        {/* Sélecteur d'éléments par page */}
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-gray-500">Afficher</span>
                                            <select
                                                value={itemsPerPage}
                                                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                                className="border border-gray-200 rounded-lg px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value={10}>10</option>
                                                <option value={25}>25</option>
                                                <option value={50}>50</option>
                                                <option value={100}>100</option>
                                            </select>
                                        </div>
                                        
                                        {/* Compteur de résultats */}
                                        <div className="text-sm text-gray-500 ml-auto">
                                            {filteredNotionPosts.length} article{filteredNotionPosts.length > 1 ? 's' : ''}
                                            {(searchQuery || periodFilter !== 'all' || statusFilter !== 'all') && ` sur ${allNotionPosts.length}`}
                                        </div>
                                        
                                    </div>
                                </div>
                                
                                {/* Liste des posts */}
                                <div className="p-6">
                                    {isLoadingPosts ? (
                                        <div className="text-center py-12">
                                            <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin text-gray-400" />
                                            <p className="text-gray-500">Chargement des posts depuis Notion...</p>
                                        </div>
                                    ) : allNotionPosts.length === 0 ? (
                                        <div className="text-center py-12 text-gray-500">
                                            <FileText className="h-16 w-16 mx-auto mb-4 opacity-30" />
                                            <p className="font-medium mb-1 text-lg">Aucun post trouvé dans Notion</p>
                                            <p className="text-sm">Les posts affichés ici proviennent uniquement de votre base Notion</p>
                                        </div>
                                    ) : filteredNotionPosts.length === 0 ? (
                                        <div className="text-center py-12 text-gray-500">
                                            <FileText className="h-16 w-16 mx-auto mb-4 opacity-30" />
                                            <p className="font-medium mb-1 text-lg">Aucun résultat</p>
                                            <p className="text-sm">Aucun article ne correspond à vos critères de recherche</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="space-y-3">
                                                {paginatedNotionPosts.map((post, index) => (
                                                    <div 
                                                        key={post.id || index}
                                                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                                                    >
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium mb-1">
                                                                {post.title || 'Sans titre'}
                                                            </p>
                                                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                                                {post.createdAt && (
                                                                    <span className="flex items-center gap-1">
                                                                        <Calendar className="h-3 w-3" />
                                                                        {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: fr })}
                                                                    </span>
                                                                )}
                                                                {post.lastEdited && (
                                                                    <span className="flex items-center gap-1">
                                                                        <Clock className="h-3 w-3" />
                                                                        Modifié {formatDistanceToNow(new Date(post.lastEdited), { addSuffix: true, locale: fr })}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3 ml-4">
                                                            <Button 
                                                                variant="outline" 
                                                                size="sm"
                                                                onClick={() => setEditingPost(post)}
                                                            >
                                                                <Edit2 className="h-4 w-4 mr-2" />
                                                                Éditer
                                                            </Button>
                                                            <Badge variant={
                                                                post.status === 'draft' ? 'secondary' :
                                                                post.status === 'scheduled' ? 'outline' : 'default'
                                                            }>
                                                                {post.status === 'draft' ? 'Brouillon' :
                                                                 post.status === 'scheduled' ? 'Programmé' : 'Publié'}
                                                            </Badge>
                                                            {post.url && (
                                                                <Button variant="ghost" size="sm" asChild>
                                                                    <a href={post.url} target="_blank" rel="noopener noreferrer">
                                                                        <ExternalLink className="h-4 w-4" />
                                                                    </a>
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            
                                            {/* Pagination */}
                                            {totalPages > 1 && (
                                                <div className="mt-6 flex items-center justify-between border-t pt-4">
                                                    <div className="text-sm text-gray-500">
                                                        Affichage {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredNotionPosts.length)} sur {filteredNotionPosts.length} articles
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => goToPage(currentPage - 1)}
                                                            disabled={currentPage === 1}
                                                        >
                                                            <ChevronLeft className="h-4 w-4" />
                                                        </Button>
                                                        
                                                        {/* Pages */}
                                                        <div className="flex items-center gap-1">
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
                                                                ))}
                                                            
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
                                                        
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => goToPage(currentPage + 1)}
                                                            disabled={currentPage === totalPages}
                                                        >
                                                            <ChevronRight className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Footer */}
                <div className="text-center py-4 text-xs text-gray-400 border-t bg-gray-50 mt-6">
                    S-PostBO v2.4.0 • Extension S-Post v2.4.0
                </div>
            </div>

            {/* Éditeur de post Notion */}
            {editingPost && (
                <NotionPostEditor
                    notionPost={editingPost}
                    profile={profile}
                    onClose={() => setEditingPost(null)}
                    onSave={handlePostSave}
                    onUpdateNotion={updateNotionPost}
                />
            )}
        </div>
    );
}


