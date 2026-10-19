"""Configuracion de la aplicacion PEA-i Plataforma."""
from pydantic_settings import BaseSettings
from functools import lru_cache

CLAVE_POR_DEFECTO = "cambiar-en-produccion-usar-variable-de-entorno"


class Settings(BaseSettings):
    app_name: str = "PEA-i Plataforma"
    app_version: str = "1.0.0"
    debug: bool = True
    # development | production. En produccion se validan secretos al arrancar.
    environment: str = "development"

    # Base de datos: SQLite para desarrollo, PostgreSQL para produccion
    database_url: str = "sqlite:///./peai.db"
    # Pool de conexiones (solo aplica a PostgreSQL).
    # pre_ping evita conexiones muertas cuando el proveedor corta la sesion.
    db_pool_size: int = 5
    db_max_overflow: int = 10
    db_pool_recycle: int = 300
    db_pool_timeout: int = 30

    # JWT
    secret_key: str = CLAVE_POR_DEFECTO
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 24 horas

    # CORS
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    # Registro publico de usuarios.
    # False = cerrado. Solo un admin autenticado puede crear usuarios.
    # True  = abierto, pero el rol SIEMPRE se fuerza a "investigador".
    allow_public_register: bool = False

    # Credenciales del primer administrador.
    # Si se definen, se crea el usuario al arrancar (idempotente).
    # Si se dejan vacias, no se crea nada y hay que usar un admin ya existente.
    admin_username: str = ""
    admin_password: str = ""
    admin_nombre: str = "Administrador"
    admin_rol: str = "admin"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    @property
    def es_produccion(self) -> bool:
        return self.environment.strip().lower() in ("production", "prod")

    def validar_secretos(self) -> None:
        """Revisa que la app no arranque en produccion con secretos de ejemplo."""
        if not self.es_produccion:
            return
        problemas = []
        if self.secret_key == CLAVE_POR_DEFECTO or len(self.secret_key) < 32:
            problemas.append("SECRET_KEY debe definirse y tener al menos 32 caracteres")
        if self.debug:
            problemas.append("DEBUG debe ser false en produccion")
        if not self.admin_username or not self.admin_password:
            problemas.append(
                "ADMIN_USERNAME y ADMIN_PASSWORD son obligatorios: "
                "sin ellos no hay forma de crear el primer usuario"
            )
        if problemas:
            raise RuntimeError(
                "Configuracion invalida para produccion:\n  - "
                + "\n  - ".join(problemas)
            )


@lru_cache
def get_settings() -> Settings:
    return Settings()