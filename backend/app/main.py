"""Aplicacion FastAPI principal de PEA-i Plataforma."""
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .database import init_db, SessionLocal
from .seed import seed_admin
from .routers import grupos, investigadores, productos, estadisticas, auth

settings = get_settings()
logger = logging.getLogger("peai")

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Programa Estadistico de Analisis de Investigacion - Universidad Popular del Cesar",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    # Revisa SECRET_KEY, DEBUG y credenciales antes de aceptar trafico.
    settings.validar_secretos()

    init_db()

    db = SessionLocal()
    try:
        usuario = seed_admin(db)
        if usuario is not None:
            logger.warning("Administrador inicial creado: %s (rol=%s)", usuario.username, usuario.rol.value)
    finally:
        db.close()


app.include_router(auth.router)
app.include_router(grupos.router)
app.include_router(investigadores.router)
app.include_router(productos.router)
app.include_router(estadisticas.router)


@app.get("/")
def root():
    return {"app": settings.app_name, "version": settings.app_version, "status": "ok"}


@app.get("/health")
def health():
    return {"status": "healthy"}