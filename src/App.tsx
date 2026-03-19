/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { MOCK_PROFILES, MOCK_DOCUMENTS, MOCK_DEADLINES, MOCK_ACCOUNTANT } from './constants';
import { getDocuments, addDocument, updateDocument, deleteDocument, getDeadlines, addDeadline, updateDeadline, deleteDeadline, getProfiles, updateProfile, getAccountant, updateAccountant } from './lib/db';
import { Profile, Document, Deadline, Accountant } from './types';

import Header from './components/layout/Header';
import BottomNav from './components/layout/BottomNav';
import NotificationsPanel from './components/layout/NotificationsPanel';

import DashboardView from './views/DashboardView';
import DocumentsView from './views/DocumentsView';
import CalendarView from './views/CalendarView';
import ProfileView from './views/ProfileView';
import SettingsView from './views/SettingsView';
import AccountantView from './views/AccountantView';
import MenuView from './views/MenuView';
import MediaLibraryView from './views/MediaLibraryView';
import OnboardingView from './views/OnboardingView';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [activeProfile, setActiveProfile] = useState<Profile>(MOCK_PROFILES[0]);
  const [isProfilePage, setIsProfilePage] = useState(false);
  const [isSettingsPage, setIsSettingsPage] = useState(false);
  const [isAccountantPage, setIsAccountantPage] = useState(false);
  const [isMediaLibraryPage, setIsMediaLibraryPage] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => JSON.parse(localStorage.getItem('darkMode') || 'false'));
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => !localStorage.getItem('onboardingComplete'));
  const [documents, setDocuments] = useState<Document[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [accountant, setAccountant] = useState<Accountant>(MOCK_ACCOUNTANT);

  useEffect(() => {
    getAccountant().then(data => { if (data) setAccountant(data); });
    getProfiles()
      .then(data => {
        if (data.length > 0) {
          setProfiles(data);
          const savedId = localStorage.getItem('activeProfileId');
          const profile = data.find(p => p.id === savedId) || data[0];
          setActiveProfile(profile);
          getDocuments(profile.id).then(docs => setDocuments(markOverdue(docs))).catch(() => setDocuments(MOCK_DOCUMENTS));
          getDeadlines(profile.id).then(setDeadlines).catch(() => setDeadlines(MOCK_DEADLINES));
        } else {
          setProfiles(MOCK_PROFILES);
          getDocuments(MOCK_PROFILES[0].id).then(docs => setDocuments(markOverdue(docs))).catch(() => setDocuments(MOCK_DOCUMENTS));
          getDeadlines(MOCK_PROFILES[0].id).then(setDeadlines).catch(() => setDeadlines(MOCK_DEADLINES));
        }
      })
      .catch(() => {
        setProfiles(MOCK_PROFILES);
        setDocuments(MOCK_DOCUMENTS);
        setDeadlines(MOCK_DEADLINES);
      });
  }, []);

  useEffect(() => { localStorage.setItem('darkMode', JSON.stringify(darkMode)); }, [darkMode]);
  useEffect(() => { localStorage.setItem('activeProfileId', activeProfile.id); }, [activeProfile]);

  const markOverdue = (docs: Document[]) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return docs.map(d => {
      if (d.type === 'invoice' && d.status === 'pending' && new Date(d.date) < thirtyDaysAgo) {
        const updated = { ...d, status: 'overdue' as const };
        updateDocument(updated).catch(() => {});
        return updated;
      }
      return d;
    });
  };

  const handleAddDocument = async (doc: Document) => {
    setDocuments(prev => [doc, ...prev]);
    try { await addDocument(doc, activeProfile.id); } catch {}
  };

  const handleDeleteDocument = async (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
    try { await deleteDocument(id); } catch {}
  };

  const handleUpdateDocument = async (doc: Document) => {
    setDocuments(prev => prev.map(d => d.id === doc.id ? doc : d));
    try { await updateDocument(doc); } catch {}
  };

  const handleAddDeadline = async (d: Deadline) => {
    setDeadlines(prev => [...prev, d].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    try { await addDeadline(d, activeProfile.id); } catch {}
  };

  const handleUpdateDeadline = async (d: Deadline) => {
    setDeadlines(prev => prev.map(x => x.id === d.id ? d : x));
    try { await updateDeadline(d); } catch {}
  };

  const handleDeleteDeadline = async (id: string) => {
    setDeadlines(prev => prev.filter(d => d.id !== id));
    try { await deleteDeadline(id); } catch {}
  };

  const totalIncome = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return documents.filter(doc => doc.type === 'invoice' && doc.status === 'paid' && new Date(doc.date).getFullYear() === currentYear).reduce((sum, doc) => sum + doc.amount, 0);
  }, [documents]);

  const totalExpenses = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return documents.filter(doc => doc.type === 'expense' && new Date(doc.date).getFullYear() === currentYear).reduce((sum, doc) => sum + doc.amount, 0);
  }, [documents]);

  const paidPercentage = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearDocs = documents.filter(doc => doc.type === 'invoice' && new Date(doc.date).getFullYear() === currentYear);
    if (yearDocs.length === 0) return 0;
    return Math.round((yearDocs.filter(doc => doc.status === 'paid').length / yearDocs.length) * 100);
  }, [documents]);

  const notificationCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return deadlines.filter(d => {
      if (d.completed) return false;
      const date = new Date(d.date);
      date.setHours(0, 0, 0, 0);
      const diff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diff >= 0 && diff <= 30;
    }).length;
  }, [deadlines]);

  const viewTitle = useMemo(() => {
    if (isProfilePage) return 'Profilo';
    if (isSettingsPage) return 'Impostazioni';
    if (isAccountantPage) return 'Commercialista';
    if (isMediaLibraryPage) return 'Libreria';
    switch (activeTab) {
      case 'home': return 'Dashboard';
      case 'docs': return 'Documenti';
      case 'calendar': return 'Calendario';
      case 'menu': return 'Menu';
      default: return 'Dashboard';
    }
  }, [activeTab, isProfilePage, isSettingsPage, isAccountantPage, isMediaLibraryPage]);

  const resetSubPages = () => { setIsProfilePage(false); setIsSettingsPage(false); setIsAccountantPage(false); setIsMediaLibraryPage(false); };
  const handleProfileClick = () => { resetSubPages(); setIsProfilePage(true); setActiveTab('menu'); };
  const handleSettingsClick = () => { resetSubPages(); setIsSettingsPage(true); setActiveTab('menu'); };
  const handleAccountantClick = () => { resetSubPages(); setIsAccountantPage(true); setActiveTab('menu'); };
  const handleMediaLibraryClick = () => { resetSubPages(); setIsMediaLibraryPage(true); setActiveTab('docs'); };
  const handleTabChange = (tab: string) => { resetSubPages(); setActiveTab(tab); };
  const handleSwitchProfile = (p: Profile) => {
    setActiveProfile(p);
    resetSubPages();
    setActiveTab('home');
    getDocuments(p.id).then(docs => setDocuments(markOverdue(docs))).catch(() => setDocuments(MOCK_DOCUMENTS));
    getDeadlines(p.id).then(setDeadlines).catch(() => setDeadlines(MOCK_DEADLINES));
  };
  const handleBack = () => { resetSubPages(); };

  const handleOnboardingComplete = async (p: Profile) => {
    setActiveProfile(p);
    setProfiles(prev => prev.map(x => x.id === p.id ? p : x));
    try { await updateProfile(p); } catch {}
    setShowOnboarding(false);
  };

  if (showOnboarding) {
    return <OnboardingView profile={activeProfile} onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className={`max-w-md mx-auto min-h-screen flex flex-col shadow-2xl relative overflow-hidden transition-colors duration-500 ${darkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      <Header
        title={viewTitle}
        activeProfile={activeProfile}
        onProfileClick={handleProfileClick}
        onBellClick={() => setIsNotificationsOpen(true)}
        notificationCount={notificationCount}
        showBack={isProfilePage || isSettingsPage || isAccountantPage || isMediaLibraryPage}
        onBack={handleBack}
        darkMode={darkMode}
      />

      {isNotificationsOpen && (
        <NotificationsPanel deadlines={deadlines} onClose={() => setIsNotificationsOpen(false)} onUpdateDeadline={handleUpdateDeadline} darkMode={darkMode} />
      )}

      <main className={`flex-1 overflow-y-auto ${darkMode ? 'bg-slate-950' : ''}`}>
        <AnimatePresence mode="wait">
          {isProfilePage ? (
            <ProfileView
              key="profile"
              activeProfile={activeProfile}
              profiles={profiles}
              onSwitchProfile={handleSwitchProfile}
              onUpdateProfile={async p => { setActiveProfile(p); setProfiles(prev => prev.map(x => x.id === p.id ? p : x)); try { await updateProfile(p); } catch {} }}
              darkMode={darkMode}
            />
          ) : isSettingsPage ? (
            <SettingsView key="settings" darkMode={darkMode} setDarkMode={setDarkMode} />
          ) : isAccountantPage ? (
            <AccountantView
              key="accountant"
              accountant={accountant}
              onSave={async a => { setAccountant(a); try { await updateAccountant(a); } catch {} }}
              darkMode={darkMode}
            />
          ) : isMediaLibraryPage ? (
            <MediaLibraryView documents={documents} onAddDocument={handleAddDocument} onDeleteDocument={handleDeleteDocument} onUpdateDocument={handleUpdateDocument} darkMode={darkMode} />
          ) : (
            <>
              {activeTab === 'home' && <DashboardView key="home" profile={activeProfile} onProfileClick={handleProfileClick} onAddDocumentClick={() => handleTabChange('docs')} income={totalIncome} expenses={totalExpenses} paidPercentage={paidPercentage} documents={documents} darkMode={darkMode} />}
              {activeTab === 'docs' && <DocumentsView key="docs" documents={documents} onAddDocument={handleAddDocument} onDeleteDocument={handleDeleteDocument} onUpdateDocument={handleUpdateDocument} onUpdateProfile={async p => { setActiveProfile(p); setProfiles(prev => prev.map(x => x.id === p.id ? p : x)); try { await updateProfile(p); } catch {} }} accountant={accountant} profile={activeProfile} darkMode={darkMode} onMediaLibraryClick={handleMediaLibraryClick} />}
              {activeTab === 'calendar' && <CalendarView key="calendar" deadlines={deadlines} onAddDeadline={handleAddDeadline} onUpdateDeadline={handleUpdateDeadline} onDeleteDeadline={handleDeleteDeadline} darkMode={darkMode} />}
              {activeTab === 'menu' && <MenuView key="menu" activeProfile={activeProfile} onProfileClick={handleProfileClick} onSettingsClick={handleSettingsClick} onAccountantClick={handleAccountantClick} darkMode={darkMode} />}
            </>
          )}
        </AnimatePresence>
      </main>

      <BottomNav activeTab={(isProfilePage || isSettingsPage || isAccountantPage) ? 'menu' : isMediaLibraryPage ? 'docs' : activeTab} setActiveTab={handleTabChange} darkMode={darkMode} />
    </div>
  );
}
