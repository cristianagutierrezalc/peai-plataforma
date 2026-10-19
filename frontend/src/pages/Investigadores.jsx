import { useCallback, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { investigadores } from "../services/api";
import { useColeccion, mensajeError } from "../hooks/useColeccion";
import { MensajeError, EstadoVacio, FilasEsqueleto } from "../components/Feedback";

const FORM_VACIO = { id: "", nombre: "", categoria: "SIN_CATEGORIA", formacion: "", email: "" };
const CATEGORIAS = ["SENIOR", "JUNIOR", "SIN_CATEGORIA"];

export default function Investigadores() {
  const cargarInvestigadores = useCallback(async () => {
    const r = await investigadores.listar();
    return r.data;
  }, []);

  const { lista, cargando, error, recargar } = useColeccion(cargarInvestigadores);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [errorForm, setErrorForm] = useState("");
  const [guardando, setGuardando] = useState(false);

  const crear = async (e) => {
    e.preventDefault();
    setErrorForm("");
    setGuardando(true);
    try {
      await investigadores.crear(form);
      setShowForm(false);
      setForm(FORM_VACIO);
      await recargar();
    } catch (err) {
      setErrorForm(mensajeError(err, "Error al crear el investigador"));
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (id) => {
    if (!window.confirm(`¿Eliminar el investigador ${id}? Esta accion no se puede deshacer.`)) return;
    try {
      await investigadores.eliminar(id);
      await recargar();
    } catch (err) {
      setErrorForm(mensajeError(err, "No se pudo eliminar el investigador"));
    }
  };

  const abrirForm = () => {
    setErrorForm("");
    setShowForm((v) => !v);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-slate-800">Investigadores</h2>
        <button
          type="button"
          onClick={abrirForm}
          aria-expanded={showForm}
          className="flex min-h-[44px] items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Plus size={16} aria-hidden="true" /> {showForm ? "Cerrar" : "Nuevo investigador"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={crear} className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="i-id" className="mb-1 block text-sm font-medium text-slate-700">
                ID
              </label>
              <input
                id="i-id"
                placeholder="Ej: INV-001"
                value={form.id}
                onChange={(e) => setForm({ ...form, id: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-2"
                required
              />
            </div>
            <div>
              <label htmlFor="i-nombre" className="mb-1 block text-sm font-medium text-slate-700">
                Nombre
              </label>
              <input
                id="i-nombre"
                placeholder="Nombre completo"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-2"
                required
              />
            </div>
            <div>
              <label htmlFor="i-categoria" className="mb-1 block text-sm font-medium text-slate-700">
                Categoría
              </label>
              <select
                id="i-categoria"
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
              <label htmlFor="i-formacion" className="mb-1 block text-sm font-medium text-slate-700">
                Formación
              </label>
              <input
                id="i-formacion"
                placeholder="Doctor, Magíster, Profesional..."
                value={form.formacion}
                onChange={(e) => setForm({ ...form, formacion: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="i-email" className="mb-1 block text-sm font-medium text-slate-700">
                Correo institucional
              </label>
              <input
                id="i-email"
                type="email"
                placeholder="nombre@dominio.edu.co"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
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
            {guardando ? "Guardando..." : "Crear investigador"}
          </button>
        </form>
      )}

      {error && <MensajeError mensaje={error} onReintentar={() => recargar()} />}

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <caption className="sr-only">Listado de investigadores</caption>
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">ID</th>
              <th scope="col" className="px-4 py-3 font-medium">Nombre</th>
              <th scope="col" className="px-4 py-3 font-medium">Categoría</th>
              <th scope="col" className="px-4 py-3 font-medium">Formación</th>
              <th scope="col" className="px-4 py-3 font-medium">Correo</th>
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
              lista.map((i) => (
                <tr key={i.id} className="border-t hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{i.id}</td>
                  <td className="px-4 py-3">{i.nombre}</td>
                  <td className="px-4 py-3">{i.categoria}</td>
                  <td className="px-4 py-3">{i.formacion || "—"}</td>
                  <td className="px-4 py-3">
                    {i.email ? (
                      <a href={`mailto:${i.email}`} className="text-primary-600 hover:underline">
                        {i.email}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        i.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {i.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => eliminar(i.id)}
                      aria-label={`Eliminar el investigador ${i.id}`}
                      title={`Eliminar ${i.id}`}
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
            titulo="No hay investigadores registrados"
            descripcion="Registra al primer investigador para poder asociarlo a grupos y productos."
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