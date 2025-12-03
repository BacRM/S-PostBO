import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Linkedin, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function LinkedInConnect({ user, onConnected }) {
    const [isConnecting, setIsConnecting] = useState(false);

    const [hasProcessedCode, setHasProcessedCode] = useState(false);

    useEffect(() => {
        // Check if we have a code in the URL (OAuth callback)
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        
        if (code && !hasProcessedCode && !isConnecting) {
            setHasProcessedCode(true);
            handleOAuthCallback(code);
        }
    }, [hasProcessedCode, isConnecting]);

    const handleOAuthCallback = async (code) => {
        setIsConnecting(true);
        try {
            // Utiliser l'URL de production fixe
            const redirect_uri = 'http://localhost:5173';
            const response = await base44.functions.invoke('linkedinAuth', {
                action: 'exchangeCode',
                code,
                redirect_uri
            });

            if (response.data.success) {
                toast.success(`Connecté en tant que ${response.data.name}`);
                // Clean URL
                window.history.replaceState({}, document.title, window.location.pathname);
                if (onConnected) onConnected();
            } else {
                toast.error(response.data.error || 'Erreur de connexion');
            }
        } catch (error) {
            toast.error('Erreur lors de la connexion LinkedIn');
        }
        setIsConnecting(false);
    };

    const handleConnect = async () => {
        setIsConnecting(true);
        try {
            // Utiliser l'URL de production fixe
            const redirect_uri = 'http://localhost:5173';
            console.log('Redirect URI:', redirect_uri);
            const response = await base44.functions.invoke('linkedinAuth', {
                action: 'getAuthUrl',
                redirect_uri
            });
            console.log('Response:', response);

            if (response.data?.authUrl) {
                // Rediriger dans la même fenêtre
                window.location.href = response.data.authUrl;
            } else {
                toast.error(response.data?.error || 'Erreur lors de la récupération de l\'URL');
                setIsConnecting(false);
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error('Erreur lors de la connexion: ' + (error.message || 'Erreur inconnue'));
            setIsConnecting(false);
        }
    };

    const isConnected = user?.linkedin_access_token && 
        (!user.linkedin_token_expires || Date.now() < user.linkedin_token_expires);

    if (isConnected) {
        return (
            <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4 flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <div>
                        <p className="font-medium text-green-800">LinkedIn connecté</p>
                        <p className="text-sm text-green-600">{user.linkedin_name}</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-medium text-blue-800">Connectez votre LinkedIn</p>
                        <p className="text-sm text-blue-600">Pour publier directement vos posts</p>
                    </div>
                    <Button 
                        onClick={handleConnect}
                        disabled={isConnecting}
                        className="bg-[#0077B5] hover:bg-[#006097]"
                    >
                        {isConnecting ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                            <Linkedin className="h-4 w-4 mr-2" />
                        )}
                        Connecter
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}