"""Pruebas del requerimiento 7: CSV, PDF y scraping de SCIENTI.

Ejecutar desde la carpeta backend/ con la venv del proyecto.
"""
import io
import os
import sys
import tempfile

tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
tmp.close()
os.environ["DATABASE_URL"] = f"sqlite:///{tmp.name}"
os.environ["ENVIRONMENT"] = "development"
os.environ["SECRET_KEY"] = "x" * 40

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.database import SessionLocal, engine, init_db  # noqa: E402
from app import models  # noqa: E402
from app.services import importador  # noqa: E402

# TestClient solo dispara el evento startup cuando se usa como context
# manager. Estas pruebas son lineales, asi que se crean las tablas aqui.
init_db()

fallos = []


def check(nombre, condicion, detalle=""):
    print(f"  [{'PASA' if condicion else 'FALLA'}] {nombre}" + (f"  -> {detalle}" if detalle and not condicion else ""))
    if not condicion:
        fallos.append(nombre)


client = TestClient(app)


# ==========================================================================
print("\n=== CSV: investigadores (coma) ===")
csv_investigadores = (
    "id,nombre,categoria,formacion,email,activo\n"
    "INV001,Ana Lopez,SENIOR,Doctora en Ingenieria,ana@upc.edu.co,SI\n"
    "INV002,Carlos Ruiz,JUNIOR,Magister,carlos@upc.edu.co,SI\n"
    "INV003,Luisa Gomez,SENIOR,Doctora,luisa@upc.edu.co,SI\n"
).encode()

r = client.post("/api/importacion/csv", files={"archivo": ("inv.csv", csv_investigadores, "text/csv")})
check("importa CSV sin sesion (endpoint abierto)", r.status_code == 200, f"-> {r.status_code} {r.text[:200]}")
if r.status_code == 200:
    d = r.json()
    check("detecta entidad investigadores", d["entidad"] == "investigadores", f"-> {d['entidad']}")
    check("crea 3 investigadores", d["resumen"]["investigadores"]["creados"] == 3, f"-> {d['resumen']}")

db = SessionLocal()
check("investigadores en la base", db.query(models.Investigador).count() >= 3)
check(
    "categoria normalizada a mayusculas",
    db.query(models.Investigador).filter_by(id="INV001").first().categoria == "SENIOR",
)
check("activo en true desde 'SI'", db.query(models.Investigador).filter_by(id="INV001").first().activo is True)
db.close()

# ==========================================================================
print("\n=== CSV: grupos (punto y coma,acentos y ids numericos) ===")
csv_grupos = (
    "Código;Nombre;Categoría;Área;Año Fundación;Líder;Activo\n"
    "G001;Grupo de Prueba;A1;Ingeniería de Sistemas;2020;INV001;SI\n"
    "G002;Grupo Segundo;B;Educación;2022;INV002;SI\n"
).encode("latin-1")  # latin-1 es como vienen muchos archivos de SCIENTI

r = client.post("/api/importacion/csv", files={"archivo": ("grupos.csv", csv_grupos, "text/csv")})
check("importa CSV con ';'", r.status_code == 200, f"-> {r.status_code} {r.text[:200]}")
if r.status_code == 200:
    check("detecta entidad grupos", r.json()["entidad"] == "grupos", f"-> {r.json()['entidad']}")
    check("crea 2 grupos", r.json()["resumen"]["grupos"]["creados"] == 2, f"-> {r.json()['resumen']}")

db = SessionLocal()
g = db.query(models.Grupo).filter_by(cod="G001").first()
check("grupo guardado", g is not None)
check("acentos correctos en área", g is not None and g.area == "Ingeniería de Sistemas", f"-> {g.area if g else None}")
check("año como entero", g is not None and g.anio_fund == 2020, f"-> {g.anio_fund if g else None}")
check("lider relacionado", g is not None and g.lider == "INV001", f"-> {g.lider if g else None}")
db.close()

# ==========================================================================
print("\n=== CSV: productos con autores ===")
csv_productos = (
    "id,titulo,tipo,categoria,validacion,anio,grupo_cod,autores,activo\n"
    "P001,Articulo de prueba,ARTICULO,,VALIDADO,2023,G001,INV001;INV002,SI\n"
    "P002,Libro de metodologia,LIBRO,,EN_REVISION,2022,G001,INV001,SI\n"
    "P003,Software de gestion,SOFTWARE,,NO_VALIDADO,2024,G002,INV002,SI\n"
).encode()

r = client.post("/api/importacion/csv", files={"archivo": ("prod.csv", csv_productos, "text/csv")})
check("importa productos", r.status_code == 200, f"-> {r.status_code} {r.text[:200]}")
if r.status_code == 200:
    check("crea 3 productos", r.json()["resumen"]["productos"]["creados"] == 3, f"-> {r.json()['resumen']}")

db = SessionLocal()
p = db.query(models.Producto).filter_by(id="P001").first()
check("producto guardado", p is not None)
check("autores relacionados (2)", p is not None and len(p.autores) == 2, f"-> {len(p.autores) if p else 0}")
check("grupo del producto", p is not None and p.grupo_cod == "G001", f"-> {p.grupo_cod if p else None}")
db.close()

# ==========================================================================
print("\n=== Idempotencia: reimportar el mismo CSV no duplica ===")
r = client.post("/api/importacion/csv", files={"archivo": ("inv.csv", csv_investigadores, "text/csv")})
check("segunda importacion marca actualizados", r.status_code == 200 and r.json()["resumen"]["investigadores"]["creados"] == 0,
      f"-> {r.json()['resumen'] if r.status_code == 200 else r.status_code}")
db = SessionLocal()
check("siguen siendo 3 investigadores", db.query(models.Investigador).count() == 3,
      f"-> {db.query(models.Investigador).count()}")
db.close()

# ==========================================================================
print("\n=== CSV: manejo de errores ===")
r = client.post("/api/importacion/csv", files={"archivo": ("malo.csv", b"columna1,columna2\nx,y\n", "text/csv")})
check("archivo sin columnas reconocidas -> 400", r.status_code == 400, f"-> {r.status_code}")
check("mensaje explica el problema", r.status_code == 400 and "encabezados" in r.json()["detail"].lower())

r = client.post("/api/importacion/csv", files={"archivo": ("vacio.csv", b"", "text/csv")})
check("archivo vacio -> 400", r.status_code == 400, f"-> {r.status_code}")

csv_invalido = b"id,nombre,categoria\nINV999,Persona Test,CATEGORIA_QUE_NO_EXISTE\n"
r = client.post("/api/importacion/csv", files={"archivo": ("bad_cat.csv", csv_invalido, "text/csv")})
check("categoria invalida se degrada y se reporta",
      r.status_code == 200 and any("categoría" in e for e in r.json()["errores"]),
      f"-> {r.json() if r.status_code == 200 else r.status_code}")

# ==========================================================================
print("\n=== Plantillas CSV ===")
for entidad in ("grupos", "investigadores", "productos"):
    resp = client.get(f"/api/importacion/plantilla/{entidad}")
    ok = resp.status_code == 200 and "id" in resp.text or "cod" in resp.text
    check(f"plantilla {entidad} descargable", ok, f"-> {resp.status_code}")
r = client.get("/api/importacion/plantilla/inexistente")
check("plantilla inexistente -> 404", r.status_code == 404, f"-> {r.status_code}")

# La plantilla debe poder importarse de verdad.
plantilla = client.get("/api/importacion/plantilla/investigadores").content
r = client.post("/api/importacion/csv", files={"archivo": ("plantilla.csv", plantilla, "text/csv")})
check("la plantilla se puede importar sin editar", r.status_code == 200, f"-> {r.status_code} {r.text[:150]}")

# ==========================================================================
print("\n=== PDF ===")
try:
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    c.drawString(70, 750, "GRUPOS DE INVESTIGACION")
    c.drawString(70, 730, "G001 - Grupo de Prueba")
    c.drawString(70, 710, "G002 - Grupo Segundo")
    c.drawString(70, 680, "INVESTIGADORES")
    c.drawString(70, 660, "ANA LOPEZ")
    c.drawString(70, 640, "CARLOS RUIZ")
    c.drawString(70, 610, "PRODUCTOS Y PROYECTOS")
    c.drawString(70, 590, "1. Articulo de prueba sobre investigacion")
    c.drawString(70, 570, "2. Libro de metodologia")
    c.save()
    pdf_bytes = buffer.getvalue()

    r = client.post("/api/importacion/pdf", files={"archivo": ("reporte.pdf", pdf_bytes, "application/pdf")})
    check("importa PDF de SCIENTI", r.status_code == 200, f"-> {r.status_code} {r.text[:250]}")
    if r.status_code == 200:
        d = r.json()
        check("detecta secciones del PDF", d["entidad"] == "mixto")
        check("reconoce grupos en el PDF", len(d["resumen"].get("grupos", {})) > 0 or "grupos" in d["resumen"],
              f"-> {list(d['resumen'].keys())}")
except ImportError:
    print("  [omitido] reportlab no instalado, se salta la prueba de PDF")
except Exception as exc:  # noqa: BLE001
    check("generacion del PDF de prueba", False, f"-> {exc}")

# PDF que no es un reporte de SCIENTI
try:
    from reportlab.pdfgen import canvas as _c
    buf2 = io.BytesIO()
    cv = _c.Canvas(buf2)
    cv.drawString(70, 750, "Documento sin datos de grupos")
    cv.save()
    r = client.post("/api/importacion/pdf", files={"archivo": ("otro.pdf", buf2.getvalue(), "application/pdf")})
    check("PDF sin tablas de SCIENTI -> 400 con mensaje util",
          r.status_code == 400 and "SCIENTI" in r.json()["detail"], f"-> {r.status_code} {r.text[:150]}")
except Exception:  # noqa: BLE001
    pass

r = client.post("/api/importacion/pdf", files={"archivo": ("falso.pdf", b"esto no es un pdf", "application/pdf")})
check("archivo que no es PDF -> 400", r.status_code == 400, f"-> {r.status_code}")

# ==========================================================================
print("\n=== Scraping SCIENTI ===")
r = client.post("/api/importacion/scienti", json={"url": "https://scienti.minciencias.gov.co/gruplac/jsp/visualiza/visualizagr.jsp?nro=00000000002099"})
check("responde sin sesion (endpoint abierto)", r.status_code in (200, 400), f"-> {r.status_code}")

if r.status_code == 400:
    detalle = r.json()["detail"]
    print(f"      SCIENTI no accesible en este entorno: {detalle[:150]}")
    check(
        "el error sugiere la alternativa CSV/PDF",
        "CSV" in detalle.upper() or "PDF" in detalle.upper(),
        f"-> {detalle}",
    )
else:
    print(f"      SCIENTI respondio: {r.json()['mensaje']}")

r = client.post("/api/importacion/scienti", json={"url": "https://sitio-malicioso.com/robo"})
check("URL fuera de SCIENTI se rechaza", r.status_code == 400 and "SCIENTI" in r.json()["detail"],
      f"-> {r.status_code} {r.text[:120]}")
check("el rechazo es por seguridad, no por red",
      r.status_code == 400 and "seguridad" in r.json()["detail"].lower(), f"-> {r.text[:120]}")

r = client.post("/api/importacion/scienti", json={"url": "x"})
check("URL demasiado corta -> 422 de validacion", r.status_code == 422, f"-> {r.status_code}")

# ==========================================================================
print("\n=== Orden de dependencias ===")
db = SessionLocal()
n_inv = db.query(models.Investigador).count()
n_grupos = db.query(models.Grupo).count()
n_prod = db.query(models.Producto).count()
check("los tres tipos de entidad quedaron cargados", n_inv > 0 and n_grupos > 0 and n_prod > 0,
      f"inv={n_inv} grupos={n_grupos} prod={n_prod}")
productos_huerfanos = db.query(models.Producto).filter(models.Producto.grupo_cod.isnot(None)).count()
check("los productos con grupo apuntan a grupos existentes",
      all(db.query(models.Grupo).filter_by(cod=p.grupo_cod).first() for p in db.query(models.Producto).all()),
      f"-> {productos_huerfanos}")
db.close()

engine.dispose()
try:
    os.unlink(tmp.name)
except OSError:
    pass

print("\n" + "=" * 62)
if fallos:
    print(f"RESULTADO: {len(fallos)} PRUEBA(S) FALLARON:")
    for f in fallos:
        print(f"  - {f}")
    sys.exit(1)
print("RESULTADO: todas las pruebas pasaron")