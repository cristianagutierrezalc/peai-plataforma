import { useCallback, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { grupos } from "../services/api";
import { useColeccion, mensajeError } from "../hooks/useColeccion";
import { MensajeError, EstadoVacio, FilasEsqueleto } from "../components/Feedback";

const FORM_VACIO = {
  cod: "",
  nombre: "",
  categoria: "SIN_CLASIFICAR",
  area: "",
  anio_fund: new Date().getFullYear(),
  lider: "",
};

const CATEGORIAS = ["A1", "A", "B", "C", "RECONOCIDO", "SIN_CLASIFICAR"];

export default function Grupos() {
  const cargarGrupos = useCallback(async () => {
    const r = await grupos.listar();
    return r.data;
  }, []);

  const { lista, cargando, error, recargar } = useColeccion(cargarGrupos);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [errorForm, setErrorForm] = useState("");
  const [guardando, setGuardando] = useState(false);

  const crear = async (e) => {
    e.preventDefault();
    setErrorForm("");
    setGuardando(true);
    try {
      await grupos.crear(form);
      setShowForm(false);
      setForm(FORM_VACIO);
      // recargar() no vuelve a mostrar el estado de carga completo.
      await recargar();
    } catch (err) {
      setErrorForm(mensajeError(err, "Error al crear el grupo"));
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (cod) => {
    if (!window.confirm(`¿Eliminar el grupo ${cod}? Esta accion no se puede deshacer.`)) return;
    try {
      await grupos.eliminar(cod);
      await recargar();
    } catch (err) {
      // Antes no havia try/catch: si fallaba, no pasaba nada y el
      // usuario creia que habia borrado el registro.
      setErrorForm(mensajeError(err, "No se pudo eliminar el grupo"));
    }
  };

  const abrirForm = () => {
    setErrorForm("");
    setShowForm((v) => !v);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-slate-800">Grupos de Investigación</h2>
        <button
          type="button"
          onClick={abrirForm}
          aria-expanded={showForm}
          className="flex min-h-[44px] items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Plus size={16} aria-hidden="true" /> {showForm ? "Cerrar" : "Nuevo grupo"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={crear} className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="g-cod" className="mb-1 block text-sm font-medium text-slate-700">
                Código
              </label>
              <input
                id="g-cod"
                placeholder="Ej: G-001"
                value={form.cod}
                onChange={(e) => setForm({ ...form, cod: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-2"
                required
              />
            </div>
            <div>
              <label htmlFor="g-nombre" className="mb-1 block text-sm font-medium text-slate-700">
                Nombre
              </label>
              <input
                id="g-nombre"
                placeholder="Nombre del grupo"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-2"
                required
              />
            </div>
            <div>
              <label htmlFor="g-categoria" className="mb-1 block text-sm font-medium text-slate-700">
                Categoría
              </label>
              <select
                id="g-categoria"
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-2"
              >
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="g-area" className="mb-1 block text-sm font-medium text-slate-700">
                Área
              </label>
              <input
                id="g-area"
                placeholder="Área de investigación"
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label htmlFor="g-anio" className="mb-1 block text-sm font-medium text-slate-700">
                Año de fundación
              </label>
              <input
                id="g-anio"
                type="number"
                value={form.anio_fund}
                onChange={(e) => setForm({ ...form, anio_fund: +e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label htmlFor="g-lider" className="mb-1 block text-sm font-medium text-slate-700">
                Líder
              </label>
              <input
                id="g-lider"
                placeholder="ID del investigador"
                value={form.lider}
                onChange={(e) => setForm({ ...form, lider: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
          </div>

          {errorForm && <MensajeError mensaje={errorForm} compacto />}

          <button
            type="submit"
            disabled={guardando}
            aria-busy={guardando}
            className="min-h-[44px] rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {guardando ? "Guardando..." : "Crear grupo"}
          </button>
        </form>
      )}

      {error && <MensajeError mensaje={error} onReintentar={() => recargar()} />}

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <caption className="sr-only">Listado de grupos de investigación</caption>
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Código</th>
              <th scope="col" className="px-4 py-3 font-medium">Nombre</th>
              <th scope="col" className="px-4 py-3 font-medium">Categoría</th>
              <th scope="col" className="px-4 py-3 font-medium">Área</th>
              <th scope="col" className="px-4 py-3 font-medium">Año</th>
              <th scope="col" className="px-4 py-3 font-medium">Estado</th>
              <th scope="col" className="px-4 py-3 font-medium">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <FilasEsqueleto columnas={7} />
            ) : (
              lista.map((g) => (
                <tr key={g.cod} className="border-t hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{g.cod}</td>
                  <td className="px-4 py-3">{g.nombre}</td>
                  <td className="px-4 py-3">{g.categoria}</td>
                  <td className="px-4 py-3">{g.area || "—"}</td>
                  <td className="px-4 py-3">{g.anio_fund || "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        g.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {g.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => eliminar(g.cod)}
                      aria-label={`Eliminar el grupo ${g.cod}`}
                      title={`Eliminar ${g.cod}`}
                      className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-red-600 hover:bg-red-50 hover:text-red-800"
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {!cargando && !error && lista.length === 0 && (
          <EstadoVacio
            titulo="No hay grupos registrados"
            descripcion="Crea el primer grupo de investigación para empezar a construir el registro."
            accion={
              <button
                type="button"
                onClick={abrirForm}
                className="mt-1 flex min-h-[44px] items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
              >
                <Plus size={16} aria-hidden="true" /> Crear el primero
              </button>
            }
          />
        )}
      </div>
    </div>
  );
}