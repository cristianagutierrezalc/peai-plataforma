"""Router de estadisticas y vistas."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from .. import crud

router = APIRouter(prefix="/api/estadisticas", tags=["Estadisticas"])


@router.get("/global")
def resumen_global(incluir_inactivos: bool = False, db: Session = Depends(get_db)):
    return crud.resumen_global(db, incluir_inactivos=incluir_inactivos)


@router.get("/grupo/{cod}")
def vista_grupo(cod: str, db: Session = Depends(get_db)):
    res = crud.vista_grupo(db, cod)
    if not res:
        raise HTTPException(status_code=404, detail=f"No existe el grupo '{cod}'")
    return {
        "grupo": {
            "cod": res["grupo"].cod,
            "nombre": res["grupo"].nombre,
            "categoria": res["grupo"].categoria,
        },
        "n_productos": res["n_productos"],
        "productos": [
            {"id": p.id, "titulo": p.titulo, "tipo": p.tipo, "anio": p.anio, "activo": p.activo}
            for p in res["productos"]
        ],
    }


@router.get("/investigador/{inv_id}")
def vista_investigador(inv_id: str, db: Session = Depends(get_db)):
    res = crud.vista_investigador(db, inv_id)
    if not res:
        raise HTTPException(status_code=404, detail=f"No existe el investigador '{inv_id}'")
    return {
        "investigador": {
            "id": res["investigador"].id,
            "nombre": res["investigador"].nombre,
            "categoria": res["investigador"].categoria,
        },
        "n_productos": res["n_productos"],
        "productos": [
            {"id": p.id, "titulo": p.titulo, "tipo": p.tipo, "anio": p.anio, "activo": p.activo}
            for p in res["productos"]
        ],
    }