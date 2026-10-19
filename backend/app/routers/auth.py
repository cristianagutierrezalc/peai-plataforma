"""Router de autenticacion."""
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models, schemas
from ..auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)

router = APIRouter(prefix="/api/auth", tags=["Autenticacion"])

# --- Limitacion de intentos de login (evita fuerza bruta en un deploy publico) ---
MAX_INTENTOS_LOGIN = 10
VENTANA_BLOQUEO_SEGUNDOS = 300
_intentos: dict[str, list[float]] = {}

ROLES_VALIDOS = {r.value for r in models.RolUsuario}

# Jerarquia de privilegios: cada rol solo puede crear usuarios de su mismo
# nivel o inferiores. Sin esto, un coordinador comprometido podria acunar
# administradores y escalar a control total de la plataforma.
NIVEL_ROL = {
    models.RolUsuario.INVESTIGADOR: 0,
    models.RolUsuario.COORDINADOR: 1,
    models.RolUsuario.ADMIN: 2,
}


def _clave_intentos(username: str, request: Request) -> str:
    ip = request.client.host if request.client else "desconocida"
    return f"{ip}|{username}"


def _registrar_intento(clave: str) -> None:
    ahora = datetime.now().timestamp()
    previos = [t for t in _intentos.get(clave, []) if ahora - t < VENTANA_BLOQUEO_SEGUNDOS]
    previos.append(ahora)
    _intentos[clave] = previos


def _intentos_excedidos(clave: str) -> bool:
    ahora = datetime.now().timestamp()
    return len([t for t in _intentos.get(clave, []) if ahora - t < VENTANA_BLOQUEO_SEGUNDOS]) >= MAX_INTENTOS_LOGIN


def _limpiar_intentos(clave: str) -> None:
    _intentos.pop(clave, None)


@router.post("/register", response_model=schemas.UsuarioRespuesta, status_code=201)
def register(user: schemas.UsuarioCrear, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Crea una cuenta de usuario. Solo administradores y coordinadores.

    No es autorregistro publico: sin credenciales de un usuario privileged
    no se puede crear cuentas ni escalarse a un rol superior.
    """
    if current_user.rol not in (models.RolUsuario.ADMIN, models.RolUsuario.COORDINADOR):
        raise HTTPException(status_code=403, detail="Permisos insuficientes para crear usuarios")

    if len(user.password) < 8:
        raise HTTPException(status_code=422, detail="La contraseña debe tener al menos 8 caracteres")

    if db.query(models.Usuario).filter(models.Usuario.username == user.username).first():
        raise HTTPException(status_code=400, detail="El usuario ya existe")

    # El rol lo elige el administrador que crea la cuenta.
    # Si llega uno invalido, se degrada a investigador en vez de romper.
    rol = models.RolUsuario(user.rol) if user.rol in ROLES_VALIDOS else models.RolUsuario.INVESTIGADOR

    # No se puede crear un usuario con mas privilegios que el que lo crea.
    if NIVEL_ROL[rol] > NIVEL_ROL[current_user.rol]:
        raise HTTPException(
            status_code=403,
            detail="No puede crear un usuario con un rol superior al suyo",
        )

    db_user = models.Usuario(
        username=user.username,
        password_hash=hash_password(user.password),
        nombre=user.nombre,
        rol=rol,
        activo=True,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@router.post("/login", response_model=schemas.Token)
def login(
    request: Request,
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    clave = _clave_intentos(form.username, request)

    if _intentos_excedidos(clave):
        raise HTTPException(
            status_code=429,
            detail="Demasiados intentos fallidos. Intenta de nuevo en unos minutos.",
        )

    user = db.query(models.Usuario).filter(models.Usuario.username == form.username).first()
    if not user or not verify_password(form.password, user.password_hash):
        _registrar_intento(clave)
        # Mensaje generico: no revela si el usuario existe.
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    if not user.activo:
        raise HTTPException(status_code=403, detail="Usuario desactivado")

    _limpiar_intentos(clave)
    token = create_access_token(data={"sub": user.username, "rol": user.rol.value})
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=schemas.UsuarioRespuesta)
def me(current_user=Depends(get_current_user)):
    return current_user