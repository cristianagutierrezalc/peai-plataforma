import { useRef, useState } from "react";
import {
  Upload, FileText, Globe, Download, CheckCircle2, AlertTriangle, Loader2, Link2,
} from "lucide-react";
import { importacion } from "../services/api";
import { Boton } from "../components/ui";
import { MensajeError, MensajeAviso } from "../components/Feedback";

const ENTIDADES = ["grupos", "investigadores", "productos"];

/** Muestra el detalle por entidad que devuelve el backend. */
function Resumen({ resumen }) {
  if (!resumen) return null;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {Object.entries(resumen).map(([entidad, d]) => (
        <div key={entidad} className="card">
          <p className="text-sm capitalize text-muted-foreground">{entidad}</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{d.creados + d.actualizados}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {d.creados} nuevos · {d.actualizados} actualizados
            {d.omitidos > 0 && ` · ${d.omitidos} omitidos`}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function Importar() {
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [url, setUrl] = useState("");
  const archivoRef = useRef(null);

  async function ejecutar(fnPeticion) {
    setCargando(true);
    setError("");
    setResultado(null);
    try {
      // fnPeticion se recibe como funcion y se invoca aqui. Pasarla ya
      // ejecutada hacia que la peticion arranque antes de tiempo.
      const r = await fnPeticion();
      setResultado(r.data);
    } catch (err) {
      // El scraping de SCIENTI puede tardar. Si la peticion se cancela por
      // tiempo, el mensaje generico no ayuda a saber que paso, asi que se
      // distingue entre error del servidor y fallo de red.
      if (err.response) {
        setError(err.response.data?.detail || `El servidor respondió con estado ${err.response.status}.`);
      } else if (err.code === "ECONNABORTED") {
        setError("La importación tardó demasiado y se canceló. Intenta de nuevo.");
      } else {
        setError(`No se pudo conectar con el servidor (${err.message}).`);
      }
    } finally {
      setCargando(false);
    }
  }

  const enviarArchivo = (evento) => {
    const archivo = evento.target.files?.[0];
    if (!archivo) return;
    const datos = new FormData();
    datos.append("archivo", archivo);
    const esPdf = archivo.name.toLowerCase().endsWith(".pdf");
    ejecutar(() => (esPdf ? importacion.pdf(datos) : importacion.csv(datos)));
    evento.target.value = "";
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Importar datos de SCIENTI</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Carga la información de grupos, investigadores y productos desde un archivo
          CSV, un reporte PDF o directamente desde el sitio de SCIENTI.
        </p>
      </div>

      {error && <MensajeError mensaje={error} />}

      {/* --- CSV y PDF --- */}
      <section className="card space-y-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary-subtle p-2.5 text-primary">
            <Upload size={20} aria-hidden="true" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Desde un archivo</h3>
            <p className="text-sm text-muted-foreground">
              CSV o PDF. La entidad se deduce de las columnas o de las secciones del reporte.
            </p>
          </div>
        </div>

        <div>
          <input
            ref={archivoRef}
            type="file"
            accept=".csv,.pdf"
            onChange={enviarArchivo}
            disabled={cargando}
            aria-label="Seleccionar archivo CSV o PDF"
            className="block w-full cursor-pointer rounded-lg border border-dashed border-border-strong bg-slate-50 px-4 py-6 text-sm text-muted-foreground file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:border-primary"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">¿No tienes el archivo?</span>
          {ENTIDADES.map((e) => (
            <a
              key={e}
              href={importacion.plantillaUrl(e)}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-border-strong bg-white px-3 py-1.5 text-sm font-medium text-foreground transition-colors duration-fast hover:bg-muted"
            >
              <Download size={14} aria-hidden="true" />
              {e}
            </a>
          ))}
        </div>
      </section>

      {/* --- Web scraping --- */}
      <section className="card space-y-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary-subtle p-2.5 text-primary">
            <Globe size={20} aria-hidden="true" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Desde SCIENTI</h3>
            <p className="text-sm text-muted-foreground">
              Pega el enlace de un grupo del portal y se descargan sus integrantes y productos.
            </p>
          </div>
        </div>

        <MensajeAviso>
          SCIENTI es un sistema antiguo: si rechaza la consulta o cambia su formato, usa
          un archivo CSV o PDF, que siempre funciona igual.
        </MensajeAviso>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (url.trim()) ejecutar(() => importacion.scienti(url.trim()));
          }}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <div className="flex-1">
            <label htmlFor="url-scienti" className="sr-only">
              URL del grupo en SCIENTI
            </label>
            <div className="relative">
              <Link2
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="url-scienti"
                type="url"
                className="input pl-9"
                placeholder="https://scienti.minciencias.gov.co/gruplac/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
            </div>
          </div>
          <Boton type="submit" disabled={cargando || !url.trim()} aria-busy={cargando}>
            {cargando ? "Descargando..." : "Importar"}
          </Boton>
        </form>
      </section>

      {cargando && (
        <div className="card flex items-center justify-center gap-3" role="status" aria-live="polite">
          <Loader2 className="animate-spin text-primary" size={20} aria-hidden="true" />
          <span className="text-sm text-muted-foreground">Procesando la información...</span>
        </div>
      )}

      {resultado && (
        <section className="space-y-3">
          <div
            className="flex items-center gap-2 rounded-lg border border-success-subtle bg-success-subtle px-4 py-3"
            role="status"
          >
            <CheckCircle2 size={18} className="text-success-fg" aria-hidden="true" />
            <p className="text-sm font-medium text-success-fg">{resultado.mensaje}</p>
          </div>

          <Resumen resumen={resultado.resumen} />

          {resultado.errores?.length > 0 && (
            <details className="card">
              <summary className="cursor-pointer text-sm font-medium text-foreground">
                {resultado.errores.length} advertencia{resultado.errores.length === 1 ? "" : "s"} durante la importación
              </summary>
              <ul className="mt-3 space-y-1.5">
                {resultado.errores.slice(0, 40).map((e, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
                    {e}
                  </li>
                ))}
              </ul>
              {resultado.errores.length > 40 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  y {resultado.errores.length - 40} más…
                </p>
              )}
            </details>
          )}
        </section>
      )}

      <section className="card">
        <h3 className="flex items-center gap-2 font-semibold text-foreground">
          <FileText size={18} className="text-muted-foreground" aria-hidden="true" />
          Formato esperado del CSV
        </h3>
        <div className="mt-3 space-y-4 text-sm">
          <div>
            <p className="font-medium text-foreground">Grupos</p>
            <code className="mt-1 block overflow-x-auto rounded bg-slate-100 px-3 py-2 text-xs text-slate-700">
              cod, nombre, categoria, area, anio_fund, lider, activo
            </code>
          </div>
          <div>
            <p className="font-medium text-foreground">Investigadores</p>
            <code className="mt-1 block overflow-x-auto rounded bg-slate-100 px-3 py-2 text-xs text-slate-700">
              id, nombre, categoria, formacion, email, activo
            </code>
          </div>
          <div>
            <p className="font-medium text-foreground">Productos</p>
            <code className="mt-1 block overflow-x-auto rounded bg-slate-100 px-3 py-2 text-xs text-slate-700">
              id, titulo, tipo, validacion, anio, grupo_cod, autores, activo
            </code>
            <p className="mt-1 text-xs text-muted-foreground">
              Los autores se separan con punto y coma. Se aceptan coma o punto y coma
              como separador de columnas, y los encabezados pueden llevar tildes.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}