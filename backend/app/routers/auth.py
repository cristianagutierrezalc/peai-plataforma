"""Router de autenticacion."""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from ..database import get_db
from .. import models, schemas
from ..auth import hash_password, verify_password, create_access_token, get_current_user
from ..config import get_settings

router = APIRouter(prefix="/api/auth", tags=["Autenticacion"])
settings = get_settings()


@router.post("/register", response_model=schemas.UsuarioRespuesta, status_code=201)
def register(user: schemas.UsuarioCrear, db: Session = Depends(get_db)):
    if db.query(models.Usuario).filter(models.Usuario.username == user.username).first():
        raise HTTPException(status_code=400, detail="El usuario ya existe")
    db_user = models.Usuario(
        username=user.username,
        password_hash=hash_password(user.password),
        nombre=user.nombre,
        rol=user.rol,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@router.post("/login", response_model=schemas.Token)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.Usuario).filter(models.Usuario.username == form.username).first()
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    if not user.activo:
        raise HTTPException(status_code=403, detail="Usuario desactivado")
    token = create_access_token(data={"sub": user.username, "rol": user.rol})
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=schemas.UsuarioRespuesta)
def me(current_user=Depends(get_current_user)):
    return current_user