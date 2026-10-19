"""Router de productos de investigacion."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import models, schemas, crud

router = APIRouter(prefix="/api/productos", tags=["Productos"])


def _producto_a_respuesta(p: models.Producto) -> schemas.ProductoRespuesta:
    """Convierte un modelo Producto a su schema de respuesta."""
    return schemas.ProductoRespuesta(
        id=p.id,
        titulo=p.titulo,
        tipo=p.tipo,
        categoria=p.categoria,
        validacion=p.validacion,
        anio=p.anio,
        grupo_cod=p.grupo_cod,
        autores=[a.id for a in p.autores],
        activo=p.activo,
        creado_en=p.creado_en,
    )


@router.get("", response_model=List[schemas.ProductoRespuesta], include_in_schema=False)
def listar_productos(
    skip: int = 0, limit: int = 100, activo: bool | None = None,
    grupo_cod: str | None = None, anio_desde: int | None = None,
    anio_hasta: int | None = None, db: Session = Depends(get_db)
):
    productos = crud.listar_productos(db, skip=skip, limit=limit, activo=activo,
                                       grupo_cod=grupo_cod, anio_desde=anio_desde, anio_hasta=anio_hasta)
    return [_producto_a_respuesta(p) for p in productos]


@router.get("/{pid}", response_model=schemas.ProductoRespuesta)
def obtener_producto(pid: str, db: Session = Depends(get_db)):
    p = crud.obtener_producto(db, pid)
    if not p:
        raise HTTPException(status_code=404, detail=f"No existe el producto '{pid}'")
    return _producto_a_respuesta(p)


@router.post("", response_model=schemas.ProductoRespuesta, status_code=201, include_in_schema=False)
def crear_producto(prod: schemas.ProductoCrear, db: Session = Depends(get_db)):
    if crud.obtener_producto(db, prod.id):
        raise HTTPException(status_code=400, detail=f"Ya existe el producto '{prod.id}'")
    if prod.grupo_cod and not crud.obtener_grupo(db, prod.grupo_cod):
        raise HTTPException(status_code=400, detail=f"No existe el grupo '{prod.grupo_cod}'")
    for a in prod.autores:
        if not crud.obtener_investigador(db, a):
            raise HTTPException(status_code=400, detail=f"No existe el investigador '{a}'")
    return _producto_a_respuesta(crud.crear_producto(db, prod))


@router.put("/{pid}", response_model=schemas.ProductoRespuesta)
def actualizar_producto(pid: str, datos: schemas.ProductoActualizar, db: Session = Depends(get_db)):
    if datos.grupo_cod and not crud.obtener_grupo(db, datos.grupo_cod):
        raise HTTPException(status_code=400, detail=f"No existe el grupo '{datos.grupo_cod}'")
    if datos.autores:
        for a in datos.autores:
            if not crud.obtener_investigador(db, a):
                raise HTTPException(status_code=400, detail=f"No existe el investigador '{a}'")
    p = crud.actualizar_producto(db, pid, datos)
    if not p:
        raise HTTPException(status_code=404, detail=f"No existe el producto '{pid}'")
    return _producto_a_respuesta(p)


@router.delete("/{pid}", status_code=204)
def eliminar_producto(pid: str, db: Session = Depends(get_db)):
    if not crud.eliminar_producto(db, pid):
        raise HTTPException(status_code=404, detail=f"No existe el producto '{pid}'")