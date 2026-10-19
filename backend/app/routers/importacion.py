"""Router de importacion de datos (Requerimiento 7 del Taller 2).

Expone las tres vias que permite el enunciado: archivo CSV, archivo PDF y
descarga desde una URL de SCIENTI.

No exige autenticacion a proposito: la importacion de datos de SCIENTI es
parte de la carga inicial de la plataforma, no una accion administrativa.
Los datos que entra son registros publicos de la institucion y no credenciales.
"""
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..database import get_db
from ..services import importador, persistencia
from ..services.importador import ErrorImportacion

router = APIRouter(prefix="/api/importacion", tags=["Importacion"])

TAMANO_MAXIMO = 10 * 1024 * 1024  # 10 MB


class UrlRequest(BaseModel):
    url: str = Field(..., min_length=8, max_length=2000)


def _leer_subida(archivo: UploadFile) -> bytes:
    contenido = archivo.file.read()
    if not contenido:
        raise HTTPException(status_code=400, detail="El archivo está vacío.")
    if len(contenido) > TAMANO_MAXIMO:
        raise HTTPException(
            status_code=413,
            detail="El archivo supera el máximo de 10 MB permitido.",
        )
    return contenido


def _responder(resultado: dict, db: Session) -> dict:
    """Guarda lo importado y arma la respuesta con el detalle por entidad."""
    resumen = persistencia.guardar(db, resultado)
    errores = list(resultado.get("errores", []))
    for detalle in resumen.values():
        errores.extend(detalle.get("errores", []))

    total = sum(d.get("creados", 0) + d.get("actualizados", 0) for d in resumen.values())
    return {
        "exito": True,
        "mensaje": f"Se importaron {total} registros.",
        "entidad": resultado.get("entidad"),
        "url": resultado.get("url"),
        "resumen": resumen,
        "errores": errores,
    }


@router.post("/csv")
async def importar_csv(archivo: UploadFile = File(...), db: Session = Depends(get_db)):
    """Importa grupos, investigadores o productos desde un archivo CSV.

    La entidad se deduce de los encabezados, asi que el mismo endpoint sirve
    para las tres. Acepta coma o punto y coma como separador.
    """
    contenido = _leer_subida(archivo)
    try:
        resultado = importador.leer_csv(contenido)
        return _responder(resultado, db)
    except ErrorImportacion as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/pdf")
async def importar_pdf(archivo: UploadFile = File(...), db: Session = Depends(get_db)):
    """Importa datos desde un reporte PDF de SCIENTI.

    Un producto sin identificador no se importa, porque sin ID no hay forma de
    evitar duplicados entre importaciones. El reporte lo reporta como error.
    """
    contenido = _leer_subida(archivo)
    try:
        resultado = importador.leer_pdf(contenido)
        return _responder(resultado, db)
    except ErrorImportacion as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/scienti")
async def importar_scienti(peticion: UrlRequest, db: Session = Depends(get_db)):
    """Descarga e importa los datos desde una URL de SCIENTI.

    SCIENTI es una aplicacion antigua y puede bloquear la consulta. Todos los
    fallos se reportan con un mensaje que sugiere la alternativa por CSV o
    PDF, que siempre funciona.
    """
    try:
        resultado = importador.leer_scienti(peticion.url)
        return _responder(resultado, db)
    except ErrorImportacion as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/plantilla/{entidad}", response_class=PlainTextResponse)
def plantilla(entidad: str):
    """Descarga un CSV de ejemplo para grupos, investigadores o productos."""
    try:
        contenido = importador.plantilla_csv(entidad)
    except ErrorImportacion as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return PlainTextResponse(
        contenido,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="plantilla_{entidad}.csv"'},
    )