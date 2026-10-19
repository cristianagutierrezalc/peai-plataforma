"""Configuracion de la aplicacion PEA-i Plataforma."""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "PEA-i Plataforma"
    app_version: str = "1.0.0"
    debug: bool = True

    # Base de datos: SQLite para desarrollo, PostgreSQL para produccion
    database_url: str = "sqlite:///./peai.db"

    # JWT
    secret_key: str = "cambiar-en-produccion-usar-variable-de-entorno"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 24 horas

    # CORS
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()