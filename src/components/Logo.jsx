import React from 'react';
import { APP_VERSION } from '../config/version';

export default function Logo({ showVersion = true, className = '', dark = false }) {
    const bgColor = dark ? 'bg-gray-800' : 'bg-white';
    const textColor = dark ? 'text-white' : 'text-gray-900';
    const iconColor = dark ? 'white' : '#1f2937';
    
    return (
        <div className={`flex items-center gap-3 ${className}`}>
            {/* Icône cerveau + circuits */}
            <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                {/* Cerveau (côté gauche avec gyri et sulci) */}
                <path 
                    d="M15 25 Q20 15 30 20 Q35 25 40 23 Q45 20 50 23 Q55 25 60 20 Q65 15 70 20 Q75 25 75 35 Q75 45 70 50 Q65 55 60 53 Q55 50 50 53 Q45 55 40 53 Q35 50 30 53 Q25 55 20 50 Q15 45 15 35 Z" 
                    fill={iconColor} 
                    stroke={iconColor} 
                    strokeWidth="2"
                />
                {/* Détails du cerveau (gyri) */}
                <path d="M25 30 Q30 28 35 30" stroke={iconColor} strokeWidth="1.5" fill="none"/>
                <path d="M25 40 Q30 38 35 40" stroke={iconColor} strokeWidth="1.5" fill="none"/>
                <path d="M25 50 Q30 48 35 50" stroke={iconColor} strokeWidth="1.5" fill="none"/>
                
                {/* Lignes de circuit (5 lignes horizontales) */}
                <line x1="70" y1="25" x2="90" y2="15" stroke={iconColor} strokeWidth="3" strokeLinecap="round"/>
                <line x1="70" y1="35" x2="90" y2="35" stroke={iconColor} strokeWidth="3" strokeLinecap="round"/>
                <line x1="70" y1="45" x2="90" y2="55" stroke={iconColor} strokeWidth="3" strokeLinecap="round"/>
                <line x1="70" y1="55" x2="90" y2="65" stroke={iconColor} strokeWidth="3" strokeLinecap="round"/>
                <line x1="70" y1="65" x2="90" y2="75" stroke={iconColor} strokeWidth="3" strokeLinecap="round"/>
                
                {/* Points de connexion */}
                <circle cx="90" cy="15" r="4" fill={iconColor}/>
                <circle cx="90" cy="35" r="4" fill={iconColor}/>
                <circle cx="90" cy="55" r="4" fill={iconColor}/>
                <circle cx="90" cy="65" r="4" fill={iconColor}/>
                <circle cx="90" cy="75" r="4" fill={iconColor}/>
            </svg>
            
            {/* Texte S-POST-AI avec logo LinkedIn dans le "in" */}
            <div className="flex items-center gap-1">
                <span className={`text-xl font-bold ${textColor} tracking-tight`}>S-POST-A</span>
                <svg width="22" height="22" viewBox="0 0 24 24" className="inline-block" fill="#0077B5">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
                </svg>
            </div>
            
            {/* Sous-titre */}
            <span className={`text-xs ${dark ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider hidden sm:inline`}>
                LinkedIn Management Plugin
            </span>
            
            {/* Version */}
            {showVersion && (
                <span className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-500'} ml-2`}>v{APP_VERSION}</span>
            )}
        </div>
    );
}

