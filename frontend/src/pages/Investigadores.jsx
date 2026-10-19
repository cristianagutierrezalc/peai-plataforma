import { useEffect, useState } from "react";
import { investigadores } from "../services/api";
import { Plus, Trash2 } from "lucide-react";

export default function Investigadores() {
  const [lista, setLista] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ id: "", nombre: "", categoria: "SIN_CATEGORIA", formacion: "", email: "" });
  const [error, setError] = useState("");

  const cargar = () => investigadores.listar().then((r) => setLista(r.data)).catch(() => {});
  useEffect(cargar, []);

  const crear = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await investigadores.crear(form);
      setShowForm(false);
      setForm({ id: "", nombre: "", categoria: "SIN_CATEGORIA", formacion: "", email: "" });
      cargar();
    } catch (err) {
      setError(err.response?.data?.detail || "Error al crear");
    }
  };

  const eliminar = async (id) => {
    if (!confirm(`¿Eliminar el investigador ${id}?`)) return;
    await investigadores.eliminar(id);
    cargar();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Investigadores</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Plus size={16} /> Nuevo investigador
        </button>
      </div>

      {showForm && (
        <form onSubmit={crear} className="rounded-xl bg-white p-6 shadow-sm space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input placeholder="ID" value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} className="rounded-lg border px-3 py-2" required />
            <input placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="rounded-lg border px-3 py-2" required />
            <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className="rounded-lg border px-3 py-2">
              {["SENIOR", "JUNIOR", "SIN_CATEGORIA"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <input placeholder="Formación" value={form.formacion} onChange={(e) => setForm({ ...form, formacion: e.target.value })} className="rounded-lg border px-3 py-2" />
            <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-lg border px-3 py-2" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
            Crear investigador
          </button>
        </form>
      )}

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Categoría</th>
              <th className="px-4 py-3">Formación</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((i) => (
              <tr key={i.id} className="border-t hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{i.id}</td>
                <td className="px-4 py-3">{i.nombre}</td>
                <td className="px-4 py-3">{i.categoria}</td>
                <td className="px-4 py-3">{i.formacion}</td>
                <td className="px-4 py-3">{i.email}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-1 text-xs ${i.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                    {i.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => eliminar(i.id)} className="text-red-600 hover:text-red-800">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {lista.length === 0 && <p className="p-6 text-center text-slate-500">No hay investigadores registrados</p>}
      </div>
    </div>
  );
}