import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings } from "lucide-react";

const CircularProgress = ({ value, max, label, color }) => {
    const percentage = max > 0 ? (value / max) * 100 : 0;
    const circumference = 2 * Math.PI * 40;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className="flex flex-col items-center">
            <div className="relative w-24 h-24">
                <svg className="w-24 h-24 transform -rotate-90">
                    <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="#e5e7eb"
                        strokeWidth="8"
                        fill="none"
                    />
                    <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke={color}
                        strokeWidth="8"
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        className="transition-all duration-500"
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold">{value}<sub className="text-sm text-gray-400">/{max}</sub></span>
                </div>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center uppercase">{label}</p>
        </div>
    );
};

export default function ObjectivesCard({ posts }) {
    const thisWeekPosts = posts.filter(p => {
        if (p.status !== 'published') return false;
        const postDate = new Date(p.created_date);
        const now = new Date();
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
        return postDate >= weekStart;
    });

    const comments = 3; // Placeholder - would need LinkedIn API data
    const likes = 9; // Placeholder

    return (
        <Card className="bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-4">
                    <CardTitle className="text-lg font-semibold">Mes objectifs</CardTitle>
                    <Select defaultValue="week">
                        <SelectTrigger className="w-[140px] h-8">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="week">Cette semaine</SelectItem>
                            <SelectItem value="month">Ce mois</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Button variant="ghost" size="icon">
                    <Settings className="h-4 w-4" />
                </Button>
            </CardHeader>
            <CardContent>
                <div className="flex justify-around py-4">
                    <CircularProgress 
                        value={comments} 
                        max={21} 
                        label="Commentaires" 
                        color="#3b82f6" 
                    />
                    <CircularProgress 
                        value={likes} 
                        max={70} 
                        label="Likes" 
                        color="#f97316" 
                    />
                    <CircularProgress 
                        value={thisWeekPosts.length} 
                        max={2} 
                        label="Posts" 
                        color="#22c55e" 
                    />
                </div>
            </CardContent>
        </Card>
    );
}