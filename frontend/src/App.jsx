import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import Campaigns from './pages/Campaigns';
import Leads from './pages/Leads';
import LeadDetail from './pages/LeadDetail';
import Quotes from './pages/Quotes';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <BrowserRouter>
      <div className="layout-container">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/leads/:id" element={<LeadDetail />} />
            <Route path="/quotes" element={<Quotes />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      <Toaster 
        position="top-right" 
        toastOptions={{ 
          style: { 
            background: 'var(--glass-bg)', 
            color: '#fff', 
            border: '1px solid var(--glass-border)', 
            backdropFilter: 'blur(12px)' 
          } 
        }} 
      />
    </BrowserRouter>
  );
}

export default App;
