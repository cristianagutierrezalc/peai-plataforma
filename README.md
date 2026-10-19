# PEA-i Plataforma

Plataforma web para el Programa Estadístico de Análisis de Investigación de la
Universidad Popular del Cesar. Evolución del Taller 2 (estructuras de datos) a un
sistema web completo con API REST, frontend moderno y base de datos.

## Stack

- **Backend:** FastAPI + SQLAlchemy + SQLite (dev) / PostgreSQL (prod)
- **Frontend:** React 18 + Vite + Tailwind CSS + Recharts
- **Auth:** JWT (OAuth2 password flow)
- **Despliegue:** Docker Compose (backend + frontend + PostgreSQL)

## Estructura

```
PEAi_Plataforma/
├── backend/          # API REST (FastAPI)
│   ├── app/
│   │   ├── main.py   # Entry point
│   │   ├── models.py # SQLAlchemy models
│   │   ├── schemas.py # Pydantic schemas
│   │   ├── crud.py   # CRUD operations
│   │   ├── auth.py   # JWT authentication
│   │   └── routers/  # API endpoints
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/         # React SPA
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── services/
│   ├── package.json
│   └── Dockerfile
└── docker-compose.yml
```

## Desarrollo local

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # o venv\Scripts\activate en Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:3000

## Despliegue con Docker

```bash
docker-compose up -d
```

- Backend: http://localhost:8000
- Frontend: http://localhost:3000
- PostgreSQL: localhost:5432

## Funcionalidades

- **Dashboard** con KPIs y gráficos (productos por tipo, por año)
- **CRUD** de grupos, investigadores y productos
- **Gestión de integrantes** y plan de actividades por grupo
- **Estadísticas** por grupo e investigador
- **Autenticación** JWT con roles (admin, coordinador, investigador)
- **API REST documentada** (Swagger/OpenAPI en /docs)

## Origen

Evolución del Taller 2 de Estructura de Datos (PEA-i), que implementaba las
mismas funcionalidades en C++ y Python con estructuras de datos propias
(listas, multilistas, pilas, colas, hipercubo). La plataforma reutiliza la
lógica de negocio y la expone como API web.