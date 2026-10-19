"""Prueba de los 3 bloqueantes arreglados. Ejecutar desde la carpeta backend/."""
import os
import sys
import tempfile

# BD temporal para no tocar peai.db
tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
tmp.close()

os.environ["DATABASE_URL"] = f"sqlite:///{tmp.name}"
os.environ["ENVIRONMENT"] = "development"
os.environ["DEBUG"] = "false"
os.environ["SECRET_KEY"] = "x" * 40
os.environ["ADMIN_USERNAME"] = "admin"
os.environ["ADMIN_PASSWORD"] = "clave-admin-123"
os.environ["ADMIN_NOMBRE"] = "Administrador Prueba"
os.environ["ADMIN_ROL"] = "admin"

from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402
from app.database import SessionLocal, normalizar_url  # noqa: E402
from app.seed import seed_admin  # noqa: E402
from app import models  # noqa: E402

fallos = []


def check(nombre, condicion, detalle=""):
    estado = "PASA" if condicion else "FALLA"
    print(f"  [{estado}] {nombre}" + (f"  -> {detalle}" if detalle and not condicion else ""))
    if not condicion:
        fallos.append(nombre)


print("\n=== BLOQUEANTE 3: driver y normalizacion de URL ===")
for url, esperado in [
    ("postgres://u:p@h:5432/d", "postgresql+psycopg2://u:p@h:5432/d"),
    ("postgresql://u:p@h:5432/d", "postgresql+psycopg2://u:p@h:5432/d"),
    ("sqlite:///./peai.db", "sqlite:///./peai.db"),
    ("  postgresql://u:p@h/d  ", "postgresql+psycopg2://u:p@h/d"),
]:
    check(f"normalizar({url.strip()})", normalizar_url(url) == esperado, f"-> {normalizar_url(url)}")

import sqlalchemy.dialects  # noqa: E402
try:
    import psycopg2  # noqa: E402
    check("driver psycopg2 importable", True, f"version {psycopg2.__version__}")
except ImportError as e:
    check("driver psycopg2 importable", False, str(e))

print("\n=== ARRANQUE: se crea el admin desde variables de entorno ===")
with TestClient(app) as client:
    db = SessionLocal()
    admin = db.query(models.Usuario).filter(models.Usuario.username == "admin").first()
    check("admin creado por el seeder", admin is not None)
    check("rol del admin = admin", admin is not None and admin.rol == models.RolUsuario.ADMIN)
    check("nombre del admin correcto", admin is not None and admin.nombre == "Administrador Prueba")
    check("password hasheado (no en claro)", admin is not None and admin.password_hash != "clave-admin-123")

    print("\n=== Seeder idempotente ===")
    total_antes = db.query(models.Usuario).count()
    creado = seed_admin(db)
    total_despues = db.query(models.Usuario).count()
    check("segunda ejecucion no crea duplicado", creado is None and total_antes == total_despues,
          f"antes={total_antes} despues={total_despues}")
    db.close()

    print("\n=== BLOQUEANTE 1: registro sin autenticar ===")
    r = client.post("/api/auth/register",
                    json={"username": "atacante", "password": "atacante123", "nombre": "Malicioso", "rol": "admin"})
    check("registro anonimo RECHAZADO (401)", r.status_code == 401, f"-> {r.status_code} {r.text[:120]}")

    r = client.post("/api/auth/register",
                    json={"username": "atacante", "password": "atacante123", "nombre": "Malicioso", "rol": "admin"})
    check("registro anonimo RECHAZADO de nuevo (401)", r.status_code == 401, f"-> {r.status_code}")

    print("\n=== Escalada de privilegios bloqueada ===")
    login = client.post("/api/auth/login", data={"username": "admin", "password": "clave-admin-123"})
    check("login del admin funciona", login.status_code == 200, f"-> {login.status_code} {login.text[:150]}")
    if login.status_code == 200:
        token = login.json()["access_token"]
        cab = {"Authorization": f"Bearer {token}"}

        # El admin SI puede crear usuarios, y el que define el rol es el admin.
        r = client.post("/api/auth/register",
                        json={"username": "coord1", "password": "coord12345", "nombre": "Coord", "rol": "coordinador"},
                        headers=cab)
        check("admin puede crear usuario", r.status_code == 201, f"-> {r.status_code} {r.text[:150]}")

        # Un investigador NO puede crear cuentas ni escalarse de rol.
        r = client.post("/api/auth/register",
                        json={"username": "inv1", "password": "investiga123", "nombre": "Inv", "rol": "investigador"},
                        headers=cab)
        check("admin puede crear investigador", r.status_code == 201, f"-> {r.status_code} {r.text[:150]}")

        li = client.post("/api/auth/login", data={"username": "inv1", "password": "investiga123"})
        check("login del investigador funciona", li.status_code == 200, f"-> {li.status_code}")
        if li.status_code == 200:
            cab2 = {"Authorization": f"Bearer {li.json()['access_token']}"}
            r = client.post("/api/auth/register",
                            json={"username": "escalado", "password": "escalado123", "nombre": "X", "rol": "admin"},
                            headers=cab2)
            check("INVESTIGADOR no puede crear cuentas (403)", r.status_code == 403, f"-> {r.status_code}")

        # Un coordinador si puede crear cuentas (por diseno), pero su cuenta
        # tampoco puede crear roles superiores a los que ya tiene.
        lc = client.post("/api/auth/login", data={"username": "coord1", "password": "coord12345"})
        if lc.status_code == 200:
            cabc = {"Authorization": f"Bearer {lc.json()['access_token']}"}
            r = client.post("/api/auth/register",
                            json={"username": "nuevo_coord", "password": "nuevoc123", "nombre": "N", "rol": "coordinador"},
                            headers=cabc)
            check("COORDINADOR puede crear cuentas (201)", r.status_code == 201, f"-> {r.status_code}")
            r = client.post("/api/auth/register",
                            json={"username": "otro_admin", "password": "otroadmin1", "nombre": "A", "rol": "admin"},
                            headers=cabc)
            check("COORDINADOR no puede crear admin (403)", r.status_code == 403, f"-> {r.status_code}")

        print("\n=== Passwords debiles rechazadas ===")
        r = client.post("/api/auth/register",
                        json={"username": "corto", "password": "123", "nombre": "X", "rol": "investigador"},
                        headers=cab)
        check("password < 8 caracteres rechazada (422)", r.status_code == 422, f"-> {r.status_code}")

        print("\n=== Mensaje de login no revela si el usuario existe ===")
        r1 = client.post("/api/auth/login", data={"username": "noexiste999", "password": "loquesea123"})
        r2 = client.post("/api/auth/login", data={"username": "admin", "password": "clave-mala-999"})
        check("mismo status para usuario inexistente y password mala", r1.status_code == r2.status_code == 401,
              f"{r1.status_code} vs {r2.status_code}")
        check("mismo mensaje", r1.json().get("detail") == r2.json().get("detail"),
              f"{r1.json().get('detail')} vs {r2.json().get('detail')}")

        print("\n=== Rate limiting de login ===")
        codigos = []
        for i in range(14):
            r = client.post("/api/auth/login", data={"username": "fuerzabruta", "password": f"malo{i}"})
            codigos.append(r.status_code)
        check("se bloquea despues de 10 intentos (429)", 429 in codigos, f"-> codigos={codigos}")

# Cerrar el pool antes de borrar el archivo, si no Windows lo mantiene tomado.
from app.database import engine  # noqa: E402

engine.dispose()
try:
    os.unlink(tmp.name)
except OSError:
    pass

print("\n" + "=" * 60)
if fallos:
    print(f"RESULTADO: {len(fallos)} PRUEBA(S) FALLARON:")
    for f in fallos:
        print(f"  - {f}")
    sys.exit(1)
print("RESULTADO: todas las pruebas pasaron")
sys.exit(0)