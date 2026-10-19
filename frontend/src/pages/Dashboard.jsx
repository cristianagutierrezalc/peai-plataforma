import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { estadisticas } from "../services/api";

const COLORS = ["#3b82f6", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    estadisticas.global().then((r) => {
      setData(r.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="text-center py-20 text-slate-500">Cargando...</div>;
  if (!data) return <div className="text-center py-20 text-red-500">Error al cargar</div>;

  const tipoData = Object.entries(data.por_tipo || {}).map(([k, v]) => ({ name: k, value: v }));
  const anioData = Object.entries(data.por_anio || {}).map(([k, v]) => ({ name: k, value: v }));

  const kpis = [
    { label: "Productos", value: data.n_productos, color: "text-primary-600" },
    { label: "Grupos", value: data.n_grupos, color: "text-accent" },
    { label: "Investigadores", value: data.n_investigadores, color: "text-success" },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Dashboard</h2>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">{k.label}</p>
            <p className={`text-3xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Graficos */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">Productos por tipo</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={tipoData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                {tipoData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">Productos por año</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={anioData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}