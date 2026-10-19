import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { auth } from "../services/api";

/**
 * Estado de sesion real, en lugar de leer localStorage durante el render.
 *
 * Antes el token se leia una vez en App.jsx y nunca cambiaba, asi que un
 * logout (que solo borra localStorage y navega) dejaba la aplicacion montada.
 * Ademas, ahora que /api/auth/register esta cerrado, saber quien eres es
 * necesario para mostrar nombre y rol.
 */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  // Hay que validar el token guardado antes de decidir que hay sesion:
  // si expiro, la app debe mostrar el login y no reventar en la primera peticion.
  const [cargando, setCargando] = useState(true);

  const cerrarSesion = useCallback(() => {
    localStorage.removeItem("peai_token");
    setUsuario(null);
  }, []);

  useEffect(() => {
    let cancelado = false;

    async function validarSesion() {
      if (!localStorage.getItem("peai_token")) {
        setCargando(false);
        return;
      }
      try {
        const { data } = await auth.me();
        if (!cancelado) setUsuario(data);
      } catch {
        // Token invalido, expirado o revocado: se descarta.
        localStorage.removeItem("peai_token");
        if (!cancelado) setUsuario(null);
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    validarSesion();
    return () => {
      cancelado = true;
    };
  }, []);

  const iniciarSesion = useCallback(async (username, password) => {
    const { data } = await auth.login(username, password);
    localStorage.setItem("peai_token", data.access_token);
    const { data: perfil } = await auth.me();
    setUsuario(perfil);
    return perfil;
  }, []);

  const valor = useMemo(
    () => ({ usuario, cargando, iniciarSesion, cerrarSesion }),
    [usuario, cargando, iniciarSesion, cerrarSesion]
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return contexto;
}