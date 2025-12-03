import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MoreVertical } from "lucide-react";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function ScheduledPosts({ posts, onEdit }) {
    const scheduledPosts = posts
        .filter(p => p.status === 'scheduled' && p.scheduled_date)
        .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date))
        .slice(0, 3);

    return (
        <Card className="bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-semibold">
                    Tes prochains posts programmés
                    <span className="text-gray-400 font-normal ml-2">{scheduledPosts.length} post{scheduledPosts.length > 1 ? 's' : ''}</span>
                </CardTitle>
                <Button variant="link" className="text-blue-600 text-sm p-0">
                    Voir tout le calendrier →
                </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                {scheduledPosts.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">Aucun post programmé</p>
                ) : (
                    scheduledPosts.map(post => (
                        <div 
                            key={post.id} 
                            className="flex gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                            onClick={() => onEdit(post)}
                        >
                            <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                                <Calendar className="h-6 w-6 text-gray-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <Badge className="bg-green-100 text-green-700 mb-2">
                                    Sera publié le {format(new Date(post.scheduled_date), "d MMM 'à' HH:mm", { locale: fr })}
                                </Badge>
                                <p className="text-sm text-gray-700 line-clamp-2">
                                    {post.content}
                                </p>
                                {post.category && (
                                    <Badge variant="outline" className="mt-2">
                                        {post.category}
                                    </Badge>
                                )}
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    );
}