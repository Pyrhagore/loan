import React, { useState, useEffect } from 'react';
import { User, LoanRequest, Loan, Repayment, InternalNotification, LoanDocument } from '../types';
import { 
  saveStoredLoans, 
  getStoredRepayments, 
  getStoredNotifications,
  saveStoredNotifications,
  generateId,
  getFormattedDate,
  createNotification
} from '../dataStore';
import { createLoanRequest, getLoanRequests, getLoans, getRepayments, repayLoan, verifyRepayment } from '../api/loans';
import { 
  CreditCard, 
  Calendar, 
  Clock, 
  PlusCircle, 
  Eye, 
  LogOut, 
  FileText, 
  User as UserIcon, 
  ChevronRight, 
  DollarSign, 
  CheckCircle, 
  XOctagon, 
  Bell, 
  Info,
  DollarSign as FCFASign,
  AlertCircle,
  Loader2
} from 'lucide-react';
import LoadingButton from './LoadingButton';

interface ClientDashboardProps {
  user: User;
  onLogout: () => void;
  onGoHome?: () => void;
}

export default function ClientDashboard({ user, onLogout, onGoHome }: ClientDashboardProps) {
  // Global States retrieved from simulated DB 
  const [requests, setRequests] = useState<LoanRequest[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [repayments, setRepayments] = useState<Repayment[]>([]);
  const [notifications, setNotifications] = useState<InternalNotification[]>([]);

  // Sub-navigation state
  const [activeTab, setActiveTab] = useState<'overview' | 'requests' | 'loans' | 'history'>('overview');

  // Modals / Input variables
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedLoanForDetails, setSelectedLoanForDetails] = useState<Loan | null>(null);
  const [showPayModal, setShowPayModal] = useState<Loan | null>(null);

  // New Request Form state
  const [montant, setMontant] = useState<number>(1000000);
  const [duree, setDuree] = useState<number>(12);
  const [motif, setMotif] = useState('');
  const [revenus, setRevenus] = useState<number>(350000);
  
  // Custom uploaded file simulations
  const [cniFileName, setCniFileName] = useState<string>('');
  const [revenuFileName, setRevenuFileName] = useState<string>('');

  // Repayment form state
  const [repayAmount, setRepayAmount] = useState<number>(0);
  const [repayDate, setRepayDate] = useState<string>(getFormattedDate());
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);

  // Reload data from API
  const loadData = async () => {
    setIsDataLoading(true);
    try {
      const apiReqs = await getLoanRequests();
      setRequests(apiReqs);
      
      const apiLoans = await getLoans();
      setLoans(apiLoans);
      
      const apiRepayments = await getRepayments();
      setRepayments(apiRepayments);
    } catch (err) {
      console.error("Erreur chargement données:", err);
    } finally {
      setIsDataLoading(false);
    }

    const allNotifications = getStoredNotifications();
    setNotifications(allNotifications.filter(n => n.user_id === user.id || n.user_id === 'all'));
  };

  useEffect(() => {
    const runVerification = async () => {
        // Detect FedaPay return for verification
        const params = new URLSearchParams(window.location.hash.split('?')[1]);
        const transactionId = params.get('id');
        const isVerifying = params.get('verify_repayment') === 'true';

        if (transactionId && isVerifying) {
            try {
                await verifyRepayment(transactionId);
                // Clear URL params avoid double trigger
                window.history.replaceState({}, '', window.location.hash.split('?')[0]);
                alert("✨ Remboursement confirmé ! Votre échéancier a été mis à jour.");
            } catch (err) {
                console.error("Verification failed", err);
            }
        }
        loadData();
    };

    runVerification();
  }, [user.id]);

  // Handle new loan request submission
  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motif.trim()) return;

    setIsLoading(true);
    try {
        await createLoanRequest({
            montant,
            duree,
            motif,
            revenus,
            documents: [
                { type: 'CNI', name: cniFileName },
                { type: 'Revenu', name: revenuFileName }
            ].filter(d => d.name) // Only send if name is present
        });

        // Reset fields & close modal
        setMontant(1000000);
        setDuree(12);
        setMotif('');
        setRevenus(350000);
        setCniFileName('');
        setRevenuFileName('');
        setShowRequestModal(false);
        
        loadData();
        setActiveTab('requests');
    } catch (err: any) {
        alert(err.message || "Erreur lors de la soumission de la demande.");
    } finally {
        setIsLoading(false);
    }
  };

  // Process a simulator or single installment repayment
  const handleProcessRepayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPayModal || repayAmount <= 0) return;

    setIsLoading(true);
    try {
        const response = await repayLoan({
            loan_id: showPayModal.id,
            montant: repayAmount
        });
        
        if (response.payment_url) {
            // Redirect to FedaPay Payment Page
            window.location.href = response.payment_url;
        } else {
            alert("Erreur: URL de paiement non reçue.");
        }
    } catch (err: any) {
        alert("Erreur lors de l'initialisation du paiement : " + err.message);
    } finally {
        setIsLoading(false);
    }
  };

  // Mark all notifications as read
  const handleMarkNotificationsAsRead = () => {
    const allNotif = getStoredNotifications();
    const updated = allNotif.map(n => {
      if (n.user_id === user.id) {
        return { ...n, is_read: true };
      }
      return n;
    });
    saveStoredNotifications(updated);
    loadData();
  };

  // Quick prepay fill helper for installment
  const handlePrepayFill = (amountToPay: number) => {
    setRepayAmount(amountToPay);
  };

  // Calculations for Client statistics
  const activeLoans = (loans || []).filter(l => l?.statut === 'En cours');
  const finishedLoans = (loans || []).filter(l => l?.statut === 'Soldé');
  const outstandingDebt = activeLoans.reduce((acc, currentLoan) => {
    const unpaidSum = (currentLoan.echeancier || [])
      .filter(e => !e.paye)
      .reduce((sum, e) => sum + (e.montant || 0), 0);
    const loanPenalties = currentLoan.penalites || 0;
    return acc + unpaidSum + loanPenalties;
  }, 0);

  const totalPaidBack = (repayments || []).reduce((sum, r) => sum + (r.montant || 0), 0);

  const unreadCount = (notifications || []).filter(n => !n.is_read).length;

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800" id="client-dashboard-root">
      
      {/* Upper Navigation Rail */}
      <nav className="bg-white border-b border-slate-200 py-4 px-6 md:px-12 flex justify-between items-center sticky top-0 z-40">
        <div 
          className="flex items-center space-x-3 cursor-pointer group"
          onClick={onGoHome}
        >
          <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-100 group-hover:scale-105 transition-transform">
            <CreditCard size={22} />
          </div>
          <div>
            <span className="font-display font-bold text-lg text-slate-900 block leading-tight">Espace Client</span>
            <span className="text-[10px] uppercase tracking-wider text-indigo-600 font-black block whitespace-nowrap">Superviseur Général BG Microfinance</span>
          </div>
        </div>

        <div className="flex items-center space-x-8">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`text-xs font-bold uppercase tracking-wider transition ${activeTab === 'overview' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-900'}`}
          >
            Tableau de bord
          </button>

          <div className="hidden sm:flex items-center space-x-3 pr-4 border-r border-slate-100">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs shadow-inner">
              {user.nom?.charAt(0)}{user.prenom?.charAt(0)}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-900">{user.prenom} {user.nom}</span>
              <span className="text-[10px] text-slate-500 font-mono">Client Verifié</span>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
            title="Se déconnecter"
          >
            <LogOut size={20} />
          </button>
        </div>
      </nav>

      {/* Main Canvas Grid */}
      <div className="max-w-7xl mx-auto py-8 px-6 md:px-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Subnav & Status Cards */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Quick Client Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 text-center space-y-3 shadow-sm">
            <div className="w-16 h-16 bg-slate-150 rounded-full flex items-center justify-center mx-auto text-slate-500 border border-slate-200">
              <UserIcon size={32} />
            </div>
            <div>
              <h4 className="font-display font-semibold text-slate-950">{user.prenom} {user.nom}</h4>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{user.email}</p>
              <p className="text-xs text-slate-500 font-mono">{user.telephone}</p>
            </div>
            <div className="pt-2">
              <span className="px-3 py-1 bg-indigo-50 text-indigo-800 text-[10px] font-bold rounded-full uppercase tracking-wider border border-indigo-100">
                Compte Actif
              </span>
            </div>
          </div>

          {/* Sub Navigation Links */}
          <div className="bg-white rounded-2xl border border-slate-200 p-2.5 space-y-1 shadow-sm">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition ${activeTab === 'overview' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <span className="flex items-center space-x-2">
                <CreditCard size={18} />
                <span>Synthèse Générale</span>
              </span>
              <ChevronRight size={14} />
            </button>

            <button
              onClick={() => setActiveTab('requests')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition ${activeTab === 'requests' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <span className="flex items-center space-x-2">
                <Clock size={18} />
                <span>Mes Demandes ({requests.length})</span>
              </span>
              <ChevronRight size={14} />
            </button>

            <button
              onClick={() => setActiveTab('loans')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition ${activeTab === 'loans' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <span className="flex items-center space-x-2">
                <Calendar size={18} />
                <span>Mes Prêts Actifs ({loans.length})</span>
              </span>
              <ChevronRight size={14} />
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <span className="flex items-center space-x-2">
                <FileText size={18} />
                <span>Mes Remboursements</span>
              </span>
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Quick Action Button */}
          <LoadingButton
            onClick={() => setShowRequestModal(true)}
            className="w-full py-3.5 rounded-2xl flex items-center justify-center space-x-2 shadow-lg shadow-indigo-100 transition"
          >
            <PlusCircle size={18} />
            <span>Faire une demande</span>
          </LoadingButton>

        </div>

        {/* Dynamic Display Area */}
        <div className="lg:col-span-9 space-y-8">

          {isDataLoading ? (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-12 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="w-12 h-12 text-teal-600 animate-spin" />
              <p className="text-slate-500 font-medium animate-pulse">Chargement de votre espace personnel, veuillez patienter...</p>
            </div>
          ) : (
            <>
              {/* Unread Notifications Banner */}
              {notifications.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <div className="flex items-center space-x-2">
                      <Bell size={18} className="text-amber-500 animate-bounce" />
                      <h4 className="font-display font-semibold text-slate-900">Notifications ({unreadCount} non lues)</h4>
                    </div>
                    {unreadCount > 0 && (
                      <button 
                        onClick={handleMarkNotificationsAsRead}
                        className="text-xs text-indigo-705 hover:underline font-semibold"
                      >
                        Tout marquer comme lu
                      </button>
                    )}
                  </div>
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {notifications.slice(0, 4).map((notif) => (
                      <div key={notif.id} className={`p-2.5 rounded-xl text-xs ${notif.is_read ? 'bg-slate-50 text-slate-500' : 'bg-indigo-50/50 border-l-2 border-indigo-500 text-slate-800'}`}>
                        <div className="flex justify-between font-bold mb-0.5">
                          <span>{notif.titre}</span>
                          <span className="font-mono text-[9px] text-slate-400 font-normal">{notif.created_at}</span>
                        </div>
                        <p>{notif.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'overview' && (
                /* Tab: Overview */
                <div className="space-y-6">
                  
                  {/* Stat grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    
                    {/* Total Loaned */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Crédits Accordés</span>
                      <span className="text-2xl font-bold text-slate-900 block font-mono mt-1">
                        {loans.reduce((sum, l) => sum + l.montant, 0).toLocaleString()} FCFA
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-2">
                        Total de {loans.length} prêts validés par l'administration.
                      </span>
                    </div>

                {/* Outstanding / Rest to pay */}
                <div className="bg-white p-6 rounded-2xl border border-blue-105 shadow-sm relative overflow-hidden bg-gradient-to-tr from-blue-50/20 to-white">
                  <span className="text-xs font-bold text-blue-500 uppercase tracking-wider block">Solde Restant Dû</span>
                  <span className="text-2xl font-bold text-blue-900 block font-mono mt-1">
                    {outstandingDebt.toLocaleString()} FCFA
                  </span>
                  <span className="text-[10px] text-blue-600/80 block mt-2">
                    Montant net incluant les intérêts restants.
                  </span>
                </div>

                {/* Repaid */}
                <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-sm relative overflow-hidden bg-gradient-to-tr from-indigo-50/20 to-white">
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block">Total Remboursé</span>
                  <span className="text-2xl font-bold text-slate-900 block font-mono mt-1">
                    {totalPaidBack.toLocaleString()} FCFA
                  </span>
                  <span className="text-[10px] text-indigo-600 space-x-1 block mt-2">
                    Somme totale déjà réglée à BG MicroFinance.
                  </span>
                </div>

              </div>

              {/* Active Loans list in brief */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h3 className="font-display font-semibold text-base text-slate-950">Aperçu de mes Prêts Actifs</h3>
                  <button 
                    onClick={() => setActiveTab('loans')}
                    className="text-xs text-indigo-700 hover:underline font-semibold"
                  >
                    Voir l'échéancier complet →
                  </button>
                </div>

                {activeLoans.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-sm">
                    Vous n'avez aucun prêt en cours d'éligibilité pour le moment.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeLoans.map(loan => {
                      const paidAmount = repayments.filter(r => r.loan_id === loan.id).reduce((s, r) => s + r.montant, 0);
                      const percent = Math.min(100, Math.round((paidAmount / loan.montant_total) * 100));
                      const nextUnpaid = loan.echeancier.find(e => !e.paye);
                      
                      return (
                        <div key={loan.id} className="p-4 bg-slate-50 border border-slate-150 rounded-xl space-y-3">
                          <div className="flex justify-between items-start flex-wrap gap-2">
                            <div>
                               <span className="px-2 py-0.5 bg-blue-105 text-blue-900 text-[10px] font-bold rounded font-mono uppercase border border-blue-100">
                                {loan.id}
                              </span>
                              <span className="text-xs text-slate-400 font-mono ml-2">Approuvé le {loan.created_at}</span>
                              <h4 className="font-display font-bold text-slate-900 mt-1">Capital : {loan.montant.toLocaleString()} F</h4>
                            </div>
                            <div className="text-right">
                              <span className="text-xs text-slate-500 block">Total à régler ({loan.taux_interet}%) :</span>
                              <span className="text-sm font-black text-slate-950 block font-mono">{loan.montant_total.toLocaleString()} F</span>
                            </div>
                          </div>

                          {/* Progress indicator */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] text-slate-500 font-semibold font-mono">
                              <span>Progression Remboursement</span>
                              <span>{percent}% ({paidAmount.toLocaleString()} F payés)</span>
                            </div>
                            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                              <div className="bg-indigo-600 h-2 rounded-full transition-all duration-300" style={{ width: `${percent}%` }}></div>
                            </div>
                          </div>

                          {/* Upcoming payment */}
                          {nextUnpaid && (
                            <div className="flex justify-between items-center p-2.5 bg-white border border-slate-100 rounded-lg text-xs">
                              <div>
                                <span className="text-slate-500">Prochaine échéance n°{nextUnpaid.numero} : </span>
                                <span className="font-bold text-rose-700 font-mono">{nextUnpaid.montant.toLocaleString()} F</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-[10px] text-slate-400 font-mono">Avant le {nextUnpaid.date_limite}</span>
                                <LoadingButton
                                  onClick={() => {
                                    setRepayAmount(nextUnpaid.montant);
                                    setShowPayModal(loan);
                                  }}
                                  className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded text-[10px] transition"
                                >
                                  Payer
                                </LoadingButton>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}

          {activeTab === 'requests' && (
            /* Tab: Requests Table */
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-150 pb-3">
                <div>
                  <h3 className="font-display font-semibold text-lg text-slate-950">Historique de mes demandes de prêt</h3>
                  <p className="text-xs text-slate-500">Suivez l'état d'avance de vos dossiers de microfinance.</p>
                </div>
              </div>

              {requests.length === 0 ? (
                <div className="text-center py-12 text-slate-500 space-y-3">
                  <div className="p-3 bg-slate-50 rounded-full w-12 h-12 flex items-center justify-center mx-auto text-slate-400">
                    <Clock size={20} />
                  </div>
                  <p className="text-sm">Vous n'avez soumis aucune demande de financement.</p>
                  <LoadingButton
                    onClick={() => setShowRequestModal(true)}
                    className="px-4 py-2 text-xs font-semibold rounded-lg shadow-sm font-medium transition"
                  >
                    Déposer mon premier dossier
                  </LoadingButton>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                        <th className="py-3 px-4">Réf / Date</th>
                        <th className="py-3 px-4">Montant</th>
                        <th className="py-3 px-4">Durée</th>
                        <th className="py-3 px-4">Motif</th>
                        <th className="py-3 px-4 text-center">Justificatifs</th>
                        <th className="py-3 px-4 text-right">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {requests.map(req => {
                        let statusBadge = '';
                        if (req.statut === 'En attente') {
                          statusBadge = 'bg-amber-50 text-amber-800 border-amber-200';
                        } else if (req.statut === 'Refusé') {
                          statusBadge = 'bg-rose-50 text-rose-800 border-rose-200';
                        } else if (req.statut === 'Validé par l\'agent') {
                          statusBadge = 'bg-blue-50 text-blue-800 border-blue-250';
                        } else {
                          statusBadge = 'bg-indigo-50 text-indigo-800 border-indigo-200';
                        }

                        return (
                          <tr key={req.id} className="hover:bg-slate-50/50">
                            <td className="py-3.5 px-4 font-mono">
                              <span className="font-bold text-slate-900 block">{req.id}</span>
                              <span className="text-[10px] text-slate-400 block mt-0.5">{req.created_at}</span>
                            </td>
                            <td className="py-3.5 px-4 font-bold text-slate-900 font-mono">
                              {req.montant.toLocaleString()} F
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-slate-600">
                              {req.duree} Mois
                            </td>
                            <td className="py-3.5 px-4 max-w-xs truncate text-slate-600 font-medium" title={req.motif}>
                              {req.motif}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {req.documents.length > 0 ? (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded font-mono text-[10px]">
                                  📎 {req.documents.length} doc{req.documents.length > 1 ? 's' : ''}
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <span className={`inline-block px-2.5 py-1 border rounded-full text-[10px] font-bold ${statusBadge}`}>
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

          {activeTab === 'loans' && (
            /* Tab: Active schedule and detail view */
            <div className="space-y-6">
              
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                <h3 className="font-display font-semibold text-base text-slate-950">Suivi et Remboursement de Prêts</h3>
                
                {loans.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 text-sm">
                    Aucun prêt octroyé à afficher. Les demandes doivent être étudiées puis validées.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {loans.map(loan => (
                      <button
                        key={loan.id}
                        onClick={() => setSelectedLoanForDetails(loan)}
                        className={`text-left p-4 rounded-xl border transition flex flex-col justify-between h-44 ${selectedLoanForDetails?.id === loan.id ? 'border-indigo-500 bg-indigo-50/10 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-350 bg-slate-50/10'}`}
                      >
                        <div className="w-full flex justify-between items-center">
                          <span className="px-2.5 py-0.5 bg-slate-100 rounded font-bold font-mono text-xs text-slate-700">
                            {loan.id}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${loan.statut === 'En cours' ? 'bg-amber-100 text-amber-800' : loan.statut === 'Soldé' ? 'bg-indigo-100 text-indigo-805' : 'bg-rose-100 text-rose-800'}`}>
                            {loan.statut}
                          </span>
                        </div>
                        <div className="my-2">
                          <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-bold">Total Dû</span>
                          <span className="text-xl font-bold font-mono text-slate-900">{loan.montant_total.toLocaleString()} F</span>
                        </div>
                        <div className="w-full flex justify-between items-center text-xs text-slate-500 font-mono border-t border-slate-100 pt-2 shrink-0">
                          <span>Intérêts: {loan.taux_interet}%</span>
                          <span className="font-bold text-indigo-700 hover:underline">Consulter l'échéancier →</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Show selected loan details block */}
              {selectedLoanForDetails && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-5 animate-fade-in" id="echeancier-panel">
                  <div className="flex justify-between items-center border-b border-slate-150 pb-3 flex-wrap gap-2">
                    <div>
                      <h4 className="font-display font-bold text-base text-slate-900">Tableau d'amortissement : Prêt {selectedLoanForDetails.id}</h4>
                      <p className="text-xs text-slate-500">Historique des échéances et versement direct par mensualité.</p>
                    </div>
                    {selectedLoanForDetails.statut === 'En cours' && (
                      <button
                        onClick={() => {
                          const nextPay = selectedLoanForDetails.echeancier.find(e => !e.paye);
                          setRepayAmount(nextPay ? nextPay.montant : 100000);
                          setShowPayModal(selectedLoanForDetails);
                        }}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-705 text-white font-medium text-xs rounded-xl shadow-md font-medium transition"
                      >
                        Saisir un remboursement
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl font-mono text-xs text-slate-600 border border-slate-150">
                    <div>
                      <span>Capital de base:</span>
                      <span className="block font-bold text-slate-900 mt-1">{selectedLoanForDetails.montant.toLocaleString()} F</span>
                    </div>
                    <div>
                      <span>Total avec Intérêts:</span>
                      <span className="block font-bold text-indigo-700 mt-1">{selectedLoanForDetails.montant_total.toLocaleString()} F</span>
                    </div>
                    <div>
                      <span>Somme déjà payée:</span>
                      <span className="block font-bold text-emerald-600 mt-1">
                        {repayments
                          .filter(r => r.loan_id === selectedLoanForDetails.id)
                          .reduce((sum, r) => sum + r.montant, 0)
                          .toLocaleString()} F
                      </span>
                    </div>
                    <div>
                      <span className="text-rose-500">Reste à payer:</span>
                      <span className="block font-bold text-rose-600 mt-1">
                        {(selectedLoanForDetails.montant_total - 
                          repayments
                            .filter(r => r.loan_id === selectedLoanForDetails.id)
                            .reduce((sum, r) => sum + r.montant, 0)
                        ).toLocaleString()} F
                      </span>
                    </div>
                  </div>

                  {/* Installment Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                          <th className="py-2.5 px-3">Mensualité</th>
                          <th className="py-2.5 px-3">Date limite de paiement</th>
                          <th className="py-2.5 px-3">Montant exigé</th>
                          <th className="py-2.5 px-3 text-right">État</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {selectedLoanForDetails.echeancier.map(e => (
                          <tr key={e.numero} className={e.paye ? 'bg-indigo-50/10' : ''}>
                            <td className="py-3 px-3 font-semibold text-slate-800">
                              Mois n°{e.numero}
                            </td>
                            <td className="py-3 px-3 text-slate-500">
                              {e.date_limite}
                            </td>
                            <td className="py-3 px-3 font-bold text-slate-900">
                              {e.montant.toLocaleString()} FCFA
                            </td>
                            <td className="py-3 px-3 text-right">
                              {e.paye ? (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-indigo-50 text-indigo-805 font-bold rounded text-[10px] border border-indigo-100">
                                  <CheckCircle size={10} className="mr-0.5 text-indigo-600" /> Réglé le {e.date_paiement}
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-amber-50 text-amber-700 font-bold rounded text-[10px] border border-amber-200">
                                  En attente
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

          {activeTab === 'history' && (
            /* Tab: History of payments */
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="border-b border-slate-150 pb-3">
                <h3 className="font-display font-semibold text-base text-slate-900">Historique complet de mes règlements</h3>
                <p className="text-xs text-slate-500">Consultez chaque versement crédité sur votre compte.</p>
              </div>

              {repayments.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  Aucune transaction d'échéance créditée pour le moment.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs font-mono">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                        <th className="py-3 px-4">Référence Versement</th>
                        <th className="py-3 px-4">Référence Prêt</th>
                        <th className="py-3 px-4 text-center">Date du Paiement</th>
                        <th className="py-3 px-4 text-right">Montant Crédité (FCFA)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {repayments.map(rep => {
                        return (
                          <tr key={rep.id} className="hover:bg-slate-50/50">
                            <td className="py-3 px-4 font-bold text-slate-900">{rep.id}</td>
                            <td className="py-3 px-4 text-slate-600">{rep.loan_id}</td>
                            <td className="py-3 px-4 text-center text-slate-500">{rep.date_paiement}</td>
                            <td className="py-3 px-4 text-right text-indigo-705 font-bold">
                              + {rep.montant.toLocaleString()} F
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

      {/* MODAL: NEW LOAN REQUEST FORM */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-100 shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto animate-fade-in" id="new-loan-modal">
            
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="font-display font-semibold text-lg text-slate-900">Soumettre un Dossier de Financement</h3>
              <button 
                onClick={() => setShowRequestModal(false)}
                className="text-slate-400 hover:text-slate-900 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-4 text-xs font-medium">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Montant sollicité (FCFA)</label>
                  <input
                    type="number"
                    min="100000"
                    max="5000000"
                    step="50000"
                    required
                    value={montant}
                    onChange={(e) => setMontant(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800"
                  />
                  <span className="text-[10px] text-slate-400">Entre 100k et 5M FCFA.</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Durée de l'échéancier (Mois)</label>
                  <select
                    value={duree}
                    onChange={(e) => setDuree(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                  >
                    {[3,6,12,18,24,36].map(m => (
                      <option key={m} value={m}>{m} Mois</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Revenus mensuels déclarés (FCFA)</label>
                <input
                  type="number"
                  min="25000"
                  required
                  value={revenus}
                  onChange={(e) => setRevenus(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800"
                />
                <span className="text-[10px] text-slate-400">Vos garanties permettront de valider de meilleurs taux.</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Motif ou projet du crédit</label>
                <textarea
                  rows={3}
                  required
                  value={motif}
                  onChange={(e) => setMotif(e.target.value)}
                  placeholder="Expliquez à quoi servira le prêt financier à d'autres fins commerciales, agricoles ou personnels..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 resize-none font-sans"
                />
              </div>

              {/* Justificatif Simulation */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Pièces justificatives (Simulateur intégré)</span>
                
                <div className="space-y-2 text-[11px]">
                  <div>
                    <label className="text-slate-500 block mb-1 font-semibold">1. Carte Nationale d'Identité ou Passeport</label>
                    <div className="flex space-x-2">
                      <select 
                        onChange={(e) => setCniFileName(e.target.value ? `cni_${user.nom.toLowerCase()}_certifie.pdf` : '')}
                        className="p-2 bg-white border border-slate-200 rounded text-xs select-none"
                      >
                        <option value="">-- Choisir un document --</option>
                        <option value="upload">📂 CNI_Recto_Verso_Original.pdf (Simulé)</option>
                      </select>
                      {cniFileName && <span className="text-indigo-705 font-semibold mt-1">✓ Fichier prêt</span>}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200">
                    <label className="text-slate-500 block mb-1 font-semibold">2. Justificatif de revenus / Fiches d'activité</label>
                    <div className="flex space-x-2">
                      <select 
                        onChange={(e) => setRevenuFileName(e.target.value ? `bulletin_revenu_${user.nom.toLowerCase()}.pdf` : '')}
                        className="p-2 bg-white border border-slate-200 rounded text-xs select-none"
                      >
                        <option value="">-- Choisir un document --</option>
                        <option value="upload">📂 Releve_Comptable_Activite.pdf (Simulé)</option>
                      </select>
                      {revenuFileName && <span className="text-indigo-705 font-semibold mt-1">✓ Fichier prêt</span>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <LoadingButton
                  type="submit"
                  isLoading={isLoading}
                  loadingText="Soumission..."
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-705 text-white rounded-2xl text-base font-bold shadow-xl shadow-indigo-100 transition-all"
                >
                  Envoyer ma demande de financement
                </LoadingButton>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL: SUBMIT REPAYMENT */}
      {showPayModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-100 shadow-2xl p-6 space-y-5 animate-fade-in" id="pay-modal">
            
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-display font-semibold text-slate-900 text-base">Rembourser une Mensualité</h3>
              <button 
                onClick={() => setShowPayModal(null)}
                className="text-slate-400 hover:text-slate-900 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-indigo-50 rounded-xl text-xs text-indigo-805 flex items-start space-x-2">
              <Info size={16} className="shrink-0 mt-0.5" />
              <span>Simulez un versement direct par carte ou dépôt bancaire pour régulariser votre tableau d'amortissement.</span>
            </div>

            <form onSubmit={handleProcessRepayment} className="space-y-4 text-xs font-semibold">
              <div className="space-y-1">
                <label className="text-slate-500 uppercase tracking-wider text-[10px]">Référence du Prêt sélectionné</label>
                <input
                  type="text"
                  disabled
                  value={showPayModal.id}
                  className="w-full px-4 py-2 bg-slate-100 border border-slate-200 text-slate-500 rounded-lg text-sm font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-slate-500 uppercase tracking-wider text-[10px]">Montant à verser (FCFA)</label>
                  {/* Shortcut Buttons */}
                  <div className="space-x-1">
                    {showPayModal.echeancier.filter(e => !e.paye).slice(0, 1).map(e => (
                      <button
                        key={e.numero}
                        type="button"
                        onClick={() => handlePrepayFill(e.montant)}
                        className="text-[9px] px-1.5 py-0.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border text-slate-500 font-mono rounded"
                      >
                        Mensualité ({e.montant.toLocaleString()} F)
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="number"
                  min="5000"
                  required
                  value={repayAmount}
                  onChange={(e) => setRepayAmount(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono block focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 uppercase tracking-wider text-[10px]">Date de versement</label>
                <input
                  type="date"
                  required
                  value={repayDate}
                  onChange={(e) => setRepayDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono block focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                />
              </div>

              <div className="pt-3 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowPayModal(null)}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
                >
                  Fermer
                </button>
                <LoadingButton
                  type="submit"
                  isLoading={isLoading}
                  loadingText="Redirection..."
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-705 text-white rounded-xl font-bold transition shadow-lg shadow-indigo-100 flex items-center justify-center space-x-2"
                >
                  <CreditCard size={18} />
                  <span>Confirmer le paiement via FedaPay</span>
                </LoadingButton>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
