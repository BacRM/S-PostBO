import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { 
    User, FileText, Calendar, 
    BarChart3, Linkedin, ExternalLink,
    RefreshCw, Database, Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_VERSION } from "@/config/version";

// Icône Notion simplifiée
const NotionIcon = ({ className }) => (
    <svg className={className} viewBox="0 0 100 100" fill="currentColor">
        <path d="M6.017 4.313l55.333 -4.087c6.797 -0.583 8.543 -0.19 12.817 2.917l17.663 12.443c2.913 2.14 3.883 2.723 3.883 5.053v68.243c0 4.277 -1.553 6.807 -6.99 7.193L24.467 99.967c-4.08 0.193 -6.023 -0.39 -8.16 -3.113L3.3 79.94c-2.333 -3.113 -3.3 -5.443 -3.3 -8.167V11.113c0 -3.497 1.553 -6.413 6.017 -6.8z"/>
    </svg>
);

const menuItems = [
    { icon: BarChart3, label: 'Mes Stats', path: '/stats', key: 'stats' },
    { icon: FileText, label: 'Analyse des Posts', path: '/allposts', key: 'allposts' },
    { icon: Plus, label: 'Créer un Post', path: '/create-post', key: 'create-post' },
    { icon: Calendar, label: 'Ma Programmation', path: '/calendar', key: 'calendar' },
    { icon: Database, label: 'Synch Notion', path: '/notion', key: 'notion' },
];

export default function Sidebar({ activePage }) {
    const location = useLocation();
    const [profile, setProfile] = useState(null);
    
    useEffect(() => {
        // Charger le profil depuis localStorage
        const data = localStorage.getItem('spost_linkedin_data');
        if (data) {
            try {
                const parsed = JSON.parse(data);
                setProfile(parsed.profile);
            } catch (e) {}
        }
    }, []);
    
    const currentPath = location.pathname.toLowerCase();
    
    return (
        <div className="w-64 bg-white border-r min-h-screen flex flex-col">
            {/* Logo S-POST-AI */}
            <div className="p-1 border-b bg-gray-50 flex items-center justify-center">
                <img 
                    src="/images/spost-logo.png" 
                    alt="S-POST-AI" 
                    className="w-full h-auto max-h-20 object-contain"
                    onError={(e) => {
                        e.target.style.display = 'none';
                    }}
                />
            </div>
            
            {/* User Header - Lien vers paramètres */}
            <Link to="/settings" className="block p-4 border-b hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
                        {profile?.firstName?.charAt(0) || 'S'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">
                            {profile ? `${profile.firstName} ${profile.lastName}` : 'S-Post'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                            {profile?.occupation?.substring(0, 30) || 'Back Office'}
                        </p>
                    </div>
                </div>
            </Link>

            {/* Menu */}
            <nav className="flex-1 p-3 overflow-y-auto">
                <div className="space-y-1">
                    {menuItems.map((item) => {
                        const isActive = currentPath === item.path || 
                            (item.path === '/' && currentPath === '/home') ||
                            currentPath.includes(item.key);
                        
                        return (
                            <Link key={item.key} to={item.path}>
                                <Button
                                    variant="ghost"
                                    className={cn(
                                        "w-full justify-start gap-3",
                                        isActive && "bg-blue-600 text-white hover:bg-blue-700 hover:text-white"
                                    )}
                                >
                                    <item.icon className="h-4 w-4" />
                                    {item.label}
                                </Button>
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* LinkedIn Status */}
            <div className="p-4 border-t bg-gray-50">
                <div className="flex items-center gap-2 mb-3">
                    <Linkedin className="h-5 w-5 text-[#0077B5]" />
                    <span className="text-sm font-medium text-gray-700">LinkedIn</span>
                    {profile && (
                        <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            Connecté
                        </span>
                    )}
                </div>
                
                {profile ? (
                    <a 
                        href={`https://www.linkedin.com/in/${profile.publicIdentifier}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                    >
                        <span className="truncate">@{profile.publicIdentifier}</span>
                        <ExternalLink className="h-3 w-3" />
                    </a>
                ) : (
                    <p className="text-xs text-gray-500">
                        Visitez LinkedIn pour synchroniser
                    </p>
                )}
                
                <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full mt-3 text-xs"
                    onClick={() => window.open('https://www.linkedin.com/in/me/recent-activity/all/', '_blank')}
                >
                    <RefreshCw className="h-3 w-3 mr-2" />
                    Synchroniser
                </Button>
            </div>

            {/* Footer avec version */}
            <div className="p-4 border-t bg-gray-50 mt-auto">
                <div className="text-center">
                    <p className="text-xs text-gray-500">
                        S-PostBO v{APP_VERSION}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                        © {new Date().getFullYear()} S-Post
                    </p>
                </div>
            </div>
        </div>
    );
}