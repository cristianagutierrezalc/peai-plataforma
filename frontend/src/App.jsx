import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { PantallaCarga } from "./components/Feedback";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Grupos from "./pages/Grupos";
import Investigadores from "./pages/Investigadores";
import Productos from "./pages/Productos";
import Login from "./pages/Login";
import Importar from "./pages/Importar";

function Rutas() {
  // El estado de sesion vive en el contexto. Antes se leia localStorage
  // durante el render, asi que un logout no desmontaba la aplicacion.
  const { usuario, cargando } = useAuth();

  if (cargando) return <PantallaCarga mensaje="Verificando sesion..." />;

  if (!usuario) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/grupos" element={<Grupos />} />
        <Route path="/investigadores" element={<Investigadores />} />
        <Route path="/productos" element={<Productos />} />
        <Route path="/importar" element={<Importar />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Rutas />
    </AuthProvider>
  );
}