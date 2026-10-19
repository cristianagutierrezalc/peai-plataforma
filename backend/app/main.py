"""Aplicacion FastAPI principal de PEA-i Plataforma."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import get_settings
from .database import init_db
from .routers import grupos, investigadores, productos, estadisticas, auth

settings = get_settings()

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
    init_db()


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