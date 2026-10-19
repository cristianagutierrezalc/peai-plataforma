import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { mensajeError } from "../hooks/useColeccion";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { iniciarSesion } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // iniciarSesion guarda el token y carga el perfil en el contexto,
      // asi que la navegacion es del cliente. Antes se hacia
      // window.location.href, que recargaba toda la pagina.
      await iniciarSesion(username, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(mensajeError(err, "Error al iniciar sesion"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-primary-700">PEA-i</h1>
          <p className="text-sm text-slate-500">Programa Estadístico de Análisis de Investigación</p>
          <p className="text-xs text-slate-400">Universidad Popular del Cesar</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="login-user" className="mb-1 block text-sm font-medium text-slate-700">
              Usuario
            </label>
            <input
              id="login-user"
              name="username"
              autoComplete="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
              required
            />
          </div>
          <div>
            <label htmlFor="login-pass" className="mb-1 block text-sm font-medium text-slate-700">
              Contraseña
            </label>
            <input
              id="login-pass"
              name="password"
              autoComplete="current-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
              required
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="w-full min-h-[44px] rounded-lg bg-primary-600 py-2 font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}