import React, { useState, useEffect } from 'react';
import { User, LoanRequest, Loan, Repayment, InternalNotification } from '../types';
import { 
  getStoredLoans, 
  saveStoredLoans, 
  getStoredRepayments, 
  getStoredNotifications,
  generateId,
  getFormattedDate,
  buildEcheancier,
  createNotification
} from '../dataStore';
import { getUsers, createAgent, toggleUserActive, deleteUser } from '../api/users';
import { getLoanRequests, getLoans, grantLoan, updateLoanRequestStatus, verifyGrant, applyLoanPenalty, getRepayments } from '../api/loans';
import { 
  ShieldCheck, 
  Users, 
  Briefcase, 
  TrendingUp, 
  CheckCircle, 
  XOctagon, 
  Check, 
  X, 
  UserPlus, 
  UserCheck, 
  UserX, 
  Trash2, 
  Clock, 
  FileText, 
  LogOut, 
  DollarSign, 
  BarChart, 
  Plus,
  AlertTriangle,
  FileCheck,
  Percent,
  Search,
  Loader2
} from 'lucide-react';
import LoadingButton from './LoadingButton';

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
  onGoHome?: () => void;
}

export default function AdminDashboard({ user, onLogout, onGoHome }: AdminDashboardProps) {
  // DB States
  const [users, setUsers] = useState<User[]>([]);
  const [requests, setRequests] = useState<LoanRequest[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [repayments, setRepayments] = useState<Repayment[]>([]);
  
  // Dashboard navigation sub-tab
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'requests' | 'loans'>('stats');

  // Search filter
  const [userSearch, setUserSearch] = useState('');
  const [loanSearch, setLoanSearch] = useState('');

  // Modals / Creators
  const [showAddAgentModal, setShowAddAgentModal] = useState(false);
  const [selectedReqForFinalStudy, setSelectedReqForFinalStudy] = useState<LoanRequest | null>(null);

  // New Agent Account creator form inputs
  const [agentNom, setAgentNom] = useState('');
  const [agentPrenom, setAgentPrenom] = useState('');
  const [agentTel, setAgentTel] = useState('');
  const [agentEmail, setAgentEmail] = useState('');
  const [agentPassword, setAgentPassword] = useState('');

  // Late Fee Penalties applier state
  const [targetLoanForPenalties, setTargetLoanForPenalties] = useState<Loan | null>(null);
  const [penaltyAmount, setPenaltyAmount] = useState<number>(15000);
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);

  // Load all system records
  const loadAllDb = async () => {
    setIsDataLoading(true);
    try {
      const apiUsers = await getUsers();
      setUsers(apiUsers);
      const apiRequests = await getLoanRequests();
      setRequests(apiRequests);
      const apiLoans = await getLoans();
      setLoans(apiLoans);
      const apiReps = await getRepayments();
      setRepayments(apiReps);
    } catch (err) {
      console.error("Erreur chargement données:", err);
    } finally {
      setIsDataLoading(false);
    }
  };

  useEffect(() => {
    loadAllDb();
    
    // Detect FedaPay return params
    const params = new URLSearchParams(window.location.hash.includes('?') ? window.location.hash.split('?')[1] : window.location.search);
    const fedapayId = params.get('id');
    const reqId = params.get('req');
    
    if (fedapayId && reqId) {
        handleFinalVerify(fedapayId, reqId);
    }
  }, []);

  const handleFinalVerify = async (transactionId: string, requestId: string) => {
    try {
        const res = await verifyGrant(transactionId, requestId);
        if (res.success) {
            alert("✨ Succès ! Le prêt a été officiellement accordé après confirmation du paiement FedaPay.");
            // Clean URL params to avoid re-triggering
            window.history.replaceState({}, document.title, window.location.pathname + window.location.hash.split('?')[0]);
            loadAllDb();
        } else {
            alert("⚠️ La transaction FedaPay n'est pas encore validée ou a échoué : " + res.message);
        }
    } catch (err: any) {
        console.error("Verification error:", err);
    }
  };

  // Filter lists
  const filteredUsers = users.filter(u => {
    const term = userSearch.toLowerCase();
    const nom = u.nom?.toLowerCase() || '';
    const prenom = u.prenom?.toLowerCase() || '';
    const email = u.email?.toLowerCase() || '';
    
    const matchName = nom.includes(term) || prenom.includes(term);
    const matchEmail = email.includes(term);
    return (matchName || matchEmail) && u.id !== 'USR-ADMIN' && u.id !== 'USR-ADMIN-001';
  });

  const filteredLoans = loans.filter(l => {
    const term = loanSearch.toLowerCase();
    const clientNom = l.client_nom?.toLowerCase() || '';
    const clientPrenom = l.client_prenom?.toLowerCase() || '';
    const loanId = l.id?.toLowerCase() || '';
    
    return clientNom.includes(term) || clientPrenom.includes(term) || loanId.includes(term);
  });

  // Action: Toggle Account Active state (Deactivate / Reactivate account per specs)
  const handleToggleUserActive = async (userId: string) => {
    try {
        await toggleUserActive(userId);
        loadAllDb();
    } catch (err: any) {
        alert(err.message);
    }
  };

  // Action: Delete user account per specs
  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir de supprimer ce compte définitivement de la base de données ?")) return;
    
    try {
        await deleteUser(userId);
        loadAllDb();
    } catch (err: any) {
        alert(err.message);
    }
  };

  // Action: Register new Credit Agent per specs
  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentEmail || !agentPassword) return;

    setIsLoading(true);
    try {
        await createAgent({
            nom: agentNom.toUpperCase().trim(),
            prenom: agentPrenom.trim(),
            telephone: agentTel.trim(),
            email: agentEmail.toLowerCase().trim(),
            password: agentPassword,
            role: 'agent'
        });

        // Cleanup form
        setAgentNom('');
        setAgentPrenom('');
        setAgentTel('');
        setAgentEmail('');
        setAgentPassword('');
        setShowAddAgentModal(false);
        
        loadAllDb();
    } catch (err: any) {
        alert(err.message);
    } finally {
        setIsLoading(false);
    }
  };

  // Action Step 3: Final Acceptance / Granting loan
  const handleFinalAccept = async (req: LoanRequest) => {
    setIsLoading(true);
    try {
        const result = await grantLoan(req.id);
        
        if (result.payment_url) {
            const openUrl = window.confirm(
                `✅ Initiation du décaissement réussie.\n\nVous allez être redirigé vers FedaPay pour simuler le transfert de fonds de ${req.montant.toLocaleString()} FCFA.\n\nLe prêt sera officiellement accordé après la confirmation de votre transaction.`
            );
            if (openUrl) {
                window.open(result.payment_url, '_self'); // Redirect current tab to allow callback to work better
            }
        } else {
            alert("❌ Erreur : Aucune URL de paiement n'a été générée par le système.");
        }
    } catch (err: any) {
        alert("Erreur lors de l'octroi du prêt : " + err.message);
    } finally {
        setIsLoading(false);
    }
  };

  // Action Step 3: Final rejection of a loan request
  const handleFinalReject = async (req: LoanRequest) => {
    try {
        await updateLoanRequestStatus(req.id, 'Refusé');
        loadAllDb();
        alert("Demande refusée définitivement.");
        setSelectedReqForFinalStudy(null);
    } catch (err: any) {
        alert("Erreur lors du refus : " + err.message);
    }
  };

  // Apply Late penalty fees
  const handleApplyLatePenalties = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetLoanForPenalties) return;

    setIsLoading(true);
    try {
        await applyLoanPenalty(targetLoanForPenalties.id, penaltyAmount);
        alert(`✅ Pénalités de ${penaltyAmount.toLocaleString()} FCFA appliquées avec succès.`);
        setTargetLoanForPenalties(null);
        loadAllDb();
    } catch (err: any) {
        alert("Erreur lors de l'application des pénalités : " + err.message);
    } finally {
        setIsLoading(false);
    }
  };

  // Compute Statistics Cards Calculations
  const totalLoanedCapital = (loans || []).reduce((sum, l) => sum + (l.montant || 0), 0);
  const totalRepaymentsReceived = (repayments || []).reduce((sum, r) => sum + (r.montant || 0), 0);
  const totalClientsCount = (users || []).filter(u => u?.role === 'client').length;
  const totalAgentsCount = (users || []).filter(u => u?.role === 'agent').length;
  const activeLoansList = (loans || []).filter(l => l?.statut === 'En cours');
  const delayedLoansCount = (loans || []).filter(l => l?.statut === 'En retard').length;
  const settledLoansCount = (loans || []).filter(l => l?.statut === 'Soldé').length;

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800 font-sans" id="admin-dashboard-root">
      
      {/* Top Banner Administration space */}
      <nav className="bg-slate-950 text-white py-4 px-6 md:px-12 flex justify-between items-center sticky top-0 z-45 border-b border-slate-900 shadow-md">
        <div 
          className="flex items-center space-x-3 cursor-pointer group" 
          onClick={onGoHome}
        >
          <div className="p-2.5 bg-indigo-500 rounded-xl text-white shadow-lg shadow-indigo-900/30 group-hover:scale-105 transition-transform">
            <ShieldCheck size={22} />
          </div>
          <div>
            <span className="font-display font-bold text-lg text-white block leading-tight">Superviseur Général</span>
            <span className="text-[10px] text-indigo-450 font-mono tracking-widest uppercase block whitespace-nowrap">BG Microfinance</span>
          </div>
        </div>

        <div className="flex items-center space-x-8">
          <button 
            onClick={() => setActiveTab('stats')}
            className={`text-xs font-bold uppercase tracking-wider transition ${activeTab === 'stats' ? 'text-indigo-400' : 'text-slate-400 hover:text-white'}`}
          >
            Tableau de bord
          </button>
          
          <span className="hidden sm:inline text-xs font-mono text-slate-450 uppercase font-semibold tracking-wider">
            Admin connecté : admin@bg.com
          </span>
          <button 
            onClick={onLogout}
            className="flex items-center space-x-1 px-3 py-1.5 border border-slate-800 hover:border-slate-700 rounded-lg text-xs font-semibold text-slate-350 transition duration-150"
          >
            <LogOut size={13} />
            <span>Déconnecter l'Admin</span>
          </button>
        </div>
      </nav>

      {/* Main Container structure */}
      <div className="max-w-7xl mx-auto py-8 px-6 md:px-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Stats panels navigation */}
        <div className="lg:col-span-3 space-y-6">
          
          <div className="bg-white rounded-2xl border border-slate-200 p-2.5 space-y-1 shadow-sm font-semibold text-slate-600 text-sm">
            
            <button
              onClick={() => setActiveTab('stats')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition ${activeTab === 'stats' ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-900/10' : 'hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <span className="flex items-center space-x-2">
                <BarChart size={18} />
                <span>Supervision Générale</span>
              </span>
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition ${activeTab === 'users' ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-900/10' : 'hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <span className="flex items-center space-x-2">
                <Users size={18} />
                <span>Gérer les Comptes ({users.filter(u => u.id !== 'USR-ADMIN').length})</span>
              </span>
            </button>

            <button
              onClick={() => setActiveTab('requests')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition ${activeTab === 'requests' ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-900/10' : 'hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <span className="flex items-center space-x-2">
                <Clock size={18} />
                <span>Arbitrages Finaux ({requests.filter(r => r.statut === "Validé par l'agent").length})</span>
              </span>
              {requests.filter(r => r.statut === "Validé par l'agent").length > 0 && (
                <span className="px-1.5 py-0.5 bg-rose-500 text-white rounded-full text-[9px] font-bold font-mono">
                  {requests.filter(r => r.statut === "Validé par l'agent").length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('loans')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition ${activeTab === 'loans' ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-900/10' : 'hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <span className="flex items-center space-x-2">
                <FileCheck size={18} />
                <span>Registre des Prêts ({loans.length})</span>
              </span>
            </button>

          </div>

          <div className="p-4 bg-slate-900 text-slate-400 rounded-2xl space-y-3 shadow-sm border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-widest">Contrôle de conformité</span>
            <p className="text-xs leading-relaxed font-sans">
              L'étape 3 requiert impérativement qu'un conseiller financier (Agent) ait initiallement pré-validé le dossier. Le deblocage officiel est une décharge administrative de signature du superviseur.
            </p>
          </div>

        </div>

        {/* Right Admin canvas */}
        <div className="lg:col-span-9 space-y-6">
          
          {isDataLoading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <Loader2 className="w-12 h-12 text-teal-600 animate-spin" />
              <p className="text-slate-500 font-medium animate-pulse">Chargement des données en cours, veuillez patienter...</p>
            </div>
          ) : (
            <>
              {activeTab === 'stats' && (
            /* Dashboard Home Stats tab */
            <div className="space-y-6">
              
              {/* Financial counters grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                
                {/* Total amount lent */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] text-slate-400 font-black uppercase block tracking-wider">Montant Total Prêté</span>
                  <span className="text-2xl font-black text-slate-900 block font-mono mt-1">{totalLoanedCapital.toLocaleString()} FCFA</span>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
                    <div className="bg-indigo-650 h-full" style={{ width: '100%' }}></div>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-2">Dossiers agréés {loans.length} au total</span>
                </div>

                {/* Total repayment gathered */}
                <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-sm bg-gradient-to-tr from-indigo-50/20 to-white">
                  <span className="text-[10px] text-indigo-600 font-black uppercase block tracking-wider">Montant Total Recouvré</span>
                  <span className="text-2xl font-black text-indigo-808 block font-mono mt-1">{totalRepaymentsReceived.toLocaleString()} FCFA</span>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
                    <div className="bg-indigo-600 h-full" style={{ width: `${Math.round((totalRepaymentsReceived / (totalLoanedCapital || 1)) * 100)}%` }}></div>
                  </div>
                  <span className="text-[10px] text-indigo-705/80 block mt-2">
                    Taux de recouvrement : {Math.round((totalRepaymentsReceived / (totalLoanedCapital || 1)) * 100)}%
                  </span>
                </div>

                {/* Risk late and defaults */}
                <div className="bg-white p-6 rounded-2xl border border-rose-100 shadow-sm bg-gradient-to-tr from-rose-50/20 to-white col-span-1 sm:col-span-2 md:col-span-1">
                  <span className="text-[10px] text-rose-600 font-bold uppercase block tracking-wider">Prêts en retard constaté</span>
                  <span className="text-2xl font-black text-rose-800 block font-mono mt-1">{delayedLoansCount} d'impayés</span>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
                    <div className="bg-rose-500 h-full" style={{ width: `${Math.round((delayedLoansCount / (loans.length || 1)) * 100)}%` }}></div>
                  </div>
                  <span className="text-[10px] text-rose-700 block mt-2">
                    Nécessite d'appliquer des pénalités
                  </span>
                </div>

              </div>

              {/* Counts of Accounts Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                
                <div className="bg-white p-4 rounded-xl border border-slate-200 text-center font-mono">
                  <span className="text-[10px] text-slate-400 block font-bold">CLIENTS INSCRITS</span>
                  <span className="text-xl font-bold text-slate-900 block mt-1">{totalClientsCount}</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 text-center font-mono">
                  <span className="text-[10px] text-slate-400 block font-bold">AGENTS CRÉDIT</span>
                  <span className="text-xl font-bold text-slate-900 block mt-1">{totalAgentsCount}</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 text-center font-mono">
                  <span className="text-[10px] text-slate-400 block font-bold">DOSSIERS EN COURS</span>
                  <span className="text-xl font-bold text-slate-900 block mt-1">{activeLoansList.length}</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 text-center font-mono">
                  <span className="text-[10px] text-slate-400 block font-bold">PRÊTS SOLDÉS</span>
                  <span className="text-xl font-bold text-indigo-805 block mt-1">{settledLoansCount}</span>
                </div>

              </div>

              {/* Visual mini-histograms (SVG charts as per graphics guidelines) */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3 h-10">
                  <h3 className="font-display font-semibold text-slate-900 text-sm">Visualisation des Flux de Trésorerie</h3>
                  <span className="text-xs text-slate-400 font-mono">Rapports des décaissements et remboursements</span>
                </div>

                {/* SVG Graphics representation */}
                <div className="flex flex-col md:flex-row gap-6">
                  
                  {/* Left chart */}
                  <div className="flex-1 p-4 bg-slate-50 border border-slate-150 rounded-2xl space-y-3">
                    <span className="text-xs font-bold text-slate-600 block uppercase">Prêts par Catégorie de Statut</span>
                    <div className="h-44 flex items-end justify-around pb-2 border-b border-slate-200 relative pt-4">
                      {/* Bar 1 (Active) */}
                      <div className="flex flex-col items-center space-y-1">
                        <span className="text-[10px] font-bold font-mono text-slate-700">{activeLoansList.length}</span>
                        <div className="w-10 bg-amber-500 rounded-t" style={{ height: `${Math.max(10, activeLoansList.length * 30)}px` }}></div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Actifs</span>
                      </div>

                      {/* Bar 2 (Soldé) */}
                      <div className="flex flex-col items-center space-y-1">
                        <span className="text-[10px] font-bold font-mono text-slate-705">{settledLoansCount}</span>
                        <div className="w-10 bg-indigo-600 rounded-t" style={{ height: `${Math.max(10, settledLoansCount * 30)}px` }}></div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Soldés</span>
                      </div>

                      {/* Bar 3 (Retards) */}
                      <div className="flex flex-col items-center space-y-1">
                        <span className="text-[10px] font-bold font-mono text-slate-700">{delayedLoansCount}</span>
                        <div className="w-10 bg-rose-600 rounded-t" style={{ height: `${Math.max(10, delayedLoansCount * 30)}px` }}></div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Retards</span>
                      </div>
                    </div>
                  </div>

                  {/* Right ratios */}
                  <div className="w-full md:w-80 p-4 bg-slate-50 border border-slate-150 rounded-2xl space-y-4">
                    <span className="text-xs font-bold text-slate-600 block uppercase">Suivi Opérationnel</span>
                    <div className="space-y-3.5 text-xs">
                      <div>
                        <div className="flex justify-between font-semibold">
                          <span>Dossiers traités par conseillers :</span>
                          <span className="font-mono">{requests.filter(r => r.statut !== 'En attente').length}</span>
                        </div>
                        <div className="w-full bg-slate-200 h-1 rounded-full mt-1.5 overflow-hidden">
                          <div className="bg-slate-900 h-full" style={{ width: '100%' }}></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between font-semibold text-rose-700">
                          <span>Refusés / Rejetés :</span>
                          <span className="font-mono">{requests.filter(r => r.statut === 'Refusé').length} dossiers</span>
                        </div>
                        <div className="w-full bg-slate-200 h-1 rounded-full mt-1.5 overflow-hidden">
                          <div className="bg-rose-600 h-full" style={{ width: `${Math.round((requests.filter(r => r.statut === 'Refusé').length / (requests.length || 1)) * 100)}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          )}

          {activeTab === 'users' && (
            /* Tab: Manage Accounts and enroll Credit agents */
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-5">
              
              <div className="flex justify-between items-center border-b border-slate-150 pb-3 flex-wrap gap-2">
                <div>
                  <h3 className="font-display font-semibold text-slate-900 text-lg">Répertoire des Comptes Utilisateurs</h3>
                  <p className="text-xs text-slate-500">Activez, désactivez ou supprimez des comptes agents et clients de microfinance.</p>
                </div>
                <button
                  onClick={() => setShowAddAgentModal(true)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 transition shadow"
                >
                  <UserPlus size={15} />
                  <span>Ajouter un Agent</span>
                </button>
              </div>

              {/* Filter bar */}
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Search size={15} />
                </span>
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Rechercher par adresse email ou nom complet de l'assujetti..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* User list */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                      <th className="py-2.5 px-4">Identité Utilisateur</th>
                      <th className="py-2.5 px-4 font-mono">Email / Tél</th>
                      <th className="py-2.5 px-4 text-center">Rôle</th>
                      <th className="py-2.5 px-4 text-center">Statut</th>
                      <th className="py-2.5 px-4 text-right">Actions de modération</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredUsers.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 block">{u.prenom} {u.nom}</span>
                          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{u.id}</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-650">
                          <span className="block">{u.email}</span>
                          <span className="block text-[10px] text-slate-400">{u.telephone}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${u.role === 'agent' ? 'bg-indigo-100 text-indigo-800' : 'bg-orange-100 text-orange-850'}`}>
                            {u.role === 'agent' ? 'Agent Crédit' : 'Client Emprunteur'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center border-slate-100">
                          {u.is_active ? (
                            <span className="inline-flex items-center space-x-1 text-indigo-705 text-[10px] font-bold">
                              ● Actif (opérationnel)
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 text-rose-700 text-[10px] font-bold font-medium">
                              ● Bloqué (désactivé)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => handleToggleUserActive(u.id)}
                            className={`p-1.5 rounded transition ${u.is_active ? 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600' : 'bg-indigo-50 text-indigo-805 hover:bg-indigo-100 border border-indigo-200'}`}
                            title={u.is_active ? 'Désactiver le compte' : 'Réactiver le compte'}
                          >
                            {u.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                          </button>

                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="p-1.5 bg-slate-50 text-slate-400 hover:bg-rose-100 hover:text-rose-700 rounded transition"
                            title="Supprimer définitivement"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {activeTab === 'requests' && (
            /* Tab: Step 3 final approval/rejection review terminal */
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              
              <div className="border-b border-slate-150 pb-2">
                <h3 className="font-display font-semibold text-slate-900 text-lg">Arbitrages Finaux & Octrois de Signature</h3>
                <p className="text-xs text-slate-500">Validez définitivement les dossiers d'échéances instruits et pré-approuvés par les agents.</p>
              </div>

              {requests.filter(r => r.statut === "Validé par l'agent").length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">
                  Aucun dossier pré-approuvé par les agents n'est en attente d'arbitrage comptable.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                        <th className="py-2.5 px-4">Référence</th>
                        <th className="py-2.5 px-4">Client Emprunteur</th>
                        <th className="py-2.5 px-4 font-mono">Volonté de Financement</th>
                        <th className="py-2.5 px-4">Motif du Projet</th>
                        <th className="py-2.5 px-4 text-center">Garanties CNI/Justifs</th>
                        <th className="py-2.5 px-4 text-center">Taux Pré-arrangé</th>
                        <th className="py-2.5 px-4 text-right">Arbitrage financier</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {requests.filter(r => r.statut === "Validé par l'agent").map(req => {
                        // Extract rates if exists
                        const suggStr = localStorage.getItem(`agent_rates_${req.id}`);
                        let suggRate = 8;
                        let suggAgent = 'Agent';
                        if (suggStr) {
                          const parsed = JSON.parse(suggStr);
                          suggRate = parsed.rate;
                          suggAgent = parsed.agent_nom;
                        }

                        return (
                          <tr key={req.id} className="hover:bg-slate-50/50">
                            <td className="py-3 px-4 font-mono text-slate-900 font-bold">{req.id}</td>
                            <td className="py-3 px-4">
                              <span className="font-semibold block text-slate-950">{req.user_prenom} {req.user_nom}</span>
                              <span className="text-[10px] text-slate-400 font-mono block">Revenus déclarés : {req.revenus.toLocaleString()} F</span>
                            </td>
                            <td className="py-3 px-4 font-bold font-mono text-slate-900">
                              <span className="block">{req.montant.toLocaleString()} FCFA</span>
                              <span className="block text-[10px] text-slate-400 font-normal">{req.duree} mensualités</span>
                            </td>
                            <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={req.motif}>
                              {req.motif}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-650 font-bold text-[9px] font-mono">
                                📎 {req.documents?.length || 0} document(s)
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center font-bold text-slate-900 font-mono">
                              <span className="block text-indigo-850">{suggRate}%</span>
                              <span className="block text-[8px] text-slate-400 font-normal">par {suggAgent}</span>
                            </td>
                            <td className="py-3 px-4 text-right space-x-2">
                              <LoadingButton
                                onClick={() => handleFinalAccept(req)}
                                isLoading={isLoading}
                                loadingText="Action..."
                                className="px-2.5 py-1.5 rounded text-[10px] font-bold transition shadow-sm"
                                title="Accorder le Prêt"
                              >
                                Débloquer
                              </LoadingButton>

                              <button
                                onClick={() => handleFinalReject(req)}
                                className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold transition"
                                title="Refuser définitivement"
                              >
                                Rejeter
                              </button>
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

          {activeTab === 'loans' && (
            /* Tab: Detailed registered Loans logs */
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              
              <div className="border-b border-slate-150 pb-2">
                <h3 className="font-display font-semibold text-slate-900 text-lg">Registres des Prêts Accordés</h3>
                <p className="text-xs text-slate-500">Appliquez des pénalités financières de retard ou examinez le respect des échéances.</p>
              </div>

              {/* Filter */}
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Search size={15} />
                </span>
                <input
                  type="text"
                  value={loanSearch}
                  onChange={(e) => setLoanSearch(e.target.value)}
                  placeholder="Rechercher par référence prêt ou nom du bénéficiaire..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              {filteredLoans.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">
                  Aucun prêt octroyé ne correspond aux critères de recherche.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                        <th className="py-3 px-4">Référence Prêt</th>
                        <th className="py-3 px-4">Bénéficiaire / Échéance</th>
                        <th className="py-3 px-4 text-center">Principal / Taux</th>
                        <th className="py-3 px-4 text-center">Somme Réglée</th>
                        <th className="py-3 px-4 text-center">Reste à recouvrer</th>
                        <th className="py-3 px-4 text-center">Statut Comptable</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {filteredLoans.map(loan => {
                        // Calculate paid and remaining
                        const totalWithPenalties = loan.montant_total + (loan.penalites || 0);
                        const unpaidInstallmentsSum = loan.echeancier
                          ? loan.echeancier
                            .filter(e => !e.paye)
                            .reduce((sum, e) => sum + e.montant, 0)
                          : loan.montant_total;
                        
                        const leftover = unpaidInstallmentsSum + (loan.penalites || 0);
                        const paid = Math.max(0, totalWithPenalties - leftover);

                        let statusBadge = '';
                        if (loan.statut === 'En cours') statusBadge = 'bg-amber-100 text-amber-800';
                        else if (loan.statut === 'Soldé') statusBadge = 'bg-indigo-100 text-indigo-850 border border-indigo-200';
                        else statusBadge = 'bg-rose-100 text-rose-800 animate-pulse';

                        const formattedDate = new Date(loan.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        });

                        return (
                          <tr key={loan.id} className="hover:bg-slate-50/50">
                            <td className="py-4 px-4">
                              <span className="font-bold text-slate-900 block">{loan.id}</span>
                              <span className="text-[9px] text-slate-400">Octroyé le {formattedDate}</span>
                            </td>
                            <td className="py-4 px-4 font-sans">
                              <span className="font-bold text-slate-950 block">{loan.client_prenom || 'Client'} {loan.client_nom || ''}</span>
                              <span className="text-[10px] text-indigo-600 font-semibold block">Date fin : {loan.date_limite}</span>
                            </td>
                            <td className="py-4 px-4 text-center text-slate-900 font-bold">
                              <span className="block">{loan.montant.toLocaleString()} F</span>
                              <span className="block text-[10px] text-slate-400 font-normal">Taux interest : {loan.taux_interet}%</span>
                            </td>
                            <td className="py-4 px-4 text-center text-indigo-600 font-bold">
                              {paid.toLocaleString()} FCFA
                            </td>
                            <td className="py-4 px-4 text-center font-black text-rose-700">
                              {leftover.toLocaleString()} FCFA
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span className={`inline-block px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${statusBadge}`}>
                                {loan.statut}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right">
                              {loan.statut !== 'Soldé' && (
                                <button
                                  onClick={() => {
                                    setTargetLoanForPenalties(loan);
                                    setPenaltyAmount(15000);
                                  }}
                                  className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 rounded-lg border border-rose-200 text-[10px] font-sans font-bold flex items-center space-x-1 ml-auto"
                                >
                                  <AlertTriangle size={12} />
                                  <span>Pénaliser</span>
                                </button>
                              )}
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

      </div>

      {/* MODAL: ADD CREDIT AGENT */}
      {showAddAgentModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-100 shadow-2xl p-6 sm:p-8 space-y-5 animate-fade-in" id="add-agent-modal">
            
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-display font-semibold text-slate-900 text-base">Inscrire un Nouvel Agent de Crédit</h3>
              <button 
                onClick={() => setShowAddAgentModal(false)}
                className="text-slate-400 hover:text-slate-900 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAgent} className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-500 uppercase tracking-wider text-[10px]">Nom de famille</label>
                  <input
                    type="text"
                    required
                    value={agentNom}
                    onChange={(e) => setAgentNom(e.target.value)}
                    placeholder="SOSSOU"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-500 uppercase tracking-wider text-[10px]">Prénom</label>
                  <input
                    type="text"
                    required
                    value={agentPrenom}
                    onChange={(e) => setAgentPrenom(e.target.value)}
                    placeholder="Marc"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-500 uppercase tracking-wider text-[10px]">Numéro de téléphone</label>
                <input
                  type="tel"
                  required
                  value={agentTel}
                  onChange={(e) => setAgentTel(e.target.value)}
                  placeholder="Ex: +229 01 99 88 77"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-500 uppercase tracking-wider text-[10px]">Adresse email reconnue</label>
                <input
                  type="email"
                  required
                  value={agentEmail}
                  onChange={(e) => setAgentEmail(e.target.value)}
                  placeholder="marc.s@bg.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-500 uppercase tracking-wider text-[10px]">Mot de passe d'accès initial</label>
                <input
                  type="password"
                  required
                  value={agentPassword}
                  onChange={(e) => setAgentPassword(e.target.value)}
                  placeholder="Définir un mot de passe sécurisé"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                />
              </div>

              <div className="pt-3 flex space-x-4">
                <button
                  type="button"
                  onClick={() => setShowAddAgentModal(false)}
                  className="w-1/2 py-2.5 bg-slate-100 text-slate-705 font-bold rounded-xl text-xs transition"
                >
                  Fermer
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-slate-900 hover:bg-slate-850 text-white font-bold rounded-xl text-xs transition"
                >
                  Créer le compte Agent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: APPLY LATE PENALTIES */}
      {targetLoanForPenalties && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full border border-slate-100 shadow-2xl p-6 space-y-4 animate-fade-in" id="penalties-modal">
            
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-display font-semibold text-slate-900 text-base">Appliquer une pénalité de retard</h3>
              <button onClick={() => setTargetLoanForPenalties(null)} className="text-slate-400 font-bold">✕</button>
            </div>

            <p className="text-xs text-slate-500">
              Ceci appliquera des pénalités comptables sur le prêt de <strong>{targetLoanForPenalties.client_prenom} {targetLoanForPenalties.client_nom}</strong>. Le montant sera reporté sur la prochaine mensualité due.
            </p>

            <form onSubmit={handleApplyLatePenalties} className="space-y-4 text-xs font-bold">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider">Montant de la pénalité (FCFA)</label>
                <input
                  type="number"
                  min="1000"
                  step="1000"
                  required
                  value={penaltyAmount}
                  onChange={(e) => setPenaltyAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-850"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setTargetLoanForPenalties(null)}
                  className="w-1/2 py-2.5 bg-slate-100 text-slate-700 rounded-xl transition font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow transition"
                >
                  Appliquer la pénalité
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
