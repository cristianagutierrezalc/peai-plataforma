"""Modelos SQLAlchemy para PEA-i Plataforma."""
from sqlalchemy import (
    Column, String, Integer, Boolean, Float, Text, ForeignKey, DateTime, Enum as SQLEnum
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
import enum


class RolIntegrante(str, enum.Enum):
    LIDER = "LIDER"
    COINVESTIGADOR = "COINVESTIGADOR"
    INVESTIGADOR = "INVESTIGADOR"
    SEMILLERISTA = "SEMILLERISTA"
    ESTUDIANTE = "ESTUDIANTE"


class EstadoActividad(str, enum.Enum):
    PENDIENTE = "PENDIENTE"
    EJECUTADA = "EJECUTADA"


class RolUsuario(str, enum.Enum):
    ADMIN = "admin"
    COORDINADOR = "coordinador"
    INVESTIGADOR = "investigador"


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(200), nullable=False)
    nombre = Column(String(200), default="")
        # values_callable hace que SQLAlchemy use el .value del enum (minusculas)
    # en vez del .name (mayusculas). Sin esto, PostgreSQL rechaza "ADMIN"
    # porque el tipo enum solo tiene "admin". SQLite no se daba cuenta.
    rol = Column(
        SQLEnum(RolUsuario, values_callable=lambda x: [e.value for e in x]),
        default=RolUsuario.INVESTIGADOR,
    )
    activo = Column(Boolean, default=True)
    creado_en = Column(DateTime, server_default=func.now())


class Grupo(Base):
    __tablename__ = "grupos"

    cod = Column(String(50), primary_key=True)
    nombre = Column(String(200), nullable=False)
    categoria = Column(String(20), default="SIN_CLASIFICAR")
    area = Column(String(200), default="")
    anio_fund = Column(Integer, default=0)
    lider = Column(String(50), ForeignKey("investigadores.id"), nullable=True)
    activo = Column(Boolean, default=True)
    creado_en = Column(DateTime, server_default=func.now())
    modificado_en = Column(DateTime, server_default=func.now(), onupdate=func.now())

    integrantes = relationship("Integrante", back_populates="grupo", cascade="all, delete-orphan")
    productos = relationship("Producto", back_populates="grupo")
    plan = relationship("Actividad", back_populates="grupo", cascade="all, delete-orphan")
    lider_rel = relationship("Investigador", foreign_keys=[lider])


class Investigador(Base):
    __tablename__ = "investigadores"

    id = Column(String(50), primary_key=True)
    nombre = Column(String(200), nullable=False)
    categoria = Column(String(20), default="SIN_CATEGORIA")
    formacion = Column(String(200), default="")
    email = Column(String(200), default="")
    activo = Column(Boolean, default=True)
    creado_en = Column(DateTime, server_default=func.now())
    modificado_en = Column(DateTime, server_default=func.now(), onupdate=func.now())

    productos = relationship("Producto", secondary="producto_autores", back_populates="autores")
    integrante_de = relationship("Integrante", back_populates="investigador", cascade="all, delete-orphan")


class Producto(Base):
    __tablename__ = "productos"

    id = Column(String(50), primary_key=True)
    titulo = Column(String(500), nullable=False)
    tipo = Column(String(50), default="OTRO")
    categoria = Column(String(20), default="")
    validacion = Column(String(20), default="NO_VALIDADO")
    anio = Column(Integer, default=0)
    grupo_cod = Column(String(50), ForeignKey("grupos.cod"), nullable=True)
    activo = Column(Boolean, default=True)
    creado_en = Column(DateTime, server_default=func.now())
    modificado_en = Column(DateTime, server_default=func.now(), onupdate=func.now())

    grupo = relationship("Grupo", back_populates="productos")
    autores = relationship("Investigador", secondary="producto_autores", back_populates="productos")


class ProductoAutor(Base):
    __tablename__ = "producto_autores"

    producto_id = Column(String(50), ForeignKey("productos.id", ondelete="CASCADE"), primary_key=True)
    investigador_id = Column(String(50), ForeignKey("investigadores.id", ondelete="CASCADE"), primary_key=True)


class Integrante(Base):
    __tablename__ = "integrantes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    grupo_cod = Column(String(50), ForeignKey("grupos.cod", ondelete="CASCADE"), nullable=False)
    investigador_id = Column(String(50), ForeignKey("investigadores.id", ondelete="CASCADE"), nullable=False)
    rol = Column(SQLEnum(RolIntegrante), default=RolIntegrante.INVESTIGADOR)
    activo = Column(Boolean, default=True)

    grupo = relationship("Grupo", back_populates="integrantes")
    investigador = relationship("Investigador", back_populates="integrante_de")


class Actividad(Base):
    __tablename__ = "actividades"

    id = Column(Integer, primary_key=True, autoincrement=True)
    grupo_cod = Column(String(50), ForeignKey("grupos.cod", ondelete="CASCADE"), nullable=False)
    descripcion = Column(String(500), nullable=False)
    estado = Column(SQLEnum(EstadoActividad), default=EstadoActividad.PENDIENTE)
    creado_en = Column(DateTime, server_default=func.now())

    grupo = relationship("Grupo", back_populates="plan")