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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-subtle to-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-primary">PEA-i</h1>
          <p className="text-sm text-muted-foreground">Programa Estadístico de Análisis de Investigación</p>
          <p className="text-xs text-slate-400">Universidad Popular del Cesar</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="login-user" className="label">Usuario</label>
            <input
              id="login-user"
              name="username"
              autoComplete="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input"
              required
            />
          </div>
          <div>
            <label htmlFor="login-pass" className="label">Contraseña</label>
            <input
              id="login-pass"
              name="password"
              autoComplete="current-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              required
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-danger-fg">
              {error}
            </p>
          )}
          <button type="submit" disabled={loading} aria-busy={loading} className="btn btn-primary w-full">
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}