/**
 * S-Post - Hook pour l'intégration LinkedIn via l'extension
 * Version 1.2.0
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

// Configuration
const LINKEDIN_CONFIG = {
  STORAGE_KEY: 'spost_linkedin_data',
  SYNC_INTERVAL: 30000,
};

/**
 * Hook principal pour gérer les données LinkedIn via l'extension S-Post
 */
export function useLinkedIn() {
  const [isExtensionInstalled, setIsExtensionInstalled] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [linkedInData, setLinkedInData] = useState(null);
  const [profile, setProfile] = useState(null);
  const [csrf, setCsrf] = useState(null);
  const [lastSync, setLastSync] = useState(null);

  const checkExtension = useCallback(() => {
    if (window.LinkedInPlanner || window.SPost) {
      setIsExtensionInstalled(true);
      return true;
    }
    
    const storedData = localStorage.getItem(LINKEDIN_CONFIG.STORAGE_KEY);
    if (storedData) {
      try {
        const data = JSON.parse(storedData);
        if (data.extensionVersion) {
          setIsExtensionInstalled(true);
          return true;
        }
      } catch (e) {}
    }
    return false;
  }, []);

  const fetchLinkedInData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const api = window.SPost || window.LinkedInPlanner;
      if (api) {
        const data = await api.getData();
        
        if (data) {
          setLinkedInData(data);
          setIsConnected(data.connected || false);
          setProfile(data.profile || null);
          setCsrf(data.csrf || null);
          setLastSync(new Date().toISOString());
          
          localStorage.setItem(LINKEDIN_CONFIG.STORAGE_KEY, JSON.stringify({
            ...data,
            updatedAt: new Date().toISOString(),
            extensionVersion: api.version,
          }));
          
          return data;
        }
      }
      
      const storedData = localStorage.getItem(LINKEDIN_CONFIG.STORAGE_KEY);
      if (storedData) {
        const data = JSON.parse(storedData);
        setLinkedInData(data);
        setIsConnected(data.connected || false);
        setProfile(data.profile || null);
        setCsrf(data.csrf || null);
        setLastSync(data.updatedAt || null);
        return data;
      }
      
      setIsConnected(false);
      return null;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    return await fetchLinkedInData();
  }, [fetchLinkedInData]);

  const disconnect = useCallback(() => {
    localStorage.removeItem(LINKEDIN_CONFIG.STORAGE_KEY);
    setLinkedInData(null);
    setIsConnected(false);
    setProfile(null);
    setCsrf(null);
  }, []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      if (!mounted) return;
      
      const hasExtension = checkExtension();
      if (hasExtension) {
        await fetchLinkedInData();
      } else {
        setIsLoading(false);
      }
    };

    init();

    const handleExtensionReady = () => {
      if (!mounted) return;
      setIsExtensionInstalled(true);
      fetchLinkedInData();
    };

    const handleDataUpdate = (event) => {
      if (!mounted) return;
      const data = event.detail;
      setLinkedInData(data);
      setIsConnected(data?.connected || false);
      setProfile(data?.profile || null);
      setCsrf(data?.csrf || null);
      setLastSync(new Date().toISOString());
    };

    window.addEventListener('SPostReady', handleExtensionReady);
    window.addEventListener('LinkedInPlannerReady', handleExtensionReady);
    window.addEventListener('SPostDataUpdated', handleDataUpdate);
    window.addEventListener('LinkedInPlannerDataUpdated', handleDataUpdate);

    return () => {
      mounted = false;
      window.removeEventListener('SPostReady', handleExtensionReady);
      window.removeEventListener('LinkedInPlannerReady', handleExtensionReady);
      window.removeEventListener('SPostDataUpdated', handleDataUpdate);
      window.removeEventListener('LinkedInPlannerDataUpdated', handleDataUpdate);
    };
  }, [checkExtension, fetchLinkedInData]);

  return {
    isExtensionInstalled,
    isConnected,
    isLoading,
    error,
    linkedInData,
    profile,
    csrf,
    lastSync,
    refresh,
    disconnect,
  };
}

/**
 * Hook pour gérer les posts LinkedIn
 */
export function useLinkedInPosts() {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState(null);

  const checkExtension = useCallback(() => {
    return !!(window.SPost || window.LinkedInPlanner);
  }, []);

  const fetchPosts = useCallback(async () => {
    if (!checkExtension()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const api = window.SPost || window.LinkedInPlanner;
      if (api?.getPosts) {
        const result = await api.getPosts();
        setPosts(result || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [checkExtension]);

  const refreshFromLinkedIn = useCallback(async () => {
    const api = window.SPost || window.LinkedInPlanner;
    if (!api?.fetchPosts) {
      setError('Extension S-Post requise');
      return;
    }
    
    setIsFetching(true);
    setError(null);
    
    try {
      const result = await api.fetchPosts();
      if (result.error) {
        setError(result.error);
      } else if (result.posts) {
        setPosts(result.posts);
      }
      await fetchPosts();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsFetching(false);
    }
  }, [fetchPosts]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const stats = useMemo(() => {
    if (!posts.length) return { totalLikes: 0, totalComments: 0, totalViews: 0, avgEngagement: 0 };
    
    const totalLikes = posts.reduce((sum, p) => sum + (p.stats?.likes || 0), 0);
    const totalComments = posts.reduce((sum, p) => sum + (p.stats?.comments || 0), 0);
    const totalViews = posts.reduce((sum, p) => sum + (p.stats?.views || 0), 0);
    const avgEngagement = ((totalLikes + totalComments) / posts.length).toFixed(1);
    
    return { totalLikes, totalComments, totalViews, avgEngagement };
  }, [posts]);

  return {
    posts,
    isLoading,
    isFetching,
    error,
    stats,
    refresh: fetchPosts,
    refreshFromLinkedIn,
  };
}

export default useLinkedIn;



