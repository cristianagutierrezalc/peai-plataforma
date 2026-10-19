# 📋 Checklist de Deploy - PEA-i Plataforma en Render

> **Tiempo estimado:** 15-20 minutos
> **Requisitos:** Cuenta GitHub + Cuenta Render (gratis)

---

## 🎯 PASO 1: Preparar repositorio GitHub

```bash
# 1. Entra a la carpeta del proyecto
cd "C:\Users\Cristian Gutierrez\OneDrive - unicesar.edu.co\Documentos\Proyecto predeterminado\PEAi_Plataforma"

# 2. Inicializa git (si no existe)
git init

# 3. Agrega todo
git add .

# 4. Commit inicial
git commit -m "feat: PEA-i Plataforma - Deploy ready with render.yaml + CI/CD"

# 5. Crea repo en GitHub (ve a github.com/new)
#    Nombre: peai-plataforma
#    Público o Privado (tu elección)
#    NO inicialices con README, .gitignore, ni license

# 6. Conecta y sube
git branch -M main
git remote add origin https://github.com/TU_USUARIO/peai-plataforma.git
git push -u origin main
```

✅ **Verifica:** En GitHub ves todos los archivos incluyendo `render.yaml` y `.github/workflows/ci-cd.yml`

---

## 🔐 PASO 2: Generar SECRET_KEY segura

```bash
cd "C:\Users\Cristian Gutierrez\OneDrive - unicesar.edu.co\Documentos\Proyecto predeterminado\PEAi_Plataforma"
python generate-secret.py
```

**Copia la salida** (ej: `SECRET_KEY=a1b2c3d4e5f6...`) - la necesitas para Render.

---

## 🐘 PASO 3: Crear cuenta en Render

1. Ve a https://render.com
2. **Sign up** → **GitHub** (conecta tu cuenta)
3. Autoriza acceso a tus repositorios

---

## 📦 PASO 4: Deploy via Blueprint (Automático)

1. En Render Dashboard: **New +** → **Blueprint**
2. **Connect repository** → Selecciona `peai-plataforma`
3. Render detecta `render.yaml` y muestra:
   - `peai-db` (PostgreSQL Free)
   - `peai-backend` (Web Service Free)
   - `peai-frontend` (Static Site Free)
4. **Apply** → Render crea todo automático

---

## ⚙️ PASO 5: Configurar variables de entorno

### En Backend (`peai-backend` → Environment):

| Variable | Valor |
|----------|-------|
| `DATABASE_URL` | *(Render la llena auto desde peai-db)* |
| `SECRET_KEY` | **Pega la clave que generaste en Paso 2** |
| `ALGORITHM` | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` |
| `CORS_ORIGINS` | `["https://peai-frontend.onrender.com","http://localhost:3000"]` |
| `DEBUG` | `false` |

> ⚠️ **Importante:** `CORS_ORIGINS` debe coincidir EXACTAMENTE con la URL de tu frontend (cámbiala si tu frontend tiene otro nombre).

### En Frontend (`peai-frontend` → Environment):

| Variable | Valor |
|----------|-------|
| `VITE_API_URL` | `https://peai-backend.onrender.com` |

> Si tu backend tiene otro nombre, cámbialo aquí.

---

## 🔄 PASO 6: Actualizar CORS tras primer deploy

1. Espera a que **ambos** servicios estén **Live** (verde)
2. Copia la URL real de tu frontend: `https://TU_NOMBRE.onrender.com`
3. En Backend → Environment → Edita `CORS_ORIGINS`:
   ```json
   ["https://TU_FRONTEND_REAL.onrender.com","http://localhost:3000"]
   ```
4. **Save Changes** → Render hace redeploy automático (~2 min)

---

## ✅ PASO 7: Verificar

| URL | Qué debe pasar |
|-----|----------------|
| `https://peai-frontend.onrender.com` | Carga login → `admin` / `admin123` → entra al Dashboard |
| `https://peai-backend.onrender.com/health` | `{"status":"healthy"}` |
| `https://peai-backend.onrender.com/docs` | Swagger UI funcional |

---

## 🤖 PASO 8: Automatizar CI/CD (GitHub Actions)

### 1. En GitHub: Settings → Secrets and variables → Actions → New repository secret

| Name | Value |
|------|-------|
| `RENDER_API_KEY` | *(De Render: Account Settings → API Keys → Create Key)* |

### 2. El workflow `.github/workflows/ci-cd.yml` ya está listo

En cada `push` a `main`:
- ✅ Tests backend + frontend
- ✅ Build frontend
- ✅ Deploy automático a Render via Blueprint

---

## 🌐 PASO 9: Dominio personalizado (Opcional)

1. Render Dashboard → `peai-frontend` → Settings → Custom Domains
2. Add Domain: `peai.upc.edu.co`
3. Configura DNS en tu proveedor:
   ```
   CNAME  peai  peai-frontend.onrender.com
   ```
4. Render provisiona SSL automático (Let's Encrypt)

---

## 🧪 COMANDOS ÚTILES

```bash
# Generar SECRET_KEY
python generate-secret.py

# Ver logs en local
cd backend && uvicorn app.main:app --reload --port 8000
cd frontend && npm run dev

# Ver logs en Render
# Dashboard → Servicio → Logs

# Forzar redeploy
# Dashboard → Servicio → Manual Deploy → Deploy latest commit

# Ver variables de entorno en producción
# Dashboard → Servicio → Environment
```

---

## 🆘 SOLUCIÓN DE PROBLEMAS

| Problema | Solución |
|----------|----------|
| `CORS error` | Verifica `CORS_ORIGINS` en backend = URL exacta del frontend |
| `DATABASE_URL` vacía | Espera a que `peai-db` esté **Available** antes de deployar backend |
| `Build failed` frontend | Revisa logs → `npm ci` falla → borra `package-lock.json` y reintenta |
| `502 Bad Gateway` | Backend no arranca → revisa logs → usualmente `DATABASE_URL` o `SECRET_KEY` |
| `401 Unauthorized` | Token expirado o `SECRET_KEY` distinta entre deploys |

---

## 📞 SOPORTE

- **Render Docs:** https://render.com/docs
- **Render Community:** https://community.render.com
- **GitHub Actions:** https://docs.github.com/en/actions

---

## 🎉 ¡LISTO!

Una vez completado tendrás:

- 🌐 **Frontend:** `https://peai-frontend.onrender.com`
- 🔧 **Backend API:** `https://peai-backend.onrender.com`
- 📚 **Docs API:** `https://peai-backend.onrender.com/docs`
- 🐘 **PostgreSQL:** Administrado por Render (backups automáticos)
- 🔄 **CI/CD:** Push a main = deploy automático
- 🔒 **HTTPS/SSL:** Automático
- 💰 **Costo:** $0/mes (plan Free)

---

**Usuario demo:** `admin` / `admin123` (cámbialo en producción)