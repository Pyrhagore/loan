from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class LoanRequestBase(BaseModel):
    montant: float
    duree: int
    motif: str
    revenus: float

class LoanRequestCreate(LoanRequestBase):
    documents: Optional[List[dict]] = []

class LoanRequestResponse(LoanRequestBase):
    id: str
    user_id: str
    statut: str
    created_at: datetime
    documents: List[dict]

    class Config:
        from_attributes = True

class Echeance(BaseModel):
    numero: int
    date_limite: str
    montant: float
    paye: bool
    date_paiement: Optional[str] = None

class LoanResponse(BaseModel):
    id: str
    client_id: str
    client_nom: Optional[str] = None
    client_prenom: Optional[str] = None
    montant: float
    taux_interet: float
    date_limite: str
    montant_total: float
    statut: str
    echeancier: List[Echeance]
    created_at: datetime
    penalites: float = 0

    class Config:
        from_attributes = True

class RepaymentCreate(BaseModel):
    loan_id: str
    montant: float
