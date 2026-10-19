import { useCallback, useEffect, useState } from "react";

/**
 * Traduce cualquier error de la API a un mensaje que se pueda mostrar.
 * Distingue "no hay conexion" de "el servidor rechazo la operacion",
 * porque son fallos muy distintos para quien esta usando la aplicacion.
 */
export function mensajeError(err, fallback = "Ocurrio un error inesperado") {
  if (!err) return fallback;
  if (!err.response) {
    return "No se pudo conectar con el servidor. Verifica tu conexion a internet.";
  }
  const { status, data } = err.response;

  if (status === 401) return "Tu sesion expiro. Vuelve a iniciar sesion.";
  if (status === 403) return data?.detail || "No tienes permisos para esta accion.";
  if (status === 422) {
    // FastAPI devuelve los errores de validacion campo por campo.
    const detalle = data?.detail;
    if (Array.isArray(detalle) && detalle.length) {
      return detalle.map((d) => d.msg || d.detail).join(" ");
    }
    return data?.detail || "Los datos enviados no son validos.";
  }
  return data?.detail || fallback;
}

/**
 * Carga de una coleccion con estados de carga y error explicitos.
 *
 * Antes cada pagina hacia `cargar().catch(() => {})`, que se tragaba los
 * errores: si el backend caia, la tabla se veia vacia y el usuario creaba
 * duplicados creyendo que no habia datos.
 *
 * `fn` DEBE venir memorizada con useCallback en el llamador; las reglas
 * de react-hooks avisan si se olvida.
 */
export function useColeccion(fn) {
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  /** Recarga sin volver a mostrar el estado de carga completo. */
  const recargar = useCallback(async () => {
    try {
      const datos = await fn();
      setLista(Array.isArray(datos) ? datos : []);
      setError("");
      return true;
    } catch (err) {
      setError(mensajeError(err, "No se pudieron cargar los datos"));
      return false;
    }
  }, [fn]);

  useEffect(() => {
    let cancelado = false;

    (async () => {
      try {
        const datos = await fn();
        if (!cancelado) {
          setLista(Array.isArray(datos) ? datos : []);
          setError("");
        }
      } catch (err) {
        if (!cancelado) setError(mensajeError(err, "No se pudieron cargar los datos"));
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();

    // El retorno debe ser una funcion de limpieza, nunca la promesa.
    // Esto era el bug 5: useEffect(cargar, []) devolvia el resultado de
    // .then(), que es una promesa, no una funcion.
    return () => {
      cancelado = true;
    };
  }, [fn]);

  return { lista, cargando, error, recargar };
}