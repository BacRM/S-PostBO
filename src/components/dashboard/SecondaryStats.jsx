import React from 'react';
import { Card } from "@/components/ui/card";
import { Eye, User, UserPlus } from "lucide-react";

const SecondaryStat = ({ icon: Icon, label, value, change, sectorChange }) => (
    <Card className="p-4 bg-white">
        <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-gray-100">
                <Icon className="h-5 w-5 text-gray-500" />
            </div>
            <div className="flex-1">
                <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
                <div className="mt-2 space-y-1">
                    {change !== undefined && (
                        <p className={`text-xs ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {change >= 0 ? '+' : ''}{change}% Vs la période précédente
                        </p>
                    )}
                    {sectorChange !== undefined && (
                        <p className="text-xs text-gray-500">
                            --% Sur votre secteur
                        </p>
                    )}
                </div>
            </div>
        </div>
    </Card>
);

export default function SecondaryStats({ stats }) {
    return (
        <div className="grid grid-cols-3 gap-4">
            <SecondaryStat
                icon={Eye}
                label="Vues uniques moyennes"
                value={stats.uniqueViews || 0}
                change={stats.uniqueViewsChange}
                sectorChange={0}
            />
            <SecondaryStat
                icon={User}
                label="Vues de profil depuis les posts"
                value={stats.profileViews || 0}
                change={stats.profileViewsChange}
                sectorChange={0}
            />
            <SecondaryStat
                icon={UserPlus}
                label="Abonnés gagnés grâce aux posts"
                value={stats.followersFromPosts || 0}
                change={stats.followersFromPostsChange}
                sectorChange={0}
            />
        </div>
    );
}