"""Operaciones CRUD sobre la base de datos."""
from sqlalchemy.orm import Session
from sqlalchemy import func
from . import models, schemas


# ---- Investigadores ----
def crear_investigador(db: Session, inv: schemas.InvestigadorCrear) -> models.Investigador:
    db_inv = models.Investigador(**inv.model_dump())
    db.add(db_inv)
    db.commit()
    db.refresh(db_inv)
    return db_inv


def obtener_investigador(db: Session, inv_id: str) -> models.Investigador | None:
    return db.query(models.Investigador).filter(models.Investigador.id == inv_id).first()


def listar_investigadores(db: Session, skip: int = 0, limit: int = 100, activo: bool | None = None):
    q = db.query(models.Investigador)
    if activo is not None:
        q = q.filter(models.Investigador.activo == activo)
    return q.offset(skip).limit(limit).all()


def actualizar_investigador(db: Session, inv_id: str, datos: schemas.InvestigadorActualizar):
    inv = obtener_investigador(db, inv_id)
    if not inv:
        return None
    for k, v in datos.model_dump(exclude_unset=True).items():
        setattr(inv, k, v)
    db.commit()
    db.refresh(inv)
    return inv


def eliminar_investigador(db: Session, inv_id: str) -> bool:
    inv = obtener_investigador(db, inv_id)
    if not inv:
        return False
    # Logica en cascada: quitar de productos e integrantes
    for p in inv.productos:
        p.autores = [a for a in p.autores if a.id != inv_id]
    db.delete(inv)
    db.commit()
    return True


# ---- Grupos ----
def crear_grupo(db: Session, grupo: schemas.GrupoCrear) -> models.Grupo:
    db_grupo = models.Grupo(**grupo.model_dump(exclude={"lider"}))
    if grupo.lider:
        db_grupo.lider = grupo.lider
    db.add(db_grupo)
    db.commit()
    db.refresh(db_grupo)
    return db_grupo


def obtener_grupo(db: Session, cod: str) -> models.Grupo | None:
    return db.query(models.Grupo).filter(models.Grupo.cod == cod).first()


def listar_grupos(db: Session, skip: int = 0, limit: int = 100, activo: bool | None = None):
    q = db.query(models.Grupo)
    if activo is not None:
        q = q.filter(models.Grupo.activo == activo)
    return q.offset(skip).limit(limit).all()


def actualizar_grupo(db: Session, cod: str, datos: schemas.GrupoActualizar):
    g = obtener_grupo(db, cod)
    if not g:
        return None
    for k, v in datos.model_dump(exclude_unset=True).items():
        setattr(g, k, v)
    db.commit()
    db.refresh(g)
    return g


def eliminar_grupo(db: Session, cod: str) -> bool:
    g = obtener_grupo(db, cod)
    if not g:
        return False
    # El producto sobrevive sin grupo
    for p in g.productos:
        p.grupo_cod = None
    db.delete(g)
    db.commit()
    return True


# ---- Productos ----
def crear_producto(db: Session, prod: schemas.ProductoCrear) -> models.Producto:
    autores = prod.autores
    data = prod.model_dump(exclude={"autores"})
    db_prod = models.Producto(**data)
    if autores:
        db_prod.autores = db.query(models.Investigador).filter(models.Investigador.id.in_(autores)).all()
    db.add(db_prod)
    db.commit()
    db.refresh(db_prod)
    return db_prod


def obtener_producto(db: Session, pid: str) -> models.Producto | None:
    return db.query(models.Producto).filter(models.Producto.id == pid).first()


def listar_productos(db: Session, skip: int = 0, limit: int = 100, activo: bool | None = None,
                     grupo_cod: str | None = None, anio_desde: int | None = None,
                     anio_hasta: int | None = None):
    q = db.query(models.Producto)
    if activo is not None:
        q = q.filter(models.Producto.activo == activo)
    if grupo_cod is not None:
        q = q.filter(models.Producto.grupo_cod == grupo_cod)
    if anio_desde is not None:
        q = q.filter(models.Producto.anio >= anio_desde)
    if anio_hasta is not None:
        q = q.filter(models.Producto.anio <= anio_hasta)
    return q.offset(skip).limit(limit).all()


def actualizar_producto(db: Session, pid: str, datos: schemas.ProductoActualizar):
    p = obtener_producto(db, pid)
    if not p:
        return None
    update = datos.model_dump(exclude_unset=True)
    autores = update.pop("autores", None)
    for k, v in update.items():
        setattr(p, k, v)
    if autores is not None:
        p.autores = db.query(models.Investigador).filter(models.Investigador.id.in_(autores)).all()
    db.commit()
    db.refresh(p)
    return p


def eliminar_producto(db: Session, pid: str) -> bool:
    p = obtener_producto(db, pid)
    if not p:
        return False
    db.delete(p)
    db.commit()
    return True


# ---- Integrantes ----
def agregar_integrante(db: Session, grupo_cod: str, inv_id: str, rol: str, activo: bool = True):
    g = obtener_grupo(db, grupo_cod)
    inv = obtener_investigador(db, inv_id)
    if not g or not inv:
        return None
    # Evitar duplicados
    existente = db.query(models.Integrante).filter(
        models.Integrante.grupo_cod == grupo_cod,
        models.Integrante.investigador_id == inv_id
    ).first()
    if existente:
        return existente
    nuevo = models.Integrante(grupo_cod=grupo_cod, investigador_id=inv_id, rol=rol, activo=activo)
    if rol == "LIDER":
        g.lider = inv_id
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo


def quitar_integrante(db: Session, grupo_cod: str, inv_id: str) -> bool:
    it = db.query(models.Integrante).filter(
        models.Integrante.grupo_cod == grupo_cod,
        models.Integrante.investigador_id == inv_id
    ).first()
    if not it:
        return False
    g = obtener_grupo(db, grupo_cod)
    if g and g.lider == inv_id:
        g.lider = None
    db.delete(it)
    db.commit()
    return True


# ---- Actividades (plan) ----
def encolar_actividad(db: Session, grupo_cod: str, descripcion: str):
    g = obtener_grupo(db, grupo_cod)
    if not g:
        return None
    act = models.Actividad(grupo_cod=grupo_cod, descripcion=descripcion)
    db.add(act)
    db.commit()
    db.refresh(act)
    return act


def atender_actividad(db: Session, grupo_cod: str):
    act = db.query(models.Actividad).filter(
        models.Actividad.grupo_cod == grupo_cod,
        models.Actividad.estado == "PENDIENTE"
    ).order_by(models.Actividad.id).first()
    if not act:
        return None
    act.estado = "EJECUTADA"
    db.commit()
    db.refresh(act)
    return act


# ---- Estadisticas ----
def resumen_global(db: Session, incluir_inactivos: bool = False):
    q_prod = db.query(models.Producto)
    q_grp = db.query(models.Grupo)
    q_inv = db.query(models.Investigador)
    if not incluir_inactivos:
        q_prod = q_prod.filter(models.Producto.activo == True)
        q_grp = q_grp.filter(models.Grupo.activo == True)
        q_inv = q_inv.filter(models.Investigador.activo == True)

    productos = q_prod.all()
    grupos = q_grp.all()
    investigadores = q_inv.all()

    por_tipo = {}
    por_anio = {}
    por_validacion = {}
    por_grupo = {}
    por_investigador = {}

    for p in productos:
        por_tipo[p.tipo] = por_tipo.get(p.tipo, 0) + 1
        por_anio[p.anio] = por_anio.get(p.anio, 0) + 1
        por_validacion[p.validacion] = por_validacion.get(p.validacion, 0) + 1
        if p.grupo_cod:
            por_grupo[p.grupo_cod] = por_grupo.get(p.grupo_cod, 0) + 1
        for a in p.autores:
            por_investigador[a.id] = por_investigador.get(a.id, 0) + 1

    return {
        "n_productos": len(productos),
        "n_grupos": len(grupos),
        "n_investigadores": len(investigadores),
        "por_tipo": por_tipo,
        "por_anio": dict(sorted(por_anio.items())),
        "por_validacion": por_validacion,
        "por_grupo": por_grupo,
        "por_investigador": por_investigador,
    }


def vista_grupo(db: Session, cod: str):
    g = obtener_grupo(db, cod)
    if not g:
        return None
    productos = [p for p in g.productos if p.activo]
    return {
        "grupo": g,
        "n_productos": len(productos),
        "productos": productos,
    }


def vista_investigador(db: Session, inv_id: str):
    inv = obtener_investigador(db, inv_id)
    if not inv:
        return None
    productos = [p for p in inv.productos if p.activo]
    return {
        "investigador": inv,
        "n_productos": len(productos),
        "productos": productos,
    }