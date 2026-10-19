"""Router de estadisticas y vistas."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from .. import crud, schemas

router = APIRouter(prefix="/api/estadisticas", tags=["Estadisticas"])


@router.get("/global")
def resumen_global(
    ventana: int | None = Query(
        None, ge=1, le=100,
        description="Ventana de observacion: cuantos ultimos anios incluir",
    ),
    desde: int | None = Query(None, ge=1900, le=2100, description="Anio inicial del rango"),
    hasta: int | None = Query(None, ge=1900, le=2100, description="Anio final del rango"),
    anio_ref: int | None = Query(
        None, ge=1900, le=2100,
        description="Anio de referencia para la ventana, util para consultar periodos historicos",
    ),
    incluir_inactivos: bool = False,
    db: Session = Depends(get_db),
):
    """Resumen estadistico con filtro opcional de ventana de observacion.

    El requerimiento 10 pide filtrar por anio: los ultimos dos, los ultimos
    cinco, o un rango explicito.
    """
    filtro = schemas.FiltroEstadisticas(
        ventana=ventana,
        desde=desde,
        hasta=hasta,
        anio_ref=anio_ref,
        incluir_inactivos=incluir_inactivos,
    )
    return crud.resumen_global(db, filtro=filtro)


@router.get("/grupo/{cod}")
def vista_grupo(
    cod: str,
    ventana: int | None = Query(None, ge=1, le=100),
    desde: int | None = Query(None, ge=1900, le=2100),
    hasta: int | None = Query(None, ge=1900, le=2100),
    db: Session = Depends(get_db),
):
    res = crud.vista_grupo(db, cod, desde=desde, hasta=hasta, ventana=ventana)
    if not res:
        raise HTTPException(status_code=404, detail=f"No existe el grupo '{cod}'")
    return {
        "grupo": {
            "cod": res["grupo"].cod,
            "nombre": res["grupo"].nombre,
            "categoria": res["grupo"].categoria,
        },
        "n_productos": res["n_productos"],
        "ventana": res.get("ventana", {"desde": None, "hasta": None}),
        "productos": [
            {"id": p.id, "titulo": p.titulo, "tipo": p.tipo, "anio": p.anio, "activo": p.activo}
            for p in res["productos"]
        ],
    }


@router.get("/investigador/{inv_id}")
def vista_investigador(
    inv_id: str,
    ventana: int | None = Query(None, ge=1, le=100),
    desde: int | None = Query(None, ge=1900, le=2100),
    hasta: int | None = Query(None, ge=1900, le=2100),
    db: Session = Depends(get_db),
):
    res = crud.vista_investigador(db, inv_id, desde=desde, hasta=hasta, ventana=ventana)
    if not res:
        raise HTTPException(status_code=404, detail=f"No existe el investigador '{inv_id}'")
    return {
        "investigador": {
            "id": res["investigador"].id,
            "nombre": res["investigador"].nombre,
            "categoria": res["investigador"].categoria,
        },
        "n_productos": res["n_productos"],
        "ventana": res.get("ventana", {"desde": None, "hasta": None}),
        "productos": [
            {"id": p.id, "titulo": p.titulo, "tipo": p.tipo, "anio": p.anio, "activo": p.activo}
            for p in res["productos"]
        ],
    }