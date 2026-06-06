import { apiRequest } from './base';
import { LoanRequest, Loan, Repayment } from '../types';

export async function createLoanRequest(data: any): Promise<LoanRequest> {
    return apiRequest<LoanRequest>('/loans/request', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function getLoanRequests(): Promise<LoanRequest[]> {
    return apiRequest<LoanRequest[]>('/loans/requests');
}

export async function getLoans(): Promise<Loan[]> {
    return apiRequest<Loan[]>('/loans/');
}

export interface GrantLoanResponse {
    payment_url: string | null;
    transaction_id: string | null;
    message: string;
}

export async function grantLoan(requestId: string): Promise<GrantLoanResponse> {
    return apiRequest<GrantLoanResponse>(`/loans/${requestId}/grant`, {
        method: 'POST',
    });
}

export async function verifyGrant(transactionId: string, requestId: string): Promise<any> {
    return apiRequest<any>(`/loans/verify-grant/${transactionId}?request_id=${requestId}`);
}

export async function repayLoan(data: { loan_id: string; montant: number }): Promise<any> {
    return apiRequest<any>('/loans/repay', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function getRepayments(): Promise<Repayment[]> {
    return apiRequest<Repayment[]>('/loans/repayments');
}

export async function verifyRepayment(transactionId: string): Promise<any> {
    return apiRequest<any>(`/loans/verify-repayment/${transactionId}`);
}

export async function updateLoanRequestStatus(requestId: string, status: string): Promise<LoanRequest> {
    return apiRequest<LoanRequest>(`/loans/${requestId}/status?statut=${encodeURIComponent(status)}`, {
        method: 'PATCH',
    });
}

export async function applyLoanPenalty(loanId: string, amount: number): Promise<any> {
    return apiRequest<any>(`/loans/${loanId}/apply-penalty?amount=${amount}`, {
        method: 'PATCH',
    });
}
