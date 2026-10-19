import { useEffect, useState } from "react";
import { productos, grupos, investigadores } from "../services/api";
import { Plus, Trash2 } from "lucide-react";

export default function Productos() {
  const [lista, setLista] = useState([]);
  const [gruposList, setGruposList] = useState([]);
  const [invsList, setInvsList] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ id: "", titulo: "", tipo: "ARTICULO", categoria: "", validacion: "NO_VALIDADO", anio: new Date().getFullYear(), grupo_cod: "", autores: [], activo: true });
  const [error, setError] = useState("");

  const cargar = () => productos.listar().then((r) => setLista(r.data)).catch(() => {});
  useEffect(() => {
    cargar();
    grupos.listar().then((r) => setGruposList(r.data));
    investigadores.listar().then((r) => setInvsList(r.data));
  }, []);

  const toggleAutor = (id) => {
    setForm((f) => ({
      ...f,
      autores: f.autores.includes(id) ? f.autores.filter((a) => a !== id) : [...f.autores, id],
    }));
  };

  const crear = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await productos.crear(form);
      setShowForm(false);
      setForm({ id: "", titulo: "", tipo: "ARTICULO", categoria: "", validacion: "NO_VALIDADO", anio: new Date().getFullYear(), grupo_cod: "", autores: [], activo: true });
      cargar();
    } catch (err) {
      setError(err.response?.data?.detail || "Error al crear");
    }
  };

  const eliminar = async (id) => {
    if (!confirm(`¿Eliminar el producto ${id}?`)) return;
    await productos.eliminar(id);
    cargar();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Productos de Investigación</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Plus size={16} /> Nuevo producto
        </button>
      </div>

      {showForm && (
        <form onSubmit={crear} className="rounded-xl bg-white p-6 shadow-sm space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input placeholder="ID" value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} className="rounded-lg border px-3 py-2" required />
            <input placeholder="Título" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} className="rounded-lg border px-3 py-2" required />
            <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className="rounded-lg border px-3 py-2">
              {["ARTICULO", "LIBRO", "CAPITULO", "SOFTWARE", "PATENTE", "TRABAJO_DIRIGIDO", "EVENTO", "PROYECTO", "OTRO"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <input placeholder="Categoría" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className="rounded-lg border px-3 py-2" />
            <select value={form.validacion} onChange={(e) => setForm({ ...form, validacion: e.target.value })} className="rounded-lg border px-3 py-2">
              {["VALIDADO", "NO_VALIDADO", "EN_REVISION"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
            <input type="number" placeholder="Año" value={form.anio} onChange={(e) => setForm({ ...form, anio: +e.target.value })} className="rounded-lg border px-3 py-2" />
            <select value={form.grupo_cod} onChange={(e) => setForm({ ...form, grupo_cod: e.target.value })} className="rounded-lg border px-3 py-2">
              <option value="">Sin grupo</option>
              {gruposList.map((g) => (
                <option key={g.cod} value={g.cod}>{g.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Autores</p>
            <div className="flex flex-wrap gap-2">
              {invsList.map((i) => (
                <button
                  type="button"
                  key={i.id}
                  onClick={() => toggleAutor(i.id)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    form.autores.includes(i.id) ? "bg-primary-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {i.nombre}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
            Crear producto
          </button>
        </form>
      )}

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Título</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Año</th>
              <th className="px-4 py-3">Validación</th>
              <th className="px-4 py-3">Grupo</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((p) => (
              <tr key={p.id} className="border-t hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{p.id}</td>
                <td className="px-4 py-3 max-w-xs truncate">{p.titulo}</td>
                <td className="px-4 py-3">{p.tipo}</td>
                <td className="px-4 py-3">{p.anio}</td>
                <td className="px-4 py-3">{p.validacion}</td>
                <td className="px-4 py-3">{p.grupo_cod || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-1 text-xs ${p.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                    {p.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => eliminar(p.id)} className="text-red-600 hover:text-red-800">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {lista.length === 0 && <p className="p-6 text-center text-slate-500">No hay productos registrados</p>}
      </div>
    </div>
  );
}