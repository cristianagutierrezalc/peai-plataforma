"""Servicios de importacion de datos (Requerimiento 7 del Taller 2).

El enunciado pide que el programa sea capaz de obtener los datos de SCIENTI
mediante web scraping, un archivo PDF o un archivo CSV. Este modulo centraliza
las tres vias y las normaliza a los mismos registros de grupos,
investigadores y productos, de modo que la base de datos no distingue de
donde salio la informacion.

Cada importador devuelve una lista de filas ya normalizadas junto con los
errores encontrados. Nunca lanza excepcion por una fila mala: una fila
invalida se reporta y el resto se importa. Si el archivo entero esta mal, si
se lanza.
"""
from __future__ import annotations

import csv
import io
import re
from typing import Any

# Categorias aceptadas por cada entidad. Se normalizan a mayusculas para
# tolerar "A1", "a1" o " A1 " en el archivo.
CATEGORIAS_GRUPO = {"A1", "A", "B", "C", "RECONOCIDO", "SIN_CLASIFICAR"}
CATEGORIAS_INVESTIGADOR = {"SENIOR", "JUNIOR", "SIN_CATEGORIA"}

TIPOS_PRODUCTO = {
    "ARTICULO", "LIBRO", "CAPITULO", "SOFTWARE", "PATENTE",
    "TRABAJO_DIRIGIDO", "EVENTO", "PROYECTO", "OTRO",
}
VALIDACIONES_PRODUCTO = {"VALIDADO", "NO_VALIDADO", "EN_REVISION"}


class ErrorImportacion(Exception):
    """Error que impide procesar el archivo completo."""


# Los encabezados de SCIENTI y de los reportes oficiales usan "Código",
# "Área Temática" o "Título del producto", no "cod", "area" o "titulo".
# Estas formas llevan al nombre canonico que leen los normalizadores de mas
# abajo: cod, nombre, categoria, area, aniofund, lider, activo (grupos);
# id, formacion, email (investigadores); titulo, tipo, validacion, anio,
# grupocod, autores (productos).
#
# Ojo: _normalizar ya quita tildes, asi que "Año" llega como "ano" y
# "Código" como "codigo". El mapa usa las formas ya normalizadas.
ALIASAS = {
    # --- grupos ---
    "codigo": "cod",
    "idgrupo": "cod",
    "codigogrupo": "grupocod",
    "codgrupo": "grupocod",
    "grupocodigo": "grupocod",
    "codigodelgrupo": "grupocod",
    "grupo": "grupocod",
    "areafundacion": "area",
    "areastematicas": "area",
    "areatematica": "area",
    "lineatematicas": "area",
    "aniofundacion": "aniofund",
    "anofundacion": "aniofund",
    "aniofund": "aniofund",
    "aniof": "aniofund",
    "fundacion": "aniofund",
    "aniofundaciongrupo": "aniofund",
    "liderdelgrupo": "lider",
    "nombredelgrupo": "nombre",
    # --- investigadores ---
    "nombrecompleto": "nombre",
    "nombreinvestigador": "nombre",
    "nombresyapellidos": "nombre",
    "nombres": "nombre",
    "idinvestigador": "id",
    "codigoinvestigador": "id",
    "correo": "email",
    "correoinstitucional": "email",
    "emailinstitucional": "email",
    "nivelacademico": "formacion",
    "formacionacademica": "formacion",
    "tituloprofesional": "formacion",
    # --- productos ---
    "titulodelproducto": "titulo",
    "nombreproducto": "titulo",
    "idproducto": "id",
    "codigoproducto": "id",
    "tipoproducto": "tipo",
    "validacionproducto": "validacion",
    "estadovalidacion": "validacion",
    "anodelproducto": "anio",
    "ano": "anio",
    "anio": "anio",
    "autor": "autores",
}


# --------------------------------------------------------------------------
# Utilidades compartidas
# --------------------------------------------------------------------------

def _normalizar(texto: Any) -> str:
    """Normaliza una clave de encabezado: minusculas, sin espacios ni tildes."""
    s = str(texto or "").strip().lower()
    s = s.replace("á", "a").replace("é", "e").replace("í", "i")
    s = s.replace("ó", "o").replace("ú", "u").replace("ñ", "n")
    s = re.sub(r"[\s_\-]+", "", s)
    return ALIASAS.get(s, s)


def _texto(valor: Any) -> str:
    if valor is None:
        return ""
    return str(valor).strip()


def _entero(valor: Any, defecto: int = 0) -> int:
    """Extrae un entero tolerando '2020', ' 2020 ', '2020.0' o 'SIN FECHA'."""
    s = _texto(valor).replace(",", "")
    m = re.search(r"-?\d{1,4}", s)
    if not m:
        return defecto
    try:
        return int(m.group())
    except ValueError:
        return defecto


def _booleano(valor: Any, defecto: bool = True) -> bool:
    s = _normalizar(valor)
    if s in ("1", "true", "verdadero", "si", "yes", "activo", "x"):
        return True
    if s in ("0", "false", "falso", "no", "inactivo"):
        return False
    return defecto


def _decodificar(archivo: bytes) -> str:
    """Los archivos de SCIENTI suelen venir en latin-1 o con BOM."""
    for codificacion in ("utf-8-sig", "utf-8", "latin-1"):
        try:
            return archivo.decode(codificacion)
        except UnicodeDecodeError:
            continue
    return archivo.decode("utf-8", errors="replace")


def _mapear_filas(cabeceras: list[Any], filas: list[list[Any]]) -> list[dict[str, Any]]:
    """Convierte filas CSV en diccionarios con claves ya normalizadas."""
    claves = [_normalizar(c) for c in cabeceras]
    resultado = []
    for fila in filas:
        if not any(_texto(v) for v in fila):
            continue  # fila vacia
        registro = {}
        for i, clave in enumerate(claves):
            if not clave:
                continue
            registro[clave] = fila[i] if i < len(fila) else ""
        resultado.append(registro)
    return resultado


# --------------------------------------------------------------------------
# 1. CSV
# --------------------------------------------------------------------------

# Encabezados aceptados por entidad. Se comparan ya normalizados, asi que
# "Código", "codigo", "COD" o "cod" funcionan igual.
CAMPOS = {
    "grupos": {
        "requeridos": ["cod", "nombre"],
        "opcionales": ["categoria", "area", "aniofund", "lider", "activo"],
    },
    "investigadores": {
        "requeridos": ["id", "nombre"],
        "opcionales": ["categoria", "formacion", "email", "activo"],
    },
    "productos": {
        "requeridos": ["id", "titulo"],
        "opcionales": ["tipo", "categoria", "validacion", "anio", "grupocod", "autores", "activo"],
    },
}


def _detectar_entidad(cabeceras: list[Any]) -> str:
    """Deduce la entidad a partir de los encabezados presentes."""
    claves = {_normalizar(c) for c in cabeceras}
    puntajes = {
        "grupos": len(claves & {"cod", "nombre", "categoria", "area", "aniofund", "lider"}),
        "investigadores": len(claves & {"id", "nombre", "categoria", "formacion", "email"}),
        "productos": len(claves & {"id", "titulo", "tipo", "validacion", "anio", "grupocod", "autores"}),
    }
    entidad = max(puntajes, key=puntajes.get)
    if puntajes[entidad] == 0:
        raise ErrorImportacion(
            "No se reconoce el archivo. Se esperaban encabezados de grupos, "
            "investigadores o productos."
        )
    return entidad


def _validar_entidad(entidad: str, registros: list[dict]) -> None:
    campos = CAMPOS[entidad]
    for registro in registros:
        faltan = [c for c in campos["requeridos"] if not _texto(registro.get(c))]
        if faltan:
            raise ErrorImportacion(
                f"En el archivo de {entidad} faltan columnas obligatorias: "
                f"{', '.join(campos['requeridos'])}"
            )


def _normalizar_grupos(registros: list[dict]) -> tuple[list[dict], list[str]]:
    filas, errores = [], []
    vistos: set[str] = set()
    for i, r in enumerate(registros, start=2):
        cod = _texto(r.get("cod"))
        if not cod:
            errores.append(f"Fila {i}: falta el código del grupo")
            continue
        if cod in vistos:
            errores.append(f"Fila {i}: el grupo {cod} aparece dos veces en el archivo")
            continue
        vistos.add(cod)

        categoria = _texto(r.get("categoria")).upper() or "SIN_CLASIFICAR"
        if categoria not in CATEGORIAS_GRUPO:
            errores.append(f"Fila {i}: categoría '{categoria}' no válida, se usó SIN_CLASIFICAR")
            categoria = "SIN_CLASIFICAR"

        filas.append({
            "cod": cod,
            "nombre": _texto(r.get("nombre")),
            "categoria": categoria,
            "area": _texto(r.get("area")),
            "anio_fund": _entero(r.get("aniofund")),
            "lider": _texto(r.get("lider")) or None,
            "activo": _booleano(r.get("activo")),
        })
    return filas, errores


def _normalizar_investigadores(registros: list[dict]) -> tuple[list[dict], list[str]]:
    filas, errores = [], []
    vistos: set[str] = set()
    for i, r in enumerate(registros, start=2):
        ident = _texto(r.get("id"))
        if not ident:
            errores.append(f"Fila {i}: falta el ID del investigador")
            continue
        if ident in vistos:
            errores.append(f"Fila {i}: el investigador {ident} aparece dos veces en el archivo")
            continue
        vistos.add(ident)

        categoria = _texto(r.get("categoria")).upper() or "SIN_CATEGORIA"
        if categoria not in CATEGORIAS_INVESTIGADOR:
            errores.append(f"Fila {i}: categoría '{categoria}' no válida, se usó SIN_CATEGORIA")
            categoria = "SIN_CATEGORIA"

        filas.append({
            "id": ident,
            "nombre": _texto(r.get("nombre")),
            "categoria": categoria,
            "formacion": _texto(r.get("formacion")),
            "email": _texto(r.get("email")),
            "activo": _booleano(r.get("activo")),
        })
    return filas, errores


def _normalizar_productos(registros: list[dict]) -> tuple[list[dict], list[str]]:
    filas, errores = [], []
    vistos: set[str] = set()
    for i, r in enumerate(registros, start=2):
        ident = _texto(r.get("id"))
        if not ident:
            errores.append(f"Fila {i}: falta el ID del producto")
            continue
        if ident in vistos:
            errores.append(f"Fila {i}: el producto {ident} aparece dos veces en el archivo")
            continue
        vistos.add(ident)

        tipo = _texto(r.get("tipo")).upper().replace(" ", "_") or "OTRO"
        if tipo not in TIPOS_PRODUCTO:
            errores.append(f"Fila {i}: tipo '{tipo}' no reconocido, se usó OTRO")
            tipo = "OTRO"

        validacion = _texto(r.get("validacion")).upper() or "NO_VALIDADO"
        if validacion not in VALIDACIONES_PRODUCTO:
            errores.append(f"Fila {i}: validación '{validacion}' no válida, se usó NO_VALIDADO")
            validacion = "NO_VALIDADO"

        # Los autores pueden venir separados por ; | o ,
        autores = [a.strip() for a in re.split(r"[;|]", _texto(r.get("autores"))) if a.strip()]

        filas.append({
            "id": ident,
            "titulo": _texto(r.get("titulo")),
            "tipo": tipo,
            "categoria": _texto(r.get("categoria")),
            "validacion": validacion,
            "anio": _entero(r.get("anio")),
            "grupo_cod": _texto(r.get("grupocod")) or None,
            "autores": autores,
            "activo": _booleano(r.get("activo")),
        })
    return filas, errores


NORMALIZADORES = {
    "grupos": _normalizar_grupos,
    "investigadores": _normalizar_investigadores,
    "productos": _normalizar_productos,
}


def leer_csv(contenido: bytes) -> dict[str, Any]:
    """Interpreta un CSV y devuelve registros normalizados de una entidad."""
    texto = _decodificar(contenido)
    # Separa punto y coma y coma a la vez: ambos son comunes en Colombia.
    muestra = texto[:4096]
    try:
        dialecto = csv.Sniffer().sniff(muestra, delimiters=";,\t|")
        separador = dialecto.delimiter
    except csv.Error:
        separador = ","

    lector = csv.reader(io.StringIO(texto), delimiter=separador)
    try:
        cabeceras = next(lector)
    except StopIteration:
        raise ErrorImportacion("El archivo CSV está vacío.")

    registros = _mapear_filas(cabeceras, list(lector))
    if not registros:
        raise ErrorImportacion("El archivo CSV no tiene filas de datos.")

    entidad = _detectar_entidad(cabeceras)
    _validar_entidad(entidad, registros)
    filas, errores = NORMALIZADORES[entidad](registros)
    # Se devuelve tambien bajo el nombre de la entidad para que tenga la
    # misma forma que el resultado del PDF y del scraping, y la persistencia
    # no tenga que distinguir entre un archivo de una entidad y uno mixto.
    return {"entidad": entidad, "filas": filas, "errores": errores, entidad: filas}


# --------------------------------------------------------------------------
# 2. PDF
# --------------------------------------------------------------------------

def leer_pdf(contenido: bytes) -> dict[str, Any]:
    """Extrae registros de un PDF de SCIENTI detectando sus secciones.

    Los reportes de SCIENTI vienen en columnas. Se recorre linea por linea
    y cada encabezado reconocido arranca una seccion que dura hasta la
    siguiente. Un producto empieza con un numero seguido de punto, que es el
    formato real del reporte.
    """
    from pypdf import PdfReader

    try:
        lector = PdfReader(io.BytesIO(contenido))
    except Exception as exc:  # noqa: BLE001 - se reporta al usuario
        raise ErrorImportacion(f"No se pudo leer el PDF: {exc}") from exc

    if lector.is_encrypted:
        raise ErrorImportacion("El PDF está protegido con contraseña.")

    paginas = []
    for numero, pagina in enumerate(lector.pages, start=1):
        try:
            paginas.append((numero, pagina.extract_text() or ""))
        except Exception:  # noqa: BLE001
            paginas.append((numero, ""))

    if not any(t.strip() for _, t in paginas):
        raise ErrorImportacion(
            "El PDF no tiene texto extraíble. Si es una imagen escaneada, "
            "necesita OCR, que este programa no hace."
        )

    grupos, investigadores, productos, errores = _recorrer_pdf(paginas)
    total = len(grupos) + len(investigadores) + len(productos)
    if total == 0:
        raise ErrorImportacion(
            "Se leyó el PDF pero no se reconoció ninguna tabla de grupos, "
            "investigadores ni productos. Revise que sea un reporte de SCIENTI."
        )

    return {
        "entidad": "mixto",
        "grupos": grupos,
        "investigadores": investigadores,
        "productos": productos,
        "errores": errores,
        "total": total,
    }


MARCAS_GRUPO = ("GRUPOS DE INVESTIGACIÓN", "GRUPOS DE INVESTIGACION", "GRUPOS ASOCIADOS")
MARCAS_INVESTIGADOR = (
    "INVESTIGADORES", "DATOS DE LOS INVESTIGADORES",
    "INVESTIGADORES ASOCIADOS",
)
MARCAS_PRODUCTO = (
    "PRODUCTOS Y PROYECTOS", "PRODUCTOS", "PROYECTOS",
)


def _recorrer_pdf(paginas: list[tuple[int, str]]) -> tuple[list, list, list, list]:
    grupos, investigadores, productos = [], [], []
    errores: list[str] = []
    seccion = None
    # Ultimo grupo/investigador visto, para asociar productos huerfanos.
    grupo_actual = None

    for numero, texto in paginas:
        for cruda in texto.splitlines():
            linea = cruda.strip()
            if not linea:
                continue

            arriba = _normalizar(linea)
            if any(_normalizar(m) in arriba for m in MARCAS_GRUPO):
                seccion = "grupos"
                grupo_actual = None
                continue
            if any(_normalizar(m) in arriba for m in MARCAS_INVESTIGADOR):
                seccion = "investigadores"
                grupo_actual = None
                continue
            if any(_normalizar(m) in arriba for m in MARCAS_PRODUCTO):
                seccion = "productos"
                continue

            # "1. Titulo del producto"  ->  es un producto
            m = re.match(r"^\d{1,2}\s*[.)]\s+(.{4,})$", linea)
            if m and seccion == "productos":
                titulo = m.group(1).strip()
                # SCIENTI distingue mayusculas en el titulo; los productos
                # reales aparecen en parrafo con puntuacion.
                if titulo and titulo[0].isupper():
                    productos.append({
                        "id": "",
                        "titulo": titulo[:500],
                        "tipo": "OTRO",
                        "categoria": "",
                        "validacion": "NO_VALIDADO",
                        "anio": 0,
                        "grupo_cod": None,
                        "autores": [],
                        "activo": True,
                        "_pagina": numero,
                    })
                    continue

            # "G01 - Nombre del grupo"
            m = re.match(r"^([A-Z]{1,4}\d{1,4})\s*[-–]\s*(.+)$", linea)
            if m and seccion in ("grupos", "productos"):
                cod, nombre = m.group(1), m.group(2).strip()
                grupo_actual = cod
                grupos.append({
                    "cod": cod,
                    "nombre": nombre[:200],
                    "categoria": "SIN_CLASIFICAR",
                    "area": "",
                    "anio_fund": 0,
                    "lider": None,
                    "activo": True,
                    "_pagina": numero,
                })
                continue

            # Nombre de investigador: dos o mas palabras en mayusculas
            if seccion == "investigadores":
                palabras = linea.split()
                if 2 <= len(palabras) <= 8 and linea.isupper() and any(c.isalpha() for c in linea):
                    investigadores.append({
                        "id": "",
                        "nombre": linea[:200],
                        "categoria": "SIN_CATEGORIA",
                        "formacion": "",
                        "email": "",
                        "activo": True,
                        "_pagina": numero,
                    })

    # Asigna al ultimo grupo visto los productos que quedaron sin grupo.
    if grupo_actual:
        for p in productos:
            if not p.get("grupo_cod"):
                p["grupo_cod"] = grupo_actual

    return grupos, investigadores, productos, errores


# --------------------------------------------------------------------------
# 3. Web scraping de SCIENTI
# --------------------------------------------------------------------------

DOMINIOS_PERMITIDOS = (
    "scienti.minciencias.gov.co",
    "minciencias.gov.co",
)

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/122.0 Safari/537.36"
)


def _validar_url(url: str) -> str:
    url = (url or "").strip()
    if not url:
        raise ErrorImportacion("Debes indicar una URL.")
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    if not any(dominio in url.lower() for dominio in DOMINIOS_PERMITIDOS):
        raise ErrorImportacion(
            "Por seguridad solo se permiten URLs de SCIENTI o Minciencias."
        )
    return url


# Palabras que identifican una seccion de productos en los reportes de SCIENTI.
PALABRAS_PRODUCTO = (
    "articulos publicados", "libros publicados", "libros de formacion",
    "capitulos de libro", "documentos de trabajo", "publicacion divulgativa",
    "traducciones", "notas cientificas", "manuales y guias",
    "informes tecnicos", "cartas", "mapas", "conceptos tecnicos",
    "disenos industriales", "disenos de industria", "software", "patentes",
    "marcas", "innovaciones", "registros cientificos", "plantas piloto",
    "prototipos", "cultivos", "variedades", "productos nutraceuticos",
)

# Seccion -> tipo de producto segun el modelo de datos.
TIPOS_POR_SECCION = (
    ("articulos publicados", "ARTICULO"),
    ("articulos", "ARTICULO"),
    ("capitulos de libro", "CAPITULO"),
    ("capitulo", "CAPITULO"),
    ("libros de formacion", "LIBRO"),
    ("libros publicados", "LIBRO"),
    ("libro", "LIBRO"),
    ("notas cientificas", "ARTICULO"),
    ("documentos de trabajo", "OTRO"),
    ("publicacion divulgativa", "OTRO"),
    ("informes tecnicos", "OTRO"),
    ("software", "SOFTWARE"),
    ("patentes", "PATENTE"),
    ("traducciones", "OTRO"),
)

def _sin_espacios(texto: str) -> str:
    """Normaliza un titulo de seccion para poder compararlo."""
    return _normalizar(texto)


def _es_seccion_productos(seccion: str) -> bool:
    return any(p in seccion for p in PALABRAS_PRODUCTO)


def _tipo_por_seccion(seccion: str) -> str:
    for aguja, tipo in TIPOS_POR_SECCION:
        if aguja in seccion:
            return tipo
    return "OTRO"


def _tipo_por_etiqueta(etiqueta: str) -> str | None:
    """Traduce la etiqueta que SCIENTI pone antes de los dos puntos.

    Ejemplos reales: "Computacional", "Libro resultado de investigacion",
    "Publicado en revista especializada", "Diseño industrial".
    """
    reglas = (
        ("software", "SOFTWARE"),
        ("aplicacionmovilm", "SOFTWARE"),
        ("computacional", "SOFTWARE"),
        ("patente", "PATENTE"),
        ("disenoindustrial", "PATENTE"),
        ("diseñoindustrial", "PATENTE"),
        ("libro", "LIBRO"),
        ("capitulo", "CAPITULO"),
        ("articulo", "ARTICULO"),
        ("revista", "ARTICULO"),
        ("publicado", "ARTICULO"),
        ("congreso", "EVENTO"),
        ("evento", "EVENTO"),
        ("trabajodirigido", "TRABAJO_DIRIGIDO"),
        ("tesis", "TRABAJO_DIRIGIDO"),
        ("informetecnico", "OTRO"),
        ("cartas", "OTRO"),
        ("notasientifica", "OTRO"),
        ("traduccion", "OTRO"),
    )
    for aguja, tipo in reglas:
        if aguja in etiqueta:
            return tipo
    return None


def _crear_investigador(nombre: str) -> dict:
    """Construye un investigador con un ID estable derivado de su nombre.

    El ID sale del nombre para que la misma persona no se duplique al
    reimportar el mismo reporte de SCIENTI. Se anade un hash corto porque dos
    investigadores distintos pueden compartir los primeros caracteres.
    """
    import hashlib

    limpio = re.sub(r"\s+", " ", nombre).strip()[:200]
    base = re.sub(r"[^A-Za-z0-9]", "", limpio.upper())
    prefijo = base[:16] or "SINNOMBRE"
    huella = hashlib.sha1(base.encode("utf-8")).hexdigest()[:6].upper()
    return {
        "id": f"INV-{prefijo}-{huella}",
        "nombre": limpio,
        "categoria": "SIN_CATEGORIA",
        "formacion": "",
        "email": "",
        "activo": True,
    }


def _extraer_grupo(texto: str) -> dict | None:
    """Saca los datos basicos del grupo del encabezado de la pagina."""
    # El codigo de SCIENTI puede ser solo de letras (GISICO, GIAM) o
    # terminado en digitos, asi que los digitos son opcionales.
    patron = r"(GRUPO\s+DE\s+INVESTIGACION[^-|]{3,200}?)\s*-\s*([A-Z]{2,10}\d{0,4})\s*-"
    m = re.search(patron, texto, re.IGNORECASE)
    if m:
        nombre = re.sub(r"\s+", " ", m.group(1)).strip()
        cod = m.group(2).strip().upper()
    else:
        # Fallback: SCIENTI muestra el nombre del grupo como primera linea
        # del texto (sin prefijo "GRUPO DE INVESTIGACION"). Generamos un
        # codigo a partir de las iniciales del nombre.
        lineas = [l.strip() for l in texto.splitlines() if l.strip()]
        nombre = lineas[0] if lineas else "Grupo importado de SCIENTI"
        # Codigo: iniciales de cada palabra en mayusculas, max 10 caracteres.
        iniciales = "".join(p[0] for p in nombre.split() if p and p[0].isalpha()).upper()
        if len(iniciales) < 3:
            iniciales = re.sub(r"\s+", "", nombre).upper()[:10]
        cod = iniciales[:10] if iniciales else "GIMPORT"

    categoria = "SIN_CLASIFICAR"
    mc = re.search(r"Clasificaci[oó]n\s+([A-C1])\b", texto, re.IGNORECASE)
    if mc:
        categoria = mc.group(1).upper()

    anio = 0
    ma = re.search(r"formaci[oó]n\s+(\d{4})", texto, re.IGNORECASE)
    if ma:
        anio = int(ma.group(1))

    lider = None
    ml = re.search(
        r"L[ií]der\s+([A-Za-zÁÉÍÓÚÑáéíóúñ\s'.-]{5,90}?)\s*(?:¿La informaci|P[aá]gina web|E-mail|Informaci[oó]n)",
        texto,
    )
    if ml:
        lider = re.sub(r"\s+", " ", ml.group(1)).strip()

    return {
        "cod": cod,
        "nombre": nombre.title()[:200],
        "categoria": categoria,
        "area": "",
        "anio_fund": anio,
        "lider": lider,
        "activo": True,
    }


def _leer_integrantes(filas: list) -> list[dict]:
    """Saca los investigadores de la tabla 'Integrantes del grupo'."""
    resultado = []
    for fila in filas:
        celdas = [c.get_text(" ", strip=True) for c in fila.find_all(["td", "th"])]
        celdas = [c for c in celdas if c]
        if len(celdas) < 2:
            continue
        # La segunda fila son los encabezados: Nombre, Vinculacion, Horas...
        if _normalizar(celdas[0]) == "nombre":
            continue
        # SCIENTI numera los integrantes como "1.- Nombre". El separador lleva
        # punto Y guion, asi que la clase acepta varios caracteres seguidos:
        # con [.)-] solo se quitaba el punto y el guion colgaba del nombre.
        nombre = re.sub(r"^\d{1,3}\s*[.)-]+\s*", "", celdas[0]).strip()
        if len(nombre) < 4 or not any(ch.isalpha() for ch in nombre):
            continue
        resultado.append(_crear_investigador(nombre))
    return resultado


# SCIENTI separa el titulo del resto del renglon asi:
#   "<titulo> <Pais>, <ano>, <otros campos> Autores: ..."
# El pais puede ir precedido de coma o solo de espacio ("UPC PRO Colombia,
# 2025"), asi que la coma es opcional. Se exige que sea una sola palabra
# iniciada en mayuscula para no cortar un titulo por la mitad.
FIN_DEL_TITULO = (
    r"\s*(?:"
    r",\s*[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ ]{3,},"                # revista en mayusculas
    r"|[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,20},\s(?:19|20)\d{2}\b"  # Pais, ano
    r"|\s*ISSN:|\s*DOI:|\s*ISBN:|\s*vol\s*:"
    r")"
)


def _leer_productos_scienti(filas: list, seccion: str, grupo: dict | None) -> list[dict]:
    """Saca productos de una seccion bibliografica de SCIENTI.

    Cada fila trae texto libre con esta forma:
      "1.- Publicado en revista especializada: Titulo, REVISTA ISSN: 1234,
       2023 vol:1 pag: 1-10 Autores: NOMBRE UNO, NOMBRE DOS"
    De ahi se sacan el tipo, el titulo, el ano y los autores.
    """
    tipo_base = _tipo_por_seccion(seccion)
    cod_grupo = grupo["cod"] if grupo else None
    resultado = []
    vistos = set()
    # SCIENTI numera cada seccion desde 1, asi que el mismo numero aparece en
    # varias tablas ("Articulos publicados" y "Otros articulos publicados").
    # El ID incluye la seccion para que no se pisen entre si.
    firma = re.sub(r"[^a-z0-9]", "", _normalizar(seccion))[:8] or "sec"

    for fila in filas:
        celdas = [c.get_text(" ", strip=True) for c in fila.find_all(["td", "th"])]
        celdas = [c for c in celdas if c]
        if not celdas:
            continue

        texto = re.sub(r"\s+", " ", " ".join(celdas)).strip()
        m = re.match(r"^(\d{1,3})\s*[.)-]\s*(.+)$", texto)
        if not m:
            continue  # titulo de seccion o fila sin numerar
        numero, cuerpo = m.group(1), m.group(2)
        if len(cuerpo) < 8:
            continue

        # "Publicado en revista especializada: TITULO, ...". La etiqueta describe
        # el tipo y nunca es parte del titulo, asi que se separa siempre por el
        # primer dos puntos cuando el prefijo es corto.
        # <ano>, <extra> Autores: ...". La etiqueta describe el tipo y nunca
        # es parte del titulo, asi que se separa siempre por el primer dos
        # puntos cuando el prefijo es corto.
        tipo = tipo_base
        mt = re.match(r"^([^:]{3,90}):\s*(.+)$", cuerpo)
        if mt:
            etiqueta = _normalizar(mt.group(1)).strip(" -")
            cuerpo = mt.group(2)
            tipo = _tipo_por_etiqueta(etiqueta) or tipo_base

        autores = []
        ma = re.search(r"Autores?\s*:?\s*(.+)$", cuerpo, re.IGNORECASE)
        if ma:
            autores = [re.sub(r"\s+", " ", a).strip() for a in ma.group(1).split(",")]

        anio = 0
        my = re.search(r"\b(19\d{2}|20\d{2})\b", cuerpo)
        if my:
            anio = int(my.group(1))

        # El titulo termina donde empieza el pais, el nombre de la revista,
        # el ISSN, el DOI, el ISBN o el volumen.
        corte = re.split(FIN_DEL_TITULO, cuerpo, maxsplit=1)
        titulo = re.sub(r"\s+", " ", corte[0]).strip(" ,.;")
        if len(titulo) < 5:
            continue

        # Un mismo producto puede repetirse entre secciones (por ejemplo
        # "Articulos publicados" y "Otros articulos publicados").
        clave = titulo.lower()[:80]
        if clave in vistos:
            continue
        vistos.add(clave)

        prefijo = cod_grupo or "SCI"
        resultado.append({
            "id": f"PRD-{prefijo}-{firma}-{numero.zfill(3)}",
            "titulo": titulo[:500],
            "tipo": tipo_base,
            "categoria": "",
            "validacion": "NO_VALIDADO",
            "anio": anio,
            "grupo_cod": cod_grupo,
            "autores": [a for a in autores if len(a) >= 4 and any(c.isalpha() for c in a)],
            "activo": True,
        })
    return resultado


def _autores_de(productos: list[dict]) -> list[str]:
    """Nombres de autor mencionados en los productos, sin repetir."""
    vistos: list[str] = []
    for p in productos:
        for a in p.get("autores", []):
            if a.upper() in ("N/A", "NA") or len(a) < 4:
                continue
            if not any(v.upper() == a.upper() for v in vistos):
                vistos.append(a)
    return vistos


def leer_scienti(url: str, timeout: float = 30.0) -> dict[str, Any]:
    """Descarga una pagina de SCIENTI y extrae los datos estructurados.

    El HTML de SCIENTI viene de una aplicacion J2EE antigua: no tiene
    encabezados de columna formales. Cada tabla arranca con una fila de
    titulo de seccion ("Integrantes del grupo", "Articulos publicados") y
    luego vienen las filas de datos. Los integrantes traen su propia fila de
    encabezados, pero los productos son texto del que hay que sacar el ano y
    los autores con expresiones regulares.

    Todo fallo se reporta con un mensaje que propone la via CSV o PDF, que
    siempre funciona, en vez de una excepcion opaca.
    """
    import httpx
    from bs4 import BeautifulSoup

    url = _validar_url(url)

    try:
        respuesta = httpx.get(
            url,
            headers={"User-Agent": USER_AGENT, "Accept-Language": "es-CO,es;q=0.9"},
            follow_redirects=True,
            timeout=timeout,
        )
    except httpx.TimeoutException as exc:
        raise ErrorImportacion(
            "SCIENTI no respondio a tiempo. Pruebe de nuevo o use un archivo CSV o PDF."
        ) from exc
    except httpx.HTTPError as exc:
        raise ErrorImportacion(
            f"No se pudo conectar con SCIENTI: {exc}. Use un archivo CSV o PDF como alternativa."
        ) from exc

    if respuesta.status_code == 403:
        raise ErrorImportacion(
            "SCIENTI rechazo la consulta (403), normalmente por proteccion "
            "anti-bot o porque exige sesion iniciada. Use un archivo CSV o PDF."
        )
    if respuesta.status_code >= 400:
        raise ErrorImportacion(
            f"SCIENTI devolvio el estado {respuesta.status_code}. "
            "Verifique la URL o use un archivo CSV o PDF."
        )

    # Los reportes de SCIENTI se sirven en ISO-8859-1.
    if not respuesta.encoding or respuesta.encoding.lower() in ("iso-8859-1", "ascii"):
        respuesta.encoding = "iso-8859-1"

    sopa = BeautifulSoup(respuesta.text, "lxml")
    texto = sopa.get_text(" ", strip=True)
    tablas = sopa.find_all("table")

    if not tablas and len(texto) < 200:
        raise ErrorImportacion(
            "La pagina respondio pero no tiene contenido. "
            "Verifique la URL o use un archivo CSV o PDF."
        )

    grupo = _extraer_grupo(texto)
    investigadores: list[dict] = []
    productos: list[dict] = []

    for tabla in tablas:
        filas = tabla.find_all("tr")
        if not filas:
            continue
        iniciales = [c.get_text(" ", strip=True) for c in filas[0].find_all(["td", "th"])]
        iniciales = [c for c in iniciales if c]
        if not iniciales:
            continue

        seccion = _sin_espacios(iniciales[0])
        if "integrantesdelgrupo" in seccion or "integrantes" in seccion or "investigadores" in seccion:
            investigadores.extend(_leer_integrantes(filas))
        elif _es_seccion_productos(seccion):
            productos.extend(_leer_productos_scienti(filas, seccion, grupo))

    # El grupo del encabezado es la fuente de la categoria y el ano.
    grupos = [grupo] if grupo else []
    if not grupos and productos:
        cod = productos[0].get("grupo_cod")
        if cod:
            grupos.append({
                "cod": cod,
                "nombre": "Grupo importado de SCIENTI",
                "categoria": "SIN_CLASIFICAR",
                "area": "",
                "anio_fund": 0,
                "lider": None,
                "activo": True,
            })

    # Los autores que aparecen en los productos tambien se registran como
    # investigadores, para que la relacion N:M quede completa.
    for nombre in _autores_de(productos):
        if not any(i["nombre"].upper() == nombre.upper() for i in investigadores):
            investigadores.append(_crear_investigador(nombre))

    total = len(grupos) + len(investigadores) + len(productos)
    if total == 0:
        raise ErrorImportacion(
            "Se descargo la pagina pero no se reconocio ninguna tabla de "
            "integrantes ni de productos. SCIENTI pudo cambiar su formato; "
            "use un archivo CSV o PDF."
        )

    return {
        "entidad": "mixto",
        "url": url,
        "grupos": grupos,
        "investigadores": investigadores,
        "productos": productos,
        "errores": [],
        "total": total,
    }

# --------------------------------------------------------------------------
# Plantillas CSV
# --------------------------------------------------------------------------

PLANTILLAS = {
    "grupos": ["cod", "nombre", "categoria", "area", "anio_fund", "lider", "activo"],
    "investigadores": ["id", "nombre", "categoria", "formacion", "email", "activo"],
    "productos": ["id", "titulo", "tipo", "categoria", "validacion", "anio", "grupo_cod", "autores", "activo"],
}

EJEMPLOS = {
    "grupos": [
        ["G001", "Grupo de Prueba", "A1", "Ingenieria de Sistemas", "2020", "INV001", "SI"],
        ["G002", "Grupo Segundo", "B", "Educacion", "2022", "", "SI"],
    ],
    "investigadores": [
        ["INV001", "Ana Lopez", "SENIOR", "Doctora en Ingenieria", "ana@upc.edu.co", "SI"],
        ["INV002", "Carlos Ruiz", "JUNIOR", "Magister en Ciencias", "carlos@upc.edu.co", "SI"],
    ],
    "productos": [
        ["P001", "Articulo de prueba", "ARTICULO", "", "VALIDADO", "2023", "G001", "INV001;INV002", "SI"],
        ["P002", "Libro de metodologia", "LIBRO", "", "EN_REVISION", "2022", "G001", "INV001", "SI"],
    ],
}


def plantilla_csv(entidad: str) -> str:
    if entidad not in PLANTILLAS:
        raise ErrorImportacion(f"Entidad desconocida: {entidad}")
    buffer = io.StringIO()
    escritor = csv.writer(buffer)
    escritor.writerow(PLANTILLAS[entidad])
    for fila in EJEMPLOS[entidad]:
        escritor.writerow(fila)
    return buffer.getvalue()