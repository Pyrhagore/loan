from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import User, LoanRequest, Loan, Repayment
from ..schemas.loan import LoanRequestCreate, LoanRequestResponse, LoanResponse, RepaymentCreate
from ..services.fedapay_service import FedaPayService
from .deps import get_current_user, settings
from sqlalchemy import func
from datetime import datetime, timedelta
import uuid

router = APIRouter(prefix="/loans", tags=["loans"])

@router.post("/request", response_model=LoanRequestResponse)
def create_loan_request(request: LoanRequestCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    new_request = LoanRequest(
        id="REQ-" + str(uuid.uuid4())[:8].upper(),
        user_id=current_user.id,
        montant=request.montant,
        duree=request.duree,
        motif=request.motif,
        revenus=request.revenus,
        documents=request.documents or [],
        statut="En attente"
    )
    db.add(new_request)
    db.commit()
    db.refresh(new_request)
    return new_request

@router.get("/requests", response_model=List[LoanRequestResponse])
def get_loan_requests(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role in ["admin", "agent"]:
        return db.query(LoanRequest).all()
    return db.query(LoanRequest).filter(LoanRequest.user_id == current_user.id).all()

@router.post("/{request_id}/grant")
async def grant_loan(request_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can grant loans")
    
    loan_request = db.query(LoanRequest).filter(LoanRequest.id == request_id).first()
    if not loan_request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    client = loan_request.user
    customer_info = {
        "firstname": client.prenom,
        "lastname": client.nom,
        "email": client.email
    }
    
    # Décaissement simulé : on crée une transaction FedaPay (collecte vers notre compte)
    # 1. Initier la transaction FedaPay (collecte simulée pour décaissement)
    payment_url = None
    fedapay_error = None
    transaction_id = None
    try:
        # On définit un callback qui redirige vers une page de succès dans le front
        callback_url = f"{settings.frontend_url}/#/admin/verify-grant?req={request_id}"
        
        fedapay_result = await FedaPayService.initiate_payment(
            amount=int(loan_request.montant),
            user_info=customer_info,
            callback_url=callback_url,
            description=f"Décaissement prêt {request_id} - {client.prenom} {client.nom}",
            metadata={"request_id": request_id, "client_id": client.id, "type": "grant"}
        )
        payment_url = fedapay_result.get("payment_url")
        transaction_id = fedapay_result.get("transaction_id")
        print(f"[FedaPay] ✅ Transaction initiée: {transaction_id}")
    except Exception as e:
        fedapay_error = str(e)
        print(f"[FedaPay] ❌ Erreur initiation: {fedapay_error}")
        raise HTTPException(status_code=500, detail=f"Erreur FedaPay: {fedapay_error}")

    return {
        "payment_url": payment_url,
        "transaction_id": transaction_id,
        "message": "Transaction FedaPay initiée. Le prêt sera accordé après confirmation du paiement."
    }

@router.get("/verify-grant/{transaction_id}")
async def verify_grant(transaction_id: str, request_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can verify grants")
    
    # 1. Vérifier le statut chez FedaPay
    status = await FedaPayService.get_transaction_status(transaction_id)
    if status != "approved" and status != "transferred": # transferred for payouts, approved for collections
        return {"status": status, "success": False, "message": f"La transaction est en état : {status}"}

    # 2. Vérifier si le prêt n'existe pas déjà
    existing_loan = db.query(Loan).filter(Loan.loan_request_id == request_id).first()
    if existing_loan:
        return {"status": status, "success": True, "message": "Le prêt a déjà été accordé."}

    # 3. Finaliser l'octroi du prêt
    loan_request = db.query(LoanRequest).filter(LoanRequest.id == request_id).first()
    if not loan_request:
        raise HTTPException(status_code=404, detail="Request not found")

    client = loan_request.user
    taux = 0.05 # Taux par défaut si non spécifié ailleurs
    montant_total = loan_request.montant * (1 + taux)
    
    # Génération automatique de l'échéantier
    echeancier = []
    montant_mensuel = round(montant_total / loan_request.duree, 2)
    from datetime import timedelta
    now = datetime.now()
    
    for i in range(1, loan_request.duree + 1):
        # On ajoute 30 jours pour chaque échéance
        date_echeance = now + timedelta(days=30 * i)
        echeancier.append({
            "numero": i,
            "date_limite": date_echeance.strftime("%Y-%m-%d"),
            "montant": montant_mensuel,
            "paye": False,
            "date_paiement": None
        })
    
    date_limite_finale = echeancier[-1]["date_limite"] if echeancier else "N/A"

    new_loan = Loan(
        id="LOAN-" + str(uuid.uuid4())[:8].upper(),
        loan_request_id=loan_request.id,
        client_id=client.id,
        agent_id=None,
        montant=loan_request.montant,
        taux_interet=taux * 100, # Stocké en pourcentage
        date_limite=date_limite_finale,
        montant_total=montant_total,
        statut="En cours",
        echeancier=echeancier,
        penalites=0
    )
    
    loan_request.statut = "Prêt accordé"
    db.add(new_loan)
    db.commit()
    db.refresh(new_loan)
    
    return {
        "status": status,
        "success": True,
        "loan_id": new_loan.id,
        "message": "Prêt accordé avec succès !"
    }

@router.get("/", response_model=List[LoanResponse])
def get_loans(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Loan)
    if current_user.role != "admin":
        query = query.filter(Loan.client_id == current_user.id)
    
    loans = query.all()
    # Populate client names and auto-repair status/dates
    for loan in loans:
        loan.client_nom = loan.client.nom
        loan.client_prenom = loan.client.prenom
        
        # Auto-repair status: If everything is paid but status is not "Soldé"
        if loan.statut != "Soldé" and loan.echeancier:
            if all(item.get("paye", False) for item in loan.echeancier):
                loan.statut = "Soldé"
                db.add(loan)
        
        # Auto-repair date_limite: If it's the old "Dans X mois" format
        if loan.date_limite and "Dans" in loan.date_limite and loan.echeancier:
            loan.date_limite = loan.echeancier[-1]["date_limite"]
            db.add(loan)
            
    db.commit()
    return loans

@router.post("/repay")
async def repay_loan(repayment: RepaymentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    loan = db.query(Loan).filter(Loan.id == repayment.loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    
    user_info = {
        "firstname": current_user.prenom,
        "lastname": current_user.nom,
        "email": current_user.email
    }
    
    fedapay_res = await FedaPayService.initiate_payment(
        amount=int(repayment.montant),
        user_info=user_info,
        callback_url=f"{settings.frontend_url}/#/?verify_repayment=true",
        description=f"Remboursement Prêt {loan.id}",
        metadata={"loan_id": loan.id, "user_id": current_user.id}
    )
    
    # Create internal record as PENDING (not a formal model yet, using Repayment)
    new_rep = Repayment(
        id="REP-" + str(uuid.uuid4())[:8].upper(),
        loan_id=loan.id,
        montant=repayment.montant,
        fedapay_transaction_id=fedapay_res["transaction_id"]
    )
    db.add(new_rep)
    db.commit()
    
    return fedapay_res

@router.get("/repayments", response_model=List[dict])
def get_repayments(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role in ["admin", "agent"]:
        reps = db.query(Repayment).filter(Repayment.statut == "Confirmé").all()
    else:
        reps = db.query(Repayment).join(Loan).filter(Loan.client_id == current_user.id, Repayment.statut == "Confirmé").all()
    
    result = []
    for r in reps:
        loan = db.query(Loan).filter(Loan.id == r.loan_id).first()
        client_nom = ""
        client_prenom = ""
        if loan and loan.client:
            client_nom = loan.client.nom or ""
            client_prenom = loan.client.prenom or ""
        result.append({
            "id": r.id,
            "loan_id": r.loan_id,
            "montant": r.montant,
            "date_paiement": r.date_paiement.isoformat() if r.date_paiement else None,
            "statut": r.statut,
            "client_nom": client_nom,
            "client_prenom": client_prenom,
        })
    return result

@router.get("/verify-repayment/{transaction_id}")
async def verify_repayment(transaction_id: str, db: Session = Depends(get_db)):
    # 1. Check FedaPay
    status = await FedaPayService.get_transaction_status(transaction_id)
    if status != "approved":
        return {"status": status, "success": False}

    # 2. Get the repayment record
    rep = db.query(Repayment).filter(Repayment.fedapay_transaction_id == transaction_id).first()
    if not rep:
        raise HTTPException(status_code=404, detail="Repayment record not found")

    if rep.statut == "Confirmé":
        return {"status": status, "success": True, "message": "Déjà confirmé"}

    # 3. Update Repayment
    rep.statut = "Confirmé"
    
    # 4. Update Loan Schedule
    loan = db.query(Loan).filter(Loan.id == rep.loan_id).first()
    if loan:
        # Logic to mark installments as paid
        paid_amount = rep.montant
        schedule = list(loan.echeancier)
        for i in range(len(schedule)):
            if not schedule[i]["paye"] and paid_amount > 0:
                inst_amount = schedule[i]["montant"]
                if paid_amount >= inst_amount:
                    schedule[i]["paye"] = True
                    schedule[i]["date_paiement"] = func.now().isoformat() if hasattr(func.now(), 'isoformat') else str(datetime.now())
                    paid_amount -= inst_amount
                else:
                    # Partial payment? For now we just mark as paid if close or just ignore partial
                    # In a real app we'd handle partial payments better.
                    break
        
        loan.echeancier = schedule
        
        # 5. Check if fully repaid
        if all(item.get("paye", False) for item in schedule):
            loan.statut = "Soldé"
            print(f"[Loan] 🏁 Prêt {loan.id} entièrement soldé !")
        
    db.commit()
    return {"status": status, "success": True, "message": "Remboursement validé et échéancier mis à jour !"}
@router.patch("/{request_id}/status", response_model=LoanRequestResponse)
def update_loan_request_status(
    request_id: str,
    statut: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["admin", "agent"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db_request = db.query(LoanRequest).filter(LoanRequest.id == request_id).first()
    if not db_request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    db_request.statut = statut
    db.commit()
    db.refresh(db_request)
    return db_request

@router.patch("/{loan_id}/apply-penalty")
def apply_penalty(
    loan_id: str,
    amount: float,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can apply penalties")
    
    loan = db.query(Loan).filter(Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    
    # Update penalty and total
    loan.penalites += amount
    loan.montant_total += amount
    loan.statut = "En retard"
    
    # Update the first unpaid installment in the schedule
    schedule = list(loan.echeancier) if loan.echeancier else []
    for i in range(len(schedule)):
        if not schedule[i].get("paye", False):
            schedule[i]["montant"] += amount
            break
    
    loan.echeancier = schedule
    db.commit()
    db.refresh(loan)
    return {"success": True, "loan_id": loan.id, "new_total": loan.montant_total, "penalties": loan.penalites}
