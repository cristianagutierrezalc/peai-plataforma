import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Package, Users, FolderKanban } from "lucide-react";
import { estadisticas } from "../services/api";
import { mensajeError } from "../hooks/useColeccion";
import { MensajeError } from "../components/Feedback";

const COLORES = [
  "hsl(var(--blue-500))",
  "hsl(var(--sky-500))",
  "hsl(var(--emerald-500))",
  "hsl(var(--amber-500))",
  "hsl(var(--red-500))",
  "hsl(var(--blue-800))",
  "hsl(var(--blue-300))",
];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      try {
        const r = await estadisticas.global();
        if (!cancelado) {
          setData(r.data);
          setError("");
        }
      } catch (err) {
        // Antes no habia catch: si la peticion fallaba, setLoading(false)
        // nunca se ejecutaba y la pantalla se quedaba en "Cargando..."
        // para siempre, sin explicar nada.
        if (!cancelado) setError(mensajeError(err, "No se pudieron cargar las estadisticas"));
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    cargar();
    return () => {
      cancelado = true;
    };
  }, []);

  if (cargando) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3" role="status" aria-live="polite">
        <span className="sr-only">Cargando estadisticas</span>
        {[0, 1, 2].map((i) => (
          <div key={i} className="card">
            <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
            <div className="mt-3 h-9 w-16 animate-pulse rounded bg-slate-200" />
          </div>
        ))}
      </div>
    );
  }

  if (error) return <MensajeError mensaje={error} />;
  if (!data) return <MensajeError mensaje="No hay datos disponibles todavia" />;

  const tipoData = Object.entries(data.por_tipo || {}).map(([k, v]) => ({ name: k, value: v }));
  const anioData = Object.entries(data.por_anio || {})
    .map(([k, v]) => ({ name: k, value: v }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const kpis = [
    { label: "Productos", value: data.n_productos, color: "text-primary", Icon: Package },
    { label: "Grupos", value: data.n_grupos, color: "text-accent", Icon: FolderKanban },
    { label: "Investigadores", value: data.n_investigadores, color: "text-success", Icon: Users },
  ];

  const sinDatos = tipoData.length === 0 && anioData.length === 0;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {kpis.map(({ label, value, color, Icon }) => (
          <div key={label} className="card flex items-center gap-4">
            <div className={`rounded-lg bg-muted p-3 ${color}`}>
              <Icon size={22} aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className={`text-3xl font-bold ${color}`}>{value ?? 0}</p>
            </div>
          </div>
        ))}
      </div>

      {sinDatos ? (
        <div className="card py-12 text-center">
          <p className="font-medium text-slate-700">Todavia no hay datos que graficar</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Registra investigadores, grupos y productos para ver las estadisticas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="card">
            <h3 className="mb-4 text-sm font-semibold text-slate-700">Productos por tipo</h3>
            {tipoData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={tipoData} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={90}>
                    {tipoData.map((_, i) => (
                      <Cell key={i} fill={COLORES[i % COLORES.length]} />
                    ))}
                  </Pie>
                  {/* Antes se ponia label sobre cada rebanada, que imprimia
                      los nombres crudos (TRABAJO_DIRIGIDO) encima unas de
                      otras. La leyenda resuelve eso. */}
                  <Legend
                    verticalAlign="bottom"
                    height={48}
                    formatter={(v) => <span className="text-xs text-slate-600">{v.replace(/_/g, " ")}</span>}
                  />
                  <Tooltip formatter={(v, n) => [v, n.replace(/_/g, " ")]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-20 text-center text-sm text-slate-400">Sin productos registrados</p>
            )}
          </div>

          <div className="card">
            <h3 className="mb-4 text-sm font-semibold text-slate-700">Productos por año</h3>
            {anioData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={anioData}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--blue-500))" radius={[4, 4, 0, 0]} name="Productos" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-20 text-center text-sm text-slate-400">Sin productos registrados</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}