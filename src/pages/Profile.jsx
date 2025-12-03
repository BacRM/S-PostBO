import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { User, Linkedin, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Sidebar from '../components/dashboard/Sidebar';
import LinkedInConnect from '../components/LinkedInConnect';

export default function Profile() {
    const [user, setUser] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        bio: '',
        website: '',
        company: '',
        position: '',
    });

    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        const userData = await base44.auth.me();
        setUser(userData);
        setFormData({
            bio: userData.bio || '',
            website: userData.website || '',
            company: userData.company || '',
            position: userData.position || '',
        });
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await base44.auth.updateMe(formData);
            toast.success('Profil mis à jour !');
            loadUser();
        } catch (error) {
            toast.error('Erreur lors de la sauvegarde');
        }
        setIsSaving(false);
    };

    const isLinkedInConnected = user?.linkedin_access_token && 
        (!user.linkedin_token_expires || Date.now() < user.linkedin_token_expires);

    return (
        <div className="flex min-h-screen bg-gray-100">
            <Sidebar user={user} activePage="profile" />
            <div className="flex-1 p-6">
                <h1 className="text-2xl font-bold mb-6">Mon profil</h1>

                <div className="grid gap-6 max-w-2xl">
                    {/* User Info */}
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
                                    <p className="text-xl font-semibold">{user?.full_name}</p>
                                    <p className="text-gray-500">{user?.email}</p>
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

                    {/* LinkedIn Connection */}
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
                                        Connecté en tant que : <strong>{user.linkedin_name}</strong>
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Token expire le : {new Date(user.linkedin_token_expires).toLocaleDateString('fr-FR')}
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Footer */}
                <div className="text-center py-2 text-xs text-gray-400 border-t bg-gray-50 mt-6">
                    S-PostBO v2.4.0 • Powered by S-Post Extension
                </div>
            </div>
        </div>
    );
}