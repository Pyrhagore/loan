import sys
import os

# Add the parent directory to sys.path to allow importing from 'app'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine
from app.models import User, LoanRequest, Loan, Repayment

def clean_database():
    db = SessionLocal()
    try:
        print("--- Nettoyage de la base de données ---")
        
        # 1. Supprimer les remboursements
        repayments_deleted = db.query(Repayment).delete()
        print(f"Bouchons de remboursements supprimés : {repayments_deleted}")
        
        # 2. Supprimer les prêts
        loans_deleted = db.query(Loan).delete()
        print(f"Prêts supprimés : {loans_deleted}")
        
        # 3. Supprimer les demandes de prêt
        requests_deleted = db.query(LoanRequest).delete()
        print(f"Demandes de prêt supprimées : {requests_deleted}")
        
        # 4. Supprimer tous les utilisateurs SAUF l'admin
        # On garde 'admin@loan.com' ou l'ID USR-ADMIN-001
        users_deleted = db.query(User).filter(User.role != 'admin').delete()
        print(f"Utilisateurs (non-admin) supprimés : {users_deleted}")
        
        db.commit()
        print("--- Nettoyage terminé avec succès ---")
        
    except Exception as e:
        db.rollback()
        print(f"Erreur lors du nettoyage : {e}")
    finally:
        db.close()

if __name__ == "__main__":
    clean_database()
