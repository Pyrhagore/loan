import { User, LoanRequest, Loan, Repayment, InternalNotification, Echeance } from './types';

// Helper to generate IDs
export const generateId = () => Math.random().toString(36).substring(2, 11).toUpperCase();

// Helper to format date in YYYY-MM-DD
export const getFormattedDate = (daysOffset: number = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split('T')[0];
};

// Initial system seed data (emptied for production pivot)
const initialUsers: User[] = [];
const initialLoanRequests: LoanRequest[] = [];
const initialLoans: Loan[] = [];
const initialRepayments: Repayment[] = [];
const initialNotifications: InternalNotification[] = [];

// Helper to initialize LocalStorage standard stores if they do not exist
const initStorage = () => {
  if (!localStorage.getItem('bg_users')) {
    localStorage.setItem('bg_users', JSON.stringify(initialUsers));
  }
  if (!localStorage.getItem('bg_loan_requests')) {
    localStorage.setItem('bg_loan_requests', JSON.stringify(initialLoanRequests));
  }
  if (!localStorage.getItem('bg_loans')) {
    localStorage.setItem('bg_loans', JSON.stringify(initialLoans));
  }
  if (!localStorage.getItem('bg_repayments')) {
    localStorage.setItem('bg_repayments', JSON.stringify(initialRepayments));
  }
  if (!localStorage.getItem('bg_notifications')) {
    localStorage.setItem('bg_notifications', JSON.stringify(initialNotifications));
  }
};

// Start initialization
initStorage();

// Storage Core Methods
export const getStoredUsers = (): User[] => {
  initStorage();
  return JSON.parse(localStorage.getItem('bg_users') || '[]');
};

export const saveStoredUsers = (users: User[]) => {
  localStorage.setItem('bg_users', JSON.stringify(users));
};

export const getStoredLoanRequests = (): LoanRequest[] => {
  initStorage();
  return JSON.parse(localStorage.getItem('bg_loan_requests') || '[]');
};

export const saveStoredLoanRequests = (requests: LoanRequest[]) => {
  localStorage.setItem('bg_loan_requests', JSON.stringify(requests));
};

export const getStoredLoans = (): Loan[] => {
  initStorage();
  return JSON.parse(localStorage.getItem('bg_loans') || '[]');
};

export const saveStoredLoans = (loans: Loan[]) => {
  localStorage.setItem('bg_loans', JSON.stringify(loans));
};

export const getStoredRepayments = (): Repayment[] => {
  initStorage();
  return JSON.parse(localStorage.getItem('bg_repayments') || '[]');
};

export const saveStoredRepayments = (repayments: Repayment[]) => {
  localStorage.setItem('bg_repayments', JSON.stringify(repayments));
};

export const getStoredNotifications = (): InternalNotification[] => {
  initStorage();
  return JSON.parse(localStorage.getItem('bg_notifications') || '[]');
};

export const saveStoredNotifications = (notifications: InternalNotification[]) => {
  localStorage.setItem('bg_notifications', JSON.stringify(notifications));
};

// Auth session state
export const getCurrentSessionUser = (): User | null => {
  const userStr = localStorage.getItem('bg_current_session_user');
  if (!userStr) return null;
  return JSON.parse(userStr) as User;
};

export const setCurrentSessionUser = (user: User | null) => {
  if (user) {
    localStorage.setItem('bg_current_session_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('bg_current_session_user');
  }
};

// High-level Actions & Business logic

// Calculate dynamic schedule
export const buildEcheancier = (montantTotal: number, duree: number, startDate: string): Echeance[] => {
  const echeances: Echeance[] = [];
  const monthlyPart = Math.round(montantTotal / duree);
  
  for (let i = 1; i <= duree; i++) {
    // Generate dates: 30 days offset each
    const dateLimit = new Date(startDate);
    dateLimit.setDate(dateLimit.getDate() + i * 30);
    
    echeances.push({
      numero: i,
      date_limite: dateLimit.toISOString().split('T')[0],
      montant: i === duree ? montantTotal - (monthlyPart * (duree - 1)) : monthlyPart, // resolve rounding residuals
      paye: false
    });
  }
  return echeances;
};

// Process Loan Repayment
export const createRepayment = (loanId: string, montant: number, dateStr: string): { success: boolean; message: string } => {
  const loans = getStoredLoans();
  const loanIndex = loans.findIndex(l => l.id === loanId);
  if (loanIndex === -1) return { success: false, message: 'Prêt non trouvé' };
  
  const loan = loans[loanIndex];
  
  // Register repayment 
  const repayments = getStoredRepayments();
  const newRepayment: Repayment = {
    id: 'REM-' + generateId(),
    loan_id: loanId,
    montant: montant,
    date_paiement: dateStr
  };
  repayments.push(newRepayment);
  saveStoredRepayments(repayments);

  // Update echeances from echeancier (from first non-paid to subsequent)
  let remainingAmountToSettle = montant;
  const updatedEcheancier = loan.echeancier.map(e => {
    if (!e.paye && remainingAmountToSettle >= e.montant) {
      remainingAmountToSettle -= e.montant;
      return { ...e, paye: true, date_paiement: dateStr };
    }
    return e;
  });

  // Check if fully paid
  const isAllPaid = updatedEcheancier.every(e => e.paye);
  
  loans[loanIndex] = {
    ...loan,
    echeancier: updatedEcheancier,
    statut: isAllPaid ? 'Soldé' : loan.statut
  };
  saveStoredLoans(loans);

  // Send Notification to client, and general notifications
  createNotification(
    loan.client_id,
    'Repas & Paiement enregistré',
    `Votre versement de ${montant.toLocaleString()} FCFA sur le prêt ${loan.id} a été enregistré avec succès.`
  );

  createNotification(
    'USR-ADMIN',
    'Remboursement de prêt',
    `Le client ${loan.client_nom} ${loan.client_prenom} a effectué un versement de ${montant.toLocaleString()} FCFA.`
  );

  return { success: true, message: 'Le remboursement a été enregistré.' };
};

// Create a Notification helper
export const createNotification = (userId: string, titre: string, message: string) => {
  const notifications = getStoredNotifications();
  const newNotif: InternalNotification = {
    id: 'NOT-' + generateId(),
    user_id: userId,
    titre: titre,
    message: message,
    is_read: false,
    created_at: new Date().toISOString().replace('T', ' ').substring(0, 16)
  };
  notifications.unshift(newNotif); // latest first
  saveStoredNotifications(notifications);
};
