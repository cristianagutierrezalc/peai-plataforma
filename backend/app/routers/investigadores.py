"""Router de investigadores."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import models, schemas, crud
from .productos import _producto_a_respuesta

router = APIRouter(prefix="/api/investigadores", tags=["Investigadores"])


@router.get("", response_model=List[schemas.InvestigadorRespuesta], include_in_schema=False)
def listar_investigadores(skip: int = 0, limit: int = 100, activo: bool | None = None, db: Session = Depends(get_db)):
    return crud.listar_investigadores(db, skip=skip, limit=limit, activo=activo)


@router.get("/{inv_id}", response_model=schemas.InvestigadorRespuesta)
def obtener_investigador(inv_id: str, db: Session = Depends(get_db)):
    inv = crud.obtener_investigador(db, inv_id)
    if not inv:
        raise HTTPException(status_code=404, detail=f"No existe el investigador '{inv_id}'")
    return inv


@router.post("", response_model=schemas.InvestigadorRespuesta, status_code=201, include_in_schema=False)
def crear_investigador(inv: schemas.InvestigadorCrear, db: Session = Depends(get_db)):
    if crud.obtener_investigador(db, inv.id):
        raise HTTPException(status_code=400, detail=f"Ya existe el investigador '{inv.id}'")
    return crud.crear_investigador(db, inv)


@router.put("/{inv_id}", response_model=schemas.InvestigadorRespuesta)
def actualizar_investigador(inv_id: str, datos: schemas.InvestigadorActualizar, db: Session = Depends(get_db)):
    inv = crud.actualizar_investigador(db, inv_id, datos)
    if not inv:
        raise HTTPException(status_code=404, detail=f"No existe el investigador '{inv_id}'")
    return inv


@router.delete("/{inv_id}", status_code=204)
def eliminar_investigador(inv_id: str, db: Session = Depends(get_db)):
    if not crud.eliminar_investigador(db, inv_id):
        raise HTTPException(status_code=404, detail=f"No existe el investigador '{inv_id}'")


@router.get("/{inv_id}/vista")
def vista_investigador(inv_id: str, db: Session = Depends(get_db)):
    res = crud.vista_investigador(db, inv_id)
    if not res:
        raise HTTPException(status_code=404, detail=f"No existe el investigador '{inv_id}'")
    return {
        "investigador": schemas.InvestigadorRespuesta.model_validate(res["investigador"]),
        "n_productos": res["n_productos"],
        "productos": [_producto_a_respuesta(p) for p in res["productos"]],
    }