"""Schemas Pydantic para validacion de entrada/salida de la API."""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from .models import RolIntegrante, EstadoActividad


# ---- Investigador ----
class InvestigadorBase(BaseModel):
    nombre: str
    categoria: str = "SIN_CATEGORIA"
    formacion: str = ""
    email: str = ""


class InvestigadorCrear(InvestigadorBase):
    id: str = Field(..., min_length=1, max_length=50)


class InvestigadorActualizar(BaseModel):
    nombre: Optional[str] = None
    categoria: Optional[str] = None
    formacion: Optional[str] = None
    email: Optional[str] = None
    activo: Optional[bool] = None


class InvestigadorRespuesta(InvestigadorBase):
    id: str
    activo: bool
    creado_en: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


# ---- Grupo ----
class GrupoBase(BaseModel):
    nombre: str
    categoria: str = "SIN_CLASIFICAR"
    area: str = ""
    anio_fund: int = 0
    lider: Optional[str] = None


class GrupoCrear(GrupoBase):
    cod: str = Field(..., min_length=1, max_length=50)


class GrupoActualizar(BaseModel):
    nombre: Optional[str] = None
    categoria: Optional[str] = None
    area: Optional[str] = None
    anio_fund: Optional[int] = None
    lider: Optional[str] = None
    activo: Optional[bool] = None


class GrupoRespuesta(GrupoBase):
    cod: str
    activo: bool
    creado_en: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


# ---- Producto ----
class ProductoBase(BaseModel):
    titulo: str
    tipo: str = "OTRO"
    categoria: str = ""
    validacion: str = "NO_VALIDADO"
    anio: int = 0
    grupo_cod: Optional[str] = None
    autores: List[str] = []


class ProductoCrear(ProductoBase):
    id: str = Field(..., min_length=1, max_length=50)


class ProductoActualizar(BaseModel):
    titulo: Optional[str] = None
    tipo: Optional[str] = None
    categoria: Optional[str] = None
    validacion: Optional[str] = None
    anio: Optional[int] = None
    grupo_cod: Optional[str] = None
    autores: Optional[List[str]] = None
    activo: Optional[bool] = None


class ProductoRespuesta(ProductoBase):
    id: str
    activo: bool
    creado_en: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


# ---- Integrante ----
class IntegranteCrear(BaseModel):
    investigador_id: str
    rol: RolIntegrante = RolIntegrante.INVESTIGADOR
    activo: bool = True


class IntegranteRespuesta(BaseModel):
    id: int
    grupo_cod: str
    investigador_id: str
    rol: RolIntegrante
    activo: bool
    model_config = ConfigDict(from_attributes=True)


# ---- Actividad (plan) ----
class ActividadCrear(BaseModel):
    descripcion: str


class ActividadRespuesta(BaseModel):
    id: int
    grupo_cod: str
    descripcion: str
    estado: EstadoActividad
    creado_en: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


# ---- Auth ----
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    username: Optional[str] = None


class UsuarioLogin(BaseModel):
    username: str
    password: str


class UsuarioCrear(BaseModel):
    username: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=8, max_length=200)
    nombre: str = Field("", max_length=200)
    rol: str = "investigador"


class UsuarioRespuesta(BaseModel):
    id: int
    username: str
    nombre: str
    rol: str
    activo: bool
    model_config = ConfigDict(from_attributes=True)


# ---- Estadisticas ----
class FiltroEstadisticas(BaseModel):
    ventana: Optional[int] = None
    anio_ref: Optional[int] = None
    desde: Optional[int] = None
    hasta: Optional[int] = None
    incluir_inactivos: bool = False


class ResumenGlobal(BaseModel):
    n_productos: int
    n_grupos: int
    n_investigadores: int
    por_tipo: dict
    por_anio: dict
    por_validacion: dict
    por_grupo: dict
    por_investigador: dict


# ---- Importacion ----
class ImportacionRespuesta(BaseModel):
    tipo: str
    grupos: int = 0
    investigadores: int = 0
    productos: int = 0
    vinculos: int = 0
    duplicados: int = 0
    errores: List[str] = []
    avisos: List[str] = []