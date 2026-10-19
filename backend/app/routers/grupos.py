"""Router de grupos de investigacion."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import models, schemas, crud
from .productos import _producto_a_respuesta

router = APIRouter(prefix="/api/grupos", tags=["Grupos"])


@router.get("", response_model=List[schemas.GrupoRespuesta], include_in_schema=False)
def listar_grupos(skip: int = 0, limit: int = 100, activo: bool | None = None, db: Session = Depends(get_db)):
    return crud.listar_grupos(db, skip=skip, limit=limit, activo=activo)


@router.get("/{cod}", response_model=schemas.GrupoRespuesta)
def obtener_grupo(cod: str, db: Session = Depends(get_db)):
    g = crud.obtener_grupo(db, cod)
    if not g:
        raise HTTPException(status_code=404, detail=f"No existe el grupo '{cod}'")
    return g


@router.post("", response_model=schemas.GrupoRespuesta, status_code=201, include_in_schema=False)
def crear_grupo(grupo: schemas.GrupoCrear, db: Session = Depends(get_db)):
    if crud.obtener_grupo(db, grupo.cod):
        raise HTTPException(status_code=400, detail=f"Ya existe el grupo '{grupo.cod}'")
    if grupo.lider and not crud.obtener_investigador(db, grupo.lider):
        raise HTTPException(status_code=400, detail=f"No existe el investigador '{grupo.lider}'")
    return crud.crear_grupo(db, grupo)


@router.put("/{cod}", response_model=schemas.GrupoRespuesta)
def actualizar_grupo(cod: str, datos: schemas.GrupoActualizar, db: Session = Depends(get_db)):
    if datos.lider and not crud.obtener_investigador(db, datos.lider):
        raise HTTPException(status_code=400, detail=f"No existe el investigador '{datos.lider}'")
    g = crud.actualizar_grupo(db, cod, datos)
    if not g:
        raise HTTPException(status_code=404, detail=f"No existe el grupo '{cod}'")
    return g


@router.delete("/{cod}", status_code=204)
def eliminar_grupo(cod: str, db: Session = Depends(get_db)):
    if not crud.eliminar_grupo(db, cod):
        raise HTTPException(status_code=404, detail=f"No existe el grupo '{cod}'")


@router.post("/{cod}/integrantes", response_model=schemas.IntegranteRespuesta, status_code=201)
def agregar_integrante(cod: str, body: schemas.IntegranteCrear, db: Session = Depends(get_db)):
    res = crud.agregar_integrante(db, cod, body.investigador_id, body.rol.value, body.activo)
    if not res:
        raise HTTPException(status_code=400, detail="Grupo o investigador inexistente")
    return res


@router.delete("/{cod}/integrantes/{inv_id}", status_code=204)
def quitar_integrante(cod: str, inv_id: str, db: Session = Depends(get_db)):
    if not crud.quitar_integrante(db, cod, inv_id):
        raise HTTPException(status_code=404, detail="Integrante no encontrado")


@router.post("/{cod}/plan", response_model=schemas.ActividadRespuesta, status_code=201)
def encolar_actividad(cod: str, body: schemas.ActividadCrear, db: Session = Depends(get_db)):
    res = crud.encolar_actividad(db, cod, body.descripcion)
    if not res:
        raise HTTPException(status_code=404, detail=f"No existe el grupo '{cod}'")
    return res


@router.post("/{cod}/plan/atender", response_model=schemas.ActividadRespuesta)
def atender_actividad(cod: str, db: Session = Depends(get_db)):
    res = crud.atender_actividad(db, cod)
    if not res:
        raise HTTPException(status_code=404, detail="No hay actividades pendientes")
    return res


@router.get("/{cod}/vista")
def vista_grupo(cod: str, db: Session = Depends(get_db)):
    res = crud.vista_grupo(db, cod)
    if not res:
        raise HTTPException(status_code=404, detail=f"No existe el grupo '{cod}'")
    return {
        "grupo": schemas.GrupoRespuesta.model_validate(res["grupo"]),
        "n_productos": res["n_productos"],
        "productos": [_producto_a_respuesta(p) for p in res["productos"]],
    }