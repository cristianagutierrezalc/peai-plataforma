import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { productos, grupos, investigadores } from "../services/api";
import { useColeccion, mensajeError } from "../hooks/useColeccion";
import { MensajeError, EstadoVacio, FilasEsqueleto } from "../components/Feedback";

const TIPOS = [
  "ARTICULO", "LIBRO", "CAPITULO", "SOFTWARE", "PATENTE",
  "TRABAJO_DIRIGIDO", "EVENTO", "PROYECTO", "OTRO",
];
const VALIDACIONES = ["VALIDADO", "NO_VALIDADO", "EN_REVISION"];

const formVacio = () => ({
  id: "",
  titulo: "",
  tipo: "ARTICULO",
  categoria: "",
  validacion: "NO_VALIDADO",
  anio: new Date().getFullYear(),
  grupo_cod: "",
  autores: [],
  activo: true,
});

export default function Productos() {
  const cargarProductos = useCallback(async () => {
    const r = await productos.listar();
    return r.data;
  }, []);

  const { lista, cargando, error, recargar } = useColeccion(cargarProductos);

  // Las listas auxiliares alimentan los desplegables del formulario.
  // Si fallan se avisa, pero no se bloquea la pagina: el formulario
  // sigue siendo utilizable sin grupo ni autores.
  const [gruposList, setGruposList] = useState([]);
  const [invsList, setInvsList] = useState([]);
  const [avisoAux, setAvisoAux] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(formVacio);
  const [errorForm, setErrorForm] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let cancelado = false;

    async function cargarAuxiliares() {
      const pendientes = [];
      try {
        const r = await grupos.listar();
        if (!cancelado) setGruposList(r.data || []);
      } catch {
        pendientes.push("grupos");
      }
      try {
        const r = await investigadores.listar();
        if (!cancelado) setInvsList(r.data || []);
      } catch {
        pendientes.push("investigadores");
      }
      if (!cancelado && pendientes.length) {
        setAvisoAux(
          `No se pudieron cargar ${pendientes.join(" ni ")}. Puedes crear el producto igual, pero no asignarlos.`
        );
      }
    }

    cargarAuxiliares();
    return () => {
      cancelado = true;
    };
  }, []);

  const toggleAutor = (id) => {
    setForm((f) => ({
      ...f,
      autores: f.autores.includes(id) ? f.autores.filter((a) => a !== id) : [...f.autores, id],
    }));
  };

  const crear = async (e) => {
    e.preventDefault();
    setErrorForm("");
    setGuardando(true);
    try {
      await productos.crear(form);
      setShowForm(false);
      setForm(formVacio());
      await recargar();
    } catch (err) {
      setErrorForm(mensajeError(err, "Error al crear el producto"));
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (id) => {
    if (!window.confirm(`¿Eliminar el producto ${id}? Esta accion no se puede deshacer.`)) return;
    try {
      await productos.eliminar(id);
      await recargar();
    } catch (err) {
      setErrorForm(mensajeError(err, "No se pudo eliminar el producto"));
    }
  };

  const abrirForm = () => {
    setErrorForm("");
    setShowForm((v) => !v);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-slate-800">Productos de Investigación</h2>
        <button
          type="button"
          onClick={abrirForm}
          aria-expanded={showForm}
          className="flex min-h-[44px] items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Plus size={16} aria-hidden="true" /> {showForm ? "Cerrar" : "Nuevo producto"}
        </button>
      </div>

      {avisoAux && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status">
          {avisoAux}
        </p>
      )}

      {showForm && (
        <form onSubmit={crear} className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="p-id" className="mb-1 block text-sm font-medium text-slate-700">
                ID
              </label>
              <input
                id="p-id"
                placeholder="Ej: PROD-001"
                value={form.id}
                onChange={(e) => setForm({ ...form, id: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-2"
                required
              />
            </div>
            <div>
              <label htmlFor="p-titulo" className="mb-1 block text-sm font-medium text-slate-700">
                Título
              </label>
              <input
                id="p-titulo"
                placeholder="Título del producto"
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-2"
                required
              />
            </div>
            <div>
              <label htmlFor="p-tipo" className="mb-1 block text-sm font-medium text-slate-700">
                Tipo
              </label>
              <select
                id="p-tipo"
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-2"
              >
                {TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="p-categoria" className="mb-1 block text-sm font-medium text-slate-700">
                Categoría
              </label>
              <input
                id="p-categoria"
                placeholder="Categoría"
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label htmlFor="p-validacion" className="mb-1 block text-sm font-medium text-slate-700">
                Validación
              </label>
              <select
                id="p-validacion"
                value={form.validacion}
                onChange={(e) => setForm({ ...form, validacion: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-2"
              >
                {VALIDACIONES.map((v) => (
                  <option key={v} value={v}>
                    {v.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="p-anio" className="mb-1 block text-sm font-medium text-slate-700">
                Año
              </label>
              <input
                id="p-anio"
                type="number"
                value={form.anio}
                onChange={(e) => setForm({ ...form, anio: +e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="p-grupo" className="mb-1 block text-sm font-medium text-slate-700">
                Grupo de investigación
              </label>
              <select
                id="p-grupo"
                value={form.grupo_cod}
                onChange={(e) => setForm({ ...form, grupo_cod: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="">Sin grupo</option>
                {gruposList.map((g) => (
                  <option key={g.cod} value={g.cod}>
                    {g.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-slate-700">Autores</legend>
            {invsList.length === 0 ? (
              <p className="text-sm text-slate-400">
                Todavia no hay investigadores registrados.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {invsList.map((i) => {
                  const seleccionado = form.autores.includes(i.id);
                  return (
                    <button
                      type="button"
                      key={i.id}
                      onClick={() => toggleAutor(i.id)}
                      aria-pressed={seleccionado}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                        seleccionado
                          ? "bg-primary-600 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {i.nombre}
                    </button>
                  );
                })}
              </div>
            )}
            {form.autores.length > 0 && (
              <p className="mt-2 text-xs text-slate-500">
                {form.autores.length} autor{form.autores.length === 1 ? "" : "es"} seleccionado
                {form.autores.length === 1 ? "" : "s"}
              </p>
            )}
          </fieldset>

          {errorForm && <MensajeError mensaje={errorForm} compacto />}

          <button
            type="submit"
            disabled={guardando}
            aria-busy={guardando}
            className="min-h-[44px] rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {guardando ? "Guardando..." : "Crear producto"}
          </button>
        </form>
      )}

      {error && <MensajeError mensaje={error} onReintentar={() => recargar()} />}

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <caption className="sr-only">Listado de productos de investigación</caption>
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">ID</th>
              <th scope="col" className="px-4 py-3 font-medium">Título</th>
              <th scope="col" className="px-4 py-3 font-medium">Tipo</th>
              <th scope="col" className="px-4 py-3 font-medium">Año</th>
              <th scope="col" className="px-4 py-3 font-medium">Validación</th>
              <th scope="col" className="px-4 py-3 font-medium">Grupo</th>
              <th scope="col" className="px-4 py-3 font-medium">Estado</th>
              <th scope="col" className="px-4 py-3 font-medium">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <FilasEsqueleto columnas={8} />
            ) : (
              lista.map((p) => (
                <tr key={p.id} className="border-t hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{p.id}</td>
                  <td className="max-w-xs truncate px-4 py-3" title={p.titulo}>
                    {p.titulo}
                  </td>
                  <td className="px-4 py-3">{p.tipo?.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3">{p.anio || "—"}</td>
                  <td className="px-4 py-3">{p.validacion?.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3">{p.grupo_cod || "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        p.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {p.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => eliminar(p.id)}
                      aria-label={`Eliminar el producto ${p.id}`}
                      title={`Eliminar ${p.id}`}
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
            titulo="No hay productos registrados"
            descripcion="Registra el primer producto de investigación para alimentar las estadísticas."
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