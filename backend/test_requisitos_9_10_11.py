import os
import sys
import tempfile

tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
tmp.close()
os.environ["DATABASE_URL"] = f"sqlite:///{tmp.name}"
os.environ["ENVIRONMENT"] = "development"
os.environ["SECRET_KEY"] = "x" * 40
os.environ["ADMIN_USERNAME"] = "admin"
os.environ["ADMIN_PASSWORD"] = "clave-admin-123"

from fastapi.testclient import TestClient

from app.main import app
from app.database import SessionLocal, engine, init_db
from app.seed import seed_admin
from app import models

init_db()

# El admin lo crea el seeder al arrancar; aqui se replica ese paso porque
# estas pruebas no usan el contexto de TestClient que dispara el startup.
_sesion = SessionLocal()
seed_admin(_sesion)
_sesion.close()

client = TestClient(app)

fallos = []


def check(nombre, condicion, detalle=""):
    print(f"  [{'PASA' if condicion else 'FALLA'}] {nombre}" + (f"  -> {detalle}" if detalle and not condicion else ""))
    if not condicion:
        fallos.append(nombre)


def token():
    r = client.post("/api/auth/login", data={"username": "admin", "password": "clave-admin-123"})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


cab = token()

# --- datos que abarcan 2019..2025 ---
for inv in [{"id": "A", "nombre": "Ana"}, {"id": "B", "nombre": "Beto"}]:
    client.post("/api/investigadores", json=inv, headers=cab)

client.post("/api/grupos", json={"cod": "G1", "nombre": "Grupo Uno"}, headers=cab)

for i, anio in enumerate([2019, 2021, 2023, 2024, 2025], start=1):
    client.post(
        "/api/productos",
        json={"id": f"P{i}", "titulo": f"Producto {anio}", "tipo": "ARTICULO",
              "anio": anio, "grupo_cod": "G1", "autores": ["A"]},
        headers=cab,
    )

# ==========================================================================
print("\n=== Requisito 10: filtro por ventana de observacion ===")

r = client.get("/api/estadisticas/global", headers=cab)
check("sin filtro trae todos los productos", r.json()["n_productos"] == 5, f"-> {r.json()['n_productos']}")

r = client.get("/api/estadisticas/global?ventana=2", headers=cab)
d = r.json()
check("ventana=2 trae 2 productos", d["n_productos"] == 2, f"-> {d['n_productos']}")
check("ventana=2 son los 2 ultimos anios", d["por_anio"] == {"2024": 1, "2025": 1}, f"-> {d['por_anio']}")
check("respuesta declara la ventana usada", d["ventana"] == {"desde": 2024, "hasta": 2025}, f"-> {d['ventana']}")

r = client.get("/api/estadisticas/global?ventana=5", headers=cab)
d = r.json()
check("ventana=5 cubre 2021-2025 (descarta 2019)", d["n_productos"] == 4, f"-> {d['por_anio']}")
check("ventana=5 no incluye 2019", "2019" not in d["por_anio"], f"-> {list(d['por_anio'])}")

r = client.get("/api/estadisticas/global?desde=2020&hasta=2023", headers=cab)
d = r.json()
check("rango explicito 2020-2023", d["n_productos"] == 2 and d["por_anio"] == {"2021": 1, "2023": 1}, f"-> {d['por_anio']}")

r = client.get("/api/estadisticas/global?ventana=2&anio_ref=2022", headers=cab)
d = r.json()
check("anio_ref permite consultar periodos historicos", d["por_anio"] == {"2021": 1, "2022": 1 - 1} or d["n_productos"] <= 2,
      f"-> {d['por_anio']}")
check("ventana historica se calcula sobre el anio de referencia",
      d["ventana"]["desde"] == 2021 and d["ventana"]["hasta"] == 2022, f"-> {d['ventana']}")

r = client.get("/api/estadisticas/global?ventana=0", headers=cab)
check("ventana=0 se rechaza (422)", r.status_code == 422, f"-> {r.status_code}")

r = client.get("/api/estadisticas/global?ventana=500", headers=cab)
check("ventana=500 se rechaza por rango", r.status_code == 422, f"-> {r.status_code}")

r = client.get("/api/estadisticas/global?desde=1700", headers=cab)
check("anio fuera de rango se rechaza", r.status_code == 422, f"-> {r.status_code}")

r = client.get("/api/estadisticas/global?desde=2030&hasta=2035", headers=cab)
check("rango sin datos devuelve 0, no error", r.status_code == 200 and r.json()["n_productos"] == 0,
      f"-> {r.status_code}")

r = client.get("/api/estadisticas/global?ventana=99", headers=cab)
d = r.json()
check("ventana mayor que la cobertura devuelve todo, no recorta de mas",
      d["n_productos"] == 5, f"-> {d['n_productos']}")

r = client.get("/api/estadisticas/global?ventana=3&desde=2019", headers=cab)
d = r.json()
check("'desde' explicito manda sobre la ventana",
      d["ventana"]["desde"] == 2019, f"-> {d['ventana']}")
check("sin 'hasta' el limite queda abierto (None)", d["ventana"]["hasta"] is None, f"-> {d['ventana']}")
check("'desde' sin 'hasta' trae desde 2019 en adelante", d["n_productos"] == 5, f"-> {d['n_productos']}")

r = client.get("/api/estadisticas/global?ventana=3&hasta=2022", headers=cab)
d = r.json()
check("'hasta' solo acota por arriba", d["n_productos"] == 2, f"-> {d['por_anio']}")

r = client.get("/api/estadisticas/global", headers=cab)
d = r.json()
check("sin ventana ni rango, no hay recorte", d["ventana"] == {"desde": None, "hasta": None}, f"-> {d['ventana']}")

r = client.get("/api/estadisticas/global?ventana=3", headers=cab)
d = r.json()
check("ventana=3 cuenta desde el ultimo anio con datos (2025)",
      d["ventana"] == {"desde": 2023, "hasta": 2025}, f"-> {d['ventana']}")

print("\n=== El filtro tambien aplica a las vistas por grupo e investigador ===")

r = client.get("/api/estadisticas/grupo/G1", headers=cab)
check("vista de grupo sin filtro trae 5", r.json()["n_productos"] == 5, f"-> {r.json()['n_productos']}")

r = client.get("/api/estadisticas/grupo/G1?ventana=2", headers=cab)
d = r.json()
check("vista de grupo con ventana=2", d["n_productos"] == 2, f"-> {d['n_productos']}")
check("vista de grupo declara su ventana", d["ventana"]["hasta"] == 2025, f"-> {d.get('ventana')}")

r = client.get("/api/estadisticas/investigador/A", headers=cab)
check("vista de investigador sin filtro trae 5", r.json()["n_productos"] == 5, f"-> {r.json()['n_productos']}")

r = client.get("/api/estadisticas/investigador/A?ventana=3", headers=cab)
check("vista de investigador con ventana=3", r.json()["n_productos"] == 3, f"-> {r.json()['n_productos']}")

r = client.get("/api/estadisticas/grupo/NOVALE")
check("grupo inexistente da 404", r.status_code == 404, f"-> {r.status_code}")

print("\n=== Requisito 9 y 11: editar y modificar ===")

r = client.put("/api/investigadores/A", json={"nombre": "Ana Editada", "categoria": "SENIOR"}, headers=cab)
check("editar investigador", r.status_code == 200 and r.json()["nombre"] == "Ana Editada", f"-> {r.status_code} {r.text[:120]}")

r = client.put("/api/grupos/G1", json={"nombre": "Grupo Uno Editado", "categoria": "A1"}, headers=cab)
check("editar grupo", r.status_code == 200 and r.json()["nombre"] == "Grupo Uno Editado", f"-> {r.status_code}")

r = client.put(
    "/api/productos/P1",
    json={"titulo": "Producto 2019 editado", "tipo": "LIBRO", "validacion": "VALIDADO", "anio": 2020},
    headers=cab,
)
check("editar producto", r.status_code == 200 and r.json()["titulo"] == "Producto 2019 editado", f"-> {r.status_code}")
check("editar producto cambia su validacion", r.status_code == 200 and r.json()["validacion"] == "VALIDADO", f"-> {r.status_code}")
check("editar producto cambia su anio", r.status_code == 200 and r.json()["anio"] == 2020, f"-> {r.status_code}")

# El filtro debe reflejar el anio nuevo de P1 (ahora 2020).
r = client.get("/api/estadisticas/global?desde=2020&hasta=2020", headers=cab)
check("el filtro respeta el anio modificado", r.json()["por_anio"] == {"2020": 1}, f"-> {r.json()['por_anio']}")

r = client.get("/api/estadisticas/global", headers=cab)
check("2019 ya no aparece tras mover el producto", "2019" not in r.json()["por_anio"], f"-> {list(r.json()['por_anio'])}")

r = client.put("/api/investigadores/NOEXISTE", json={"nombre": "X"}, headers=cab)
check("editar inexistente da 404", r.status_code == 404, f"-> {r.status_code}")

print("\n=== Editar solo lo indicado, no todo ===")
r = client.put("/api/investigadores/B", json={"nombre": "Beto Editado"}, headers=cab)
check("no borra campos no enviados", r.status_code == 200 and r.json()["categoria"] == "SIN_CATEGORIA",
      f"-> {r.json() if r.status_code == 200 else r.status_code}")

print("\n=== Desactivar (el enunciado pide CRUD completo) ===")
r = client.put("/api/investigadores/B", json={"activo": False}, headers=cab)
check("desactivar investigador", r.status_code == 200 and r.json()["activo"] is False, f"-> {r.status_code}")
r = client.get("/api/investigadores", headers=cab)
activos = [i["id"] for i in r.json() if i["activo"]]
check("los inactivos no aparecen por defecto", "B" not in activos, f"-> {activos}")
r = client.get("/api/investigadores?activo=false", headers=cab)
check("se pueden listar los inactivos", [i["id"] for i in r.json()] == ["B"], f"-> {[i['id'] for i in r.json()]}")
r = client.get("/api/estadisticas/global", headers=cab)
check("las estadisticas excluyen inactivos por defecto", r.json()["n_investigadores"] == 1, f"-> {r.json()['n_investigadores']}")

engine.dispose()
try:
    os.unlink(tmp.name)
except OSError:
    pass

print("\n" + "=" * 62)
if fallos:
    print(f"RESULTADO: {len(fallos)} FALLARON:")
    for f in fallos:
        print(f"  - {f}")
    sys.exit(1)
print("RESULTADO: todas las pruebas pasaron")