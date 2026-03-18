/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Calendar, 
  Settings, 
  Bell, 
  Plus, 
  Search, 
  ArrowUpDown,
  ChevronRight,
  User,
  LogOut,
  Globe,
  CreditCard,
  Briefcase,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileEdit,
  Mail,
  Camera,
  Image,
  LayoutList,
  Grid,
  ScanFace,
  Lock,
  ShieldCheck,
  ArrowLeft,
  Languages,
  Moon,
  Sun,
  ArrowUpRight,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MOCK_PROFILES, MOCK_DOCUMENTS, MOCK_DEADLINES, MOCK_ACCOUNTANT } from './constants';
import { getDocuments, addDocument, getDeadlines, getProfiles, updateProfile } from './lib/db';
import { Profile, Document, Deadline, Accountant } from './types';

// --- Components ---

const CreateExpenseModal = ({ isOpen, onClose, onSave, darkMode }: { isOpen: boolean, onClose: () => void, onSave: (doc: any) => void, darkMode?: boolean }) => {
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: 'abbonamento',
  });

  const handleSubmit = () => {
    if (!formData.amount) return;
    onSave({
      ...formData,
      id: Math.random().toString(36).substr(2, 9),
      amount: parseFloat(formData.amount),
      type: 'expense',
      status: 'paid',
      title: formData.title || formData.category,
    });
    onClose();
    setFormData({ title: '', amount: '', date: new Date().toISOString().split('T')[0], category: 'abbonamento' });
  };

  const categories = [
    { value: 'abbonamento', label: 'Abbonamento', emoji: '📦' },
    { value: 'materiale', label: 'Materiale', emoji: '🛠️' },
    { value: 'software', label: 'Software', emoji: '💻' },
    { value: 'formazione', label: 'Formazione', emoji: '📚' },
    { value: 'altro', label: 'Altro', emoji: '📎' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className={`relative w-full max-w-md rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl backdrop-blur-xl ${darkMode ? 'bg-slate-900/90' : 'bg-white/90'}`}>
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Nuova Spesa</h2>
                  <p className="text-sm text-slate-500">Registra un'uscita deducibile</p>
                </div>
                <button onClick={onClose} className={`p-2 rounded-full transition-all active:scale-90 ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-50 text-slate-400'}`}>
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Categoria</label>
                  <div className="grid grid-cols-5 gap-2">
                    {categories.map(cat => (
                      <button
                        key={cat.value}
                        onClick={() => setFormData({ ...formData, category: cat.value })}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-center transition-all active:scale-95 ${formData.category === cat.value ? 'bg-indigo-500 border-indigo-500 text-white' : (darkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-600')}`}
                      >
                        <span className="text-lg">{cat.emoji}</span>
                        <span className="text-[9px] font-bold">{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Descrizione (opzionale)</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Es: Abbonamento Adobe Creative" className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${darkMode ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-100 text-slate-900 placeholder:text-slate-400'}`} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Importo</label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input type="number" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} placeholder="0.00" className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold ${darkMode ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-100 text-slate-900 placeholder:text-slate-400'}`} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Data</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-100 text-slate-900'}`} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 space-y-3">
                <button onClick={handleSubmit} className="w-full bg-indigo-500 text-white py-4 rounded-2xl font-bold shadow-xl shadow-indigo-500/30 active:scale-[0.98] transition-all hover:bg-indigo-600">
                  Registra Spesa
                </button>
                <button onClick={onClose} className={`w-full py-4 rounded-2xl font-bold active:scale-[0.98] transition-all ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
                  Annulla
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const CreateInvoiceModal = ({ isOpen, onClose, onSave, darkMode }: { isOpen: boolean, onClose: () => void, onSave: (doc: any) => void, darkMode?: boolean }) => {
  const [formData, setFormData] = useState({
    client: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    title: '',
    status: 'paid' as const
  });

  const handleSubmit = () => {
    if (!formData.client || !formData.amount) return;
    onSave({
      ...formData,
      id: Math.random().toString(36).substr(2, 9),
      amount: parseFloat(formData.amount),
      type: 'invoice'
    });
    onClose();
    setFormData({
      client: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      title: '',
      status: 'paid'
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
          />
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className={`relative w-full max-w-md rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl transition-all backdrop-blur-xl ${darkMode ? 'bg-slate-900/90' : 'bg-white/90'}`}
          >
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h2 className={`text-2xl font-bold transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>Nuova Fattura</h2>
                  <p className="text-sm text-slate-500">Compila i dettagli per creare il documento</p>
                </div>
                <button onClick={onClose} className={`p-2 rounded-full transition-all active:scale-90 hover:shadow-lg ${darkMode ? 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:shadow-primary/10' : 'bg-slate-50 text-slate-400 hover:text-slate-600 hover:shadow-slate-200'}`}>
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Cliente</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      value={formData.client}
                      onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                      placeholder="Nome del cliente o azienda" 
                      className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all ${darkMode ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-100 text-slate-900 placeholder:text-slate-400'}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Importo</label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="number" 
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        placeholder="0.00" 
                        className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold ${darkMode ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-100 text-slate-900 placeholder:text-slate-400'}`}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">EUR</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Data</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="date" 
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all ${darkMode ? 'bg-slate-800 border-slate-700 text-white color-scheme-dark' : 'bg-slate-50 border-slate-100 text-slate-900'}`}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Descrizione / Numero</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Es: Consulenza Maggio - Fattura #004" 
                      className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all ${darkMode ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-100 text-slate-900 placeholder:text-slate-400'}`}
                    />
                  </div>
                </div>

                <div className={`flex items-center gap-3 p-4 rounded-2xl border transition-colors ${darkMode ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100'}`}>
                  <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white">
                    <CheckCircle2 size={20} />
                  </div>
                  <div className="flex-1">
                    <p className={`text-xs font-bold ${darkMode ? 'text-emerald-400' : 'text-emerald-900'}`}>Segna come Pagato</p>
                    <p className={`text-[10px] ${darkMode ? 'text-emerald-500/60' : 'text-emerald-600'}`}>Aggiornerà le entrate in Home</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={formData.status === 'paid'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.checked ? 'paid' : 'pending' })}
                    className="w-5 h-5 rounded-lg border-emerald-200 text-emerald-500 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-4 space-y-3">
                <button 
                  onClick={handleSubmit}
                  className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-xl shadow-primary/30 active:scale-[0.98] transition-all hover:bg-primary/90"
                >
                  Crea e Salva Pagamento
                </button>
                <button onClick={onClose} className={`w-full py-4 rounded-2xl font-bold active:scale-[0.98] transition-all hover:shadow-lg ${darkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:shadow-primary/10' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:shadow-slate-200'}`}>
                  Annulla
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const AccountantModal = ({ isOpen, onClose, accountant, darkMode }: { isOpen: boolean, onClose: () => void, accountant: Accountant, darkMode?: boolean }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
        />
        <motion.div 
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          className={`relative w-full max-w-md rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl transition-all backdrop-blur-xl ${darkMode ? 'bg-slate-900/90' : 'bg-white/90'}`}
        >
          <div className="p-8 space-y-6">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h2 className={`text-2xl font-bold transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>Il tuo Commercialista</h2>
                <p className="text-sm text-slate-500">Dettagli del contatto e invio documenti</p>
              </div>
              <button onClick={onClose} className={`p-2 rounded-full transition-all active:scale-90 hover:shadow-lg ${darkMode ? 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:shadow-primary/10' : 'bg-slate-50 text-slate-400 hover:text-slate-600 hover:shadow-slate-200'}`}>
                <Plus className="rotate-45" size={24} />
              </button>
            </div>

            <div className={`flex items-center gap-4 p-4 rounded-2xl transition-colors ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
              <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white text-xl font-bold">
                {accountant.firstName[0]}{accountant.lastName[0]}
              </div>
              <div>
                <p className={`text-lg font-bold transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>{accountant.firstName} {accountant.lastName}</p>
                <p className="text-sm text-slate-500">Commercialista Abilitato</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Studio / Sede</p>
                <div className="flex items-start gap-2">
                  <Globe size={16} className="text-slate-400 mt-0.5" />
                  <p className={`text-sm font-medium transition-colors ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{accountant.office}</p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contratto</p>
                <div className="flex items-start gap-2">
                  <FileText size={16} className="text-slate-400 mt-0.5" />
                  <p className={`text-sm font-medium transition-colors ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{accountant.contractDetails}</p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Istruzioni Invio Fatture</p>
                <div className={`p-4 rounded-xl border transition-colors ${darkMode ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100'}`}>
                  <p className={`text-sm leading-relaxed font-medium transition-colors ${darkMode ? 'text-emerald-400' : 'text-emerald-800'}`}>
                    {accountant.sendingInstructions}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <a href={`mailto:${accountant.email}`} className={`flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm shadow-xl active:scale-[0.98] transition-all ${darkMode ? 'bg-white text-slate-900 shadow-white/10 hover:bg-slate-100' : 'bg-slate-900 text-white shadow-slate-900/20 hover:bg-slate-800'}`}>
                <Mail size={18} />
                Invia Email
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

const Header = ({ title, activeProfile, onProfileClick, showBack, onBack, darkMode }: { 
  title: string, 
  activeProfile: Profile, 
  onProfileClick: () => void,
  showBack?: boolean,
  onBack?: () => void,
  darkMode?: boolean
}) => (
  <header className={`sticky top-0 z-20 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b transition-colors duration-500 ${darkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-white/80 border-slate-100'}`}>
    <div className="flex items-center gap-3">
      {showBack ? (
        <button 
          onClick={onBack}
          className={`p-2 -ml-2 rounded-xl active:scale-90 transition-all hover:shadow-lg ${darkMode ? 'bg-slate-900 text-slate-300 hover:shadow-primary/10' : 'bg-slate-50 text-slate-600 hover:shadow-slate-200'}`}
        >
          <ArrowLeft size={20} />
        </button>
      ) : (
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
          <div className="w-4 h-4 border-2 border-white rounded-sm transform rotate-45" />
        </div>
      )}
      <h1 className={`text-xl font-bold tracking-tight transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>{title}</h1>
    </div>
    <div className="flex items-center gap-4">
      {!showBack && (
        <button className={`relative p-2 transition-all active:scale-90 hover:shadow-lg rounded-xl ${darkMode ? 'text-slate-500 hover:text-primary hover:shadow-primary/10' : 'text-slate-400 hover:text-primary hover:shadow-slate-200'}`}>
          <Bell size={22} />
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 border-2 border-white rounded-full text-[10px] font-bold text-white flex items-center justify-center">2</span>
        </button>
      )}
      <button 
        onClick={onProfileClick}
        className={`w-9 h-9 rounded-full border-2 overflow-hidden transition-all active:scale-90 hover:shadow-lg ${darkMode ? 'border-slate-800 hover:border-primary hover:shadow-primary/20' : 'border-slate-100 hover:border-primary hover:shadow-slate-200'}`}
      >
        <img src={activeProfile.avatar} alt={activeProfile.name} className="w-full h-full object-cover" />
      </button>
    </div>
  </header>
);

const BottomNav = ({ activeTab, setActiveTab, darkMode }: { activeTab: string, setActiveTab: (tab: string) => void, darkMode?: boolean }) => {
  const tabs = [
    { id: 'home', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'docs', label: 'Documenti', icon: FileText },
    { id: 'calendar', label: 'Calendario', icon: Calendar },
    { id: 'menu', label: 'Menu', icon: Settings },
  ];

  return (
    <div className="fixed bottom-8 left-0 right-0 z-30 px-6 pointer-events-none">
      <nav className={`max-w-md mx-auto pointer-events-auto rounded-[32px] border px-8 py-4 flex justify-between items-center backdrop-blur-xl transition-all duration-500 ${
        darkMode 
        ? 'bg-slate-900/90 border-slate-800 shadow-[0_20px_50px_rgba(59,130,246,0.15)] hover:shadow-[0_20px_60px_rgba(59,130,246,0.25)]' 
        : 'bg-white/90 border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.1)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.15)]'
      }`}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-col items-center gap-1 transition-all active:scale-95 ${isActive ? 'text-primary' : (darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600')}`}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} className="transition-transform duration-300" />
              <span className={`text-[10px] font-bold uppercase tracking-wider transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-40'}`}>{tab.label}</span>
              
              {isActive && (
                <motion.div 
                  layoutId="nav-dot"
                  className="absolute -bottom-2 w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

// --- Views ---

const DashboardView = ({ profile, onProfileClick, income, paidPercentage, documents, darkMode }: { profile: Profile, onProfileClick: () => void, income: number, paidPercentage: number, documents: Document[], darkMode?: boolean, key?: string }) => {
  const displayYear = new Date().getFullYear();
  const today = new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.05 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20, scale: 0.98 },
    show: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { type: 'spring', stiffness: 260, damping: 20 } 
    }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="p-6 space-y-6 pb-24"
    >
      {/* Greeting & Date */}
      <motion.div variants={item} className="space-y-1">
        <h2 className={`text-2xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>Ciao, {profile.name.split(' ')[0]}!</h2>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{profile.country}</p>
      </motion.div>

      {/* Main Stat Card - Synchronized & Read-only */}
      <motion.div 
        variants={item} 
        className={`rounded-3xl p-6 shadow-sm border transition-all ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} space-y-4`}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Entrate Annuali</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sincronizzato</span>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Gen, {displayYear} - Dic, {displayYear}</p>
          <div className="flex items-baseline gap-3">
            <h2 className={`text-3xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>€{income.toLocaleString()}</h2>
          </div>
        </div>
        <div className={`pt-4 border-t flex justify-between items-center ${darkMode ? 'border-slate-800' : 'border-slate-50'}`}>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fatture Saldate</span>
          <span className={`text-xs font-bold ${darkMode ? 'text-slate-300' : 'text-slate-900'}`}>{paidPercentage}%</span>
        </div>
      </motion.div>

      {/* Secondary Stats */}
      <motion.div variants={item} className="grid grid-cols-2 gap-4">
        <div className={`rounded-2xl p-4 border transition-all hover:shadow-lg hover:shadow-primary/5 active:scale-[0.98] ${darkMode ? 'bg-slate-900 border-slate-800 hover:border-primary/30' : 'bg-white border-slate-100 hover:border-primary/20'} space-y-2`}>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tasse Stimate</p>
          <p className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>€{Math.round(income * 0.15).toLocaleString()}</p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div className="bg-primary h-full" style={{ width: '15%' }} />
          </div>
        </div>
        <div className={`rounded-2xl p-4 border transition-all hover:shadow-lg hover:shadow-emerald-500/5 active:scale-[0.98] ${darkMode ? 'bg-slate-900 border-slate-800 hover:border-emerald-500/30' : 'bg-white border-slate-100 hover:border-emerald-500/20'} space-y-2`}>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Netto Previsto</p>
          <p className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>€{Math.round(income * 0.85).toLocaleString()}</p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full" style={{ width: '85%' }} />
          </div>
        </div>
      </motion.div>

      {/* Chart Section (Matches Image Style) */}
      <motion.div variants={item} className={`rounded-3xl p-6 shadow-sm border transition-all hover:shadow-2xl active:scale-[0.99] ${darkMode ? 'bg-slate-900 border-slate-800 hover:border-primary/30 hover:shadow-primary/10' : 'bg-white border-slate-100 hover:border-primary/20 hover:shadow-primary/5'} space-y-6`}>
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Andamento Entrate</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Statistiche Mensili</p>
          </div>
          <div className={`p-2 rounded-xl ${darkMode ? 'bg-slate-800 text-primary' : 'bg-slate-50 text-primary'}`}>
            <TrendingUp size={18} />
          </div>
        </div>

        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={Array.from({ length: 12 }, (_, i) => {
                const month = String(i + 1).padStart(2, '0');
                const currentYear = new Date().getFullYear();
                const monthDocs = documents.filter(d => {
                  const date = new Date(d.date);
                  return date.getFullYear() === currentYear && date.getMonth() === i;
                });
                const monthIncome = monthDocs.filter(d => d.type === 'invoice' && d.status === 'paid').reduce((s, d) => s + d.amount, 0);
                const monthExpenses = monthDocs.filter(d => d.type === 'expense').reduce((s, d) => s + d.amount, 0);
                return { name: month, income: monthIncome, expenses: monthExpenses, net: monthIncome - monthExpenses };
              })}
              margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className={`p-2 rounded-xl border shadow-xl backdrop-blur-md ${darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-100'}`}>
                        <p className={`text-[10px] font-bold mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Mese {payload[0].payload.name}</p>
                        <div className="space-y-0.5">
                          {payload.map((entry: any, index: number) => (
                            <div key={index} className="flex items-center justify-between gap-4">
                              <span className="text-[10px] font-bold text-slate-400 uppercase">{entry.name === 'income' ? 'Entrate' : entry.name === 'expenses' ? 'Uscite' : 'Netto'}</span>
                              <span className={`text-[10px] font-black ${entry.name === 'income' ? 'text-emerald-500' : entry.name === 'expenses' ? 'text-indigo-500' : 'text-blue-500'}`}>
                                €{Math.round(entry.value).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area 
                type="monotone" 
                dataKey="income" 
                stroke="#10b981" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorIncome)" 
              />
              <Area 
                type="monotone" 
                dataKey="expenses" 
                stroke="#6366f1" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorExpenses)" 
              />
              <Area 
                type="monotone" 
                dataKey="net" 
                stroke="#3b82f6" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorNet)" 
              />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }}
                dy={10}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="flex justify-between items-center pt-2">
          {[
            { label: 'Entrate', color: 'bg-emerald-500' },
            { label: 'Uscite', color: 'bg-indigo-500' },
            { label: 'Netto', color: 'bg-blue-500' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${item.color}`} />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{item.label}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

const DocumentsView = ({ documents, onAddDocument, darkMode, key }: { documents: Document[], onAddDocument: (doc: Document) => void, darkMode?: boolean, key?: string }) => {
  const [isAccountantOpen, setIsAccountantOpen] = useState(false);
  const [isChoiceOpen, setIsChoiceOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');

  const handleSaveDocument = (newDoc: Document) => {
    onAddDocument(newDoc);
  };

  const totals = useMemo(() => {
    return documents.reduce((acc, doc) => {
      if (doc.type === 'invoice' && doc.status === 'paid') {
        acc.income += doc.amount;
      } else if (doc.type === 'expense') {
        acc.expenses += doc.amount;
      }
      return acc;
    }, { income: 0, expenses: 0 });
  }, [documents]);

  const balance = totals.income - totals.expenses;

  const filteredDocuments = useMemo(() => {
    if (filter === 'income') return documents.filter(d => d.type === 'invoice');
    if (filter === 'expense') return documents.filter(d => d.type === 'expense');
    return documents;
  }, [documents, filter]);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.06, delayChildren: 0.05 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 15, scale: 0.98 },
    show: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { type: 'spring', stiffness: 260, damping: 20 } 
    }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="p-6 space-y-8 pb-24"
    >
      {/* Search Bar - Moved from internal header */}
      <motion.div variants={item} className="relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary" size={18} />
        <input 
          type="text" 
          placeholder="Cerca tra le fatture..." 
          className={`w-full pl-10 pr-4 py-3 border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all hover:shadow-lg ${darkMode ? 'bg-slate-900 border-slate-800 text-white placeholder:text-slate-600 hover:border-primary/40 hover:shadow-primary/10' : 'bg-white border-slate-100 text-slate-900 placeholder:text-slate-400 hover:border-primary/20 hover:shadow-primary/5'}`}
        />
      </motion.div>

      {/* Accountant Card - Refined */}
      <motion.button 
        variants={item}
        onClick={() => setIsAccountantOpen(true)}
        className={`w-full p-6 border rounded-3xl flex items-center justify-between transition-all group active:scale-[0.98] ${darkMode ? 'bg-slate-900 border-slate-800 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10' : 'bg-white border-slate-100 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5'}`}
      >
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${darkMode ? 'bg-slate-800 text-primary group-hover:bg-primary group-hover:text-white' : 'bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white'}`}>
            <Mail size={28} strokeWidth={1.5} />
          </div>
          <div className="text-left">
            <p className={`text-base font-bold transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>Invia Documenti</p>
            <p className="text-xs text-slate-500">Al tuo commercialista</p>
          </div>
        </div>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${darkMode ? 'bg-slate-800 text-slate-600 group-hover:bg-primary/20 group-hover:text-primary' : 'bg-slate-50 text-slate-300 group-hover:bg-primary/10 group-hover:text-primary'}`}>
          <ChevronRight size={20} />
        </div>
      </motion.button>

      {/* Quick Actions Grid */}
      <motion.div variants={item} className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Caricamento Rapido</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <button className={`flex flex-col items-start gap-4 p-5 border rounded-3xl transition-all group active:scale-[0.98] ${darkMode ? 'bg-slate-900 border-slate-800 hover:border-emerald-500/40 hover:shadow-2xl hover:shadow-emerald-500/10' : 'bg-white border-slate-100 hover:border-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/5'}`}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform ${darkMode ? 'bg-emerald-500/10 text-emerald-500' : 'bg-emerald-50 text-emerald-600'}`}>
              <Camera size={24} />
            </div>
            <div className="text-left">
              <p className={`text-sm font-bold transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>Scansiona</p>
              <p className="text-[10px] text-slate-400 font-medium">Foto scontrino</p>
            </div>
          </button>
          <button className={`flex flex-col items-start gap-4 p-5 border rounded-3xl transition-all group active:scale-[0.98] ${darkMode ? 'bg-slate-900 border-slate-800 hover:border-blue-500/40 hover:shadow-2xl hover:shadow-blue-500/10' : 'bg-white border-slate-100 hover:border-blue-500/20 hover:shadow-xl hover:shadow-blue-500/5'}`}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform ${darkMode ? 'bg-blue-500/10 text-blue-500' : 'bg-blue-50 text-blue-600'}`}>
              <Image size={24} />
            </div>
            <div className="text-left">
              <p className={`text-sm font-bold transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>Importa</p>
              <p className="text-[10px] text-slate-400 font-medium">Da file o email</p>
            </div>
          </button>
        </div>
      </motion.div>

      {/* Interactive Filter Cards */}
      <motion.div variants={item} className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Filtra per Categoria</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <button 
            onClick={() => setFilter('income')}
            className={`p-4 rounded-3xl border transition-all text-left space-y-2 active:scale-[0.95] ${
              filter === 'income' 
              ? 'bg-emerald-600 border-emerald-600 text-white shadow-xl shadow-emerald-500/40' 
              : (darkMode ? 'bg-slate-900 border-slate-800 text-emerald-500 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/10' : 'bg-white border-slate-100 text-emerald-600 hover:border-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/5')
            }`}
          >
            <p className={`text-[9px] font-bold uppercase tracking-wider ${filter === 'income' ? 'text-white/60' : (darkMode ? 'text-emerald-500/60' : 'text-emerald-600/60')}`}>Entrate</p>
            <p className="text-sm font-bold">€{totals.income.toLocaleString()}</p>
          </button>
          
          <button 
            onClick={() => setFilter('expense')}
            className={`p-4 rounded-3xl border transition-all text-left space-y-2 active:scale-[0.95] ${
              filter === 'expense' 
              ? 'bg-red-600 border-red-600 text-white shadow-xl shadow-red-500/40' 
              : (darkMode ? 'bg-slate-900 border-slate-800 text-red-500 hover:border-red-500/40 hover:shadow-lg hover:shadow-red-500/10' : 'bg-white border-slate-100 text-red-600 hover:border-red-500/20 hover:shadow-lg hover:shadow-red-500/5')
            }`}
          >
            <p className={`text-[9px] font-bold uppercase tracking-wider ${filter === 'expense' ? 'text-white/60' : (darkMode ? 'text-red-500/60' : 'text-red-600/60')}`}>Uscite</p>
            <p className="text-sm font-bold">€{totals.expenses.toLocaleString()}</p>
          </button>

          <button 
            onClick={() => setFilter('all')}
            className={`p-4 rounded-3xl border transition-all text-left space-y-2 active:scale-[0.95] ${
              filter === 'all' 
              ? (darkMode ? 'bg-white border-white text-slate-900 shadow-xl shadow-white/20' : 'bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-900/40')
              : (darkMode ? 'bg-slate-900 border-slate-800 text-slate-400 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10' : 'bg-white border-slate-100 text-slate-600 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5')
            }`}
          >
            <p className={`text-[9px] font-bold uppercase tracking-wider ${filter === 'all' ? (darkMode ? 'text-slate-900/60' : 'text-white/60') : 'text-slate-400'}`}>Bilancio</p>
            <p className="text-sm font-bold">€{balance.toLocaleString()}</p>
          </button>
        </div>
      </motion.div>

      {/* History List */}
      <motion.div variants={item} className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            {filter === 'all' ? 'Cronologia Completa' : filter === 'income' ? 'Fatture Clienti' : 'Spese e Uscite'}
          </span>
          {filter !== 'all' && (
            <button 
              onClick={() => setFilter('all')}
              className="text-[11px] font-bold text-primary uppercase tracking-wider active:scale-90 transition-all hover:drop-shadow-[0_0_4px_rgba(59,130,246,0.3)]"
            >
              Reset Filtro
            </button>
          )}
        </div>

        <div className="space-y-3">
          {filteredDocuments.length > 0 ? (
            filteredDocuments.map((doc) => (
              <motion.div 
                variants={item}
                key={doc.id}
                className={`p-4 border rounded-2xl flex items-center gap-4 transition-all active:scale-[0.98] hover:shadow-xl ${darkMode ? 'bg-slate-900 border-slate-800 hover:border-primary/40 hover:shadow-primary/10' : 'bg-white border-slate-100 hover:border-primary/20 hover:shadow-primary/5'}`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
                  doc.type === 'invoice' 
                  ? (darkMode ? 'bg-emerald-500/10 text-emerald-500' : 'bg-emerald-50 text-emerald-600') 
                  : (darkMode ? 'bg-red-500/10 text-red-500' : 'bg-red-50 text-red-600')
                }`}>
                  {doc.type === 'invoice' ? <ArrowUpDown className="rotate-180" size={20} /> : <ArrowUpDown size={20} />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-0.5">
                    <h3 className={`text-sm font-bold truncate pr-2 transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>{doc.client || doc.title}</h3>
                    <p className={`text-sm font-bold shrink-0 transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {doc.type === 'expense' ? '-' : '+'}€{doc.amount.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-medium text-slate-400">
                        {new Date(doc.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                      </span>
                      <div className={`w-1 h-1 rounded-full ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`} />
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${
                        doc.status === 'paid' ? 'text-emerald-500' : 'text-slate-400'
                      }`}>
                        {doc.status === 'paid' ? 'Saldato' : doc.status}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="py-12 text-center space-y-2">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto transition-colors ${darkMode ? 'bg-slate-900 text-slate-700' : 'bg-slate-50 text-slate-300'}`}>
                <FileText size={32} />
              </div>
              <p className="text-sm font-medium text-slate-500">Nessun documento trovato per questo filtro</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Floating Action Button - Fixed at bottom of view */}
      <motion.div variants={item} className="fixed bottom-24 left-0 right-0 px-6 py-4 pointer-events-none">
        <div className="max-w-md mx-auto flex justify-end">
          <button
            onClick={() => setIsChoiceOpen(true)}
            className="w-14 h-14 bg-primary rounded-full shadow-xl shadow-primary/30 flex items-center justify-center text-white active:scale-90 transition-all pointer-events-auto"
          >
            <Plus size={28} strokeWidth={2.5} />
          </button>
        </div>
      </motion.div>

      <AccountantModal 
        isOpen={isAccountantOpen} 
        onClose={() => setIsAccountantOpen(false)} 
        accountant={MOCK_ACCOUNTANT} 
        darkMode={darkMode}
      />

      {/* Choice Sheet */}
      <AnimatePresence>
        {isChoiceOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsChoiceOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className={`relative w-full max-w-md rounded-t-[32px] overflow-hidden shadow-2xl backdrop-blur-xl ${darkMode ? 'bg-slate-900/90' : 'bg-white/90'}`}>
              <div className="p-8 space-y-4">
                <div className="space-y-1">
                  <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Cosa vuoi aggiungere?</h2>
                  <p className="text-sm text-slate-500">Scegli il tipo di documento</p>
                </div>
                <button onClick={() => { setIsChoiceOpen(false); setIsCreateOpen(true); }} className={`w-full p-5 rounded-2xl border flex items-center gap-4 transition-all active:scale-[0.98] hover:shadow-lg ${darkMode ? 'bg-slate-800 border-slate-700 hover:border-primary/40 hover:shadow-primary/10' : 'bg-white border-slate-100 hover:border-primary/20 hover:shadow-primary/5'}`}>
                  <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
                    <FileText size={22} />
                  </div>
                  <div className="text-left">
                    <p className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Fattura</p>
                    <p className="text-sm text-slate-500">Entrata da un cliente</p>
                  </div>
                  <ChevronRight size={18} className="ml-auto text-slate-400" />
                </button>
                <button onClick={() => { setIsChoiceOpen(false); setIsExpenseOpen(true); }} className={`w-full p-5 rounded-2xl border flex items-center gap-4 transition-all active:scale-[0.98] hover:shadow-lg ${darkMode ? 'bg-slate-800 border-slate-700 hover:border-indigo-500/40 hover:shadow-indigo-500/10' : 'bg-white border-slate-100 hover:border-indigo-500/20 hover:shadow-indigo-500/5'}`}>
                  <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                    <CreditCard size={22} />
                  </div>
                  <div className="text-left">
                    <p className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Spesa</p>
                    <p className="text-sm text-slate-500">Abbonamento, materiale, software…</p>
                  </div>
                  <ChevronRight size={18} className="ml-auto text-slate-400" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <CreateInvoiceModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSave={handleSaveDocument}
        darkMode={darkMode}
      />
      <CreateExpenseModal
        isOpen={isExpenseOpen}
        onClose={() => setIsExpenseOpen(false)}
        onSave={handleSaveDocument}
        darkMode={darkMode}
      />
    </motion.div>
  );
};

const CalendarView = ({ deadlines, darkMode, key }: { deadlines: Deadline[], darkMode?: boolean, key?: string }) => {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  const months = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];

  const filteredDeadlines = useMemo(() => {
    if (selectedMonth === null) return deadlines;
    return deadlines.filter(d => new Date(d.date).getMonth() === selectedMonth);
  }, [selectedMonth, deadlines]);

  const nextDeadline = useMemo(() => {
    const today = new Date();
    return deadlines
      .filter(d => new Date(d.date) >= today)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0] || null;
  }, [deadlines]);

  const daysUntilNext = nextDeadline
    ? Math.ceil((new Date(nextDeadline.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.06, delayChildren: 0.05 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 15, scale: 0.98 },
    show: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { type: 'spring', stiffness: 260, damping: 20 } 
    }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="p-6 space-y-8 pb-24"
    >
      {/* View Mode Switcher - Moved from internal header */}
      <motion.div variants={item} className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Visualizzazione</span>
        <div className={`flex p-1 rounded-xl transition-colors ${darkMode ? 'bg-slate-900' : 'bg-slate-100'}`}>
          <button 
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? (darkMode ? 'bg-slate-800 shadow-sm text-primary' : 'bg-white shadow-sm text-primary') : 'text-slate-400'}`}
          >
            <LayoutList size={18} />
          </button>
          <button 
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? (darkMode ? 'bg-slate-800 shadow-sm text-primary' : 'bg-white shadow-sm text-primary') : 'text-slate-400'}`}
          >
            <Grid size={18} />
          </button>
        </div>
      </motion.div>

      {viewMode === 'grid' ? (
        <motion.div variants={container} className="space-y-6">
          <motion.div variants={item} className="flex items-center justify-between px-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Seleziona Mese</span>
            <span className={`text-sm font-bold transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>{new Date().getFullYear()}</span>
          </motion.div>
          <div className="grid grid-cols-3 gap-3">
            {months.map((month, index) => {
              const hasDeadlines = deadlines.some(d => new Date(d.date).getMonth() === index);
              const isSelected = selectedMonth === index;
              
              return (
                <motion.button
                  variants={item}
                  key={month}
                  onClick={() => {
                    setSelectedMonth(isSelected ? null : index);
                    setViewMode('list');
                  }}
                  className={`relative p-4 rounded-3xl border transition-all text-center space-y-1 active:scale-[0.95] ${
                    isSelected 
                    ? 'bg-primary border-primary text-white shadow-xl shadow-primary/40' 
                    : (darkMode ? 'bg-slate-900 border-slate-800 text-slate-400 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10' : 'bg-white border-slate-100 text-slate-600 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5')
                  }`}
                >
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-white/60' : 'text-slate-400'}`}>
                    {month.substring(0, 3)}
                  </p>
                  <p className={`text-sm font-bold transition-colors ${isSelected ? 'text-white' : (darkMode ? 'text-slate-200' : 'text-slate-900')}`}>{index + 1}</p>
                  {hasDeadlines && !isSelected && (
                    <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      ) : (
        <>
          {/* Next Deadline Hero */}
          {nextDeadline && (
            <motion.div
              variants={item}
              className="relative p-6 bg-primary rounded-3xl text-white overflow-hidden shadow-xl shadow-primary/20"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                    <AlertCircle size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-white/60 uppercase tracking-wider">Prossima Scadenza</p>
                    <p className="text-sm font-bold">
                      {daysUntilNext === 0 ? 'Oggi!' : daysUntilNext === 1 ? 'Domani' : `Mancano ${daysUntilNext} giorni`}
                    </p>
                  </div>
                </div>
                <h3 className="text-lg font-bold leading-tight">{nextDeadline.title}</h3>
                {nextDeadline.amount && (
                  <div className="pt-2">
                    <p className="text-2xl font-bold">€{nextDeadline.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

            {/* Deadlines List */}
            <motion.div variants={item} className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  {selectedMonth !== null ? `Scadenze di ${months[selectedMonth]}` : 'Tutte le Scadenze'}
                </span>
                {selectedMonth !== null && (
                  <button 
                    onClick={() => setSelectedMonth(null)}
                    className="text-[11px] font-bold text-primary uppercase tracking-wider active:scale-90 transition-all hover:drop-shadow-[0_0_4px_rgba(59,130,246,0.3)]"
                  >
                    Vedi Tutte
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {filteredDeadlines.length > 0 ? (
                  filteredDeadlines.map((deadline) => (
                    <motion.div 
                      variants={item}
                      key={deadline.id}
                      className={`p-4 border rounded-2xl flex items-center gap-4 transition-all active:scale-[0.98] hover:shadow-xl ${darkMode ? 'bg-slate-900 border-slate-800 hover:border-primary/40 hover:shadow-primary/10' : 'bg-white border-slate-100 hover:border-primary/20 hover:shadow-primary/5'}`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 ${
                        deadline.type === 'tax' 
                        ? (darkMode ? 'bg-red-500/10 text-red-500' : 'bg-red-50 text-red-600') 
                        : (darkMode ? 'bg-blue-500/10 text-blue-500' : 'bg-blue-50 text-blue-600')
                      }`}>
                        <span className="text-[9px] font-bold uppercase tracking-tighter">
                          {new Date(deadline.date).toLocaleDateString('it-IT', { month: 'short' })}
                        </span>
                        <span className="text-lg font-black leading-none">
                          {new Date(deadline.date).getDate()}
                        </span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-0.5">
                          <h3 className={`text-sm font-bold truncate pr-2 transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>{deadline.title}</h3>
                          {deadline.amount && (
                            <p className={`text-sm font-bold shrink-0 transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                              €{deadline.amount.toLocaleString()}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-medium text-slate-400">
                            {deadline.type === 'tax' ? 'Adempimento Fiscale' : 'Pagamento Fornitore'}
                          </span>
                          <div className={`w-1 h-1 rounded-full ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`} />
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${
                            deadline.type === 'tax' ? 'text-red-500' : 'text-blue-500'
                          }`}>
                            {deadline.type === 'tax' ? 'Urgente' : 'In Scadenza'}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="py-12 text-center space-y-2">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto transition-colors ${darkMode ? 'bg-slate-900 text-slate-700' : 'bg-slate-50 text-slate-300'}`}>
                      <Calendar size={32} />
                    </div>
                    <p className="text-sm font-medium text-slate-500">Nessuna scadenza per questo mese</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
    </motion.div>
  );
};

const ProfileView = ({ activeProfile, profiles, onSwitchProfile, onUpdateProfile, darkMode }: { activeProfile: Profile, profiles: Profile[], onSwitchProfile: (p: Profile) => void, onUpdateProfile: (p: Profile) => void, darkMode?: boolean, key?: string }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ name: activeProfile.name, email: activeProfile.email, jobType: activeProfile.jobType, country: activeProfile.country, currency: activeProfile.currency });

  const handleSaveEdit = () => {
    onUpdateProfile({ ...activeProfile, ...editData });
    setIsEditing(false);
  };
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.05 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20, scale: 0.98 },
    show: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { type: 'spring', stiffness: 260, damping: 20 } 
    }
  };

  return (
    <>
    <AnimatePresence>
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditing(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className={`relative w-full max-w-md rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl backdrop-blur-xl ${darkMode ? 'bg-slate-900/90' : 'bg-white/90'}`}>
            <div className="p-8 space-y-5">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Modifica Profilo</h2>
                  <p className="text-sm text-slate-500">Aggiorna i tuoi dati personali</p>
                </div>
                <button onClick={() => setIsEditing(false)} className={`p-2 rounded-full ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-50 text-slate-400'}`}><Plus className="rotate-45" size={24} /></button>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Nome', key: 'name', placeholder: 'Il tuo nome' },
                  { label: 'Email', key: 'email', placeholder: 'La tua email' },
                  { label: 'Tipo Lavoro', key: 'jobType', placeholder: 'Es. Freelance Designer' },
                ].map(({ label, key, placeholder }) => (
                  <div key={key} className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{label}</label>
                    <input
                      type="text"
                      value={editData[key as keyof typeof editData]}
                      onChange={e => setEditData({ ...editData, [key]: e.target.value })}
                      placeholder={placeholder}
                      className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${darkMode ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-100 text-slate-900 placeholder:text-slate-400'}`}
                    />
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Paese</label>
                    <select value={editData.country} onChange={e => setEditData({ ...editData, country: e.target.value as any })} className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-100 text-slate-900'}`}>
                      <option>Italy</option><option>USA</option><option>UK</option><option>Germany</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Valuta</label>
                    <select value={editData.currency} onChange={e => setEditData({ ...editData, currency: e.target.value as any })} className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-100 text-slate-900'}`}>
                      <option>EUR</option><option>USD</option><option>GBP</option>
                    </select>
                  </div>
                </div>
              </div>
              <button onClick={handleSaveEdit} className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-xl shadow-primary/30 active:scale-[0.98] transition-all">Salva Modifiche</button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="p-6 space-y-8 pb-24"
    >
      <motion.div variants={item} className="flex flex-col items-center text-center space-y-4">
        <div className="relative group">
          <div className={`w-24 h-24 rounded-3xl border-4 shadow-xl overflow-hidden transition-all group-hover:shadow-primary/20 ${darkMode ? 'border-slate-800' : 'border-white'}`}>
            <img src={activeProfile.avatar} alt={activeProfile.name} className="w-full h-full object-cover" />
          </div>
          <button onClick={() => setIsEditing(true)} className={`absolute -bottom-2 -right-2 w-8 h-8 bg-primary text-white rounded-xl flex items-center justify-center border-2 shadow-lg transition-all active:scale-90 hover:shadow-primary/40 ${darkMode ? 'border-slate-900' : 'border-white'}`}>
            <FileEdit size={14} />
          </button>
        </div>
        <div>
          <h2 className={`text-xl font-bold transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>{activeProfile.name}</h2>
          <p className="text-sm text-slate-500">{activeProfile.jobType}</p>
        </div>
      </motion.div>

      <motion.div variants={item} className="space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">Impostazioni Profilo</h3>
        <div className={`rounded-2xl border overflow-hidden transition-colors ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
          <button className={`w-full p-4 flex items-center justify-between border-b transition-all active:bg-slate-800/10 group ${darkMode ? 'border-slate-800 hover:bg-slate-800/50' : 'border-slate-50 hover:bg-slate-50'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 transition-colors ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}><Globe size={18} /></div>
              <span className={`text-sm font-semibold transition-colors ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>Paese</span>
            </div>
            <span className="text-sm text-slate-400 flex items-center gap-1">{activeProfile.country}</span>
          </button>
          <button className={`w-full p-4 flex items-center justify-between border-b transition-all active:bg-slate-800/10 group ${darkMode ? 'border-slate-800 hover:bg-slate-800/50' : 'border-slate-50 hover:bg-slate-50'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 transition-colors ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}><CreditCard size={18} /></div>
              <span className={`text-sm font-semibold transition-colors ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>Valuta</span>
            </div>
            <span className="text-sm text-slate-400 flex items-center gap-1">{activeProfile.currency}</span>
          </button>
          <button className={`w-full p-4 flex items-center justify-between transition-all active:bg-slate-800/10 group ${darkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 transition-colors ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}><Briefcase size={18} /></div>
              <span className={`text-sm font-semibold transition-colors ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>Tipo Lavoro</span>
            </div>
            <span className="text-sm text-slate-400 flex items-center gap-1">{activeProfile.jobType}</span>
          </button>
        </div>
      </motion.div>

      <motion.div variants={item} className="space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">Cambia Profilo</h3>
        <div className="space-y-3">
          {profiles.map((p) => (
            <button
              key={p.id}
              onClick={() => onSwitchProfile(p)}
              className={`w-full p-4 rounded-2xl border flex items-center gap-4 transition-all active:scale-[0.98] ${
                activeProfile.id === p.id 
                ? (darkMode ? 'bg-primary/10 border-primary shadow-xl shadow-primary/20' : 'bg-primary/5 border-primary shadow-lg shadow-primary/10') 
                : (darkMode ? 'bg-slate-900 border-slate-800 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10' : 'bg-white border-slate-100 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5')
              }`}
            >
              <img src={p.avatar} alt={p.name} className="w-10 h-10 rounded-lg" />
              <div className="flex-1 text-left">
                <p className={`text-sm font-bold ${activeProfile.id === p.id ? 'text-primary' : (darkMode ? 'text-white' : 'text-slate-900')}`}>{p.name}</p>
                <p className="text-xs text-slate-500">{p.jobType}</p>
              </div>
              {activeProfile.id === p.id && <CheckCircle2 size={20} className="text-primary" />}
            </button>
          ))}
          <button className={`w-full p-4 rounded-2xl border border-dashed text-slate-400 flex items-center justify-center gap-2 text-sm font-bold transition-all active:scale-[0.98] hover:shadow-lg ${darkMode ? 'border-slate-800 hover:bg-slate-900 hover:border-primary/40 hover:shadow-primary/10' : 'border-slate-200 hover:bg-slate-50 hover:border-primary/20 hover:shadow-primary/5'}`}>
            <Plus size={18} />
            Aggiungi Profilo
          </button>
        </div>
      </motion.div>
    </motion.div>
    </>
  );
};

const LogoutModal = ({ isOpen, onClose, onConfirm, darkMode }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, darkMode?: boolean }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            className={`relative w-full max-w-sm rounded-[32px] p-8 shadow-2xl space-y-6 overflow-hidden transition-colors ${darkMode ? 'bg-slate-900' : 'bg-white'}`}
          >
            <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl ${darkMode ? 'bg-red-500/10' : 'bg-red-500/5'}`} />
            
            <div className="flex flex-col items-center text-center space-y-4">
              <div className={`w-20 h-20 rounded-3xl flex items-center justify-center transition-colors ${darkMode ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-500'}`}>
                <LogOut size={40} strokeWidth={1.5} />
              </div>
              <div className="space-y-2">
                <h3 className={`text-xl font-bold transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>Vuoi uscire veramente?</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Dovrai reinserire le tue credenziali per accedere nuovamente al tuo account.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button 
                onClick={onClose}
                className={`py-4 rounded-2xl font-bold transition-all active:scale-95 ${darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
              >
                Annulla
              </button>
              <button 
                onClick={onConfirm}
                className="py-4 bg-red-500 text-white rounded-2xl font-bold shadow-xl shadow-red-500/40 hover:bg-red-600 transition-all active:scale-95"
              >
                Sì, Esci
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const SettingsView = ({ darkMode, setDarkMode }: { darkMode: boolean, setDarkMode: (v: boolean) => void, key?: string }) => {
  const [selectedLang, setSelectedLang] = useState('Italiano');
  const languages = ['Italiano', 'English', 'Español', 'Français'];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.05 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20, scale: 0.98 },
    show: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { type: 'spring', stiffness: 260, damping: 20 } 
    }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="p-6 space-y-8"
    >
      {/* Theme Selection */}
      <motion.div variants={item} className="space-y-4">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Aspetto</p>
        <div className={`rounded-3xl p-2 border flex gap-2 transition-colors ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
          <button 
            onClick={() => setDarkMode(false)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl transition-all active:scale-95 ${!darkMode ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <Sun size={18} />
            <span className="text-sm font-bold">Light</span>
          </button>
          <button 
            onClick={() => setDarkMode(true)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl transition-all active:scale-95 ${darkMode ? 'bg-white text-slate-900 shadow-xl shadow-white/20' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            <Moon size={18} />
            <span className="text-sm font-bold">Dark</span>
          </button>
        </div>
      </motion.div>

      {/* Language Selection */}
      <motion.div variants={item} className="space-y-4">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Lingua Applicazione</p>
        <div className={`rounded-3xl border overflow-hidden divide-y transition-colors ${darkMode ? 'bg-slate-900 border-slate-800 divide-slate-800' : 'bg-white border-slate-100 divide-slate-50'}`}>
          {languages.map((lang) => (
            <button 
              key={lang}
              onClick={() => setSelectedLang(lang)}
              className={`w-full p-4 flex items-center justify-between group active:scale-[0.98] transition-all ${selectedLang === lang ? (darkMode ? 'bg-slate-800/80 shadow-inner' : 'bg-slate-50 shadow-inner') : (darkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50')}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${selectedLang === lang ? 'bg-primary/10 text-primary' : (darkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-50 text-slate-400')}`}>
                  <Languages size={16} />
                </div>
                <span className={`text-sm font-bold ${selectedLang === lang ? (darkMode ? 'text-white' : 'text-slate-900') : 'text-slate-500'}`}>{lang}</span>
              </div>
              {selectedLang === lang && (
                <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center text-white">
                  <CheckCircle2 size={12} strokeWidth={3} />
                </div>
              )}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Info Section */}
      <motion.div variants={item} className={`p-6 rounded-3xl space-y-2 transition-colors ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
        <p className={`text-xs font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Versione App</p>
        <p className="text-xs text-slate-500">v2.4.0 (Build 2026.03)</p>
        <div className="pt-4 flex gap-4">
          <button className="text-[10px] font-bold text-primary uppercase tracking-wider active:scale-90 transition-all hover:drop-shadow-[0_0_4px_rgba(59,130,246,0.3)]">Note di rilascio</button>
          <button className="text-[10px] font-bold text-primary uppercase tracking-wider active:scale-90 transition-all hover:drop-shadow-[0_0_4px_rgba(59,130,246,0.3)]">Supporto</button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const SecurityModal = ({ isOpen, onClose, darkMode }: { isOpen: boolean, onClose: () => void, darkMode?: boolean }) => {
  const [faceIdEnabled, setFaceIdEnabled] = useState(true);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            className={`relative w-full max-w-sm rounded-[32px] p-6 shadow-2xl space-y-6 overflow-hidden transition-colors ${darkMode ? 'bg-slate-900' : 'bg-white'}`}
          >
            <div className="flex items-center justify-between">
              <h3 className={`text-xl font-bold transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>Sicurezza</h3>
              <button onClick={onClose} className={`p-2 rounded-xl transition-all active:scale-90 hover:shadow-lg ${darkMode ? 'bg-slate-800 text-slate-400 hover:shadow-primary/10' : 'bg-slate-50 text-slate-400 hover:shadow-slate-200'}`}>
                <Plus size={20} className="rotate-45" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Face ID Option */}
              <div className={`p-4 rounded-2xl flex items-center justify-between transition-colors ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm transition-colors ${darkMode ? 'bg-slate-700 text-primary' : 'bg-white text-primary'}`}>
                    <ScanFace size={20} />
                  </div>
                  <div>
                    <p className={`text-sm font-bold transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>Face ID</p>
                    <p className="text-[10px] text-slate-500">Accesso rapido biometrico</p>
                  </div>
                </div>
                <button 
                  onClick={() => setFaceIdEnabled(!faceIdEnabled)}
                  className={`w-12 h-6 rounded-full transition-all relative active:scale-95 ${faceIdEnabled ? 'bg-primary shadow-lg shadow-primary/30' : (darkMode ? 'bg-slate-700' : 'bg-slate-200')}`}
                >
                  <motion.div 
                    animate={{ x: faceIdEnabled ? 24 : 4 }}
                    className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                  />
                </button>
              </div>

              {/* Password Option */}
              <button className={`w-full p-4 border rounded-2xl flex items-center justify-between group active:scale-[0.98] transition-all ${darkMode ? 'bg-slate-900 border-slate-800 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10' : 'bg-white border-slate-100 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${darkMode ? 'bg-slate-800 text-slate-500 group-hover:text-primary' : 'bg-slate-50 text-slate-400 group-hover:text-primary'}`}>
                    <Lock size={20} />
                  </div>
                  <div className="text-left">
                    <p className={`text-sm font-bold transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>Password</p>
                    <p className="text-[10px] text-slate-500">Aggiorna la tua chiave d'accesso</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Terms Option */}
              <button className={`w-full p-4 border rounded-2xl flex items-center justify-between group active:scale-[0.98] transition-all hover:shadow-lg ${darkMode ? 'bg-slate-900 border-slate-800 hover:border-primary/40 hover:shadow-primary/10' : 'bg-white border-slate-100 hover:border-primary/20 hover:shadow-primary/5'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${darkMode ? 'bg-slate-800 text-slate-500 group-hover:text-primary' : 'bg-slate-50 text-slate-400 group-hover:text-primary'}`}>
                    <ShieldCheck size={20} />
                  </div>
                  <div className="text-left">
                    <p className={`text-sm font-bold transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>Termini e Condizioni</p>
                    <p className="text-[10px] text-slate-500">Note legali e privacy policy</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <button 
              onClick={onClose}
              className={`w-full py-4 rounded-2xl font-bold shadow-xl active:scale-95 transition-all ${darkMode ? 'bg-white text-slate-900 shadow-slate-900/20' : 'bg-slate-900 text-white shadow-slate-200'}`}
            >
              Chiudi
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const MenuView = ({ activeProfile, onProfileClick, onSettingsClick, darkMode }: { 
  activeProfile: Profile, 
  onProfileClick: () => void, 
  onSettingsClick: () => void,
  darkMode?: boolean,
  key?: string 
}) => {
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);

  const menuItems: { label: string, icon: any, onClick: () => void, color?: string, badge?: string }[] = [
    { label: 'Impostazioni', icon: Settings, onClick: onSettingsClick },
    { label: 'Abbonamento', icon: CreditCard, onClick: () => {} },
    { label: 'Sicurezza', icon: AlertCircle, onClick: () => setIsSecurityModalOpen(true) },
    { label: 'Logout', icon: LogOut, onClick: () => setIsLogoutModalOpen(true), color: 'text-red-500' },
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.05 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 15, scale: 0.98 },
    show: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { type: 'spring', stiffness: 260, damping: 20 } 
    }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="p-6 space-y-6 pb-24"
    >
      {/* Profile Summary Card (Matching User Image) */}
      <motion.button 
        variants={item}
        onClick={onProfileClick}
        className={`w-full p-6 rounded-[32px] border flex items-center gap-5 active:scale-[0.98] transition-all shadow-sm hover:shadow-xl ${darkMode ? 'bg-slate-900 border-slate-800 hover:border-primary/40 hover:shadow-primary/10' : 'bg-white border-slate-100 hover:border-primary/20 hover:shadow-primary/5'}`}
      >
        <div className="relative">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-[#E8D5C4]'}`}>
            <img src={activeProfile.avatar} alt={activeProfile.name} className={`w-full h-full object-cover ${darkMode ? 'opacity-90' : 'mix-blend-multiply opacity-80'}`} />
          </div>
          <div className={`absolute inset-0 rounded-full border-2 ${darkMode ? 'border-slate-700/50' : 'border-white/50'}`} />
        </div>
        <div className="text-left">
          <h2 className={`text-xl font-bold leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>{activeProfile.name}</h2>
          <p className={`text-sm font-medium ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{activeProfile.jobType}</p>
        </div>
        <ChevronRight size={20} className="ml-auto text-slate-300" />
      </motion.button>

      <div className="space-y-2">
        {menuItems.map((menuItem) => {
          const Icon = menuItem.icon;
          return (
            <motion.button
              variants={item}
              key={menuItem.label}
              onClick={menuItem.onClick}
              className={`w-full p-4 rounded-2xl border flex items-center justify-between group active:scale-[0.98] transition-all hover:shadow-lg ${darkMode ? 'bg-slate-900 border-slate-800 hover:border-primary/40 hover:shadow-primary/10' : 'bg-white border-slate-100 hover:border-primary/20 hover:shadow-primary/5'}`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${menuItem.color ? 'bg-red-50 text-red-500' : (darkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-50 text-slate-400')}`}>
                  <Icon size={20} />
                </div>
                <span className={`font-bold ${menuItem.color || (darkMode ? 'text-slate-200' : 'text-slate-900')}`}>{menuItem.label}</span>
              </div>
              <div className="flex items-center gap-2">
                {menuItem.badge && <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${darkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400'}`}>{menuItem.badge}</span>}
                <ChevronRight size={18} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.button>
          );
        })}
      </div>

      <div className={`p-6 rounded-3xl space-y-4 relative overflow-hidden transition-all hover:shadow-2xl active:scale-[0.99] ${darkMode ? 'bg-primary/10 border border-primary/20 hover:border-primary/40 hover:shadow-primary/10' : 'bg-slate-900 text-white hover:shadow-slate-900/20'}`}>
        {!darkMode && <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />}
        <h3 className={`text-lg font-bold relative z-10 ${darkMode ? 'text-primary' : 'text-white'}`}>Passa a Pro</h3>
        <p className={`text-xs relative z-10 leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-400'}`}>
          Sblocca l'export per il commercialista, tasse automatiche e profili illimitati.
        </p>
        <button className="w-full bg-primary py-3 rounded-xl text-sm font-bold relative z-10 text-white shadow-lg shadow-primary/20 hover:bg-primary/90 active:scale-95 transition-all">
          Scopri i Piani
        </button>
      </div>

      <LogoutModal 
        isOpen={isLogoutModalOpen} 
        onClose={() => setIsLogoutModalOpen(false)} 
        onConfirm={() => {
          setIsLogoutModalOpen(false);
          // Handle actual logout logic here
          console.log('Logging out...');
        }} 
        darkMode={darkMode}
      />

      <SecurityModal 
        isOpen={isSecurityModalOpen} 
        onClose={() => setIsSecurityModalOpen(false)} 
        darkMode={darkMode}
      />
    </motion.div>
  );
};

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [activeProfile, setActiveProfile] = useState<Profile>(MOCK_PROFILES[0]);
  const [isProfilePage, setIsProfilePage] = useState(false);
  const [isSettingsPage, setIsSettingsPage] = useState(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => JSON.parse(localStorage.getItem('darkMode') || 'false'));
  const [documents, setDocuments] = useState<Document[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    getDocuments()
      .then(setDocuments)
      .catch(() => setDocuments(MOCK_DOCUMENTS));
    getDeadlines()
      .then(setDeadlines)
      .catch(() => setDeadlines(MOCK_DEADLINES));
    getProfiles()
      .then((data) => {
        if (data.length > 0) {
          setProfiles(data);
          const savedId = localStorage.getItem('activeProfileId');
          const saved = data.find(p => p.id === savedId);
          setActiveProfile(saved || data[0]);
        } else {
          setProfiles(MOCK_PROFILES);
        }
      })
      .catch(() => setProfiles(MOCK_PROFILES));
  }, []);

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('activeProfileId', activeProfile.id);
  }, [activeProfile]);

  const handleAddDocument = async (doc: Document) => {
    setDocuments(prev => [doc, ...prev]);
    try {
      await addDocument(doc);
    } catch {
      // errore silenzioso
    }
  };

  const totalIncome = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return documents
      .filter(doc => {
        const docYear = new Date(doc.date).getFullYear();
        return doc.type === 'invoice' && doc.status === 'paid' && docYear === currentYear;
      })
      .reduce((sum, doc) => sum + doc.amount, 0);
  }, [documents]);

  const paidPercentage = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearDocs = documents.filter(doc => {
      const docYear = new Date(doc.date).getFullYear();
      return doc.type === 'invoice' && docYear === currentYear;
    });
    if (yearDocs.length === 0) return 0;
    const paidDocs = yearDocs.filter(doc => doc.status === 'paid');
    return Math.round((paidDocs.length / yearDocs.length) * 100);
  }, [documents]);

  const viewTitle = useMemo(() => {
    if (isProfilePage) return 'Profilo';
    if (isSettingsPage) return 'Impostazioni';
    switch (activeTab) {
      case 'home': return 'Dashboard';
      case 'docs': return 'Documenti';
      case 'calendar': return 'Calendario';
      case 'menu': return 'Menu';
      default: return 'Dashboard';
    }
  }, [activeTab, isProfilePage, isSettingsPage]);

  const handleProfileClick = () => {
    setIsProfilePage(true);
    setIsSettingsPage(false);
    setActiveTab('menu');
  };

  const handleSettingsClick = () => {
    setIsSettingsPage(true);
    setIsProfilePage(false);
    setActiveTab('menu');
  };

  const handleTabChange = (tab: string) => {
    setIsProfilePage(false);
    setIsSettingsPage(false);
    setActiveTab(tab);
  };

  const handleSwitchProfile = (p: Profile) => {
    setActiveProfile(p);
    setIsProfilePage(false);
    setIsSettingsPage(false);
    setActiveTab('home');
  };

  const handleBack = () => {
    setIsProfilePage(false);
    setIsSettingsPage(false);
  };

  return (
    <div className={`max-w-md mx-auto min-h-screen flex flex-col shadow-2xl relative overflow-hidden transition-colors duration-500 ${darkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      <Header 
        title={viewTitle} 
        activeProfile={activeProfile} 
        onProfileClick={handleProfileClick} 
        showBack={isProfilePage || isSettingsPage}
        onBack={handleBack}
        darkMode={darkMode}
      />

      <main className={`flex-1 overflow-y-auto ${darkMode ? 'bg-slate-950' : ''}`}>
        <AnimatePresence mode="wait">
          {isProfilePage ? (
            <ProfileView
              key="profile"
              activeProfile={activeProfile}
              profiles={profiles}
              onSwitchProfile={handleSwitchProfile}
              onUpdateProfile={async (p) => {
                setActiveProfile(p);
                setProfiles(prev => prev.map(x => x.id === p.id ? p : x));
                try { await updateProfile(p); } catch {}
              }}
              darkMode={darkMode}
            />
          ) : isSettingsPage ? (
            <SettingsView 
              key="settings" 
              darkMode={darkMode} 
              setDarkMode={setDarkMode} 
            />
          ) : (
                <>
                  {activeTab === 'home' && <DashboardView key="home" profile={activeProfile} onProfileClick={handleProfileClick} income={totalIncome} paidPercentage={paidPercentage} documents={documents} darkMode={darkMode} />}
                  {activeTab === 'docs' && <DocumentsView key="docs" documents={documents} onAddDocument={handleAddDocument} darkMode={darkMode} />}
                  {activeTab === 'calendar' && <CalendarView key="calendar" deadlines={deadlines} darkMode={darkMode} />}
                  {activeTab === 'menu' && <MenuView key="menu" activeProfile={activeProfile} onProfileClick={handleProfileClick} onSettingsClick={handleSettingsClick} darkMode={darkMode} />}
                </>
          )}
        </AnimatePresence>
      </main>

      <BottomNav activeTab={(isProfilePage || isSettingsPage) ? 'menu' : activeTab} setActiveTab={handleTabChange} darkMode={darkMode} />
    </div>
  );
}
