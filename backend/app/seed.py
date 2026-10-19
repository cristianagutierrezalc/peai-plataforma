"""Creacion del primer administrador a partir de variables de entorno.

El endpoint /api/auth/register esta cerrado por defecto, asi que el unico
poco de entrada inicial es este seeder. Es idempotente: si el usuario ya
existe no hace nada, de modo que se puede dejar configurado en el hosting
sin miedo a duplicados en cada arranque.
"""
from sqlalchemy.orm import Session

from . import models
from .auth import hash_password
from .config import get_settings

# Solo se aceptan estos roles para el admin inicial.
ROLES_PERMITIDOS = {"admin", "coordinador", "investigador"}


def seed_admin(db: Session) -> models.Usuario | None:
    """Crea el administrador inicial si las variables de entorno estan definidas.

    Devuelve el usuario creado, o None si no habia nada que hacer.
    """
    settings = get_settings()

    username = settings.admin_username.strip()
    password = settings.admin_password

    if not username or not password:
        # Sin credenciales configuradas no se inventa nada.
        # El operador debe crear el admin con otro mecanismo.
        return None

    if len(password) < 8:
        raise RuntimeError(
            f"ADMIN_PASSWORD del usuario '{username}' debe tener al menos 8 caracteres"
        )

    rol = settings.admin_rol.strip().lower()
    if rol not in ROLES_PERMITIDOS:
        raise RuntimeError(
            f"ADMIN_ROL invalido: '{settings.admin_rol}'. "
            f"Valores permitidos: {', '.join(sorted(ROLES_PERMITIDOS))}"
        )

    # Idempotencia: no recrear ni sobreescribir un admin existente.
    existente = db.query(models.Usuario).filter(models.Usuario.username == username).first()
    if existente is not None:
        return None

    usuario = models.Usuario(
        username=username,
        password_hash=hash_password(password),
        nombre=settings.admin_nombre.strip() or "Administrador",
        rol=models.RolUsuario(rol),
        activo=True,
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return usuario