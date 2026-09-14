import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import ErrorBoundary from './components/ErrorBoundary';
import Home from './pages/Home';
import Campaigns from './pages/Campaigns';
import Leads from './pages/Leads';
import LeadDetail from './pages/LeadDetail';
import Quotes from './pages/Quotes';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import WhatsApp from './pages/WhatsApp';
import CallLogs from './pages/CallLogs';
import { Toaster } from 'react-hot-toast';

// Wrapper that removes padding on the WhatsApp page so iframe fills fully
function MainContent() {
  const location = useLocation();
  const isWhatsApp = location.pathname === '/whatsapp';

  return (
    <main className={`main-content${isWhatsApp ? ' no-pad' : ''}`}>
      <ErrorBoundary>
        <Routes>
          <Route path="/"            element={<Home />} />
          <Route path="/campaigns"   element={<Campaigns />} />
          <Route path="/leads"       element={<Leads />} />
          <Route path="/leads/:id"   element={<LeadDetail />} />
          <Route path="/quotes"      element={<Quotes />} />
          <Route path="/analytics"   element={<Analytics />} />
          <Route path="/settings"    element={<Settings />} />
          <Route path="/whatsapp"    element={<WhatsApp />} />
          <Route path="/call-logs"   element={<CallLogs />} />
          <Route path="*"            element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
    </main>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <div className="layout-container">
          <Sidebar />
          <MainContent />
        </div>
      </ErrorBoundary>
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
