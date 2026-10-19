import { useCallback, useState } from "react";
import { Save, X, Loader2 } from "lucide-react";
import { Boton } from "../components/ui";
import { MensajeError } from "../components/Feedback";

/**
 * Formulario de edicion reutilizable.
 *
 * Antes los formularios eran de solo creacion: la API tenia los PUT y la
 * interfaz no los exposaba, asi que un dato mal capturado no se podia
 * corregir (requisitos 9 y 11 del enunciado).
 *
 * Recibe `campos` (id, etiqueta, tipo, valor, opciones, required) y
 * `onGuardar(datos)`. Solo envia los campos que cambiaron, para no pisar
 * con valores vacios lo que el usuario no toco.
 */
export default function Formulario({
  campos,
  valoresIniciales,
  onGuardar,
  onCancelar,
  titulo,
  textoBoton = "Guardar cambios",
}) {
  const [valores, setValores] = useState(() =>
    Object.fromEntries(campos.map((c) => [c.name, valoresIniciales?.[c.name] ?? c.valor ?? ""]))
  );
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cambiado = useCallback(
    () =>
      campos.some(
        (c) => String(valores[c.name] ?? "") !== String(valoresIniciales?.[c.name] ?? c.valor ?? "")
      ),
    [campos, valores, valoresIniciales]
  );

  const set = (name) => (e) => setValores((v) => ({ ...v, [name]: e.target.value }));

  const alternar = (name, valor) =>
    setValores((v) => ({ ...v, [name]: v[name]?.includes(valor) ? v[name].filter((x) => x !== valor) : [...(v[name] || []), valor] }));

  const enviar = async (e) => {
    e.preventDefault();
    setError("");
    setGuardando(true);

    // Solo lo modificado: enviar el resto en blanco borraria datos.
    const cambios = {};
    for (const c of campos) {
      const antes = valoresIniciales?.[c.name] ?? c.valor ?? "";
      if (String(valores[c.name] ?? "") !== String(antes)) {
        cambios[c.name] = c.tipo === "number" ? Number(valores[c.name]) || 0 : valores[c.name];
      }
    }

    try {
      await onGuardar(cambios);
    } catch (err) {
      setError(err.response?.data?.detail || "No se pudo guardar el cambio.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form onSubmit={enviar} className="card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">{titulo}</h3>
        {onCancelar && (
          <button
            type="button"
            onClick={onCancelar}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors duration-fast hover:bg-muted"
          >
            <X size={14} aria-hidden="true" />
            Cancelar
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {campos.map((c) => (
          <div key={c.name} className={c.anchoCompleto ? "sm:col-span-2" : ""}>
            <label htmlFor={`edit-${c.name}`} className="label">
              {c.etiqueta}
            </label>

            {c.tipo === "select" ? (
              <select
                id={`edit-${c.name}`}
                className="input"
                value={valores[c.name] ?? ""}
                onChange={set(c.name)}
              >
                {(c.opciones || []).map((o) => (
                  <option key={o} value={o}>
                    {o.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            ) : c.tipo === "chips" ? (
              <div className="flex flex-wrap gap-2">
                {(c.opciones || []).map((o) => {
                  // Una opcion puede ser texto plano o { valor, texto }.
                  const valor = typeof o === "object" ? o.valor : o;
                  const texto = typeof o === "object" ? o.texto : o;
                  const activo = (valores[c.name] || []).includes(valor);
                  return (
                    <button
                      type="button"
                      key={valor}
                      onClick={() => alternar(c.name, valor)}
                      aria-pressed={activo}
                      className={`min-h-[36px] rounded-full px-3 text-xs font-medium transition-colors duration-fast ${
                        activo ? "bg-primary text-white" : "bg-muted text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {texto}
                    </button>
                  );
                })}
              </div>
            ) : (
              <input
                id={`edit-${c.name}`}
                type={c.tipo || "text"}
                className="input"
                value={valores[c.name] ?? ""}
                onChange={set(c.name)}
                placeholder={c.placeholder}
                required={c.required}
              />
            )}
          </div>
        ))}
      </div>

      {error && <MensajeError mensaje={error} />}

      <div className="flex items-center gap-2">
        <Boton type="submit" disabled={guardando || !cambiado()} aria-busy={guardando}>
          {guardando ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
          {guardando ? "Guardando..." : textoBoton}
        </Boton>
        {!cambiado() && !guardando && (
          <span className="text-sm text-muted-foreground">No hay cambios todavía</span>
        )}
      </div>
    </form>
  );
}