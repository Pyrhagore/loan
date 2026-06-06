from sqlalchemy.orm import Session
from .database import SessionLocal
from .models import User
from .services.auth_service import get_password_hash
import uuid

def init_admin_user():
    db = SessionLocal()
    try:
        # Check if admin exists
        admin = db.query(User).filter(User.email == "admin@loan.com").first()
        if not admin:
            admin_user = User(
                id="USR-ADMIN-001",
                email="admin@loan.com",
                hashed_password=get_password_hash("admin123"),
                nom="ADMIN",
                prenom="System",
                telephone="+22900000000",
                role="admin",
                is_active=True
            )
            db.add(admin_user)
            db.commit()
            print("Compte administrateur par défaut créé : admin@loan.com / admin123")
        else:
            print("Compte administrateur déjà existant.")
    finally:
        db.close()
