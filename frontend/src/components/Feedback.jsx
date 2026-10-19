import { AlertCircle, Inbox, RefreshCw } from "lucide-react";

/** Pantalla de espera a decision. Se muestra mientras se valida el token. */
export function PantallaCarga({ mensaje = "Cargando..." }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3">
        <RefreshCw className="animate-spin text-primary" size={28} aria-hidden="true" />
        <p className="text-sm text-muted-foreground">{mensaje}</p>
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
      className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border border-danger-border bg-danger-subtle text-danger-fg ${
        compacto ? "px-4 py-3" : "px-4 py-3"
      }`}
    >
      <div className="flex items-start gap-3">
        <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
        <p className="text-sm">{mensaje}</p>
      </div>
      {onReintentar && (
        <button
          type="button"
          onClick={onReintentar}
          className="btn min-h-[36px] shrink-0 border border-danger-border bg-white px-3 text-danger-fg hover:bg-danger-subtle"
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
      <div className="rounded-full bg-muted p-3">
        <Inbox size={24} className="text-slate-400" aria-hidden="true" />
      </div>
      <p className="font-medium text-slate-700">{titulo}</p>
      {descripcion && <p className="max-w-sm text-sm text-muted-foreground">{descripcion}</p>}
      {accion}
    </div>
  );
}

/** Aviso informativo, por ejemplo cuando fallan las listas auxiliares. */
export function MensajeAviso({ children }) {
  return (
    <p
      role="status"
      className="rounded-lg border border-warning/30 bg-warning-subtle px-4 py-3 text-sm text-warning-fg"
    >
      {children}
    </p>
  );
}