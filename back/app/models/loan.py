from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime, Boolean, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base

class LoanRequest(Base):
    __tablename__ = "loan_requests"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"))
    montant = Column(Float)
    duree = Column(Integer)
    motif = Column(String)
    revenus = Column(Float)
    statut = Column(String, default="En attente") # 'En attente', 'Refusé', 'Validé par l\'agent', 'Prêt accordé'
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    documents = Column(JSON, default=[]) # Store doc info as JSON for simplicity

    user = relationship("User")

class Loan(Base):
    __tablename__ = "loans"

    id = Column(String, primary_key=True, index=True)
    loan_request_id = Column(String, ForeignKey("loan_requests.id"))
    client_id = Column(String, ForeignKey("users.id"))
    agent_id = Column(String, ForeignKey("users.id"), nullable=True)
    montant = Column(Float)
    taux_interet = Column(Float)
    date_limite = Column(String)
    montant_total = Column(Float)
    statut = Column(String, default="En cours") # 'En cours', 'Soldé', 'En retard'
    penalites = Column(Float, default=0)
    echeancier = Column(JSON) # Detailed schedule
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    request = relationship("LoanRequest")
    client = relationship("User", foreign_keys=[client_id])
    agent = relationship("User", foreign_keys=[agent_id])

class Repayment(Base):
    __tablename__ = "repayments"

    id = Column(String, primary_key=True, index=True)
    loan_id = Column(String, ForeignKey("loans.id"))
    montant = Column(Float)
    date_paiement = Column(DateTime(timezone=True), server_default=func.now())
    fedapay_transaction_id = Column(String, nullable=True)
    statut = Column(String, default="En attente") # 'En attente', 'Confirmé'

    loan = relationship("Loan")
