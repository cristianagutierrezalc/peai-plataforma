import { useEffect, useState } from "react";
import { grupos } from "../services/api";
import { Plus, Trash2, Edit2 } from "lucide-react";

export default function Grupos() {
  const [lista, setLista] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ cod: "", nombre: "", categoria: "SIN_CLASIFICAR", area: "", anio_fund: 0, lider: "" });
  const [error, setError] = useState("");

  const cargar = () => grupos.listar().then((r) => setLista(r.data)).catch(() => {});
  useEffect(cargar, []);

  const crear = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await grupos.crear(form);
      setShowForm(false);
      setForm({ cod: "", nombre: "", categoria: "SIN_CLASIFICAR", area: "", anio_fund: 0, lider: "" });
      cargar();
    } catch (err) {
      setError(err.response?.data?.detail || "Error al crear");
    }
  };

  const eliminar = async (cod) => {
    if (!confirm(`¿Eliminar el grupo ${cod}?`)) return;
    await grupos.eliminar(cod);
    cargar();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Grupos de Investigación</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Plus size={16} /> Nuevo grupo
        </button>
      </div>

      {showForm && (
        <form onSubmit={crear} className="rounded-xl bg-white p-6 shadow-sm space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input placeholder="Código" value={form.cod} onChange={(e) => setForm({ ...form, cod: e.target.value })} className="rounded-lg border px-3 py-2" required />
            <input placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="rounded-lg border px-3 py-2" required />
            <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className="rounded-lg border px-3 py-2">
              {["A1", "A", "B", "C", "RECONOCIDO", "SIN_CLASIFICAR"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <input placeholder="Área" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} className="rounded-lg border px-3 py-2" />
            <input type="number" placeholder="Año fundación" value={form.anio_fund} onChange={(e) => setForm({ ...form, anio_fund: +e.target.value })} className="rounded-lg border px-3 py-2" />
            <input placeholder="Líder (id investigador)" value={form.lider} onChange={(e) => setForm({ ...form, lider: e.target.value })} className="rounded-lg border px-3 py-2" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
            Crear grupo
          </button>
        </form>
      )}

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Categoría</th>
              <th className="px-4 py-3">Área</th>
              <th className="px-4 py-3">Año</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((g) => (
              <tr key={g.cod} className="border-t hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{g.cod}</td>
                <td className="px-4 py-3">{g.nombre}</td>
                <td className="px-4 py-3">{g.categoria}</td>
                <td className="px-4 py-3">{g.area}</td>
                <td className="px-4 py-3">{g.anio_fund}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-1 text-xs ${g.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                    {g.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => eliminar(g.cod)} className="text-red-600 hover:text-red-800">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {lista.length === 0 && <p className="p-6 text-center text-slate-500">No hay grupos registrados</p>}
      </div>
    </div>
  );
}