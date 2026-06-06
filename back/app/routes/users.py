from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import User
from ..schemas.user import UserResponse, UserCreate
from ..routes.deps import get_current_user, get_admin_user
from ..services.auth_service import get_password_hash
import uuid

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/", response_model=List[UserResponse])
def read_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    return db.query(User).all()

@router.post("/agents", response_model=UserResponse)
def create_agent(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    # Vérifie si l'email existe déjà
    db_user = db.query(User).filter(User.email == user_in.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email déjà enregistré")
    
    new_agent = User(
        id=f"USR-AGENT-{str(uuid.uuid4())[:8]}",
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        nom=user_in.nom,
        prenom=user_in.prenom,
        telephone=user_in.telephone,
        role="agent",
        is_active=True
    )
    db.add(new_agent)
    db.commit()
    db.refresh(new_agent)
    return new_agent

@router.patch("/{user_id}/toggle-active", response_model=UserResponse)
def toggle_user_active(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    if db_user.role == "admin":
        raise HTTPException(status_code=400, detail="Impossible de modifier un administrateur")
        
    db_user.is_active = not db_user.is_active
    db.commit()
    db.refresh(db_user)
    return db_user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    if db_user.role == "admin":
        raise HTTPException(status_code=400, detail="Impossible de supprimer un administrateur")
        
    db.delete(db_user)
    db.commit()
    return None
