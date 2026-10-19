"""Conexion a la base de datos con SQLAlchemy."""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from .config import get_settings

settings = get_settings()


def normalizar_url(url: str) -> str:
    """Normaliza la URL de conexion segun el proveedor.

    - Render y Supabase entregan 'postgres://' o 'postgresql://'.
      SQLAlchemy 2.x solo acepta el prefijo 'postgresql://'.
    - Fuerza el driver psycopg2 para que no dependa del default de SQLAlchemy.
    """
    url = url.strip()
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://") :]
    if url.startswith("postgresql://") and "+" not in url.split("://", 1)[0]:
        url = "postgresql+psycopg2://" + url[len("postgresql://") :]
    return url


database_url = normalizar_url(settings.database_url)

connect_args = {}
engine_kwargs = {"echo": settings.debug}

if database_url.startswith("sqlite"):
    # SQLite necesita check_same_thread=False para FastAPI
    connect_args = {"check_same_thread": False}
else:
    # Pool explicito: en despliegues serverless el proveedor corta conexiones
    # ociosas con frecuencia. pre_ping las revive y pool_recycle evita que
    # el servidor web rechace una conexion que ya esta muerta.
    engine_kwargs.update(
        pool_size=settings.db_pool_size,
        max_overflow=settings.db_max_overflow,
        pool_timeout=settings.db_pool_timeout,
        pool_recycle=settings.db_pool_recycle,
        pool_pre_ping=True,
    )

engine = create_engine(database_url, connect_args=connect_args, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dependency injection para sesiones de BD en FastAPI."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Crea todas las tablas."""
    Base.metadata.create_all(bind=engine)