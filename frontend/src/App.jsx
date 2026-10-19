import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Grupos from "./pages/Grupos";
import Investigadores from "./pages/Investigadores";
import Productos from "./pages/Productos";
import Login from "./pages/Login";

export default function App() {
  const token = localStorage.getItem("peai_token");
  if (!token) {
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}