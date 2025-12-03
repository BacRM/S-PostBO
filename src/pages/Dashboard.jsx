import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Sidebar from '../components/dashboard/Sidebar';
import StatsCards from '../components/dashboard/StatsCards';
import SecondaryStats from '../components/dashboard/SecondaryStats';
import ScheduledPosts from '../components/dashboard/ScheduledPosts';
import ObjectivesCard from '../components/dashboard/ObjectivesCard';
import LinkedInConnect from '../components/LinkedInConnect';
import PostEditor from '../components/PostEditor';

export default function Dashboard() {
    const [user, setUser] = useState(null);
    const [showEditor, setShowEditor] = useState(false);
    const [editingPost, setEditingPost] = useState(null);

    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        const userData = await base44.auth.me();
        setUser(userData);
    };

    const { data: posts = [], refetch } = useQuery({
        queryKey: ['posts'],
        queryFn: () => base44.entities.Post.list('-created_date'),
    });

    const isLinkedInConnected = user?.linkedin_access_token && 
        (!user.linkedin_token_expires || Date.now() < user.linkedin_token_expires);

    // Calculate stats from posts
    const publishedPosts = posts.filter(p => p.status === 'published');
    const stats = {
        impressions: 760,
        impressionsChange: -0.05,
        impressionsSector: -0.82,
        interactions: 6,
        interactionsChange: -0.89,
        interactionsSector: -0.82,
        newFollowers: 47,
        newFollowersChange: 0.24,
        newFollowersSector: 1.8,
        publications: publishedPosts.length,
        publicationsChange: -0.6,
        publicationsSector: 1.2,
        uniqueViews: 0,
        uniqueViewsChange: 0,
        profileViews: 3,
        profileViewsChange: -0.88,
        followersFromPosts: 0,
        followersFromPostsChange: -1,
    };

    const handleSave = () => {
        setShowEditor(false);
        setEditingPost(null);
        refetch();
    };

    const handleEdit = (post) => {
        setEditingPost(post);
        setShowEditor(true);
    };

    if (showEditor) {
        return (
            <div className="min-h-screen bg-gray-50 p-4 md:p-8">
                <PostEditor 
                    post={editingPost}
                    onSave={handleSave}
                    onClose={() => {
                        setShowEditor(false);
                        setEditingPost(null);
                    }}
                    isLinkedInConnected={isLinkedInConnected}
                />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-gray-100">
            {/* Sidebar */}
            <Sidebar user={user} />

            {/* Main Content */}
            <div className="flex-1 p-6">
                {/* Header */}
                <div className="flex justify-end mb-6">
                    <Button 
                        onClick={() => setShowEditor(true)}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Nouveau post
                    </Button>
                </div>

                {/* LinkedIn Connection Alert */}
                {!isLinkedInConnected && (
                    <div className="mb-6">
                        <LinkedInConnect user={user} onConnected={loadUser} />
                    </div>
                )}

                {/* Stats Cards */}
                <div className="space-y-4 mb-6">
                    <StatsCards stats={stats} />
                    <SecondaryStats stats={stats} />
                </div>

                {/* Bottom Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <ScheduledPosts posts={posts} onEdit={handleEdit} />
                    </div>
                    <div>
                        <ObjectivesCard posts={posts} />
                    </div>
                </div>
            </div>
        </div>
    );
}