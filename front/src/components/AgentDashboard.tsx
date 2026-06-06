import React, { useState, useEffect } from 'react';
import { User, LoanRequest, Loan, Repayment, InternalNotification } from '../types';
import { 
  getStoredRepayments, 
  getStoredNotifications,
  saveStoredNotifications,
  getFormattedDate,
  createNotification
} from '../dataStore';
import { getLoanRequests, getLoans, updateLoanRequestStatus, getRepayments } from '../api/loans';
import { 
  Search, 
  Clock, 
  CheckCircle, 
  XCircle, 
  FileText, 
  Percent, 
  Calendar, 
  User as UserIcon, 
  LogOut, 
  Download, 
  ShieldCheck, 
  ArrowRight,
  TrendingUp,
  Inbox,
  Activity,
  ChevronRight,
  Info,
  Loader2
} from 'lucide-react';
import LoadingButton from './LoadingButton';

interface AgentDashboardProps {
  user: User;
  onLogout: () => void;
  onGoHome?: () => void;
}

export default function AgentDashboard({ user, onLogout, onGoHome }: AgentDashboardProps) {
  // DB States
  const [requests, setRequests] = useState<LoanRequest[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [repayments, setRepayments] = useState<Repayment[]>([]);
  const [notifications, setNotifications] = useState<InternalNotification[]>([]);

  // Sub-tabs
  const [activeTab, setActiveTab] = useState<'pending' | 'repayments' | 'processed'>('pending');

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Request detail / evaluation card
  const [selectedReq, setSelectedReq] = useState<LoanRequest | null>(null);

  // Evaluation form variables
  const [interestRate, setInterestRate] = useState<number>(8); // default 8% interest
  const [customDuree, setCustomDuree] = useState<number>(12); // months
  const [dateLimite, setDateLimite] = useState<string>(getFormattedDate(365)); // 1 year from now
  const [rejectionReason, setRejectionReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);

  // Load database stores
  const loadData = async () => {
    setIsDataLoading(true);
    try {
      const apiReqs = await getLoanRequests();
      setRequests(apiReqs);
      const apiLoans = await getLoans();
      setLoans(apiLoans);
      const apiReps = await getRepayments();
      setRepayments(apiReps);
    } catch (err) {
      console.error("Erreur chargement données:", err);
    } finally {
      setIsDataLoading(false);
    }
    
    const allNotifs = getStoredNotifications();
    setNotifications(allNotifs.filter(n => n.user_id === user.id || n.user_id === 'all'));
  };

  useEffect(() => {
    loadData();
  }, [user.id]);

  // Handle validating a requests (Moves to 'Validé par l'agent')
  const handleAgentValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq) return;

    setIsLoading(true);
    try {
        await updateLoanRequestStatus(selectedReq.id, "Validé par l'agent");
        
        // Save temporary calculation settings into storage or session as suggestion for final Admin approval
        localStorage.setItem(`agent_rates_${selectedReq.id}`, JSON.stringify({
            rate: interestRate,
            duree: customDuree,
            date_limite: dateLimite,
            agent_id: user.id,
            agent_nom: `${user.prenom} ${user.nom}`
        }));

        // Reset local variable selector & reload
        setSelectedReq(null);
        loadData();
        alert("Dossier validé techniquement.");
    } catch (err: any) {
        alert("Erreur lors de la validation : " + err.message);
    } finally {
        setIsLoading(false);
    }
  };

  // Handle rejecting a requests (Status moves to 'Refusé')
  const handleAgentReject = async () => {
    if (!selectedReq) return;

    setIsLoading(true);
    try {
        await updateLoanRequestStatus(selectedReq.id, 'Refusé');
        setSelectedReq(null);
        setRejectionReason('');
        loadData();
        alert("Dossier refusé.");
    } catch (err: any) {
        alert("Erreur lors du refus : " + err.message);
    } finally {
        setIsLoading(false);
    }
  };

  // Filter requests according to search
  const filteredRequests = requests.filter(r => {
    const term = searchQuery.toLowerCase();
    const userNom = r.user_nom?.toLowerCase() || '';
    const userPrenom = r.user_prenom?.toLowerCase() || '';
    const reqId = r.id?.toLowerCase() || '';
    
    return userNom.includes(term) || userPrenom.includes(term) || reqId.includes(term);
  });

  const pendingCount = (requests || []).filter(r => r?.statut === 'En attente').length;
  const processedByAgentCount = (requests || []).filter(r => r?.statut !== 'En attente').length;

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800 font-sans" id="agent-dashboard-root">
      
      {/* Header element */}
      <header className="bg-slate-900 text-white py-4 px-6 md:px-12 flex justify-between items-center sticky top-0 z-40 shadow-md">
        <div 
          className="flex items-center space-x-3 cursor-pointer group"
          onClick={onGoHome}
        >
          <div className="p-2.5 bg-indigo-500 rounded-xl text-white shadow-lg shadow-indigo-900/30 group-hover:scale-105 transition-transform">
            <Activity size={22} />
          </div>
          <div>
            <span className="font-display font-bold text-lg text-white block leading-tight">Espace AGENT Crédit</span>
            <span className="text-[10px] text-indigo-450 font-mono tracking-widest uppercase block whitespace-nowrap font-bold">Superviseur Général BG Microfinance</span>
          </div>
        </div>

        <div className="flex items-center space-x-8">
          <button 
            onClick={() => setActiveTab('stats')}
            className={`text-xs font-bold uppercase tracking-wider transition ${activeTab === 'stats' ? 'text-indigo-400' : 'text-slate-400 hover:text-white'}`}
          >
            Tableau de bord
          </button>

          <div className="hidden sm:flex flex-col items-end">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Agent connecté</span>
            <span className="text-xs font-mono text-slate-300">{user.email}</span>
          </div>
          <button 
            onClick={onLogout}
            className="flex items-center space-x-1 px-3 py-1.5 border border-slate-700 hover:border-slate-600 rounded-lg text-xs font-semibold text-slate-400 transition"
          >
            <LogOut size={13} />
            <span>Quitter</span>
          </button>
        </div>
      </header>

      {/* Main Container workspace */}
      <main className="max-w-7xl mx-auto py-8 px-6 md:px-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Stats overview and subtabs navigation */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Statistical brief counter */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider">État des dossiers</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                <span className="block text-2xl font-black text-amber-700 font-mono">{pendingCount}</span>
                <span className="block text-[10px] font-bold text-slate-500">En attente</span>
              </div>
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                <span className="block text-2xl font-black text-indigo-700 font-mono">{processedByAgentCount}</span>
                <span className="block text-[10px] font-bold text-slate-500">Traités</span>
              </div>
            </div>
          </div>

          {/* Navigation rail inside Console */}
          <div className="bg-white rounded-2xl border border-slate-200 p-2.5 space-y-1 shadow-sm font-medium text-slate-600 text-sm">
            <button
              onClick={() => { setActiveTab('pending'); setSelectedReq(null); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition ${activeTab === 'pending' ? 'bg-slate-900 text-white font-bold' : 'hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <span className="flex items-center space-x-2">
                <Inbox size={18} />
                <span>Demandes d'études ({requests.filter(r => r.statut === 'En attente').length})</span>
              </span>
              <ChevronRight size={14} />
            </button>

            <button
              onClick={() => { setActiveTab('processed'); setSelectedReq(null); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition ${activeTab === 'processed' ? 'bg-slate-900 text-white font-bold' : 'hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <span className="flex items-center space-x-2">
                <CheckCircle size={18} />
                <span>Dossiers Orientés ({requests.filter(r => r.statut !== 'En attente').length})</span>
              </span>
              <ChevronRight size={14} />
            </button>

            <button
              onClick={() => { setActiveTab('repayments'); setSelectedReq(null); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition ${activeTab === 'repayments' ? 'bg-slate-900 text-white font-bold' : 'hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <span className="flex items-center space-x-2">
                <FileText size={18} />
                <span>Flux Remboursements</span>
              </span>
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Search bar helper */}
          <div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Search size={16} />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par Nom ou Réf..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-slate-800 shadow-sm"
              />
            </div>
          </div>

          {/* Guidelines box */}
          <div className="p-4 bg-slate-100 rounded-2xl border border-slate-200 text-[11px] text-slate-500 leading-relaxed font-sans">
            <dt className="font-bold text-slate-700 uppercase tracking-widest text-[9px] mb-1">Gouvernance microfinance :</dt>
            <p>Conformément aux directives de micro-crédit nationales, veuillez vérifier soigneusement les relevés d'activités ainsi que l'éligibilité d'identité des emprunteurs avant d'accorder une pré-validation.</p>
          </div>

        </div>

        {/* Right Dashboard Area */}
        <div className="lg:col-span-9 space-y-8">
          
          {isDataLoading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <Loader2 className="w-12 h-12 text-teal-600 animate-spin" />
              <p className="text-slate-500 font-medium animate-pulse">Chargement des dossiers, veuillez patienter...</p>
            </div>
          ) : (
            <>
              {activeTab === 'pending' && (
            /* Tab Content: Pending evaluations */
            <div className="space-y-6">
              
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="font-display font-semibold text-slate-900 text-lg">Dossiers de micro-crédit en attente d'étude technique</h3>
                  <p className="text-xs text-slate-500">Sélectionnez une demande pour ouvrir le module d'évaluation et configurer les barèmes.</p>
                </div>

                {filteredRequests.filter(r => r.statut === 'En attente').length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-sm">
                    Aucun nouveau dossier à examiner pour l'instant.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredRequests.filter(r => r.statut === 'En attente').map(req => (
                      <button
                        key={req.id}
                        onClick={() => {
                          setSelectedReq(req);
                          setCustomDuree(req.duree);
                          setInterestRate(8);
                          setDateLimite(getFormattedDate(req.duree * 30));
                        }}
                        className={`w-full text-left p-4 rounded-xl border transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${selectedReq?.id === req.id ? 'border-indigo-500 bg-indigo-50/10' : 'border-slate-150 bg-white hover:border-slate-300'}`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-800 font-bold font-mono text-[10px] rounded">
                              {req.id}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">Date: {req.created_at}</span>
                          </div>
                          <h4 className="font-display font-bold text-slate-900">
                            Client : {req.user_prenom} {req.user_nom}
                          </h4>
                          <span className="text-[11px] text-slate-500 font-medium block">
                            Motif : {req.motif}
                          </span>
                        </div>

                        <div className="flex flex-row sm:flex-col items-end justify-between sm:justify-start w-full sm:w-auto text-right border-t sm:border-t-0 border-slate-100 pt-2 sm:pt-0">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold">MONTANT</span>
                            <span className="text-sm font-black text-slate-950 font-mono">{req.montant.toLocaleString()} F CFA</span>
                          </div>
                          <div className="sm:mt-1">
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-800 font-bold text-[9px] rounded-full uppercase border border-amber-200">
                              En attente d'avis
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Opened evaluation workspace panel */}
              {selectedReq && (
                <div className="bg-white rounded-2xl border lg:border-indigo-500 border-slate-200 p-5 sm:p-6 shadow-md space-y-6 animate-fade-in" id="evaluation-workspace">
                  <div className="flex justify-between items-center border-b border-slate-150 pb-3">
                    <div>
                      <h3 className="font-display font-semibold text-indigo-900 text-base">Module d'Étude Technique : Dossier {selectedReq.id}</h3>
                      <p className="text-xs text-slate-500">Validez les critères et configurez la proposition commerciale à l'attention de l'administrateur.</p>
                    </div>
                    <button onClick={() => setSelectedReq(null)} className="text-slate-400 hover:text-slate-700">
                      Fermer
                    </button>
                  </div>

                  {/* Client background card */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-150 rounded-xl text-xs">
                    <div>
                      <span className="text-slate-400 block font-medium">Bénéficiaire</span>
                      <p className="font-bold text-slate-900">{selectedReq.user_prenom} {selectedReq.user_nom}</p>
                      <p className="text-slate-500 font-mono text-[10px] mt-0.5">{selectedReq.id}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Revenus Mensuels</span>
                      <p className="font-bold text-slate-900 font-mono">{selectedReq.revenus.toLocaleString()} F CFA</p>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Capital Sollicité</span>
                      <p className="font-bold text-slate-950 font-mono text-sm">{selectedReq.montant.toLocaleString()} F</p>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Durée Estimée</span>
                      <p className="font-bold text-slate-900">{selectedReq.duree} Mois</p>
                    </div>
                  </div>

                  {/* Document downloads simulators widgets */}
                  <div className="space-y-2.5">
                    <span className="text-xs font-bold uppercase text-slate-500 tracking-wider block">Pièces justificatives fournies :</span>
                    
                    {selectedReq.documents.length === 0 ? (
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-start space-x-2">
                        <span>⚠️ Aucune pièce justificative jointe à ce dossier. Veuillez exiger des garanties avant toute validation technique.</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {selectedReq.documents.map(doc => (
                          <div key={doc.id} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                            <div className="flex items-center space-x-2 text-xs">
                              <FileText size={18} className="text-indigo-700" />
                              <div className="max-w-[180px] truncate">
                                <span className="font-bold text-slate-900 block truncate">{doc.file_name}</span>
                                <span className="text-[10px] text-slate-400">{doc.type_document}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => alert(`Téléchargement simulé de la pièce jointe : ${doc.file_name}`)}
                              className="p-1 text-slate-500 hover:text-slate-950 hover:bg-slate-50 rounded"
                              title="Télécharger la pièce justificative"
                            >
                              <Download size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Decision workflow area */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-8 border-t border-slate-100 pt-6">
                    
                    {/* Acceptance column */}
                    <div className="md:col-span-7 space-y-4">
                      <div className="flex items-center space-x-2 text-indigo-800">
                        <ShieldCheck size={18} />
                        <h4 className="font-bold font-display text-sm">Option A : Valider Techniquement</h4>
                      </div>

                      <form onSubmit={handleAgentValidate} className="space-y-4 text-xs font-semibold">
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-slate-500 uppercase tracking-wider text-[10px]">Taux d'intérêt (%)</label>
                            <input
                              type="number"
                              min="1"
                              max="30"
                              required
                              value={interestRate}
                              onChange={(e) => setInterestRate(Number(e.target.value))}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono block focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                            />
                            <span className="text-[10px] text-slate-400">Taux recommandé : 8%</span>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-slate-500 uppercase tracking-wider text-[10px]">Périodicité de mensualité</label>
                            <select
                              value={customDuree}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setCustomDuree(val);
                                setDateLimite(getFormattedDate(val * 30));
                              }}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                            >
                              {[3,6,12,18,24,36].map(m => (
                                <option key={m} value={m}>{m} Mois</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-slate-500 uppercase tracking-wider text-[10px]">Date limite de remboursement finale suggérée</label>
                          <input
                            type="date"
                            required
                            value={dateLimite}
                            onChange={(e) => setDateLimite(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono block focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                          />
                        </div>

                        <div className="p-3 bg-indigo-50 text-indigo-900 rounded-xl space-y-1 block font-mono text-[11px] border border-indigo-100">
                          <div className="flex justify-between">
                            <span>Capital de base :</span>
                            <span>{selectedReq.montant.toLocaleString()} F CFA</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total à terme ({interestRate}%) :</span>
                            <span className="font-bold text-indigo-750">{(selectedReq.montant * (1 + (interestRate / 100))).toLocaleString()} F CFA</span>
                          </div>
                        </div>

                        <LoadingButton
                          type="submit"
                          isLoading={isLoading}
                          loadingText="Validation..."
                          className="w-full py-3 rounded-xl transition shadow flex items-center justify-center space-x-1"
                        >
                          <span>Pré-valider et envoyer à l'administrateur</span>
                          <ArrowRight size={14} />
                        </LoadingButton>
                      </form>
                    </div>

                    {/* Rejection column */}
                    <div className="md:col-span-5 border-t md:border-t-0 md:border-l border-slate-250/80 pt-6 md:pt-0 md:pl-6 space-y-4">
                      
                      <div className="flex items-center space-x-2 text-rose-800">
                        <XCircle size={18} />
                        <h4 className="font-bold font-display text-sm">Option B : Rejeter la demande</h4>
                      </div>

                      <div className="space-y-4 text-xs">
                        <div className="space-y-1.5">
                          <label className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Justification de refus d'avis</label>
                          <textarea
                            rows={3}
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Indiquez explicitement pourquoi le dossier ne remplit pas les conditions afin d'alerter le client..."
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800 resize-none font-sans"
                          />
                        </div>

                        <LoadingButton
                          type="button"
                          onClick={handleAgentReject}
                          isLoading={isLoading}
                          loadingText="Refus..."
                          className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl transition"
                        >
                          Notifier de mon refus
                        </LoadingButton>
                      </div>

                    </div>

                  </div>

                </div>
              )}

            </div>
          )}

          {activeTab === 'processed' && (
            /* Tab: Done evaluations logs */
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-2">
                <h3 className="font-display font-semibold text-slate-900 text-lg">Dossiers orientés et historisés</h3>
                <p className="text-xs text-slate-500">Liste exhaustive des demandes de microfinance orientées par l'équipe technique.</p>
              </div>

              {requests.filter(r => r.statut !== 'En attente').length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  Aucun dossier n'a été traité pour l'instant.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                        <th className="py-2.5 px-4">Référence</th>
                        <th className="py-2.5 px-4">Client</th>
                        <th className="py-2.5 px-4">Montant sollicitée</th>
                        <th className="py-2.5 px-4">Projet / Échéance</th>
                        <th className="py-2.5 px-4 text-right">Statut Final</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {requests.filter(r => r.statut !== 'En attente').map(req => {
                        let statusColor = 'bg-slate-100 text-slate-800';
                        if (req.statut === 'Refusé') statusColor = 'bg-rose-100 text-rose-850 border overflow-hidden border-rose-200';
                        else if (req.statut === 'Validé par l\'agent') statusColor = 'bg-blue-100 text-blue-800 border border-blue-200';
                        else statusColor = 'bg-indigo-100 text-indigo-850 border border-indigo-200';

                        return (
                          <tr key={req.id} className="hover:bg-slate-50/40">
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{req.id}</td>
                            <td className="py-3.5 px-4">
                              <span className="font-semibold text-slate-900 block">{req.user_prenom} {req.user_nom}</span>
                              <span className="text-[10px] text-slate-400 font-mono block mt-0.5">Revenus : {req.revenus.toLocaleString()} F CFA</span>
                            </td>
                            <td className="py-3.5 px-4 font-bold text-slate-900 font-mono">
                              {req.montant.toLocaleString()} F CFA
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate" title={req.motif}>
                              {req.motif}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <span className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-bold ${statusColor}`}>
                                {req.statut}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'repayments' && (
            /* Tab: Track repayments received across system */
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="border-b border-slate-150 pb-3">
                <h3 className="font-display font-semibold text-slate-900 text-lg">Registres des Remboursements Enregistrés</h3>
                <p className="text-xs text-slate-500 font-sans">Visualisation comptable de tous les dépôts crédités auprès du secrétariat aux crédits.</p>
              </div>

              {repayments.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  Aucun versement n'a été consigné ou récupéré pour l'instant.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs font-mono">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                        <th className="py-3 px-4">Référence Dépôt</th>
                        <th className="py-3 px-4">Bénéficiaire</th>
                        <th className="py-3 px-4">Référence Prêt</th>
                        <th className="py-3 px-4 text-center">Date Heure Versement</th>
                        <th className="py-3 px-4 text-right font-semibold text-indigo-805">Montant Crédité</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {repayments.map(rep => {
                        const clientName = `${(rep as any).client_prenom || ''} ${(rep as any).client_nom || ''}`.trim() || '—';
                        const dateStr = rep.date_paiement
                          ? new Date(rep.date_paiement).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                          : '—';
                        return (
                          <tr key={rep.id} className="hover:bg-slate-50/50">
                            <td className="py-3.5 px-4 font-bold text-slate-900">{rep.id}</td>
                            <td className="py-3.5 px-4 font-sans font-semibold text-slate-800">{clientName}</td>
                            <td className="py-3.5 px-4 text-slate-600">{rep.loan_id}</td>
                            <td className="py-3.5 px-4 text-center text-slate-500">{dateStr}</td>
                            <td className="py-3.5 px-4 text-right text-indigo-705 font-bold">
                              + {rep.montant.toLocaleString()} F CFA
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
            </>
          )}

        </div>

      </main>

    </div>
  );
}
