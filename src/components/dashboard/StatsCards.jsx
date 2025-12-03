import React from 'react';
import { Card } from "@/components/ui/card";
import { Eye, Users, UserPlus, FileText } from "lucide-react";

const StatCard = ({ icon: Icon, label, value, change, sectorChange, iconBg }) => (
    <Card className="p-4 bg-white">
        <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${iconBg}`}>
                <Icon className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
                <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
                <div className="mt-2 space-y-1">
                    {change !== undefined && (
                        <p className={`text-xs flex items-center gap-1 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {change >= 0 ? '+' : ''}{change}% Vs la période précédente
                        </p>
                    )}
                    {sectorChange !== undefined && (
                        <p className={`text-xs ${sectorChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {sectorChange >= 0 ? '+' : ''}{sectorChange}% Sur votre secteur
                        </p>
                    )}
                </div>
            </div>
        </div>
    </Card>
);

export default function StatsCards({ stats }) {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
                icon={Eye}
                label="Impressions"
                value={stats.impressions || 0}
                change={stats.impressionsChange}
                sectorChange={stats.impressionsSector}
                iconBg="bg-blue-500"
            />
            <StatCard
                icon={Users}
                label="Interactions"
                value={stats.interactions || 0}
                change={stats.interactionsChange}
                sectorChange={stats.interactionsSector}
                iconBg="bg-blue-500"
            />
            <StatCard
                icon={UserPlus}
                label="Nouveaux abonnés"
                value={stats.newFollowers || 0}
                change={stats.newFollowersChange}
                sectorChange={stats.newFollowersSector}
                iconBg="bg-blue-500"
            />
            <StatCard
                icon={FileText}
                label="Nombre de publications"
                value={stats.publications || 0}
                change={stats.publicationsChange}
                sectorChange={stats.publicationsSector}
                iconBg="bg-blue-500"
            />
        </div>
    );
}