"""Persistencia de lo importado, en el orden correcto por dependencias.

Los grupos apuntan a investigadores (lider) y los productos a grupos y a
autores. Por eso el orden es investigadores -> grupos -> productos: si se
importara al reves, las claves foraneas no existirian todavia.
"""
from __future__ import annotations

import re

from sqlalchemy.orm import Session

from .. import models
from .importador import ErrorImportacion

MAX_LENGHTUD_CODIGO = 50


def _corte(texto: str, limite: int) -> str:
    return (texto or "")[:limite]


def guardar_grupos(db: Session, filas: list[dict]) -> dict:
    """Inserta o actualiza grupos. Devuelve conteos y errores."""
    creados = actualizados = omitidos = 0
    errores = []
    # Deduplica dentro del lote: las filas agregadas todavia no estan
    # confirmadas, asi que consultarlas no las encuentra y un id repetido
    # romperia con violacion de la restriccion UNIQUE.
    vistos: set[str] = set()

    for f in filas:
        cod = _corte(f["cod"], MAX_LENGHTUD_CODIGO)
        if not cod:
            omitidos += 1
            continue
        if cod in vistos:
            omitidos += 1
            errores.append(f"Grupo {cod}: aparece repetido en el archivo, se importo una vez")
            continue
        vistos.add(cod)

        lider = f.get("lider")
        # El lider debe existir; si no, se descarta la referencia en vez de
        # romper la importacion completa.
        if lider and not db.query(models.Investigador).filter(models.Investigador.id == lider).first():
            errores.append(f"Grupo {cod}: el líder '{lider}' no está registrado, se omitió su líder")
            lider = None

        existente = db.query(models.Grupo).filter(models.Grupo.cod == cod).first()
        if existente:
            existente.nombre = _corte(f["nombre"], 200)
            existente.categoria = f.get("categoria") or "SIN_CLASIFICAR"
            existente.area = _corte(f.get("area", ""), 200)
            existente.anio_fund = f.get("anio_fund", 0)
            existente.lider = lider
            existente.activo = f.get("activo", True)
            actualizados += 1
        else:
            db.add(models.Grupo(
                cod=cod,
                nombre=_corte(f["nombre"], 200),
                categoria=f.get("categoria") or "SIN_CLASIFICAR",
                area=_corte(f.get("area", ""), 200),
                anio_fund=f.get("anio_fund", 0),
                lider=lider,
                activo=f.get("activo", True),
            ))
            creados += 1

    db.commit()
    return {"creados": creados, "actualizados": actualizados, "omitidos": omitidos, "errores": errores}


def guardar_investigadores(db: Session, filas: list[dict]) -> dict:
    creados = actualizados = omitidos = 0
    errores = []
    vistos: set[str] = set()

    for f in filas:
        # Si el archivo no trae ID (pasa con PDF y scraping) se genera uno
        # estable a partir del nombre, para que el mismo investigador no se
        # duplique en cada importacion.
        ident = _corte(f.get("id") or "", MAX_LENGHTUD_CODIGO)
        if not ident:
            base = re.sub(r"[^A-Za-z0-9]", "", f["nombre"].upper())[:12]
            ident = f"INV-{base}" if base else f"INV-{abs(hash(f['nombre'])) % 100000}"

        if ident in vistos:
            omitidos += 1
            continue
        vistos.add(ident)

        existente = db.query(models.Investigador).filter(models.Investigador.id == ident).first()
        if existente:
            existente.nombre = _corte(f["nombre"], 200)
            existente.categoria = f.get("categoria") or "SIN_CATEGORIA"
            existente.formacion = _corte(f.get("formacion", ""), 200)
            existente.email = _corte(f.get("email", ""), 200)
            existente.activo = f.get("activo", True)
            actualizados += 1
        else:
            db.add(models.Investigador(
                id=ident,
                nombre=_corte(f["nombre"], 200),
                categoria=f.get("categoria") or "SIN_CATEGORIA",
                formacion=_corte(f.get("formacion", ""), 200),
                email=_corte(f.get("email", ""), 200),
                activo=f.get("activo", True),
            ))
            creados += 1

    db.commit()
    return {"creados": creados, "actualizados": actualizados, "omitidos": omitidos, "errores": errores}


def _clave_nombre(nombre: str) -> str:
    """Clave para comparar nombres de persona sin tildes ni mayusculas.

    SCIENTI escribe el mismo nombre de varias formas: "john jairo PATINO
    VANEGAS" en la tabla de integrantes y "JOHN JAIRO PATINO VANEGAS" en la
    de productos. Sin normalizar, el autor no se encuentra al guardar el
    producto y la relacion se pierde.
    """
    import unicodedata

    plano = unicodedata.normalize("NFKD", (nombre or "").strip().lower())
    return "".join(c for c in plano if not unicodedata.combining(c))


def _ids_de_investigadores(db: Session) -> dict[str, models.Investigador]:
    """Indice de investigadores por ID y por nombre normalizado.

    Se construye una sola vez por importacion en vez de consultar por cada
    autor de cada producto, que en los reportes de SCIENTI son miles de
    consultas. El indice tiene las dos claves porque un autor puede venir
    como "INV001" (CSV) o como "JOHN JAIRO PATINO VANEGAS" (scraping).
    """
    indice: dict[str, models.Investigador] = {}
    for inv in db.query(models.Investigador).all():
        indice.setdefault(inv.id, inv)
        indice.setdefault(_clave_nombre(inv.nombre), inv)
    return indice


def guardar_productos(db: Session, filas: list[dict], indice: dict | None = None) -> dict:
    creados = actualizados = omitidos = 0
    errores = []
    vistos: set[str] = set()
    sin_autor: dict[str, int] = {}

    for f in filas:
        ident = _corte(f["id"], MAX_LENGHTUD_CODIGO)
        if not ident:
            # Sin ID no hay forma de evitar duplicados entre importaciones.
            omitidos += 1
            errores.append(
                f"Producto '{f['titulo'][:40]}': sin identificador, "
                "no se puede importar de forma segura. Agrega una columna 'id'."
            )
            continue
        if ident in vistos:
            omitidos += 1
            errores.append(f"Producto {ident}: aparece repetido, se importo una vez")
            continue
        vistos.add(ident)

        grupo_cod = f.get("grupo_cod")
        if grupo_cod and not db.query(models.Grupo).filter(models.Grupo.cod == grupo_cod).first():
            errores.append(f"Producto {ident}: el grupo '{grupo_cod}' no existe, se dejó sin grupo")
            grupo_cod = None

        existente = db.query(models.Producto).filter(models.Producto.id == ident).first()
        if not existente:
            existente = models.Producto(id=ident)
            db.add(existente)
            creados += 1
        else:
            actualizados += 1

        existente.titulo = _corte(f["titulo"], 500)
        existente.tipo = f.get("tipo") or "OTRO"
        existente.categoria = _corte(f.get("categoria", ""), 20)
        existente.validacion = f.get("validacion") or "NO_VALIDADO"
        existente.anio = f.get("anio", 0)
        existente.grupo_cod = grupo_cod
        existente.activo = f.get("activo", True)

        indice = indice if indice is not None else _ids_de_investigadores(db)

        # Autores: por ID, y si no aparece, por nombre normalizado.
        # Un mismo autor puede venir con distinta capitalizacion desde el
        # scraping que desde el CSV.
        existente.autores = []
        for aut in f.get("autores", []):
            inv = indice.get(aut) or indice.get(_clave_nombre(aut))
            if inv is not None:
                # La relacion es N:M con tabla intermedia, asi que se reemplaza la lista
                # completa para que SQLAlchemy registre la diferencia.
                if inv in existente.autores:
                    existente.autores.remove(inv)
                else:
                    existente.autores.append(inv)
            else:
                sin_autor[aut] = sin_autor.get(aut, 0) + 1

    db.commit()

    # Se agrupan los avisos por autor en vez de repetirlos por cada producto.
    if sin_autor:
        for autor, veces in sorted(sin_autor.items(), key=lambda kv: -kv[1]):
            errores.append(
                f"El autor '{autor}' no está registrado ({veces} producto"
                f"{'s' if veces > 1 else ''} sin vincular)"
            )

    return {"creados": creados, "actualizados": actualizados, "omitidos": omitidos, "errores": errores}


def guardar(db: Session, resultado: dict) -> dict:
    """Guarda un resultado de importación en el orden de dependencias."""
    resumen = {}

    # Los investigadores van primero porque los grupos los referencian como
    # líder y los productos los referencian como autores.
    if resultado.get("investigadores"):
        resumen["investigadores"] = guardar_investigadores(db, resultado["investigadores"])
    if resultado.get("grupos"):
        resumen["grupos"] = guardar_grupos(db, resultado["grupos"])
    if resultado.get("productos"):
        indice = _ids_de_investigadores(db)
        resumen["productos"] = guardar_productos(db, resultado["productos"], indice)

    if not resumen:
        raise ErrorImportacion("El archivo no contenía datos para importar.")

    return resumen