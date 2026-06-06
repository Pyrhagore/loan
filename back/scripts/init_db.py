import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine, Base
from app.models import User
from app.services.auth_service import get_password_hash
import uuid

def init_db():
    # Crée les tables si elles n'existent pas
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Vérifie si l'admin existe déjà
        admin = db.query(User).filter(User.email == "admin@loan.com").first()
        if not admin:
            admin = User(
                id="USR-ADMIN",
                email="admin@loan.com",
                hashed_password=get_password_hash("admin123"),
                nom="Administrateur",
                prenom="Principal",
                telephone="+22900000000",
                role="admin"
            )
            db.add(admin)
            db.commit()
            print("Compte administrateur créé par défaut : admin@loan.com / admin123")
        else:
            print("Le compte administrateur existe déjà.")
    except Exception as e:
        print(f"Erreur lors de l'initialisation : {e}")
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
