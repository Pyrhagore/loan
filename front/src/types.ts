export type UserRole = 'admin' | 'agent' | 'client';

export interface User {
  id: string;
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  password?: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export type LoanRequestStatus = 'En attente' | 'Refusé' | 'Validé par l\'agent' | 'Prêt accordé';

export interface LoanRequest {
  id: string;
  user_id: string;
  user_nom: string;
  user_prenom: string;
  montant: number;
  duree: number; // in months
  motif: string;
  revenus: number;
  statut: LoanRequestStatus;
  created_at: string;
  documents: LoanDocument[];
}

export interface LoanDocument {
  id: string;
  loan_request_id: string;
  file_name: string;
  file_url: string;
  type_document: 'Carte d\'identité' | 'Justificatif de revenu' | 'Contrat de prêt' | 'Autre';
}

export type LoanStatus = 'En cours' | 'Soldé' | 'En retard';

export interface Echeance {
  numero: number;
  date_limite: string;
  montant: number;
  paye: boolean;
  date_paiement?: string;
}

export interface Loan {
  id: string;
  loan_request_id: string;
  client_id: string;
  client_nom: string;
  client_prenom: string;
  agent_id?: string;
  agent_nom?: string;
  montant: number;
  taux_interet: number; // percentage, e.g. 5 for 5%
  date_limite: string;
  montant_total: number;
  statut: LoanStatus;
  created_at: string;
  echeancier: Echeance[];
  penalites: number; // delayed payment penalties
}

export interface Repayment {
  id: string;
  loan_id: string;
  montant: number;
  date_paiement: string;
}

export interface InternalNotification {
  id: string;
  user_id: string; // "all" for general broadcasts (or specific roles), or high specificity
  titre: string;
  message: string;
  is_read: boolean;
  created_at: string;
}
