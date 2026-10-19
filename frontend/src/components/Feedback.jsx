import { AlertCircle, Inbox, RefreshCw } from "lucide-react";

/** Pantalla de espera a decision. Se muestra mientras se valida el token. */
export function PantallaCarga({ mensaje = "Cargando..." }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3">
        <RefreshCw className="animate-spin text-primary-600" size={28} aria-hidden="true" />
        <p className="text-sm text-slate-500">{mensaje}</p>
      </div>
    </div>
  );
}

/**
 * Aviso de error con opcion de reintentar.
 * Distingue "no pudimos cargar" de "no hay datos": son cosas distintas y
 * confundirlas hace que el usuario repita operaciones a ciegas.
 */
export function MensajeError({ mensaje, onReintentar, compacto = false }) {
  if (!mensaje) return null;
  return (
    <div
      role="alert"
      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 text-red-800 ${
        compacto ? "px-4 py-3" : "p-6"
      }`}
    >
      <div className="flex items-start gap-3">
        <AlertCircle size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
        <p className="text-sm">{mensaje}</p>
      </div>
      {onReintentar && (
        <button
          type="button"
          onClick={onReintentar}
          className="shrink-0 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}

/** Estado vacio: dice que no hay datos y ofrece la accion para crearlos. */
export function EstadoVacio({ titulo, descripcion, accion }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="rounded-full bg-slate-100 p-3">
        <Inbox size={24} className="text-slate-400" aria-hidden="true" />
      </div>
      <p className="font-medium text-slate-700">{titulo}</p>
      {descripcion && <p className="max-w-sm text-sm text-slate-500">{descripcion}</p>}
      {accion}
    </div>
  );
}

/** Filas de esqueleto mientras llegan los datos. Evita el salto de layout. */
export function FilasEsqueleto({ columnas = 5, filas = 5 }) {
  return (
    <>
      {Array.from({ length: filas }).map((_, f) => (
        <tr key={f} className="border-t border-slate-100">
          {Array.from({ length: columnas }).map((__, c) => (
            <td key={c} className="px-4 py-3">
              <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}