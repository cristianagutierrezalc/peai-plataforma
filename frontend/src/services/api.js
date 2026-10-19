import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  headers: { "Content-Type": "application/json" },
});

// Interceptor para agregar token JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("peai_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejar 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("peai_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;

export const auth = {
  login: (username, password) => {
    const form = new FormData();
    form.append("username", username);
    form.append("password", password);
    return api.post("/auth/login", form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
  },
  register: (data) => api.post("/auth/register", data),
  me: () => api.get("/auth/me"),
};

export const grupos = {
  listar: (params) => api.get("/grupos", { params }),
  obtener: (cod) => api.get(`/grupos/${cod}`),
  crear: (data) => api.post("/grupos", data),
  actualizar: (cod, data) => api.put(`/grupos/${cod}`, data),
  eliminar: (cod) => api.delete(`/grupos/${cod}`),
  vista: (cod) => api.get(`/grupos/${cod}/vista`),
  agregarIntegrante: (cod, data) => api.post(`/grupos/${cod}/integrantes`, data),
  quitarIntegrante: (cod, invId) => api.delete(`/grupos/${cod}/integrantes/${invId}`),
  encolarActividad: (cod, desc) => api.post(`/grupos/${cod}/plan`, { descripcion: desc }),
  atenderActividad: (cod) => api.post(`/grupos/${cod}/plan/atender`),
};

export const investigadores = {
  listar: (params) => api.get("/investigadores", { params }),
  obtener: (id) => api.get(`/investigadores/${id}`),
  crear: (data) => api.post("/investigadores", data),
  actualizar: (id, data) => api.put(`/investigadores/${id}`, data),
  eliminar: (id) => api.delete(`/investigadores/${id}`),
  vista: (id) => api.get(`/investigadores/${id}/vista`),
};

export const productos = {
  listar: (params) => api.get("/productos", { params }),
  obtener: (id) => api.get(`/productos/${id}`),
  crear: (data) => api.post("/productos", data),
  actualizar: (id, data) => api.put(`/productos/${id}`, data),
  eliminar: (id) => api.delete(`/productos/${id}`),
};

export const estadisticas = {
  global: (params) => api.get("/estadisticas/global", { params }),
  grupo: (cod) => api.get(`/estadisticas/grupo/${cod}`),
  investigador: (id) => api.get(`/estadisticas/investigador/${id}`),
};