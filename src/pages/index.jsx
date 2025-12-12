import Layout from "./Layout.jsx";

import Home from "./Home";

import Dashboard from "./Dashboard";

import Calendar from "./Calendar";

import AllPosts from "./AllPosts";

import Stats from "./Stats";

import Profile from "./Profile";

import NotionSync from "./NotionSync";

import Settings from "./Settings";

import Callback from "./Callback";

import CreatePost from "./CreatePost";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Home: Home,
    
    Dashboard: Dashboard,
    
    Calendar: Calendar,
    
    AllPosts: AllPosts,
    
    Stats: Stats,
    
    Profile: Profile,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                {/* Route par défaut → Mes Stats */}
                <Route path="/" element={<Stats />} />
                
                {/* Route OAuth Callback - sans layout */}
                <Route path="/callback" element={<Callback />} />
                
                {/* Routes principales */}
                <Route path="/stats" element={<Stats />} />
                <Route path="/allposts" element={<AllPosts />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/notion" element={<NotionSync />} />
                <Route path="/create-post" element={<CreatePost />} />
                
                {/* Routes compatibilité */}
                <Route path="/Stats" element={<Stats />} />
                <Route path="/AllPosts" element={<AllPosts />} />
                <Route path="/Calendar" element={<Calendar />} />
                <Route path="/Profile" element={<Profile />} />
                <Route path="/Settings" element={<Settings />} />
                <Route path="/Notion" element={<NotionSync />} />
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}