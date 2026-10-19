import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import { Package, Users, FolderKanban, Calendar } from "lucide-react";
import { estadisticas, grupos as gruposApi, investigadores as invApi } from "../services/api";
import { mensajeError } from "../hooks/useColeccion";
import { MensajeError, EstadoVacio } from "../components/Feedback";
import { Boton } from "../components/ui";

const COLORES = [
  "hsl(var(--blue-500))", "hsl(var(--sky-500))", "hsl(var(--emerald-500))",
  "hsl(var(--amber-500))", "hsl(var(--red-500))", "hsl(var(--blue-800))",
  "hsl(var(--blue-300))",
];

/** Opciones de ventana de observacion (requisito 10). */
const VENTANAS = [
  { valor: "", texto: "Todos los años" },
  { valor: "2", texto: "Últimos 2 años" },
  { valor: "3", texto: "Últimos 3 años" },
  { valor: "5", texto: "Últimos 5 años" },
  { valor: "10", texto: "Últimos 10 años" },
];

const VISTAS = [
  { clave: "global", texto: "Por productos" },
  { clave: "grupo", texto: "Por grupo" },
  { clave: "investigador", texto: "Por investigador" },
];

export default function Dashboard() {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [ventana, setVentana] = useState("");
  const [vista, setVista] = useState("global");
  const [seleccion, setSeleccion] = useState("");
  const [detalle, setDetalle] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [opciones, setOpciones] = useState({ grupos: [], investigadores: [] });

  // Los listados de grupos e investigadores alimentan los desplegables de
  // las vistas por grupo y por investigador.
  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const [g, i] = await Promise.all([gruposApi.listar(), invApi.listar()]);
        if (!cancelado) setOpciones({ grupos: g.data || [], investigadores: i.data || [] });
      } catch {
        // Si fallan, las vistas por entidad quedan sin opciones y el
        // resumen global sigue funcionando.
      }
    })();
    return () => { cancelado = true; };
  }, []);

  // El filtro de ventana se convierte en parametros de consulta. Se
  // memoiza para que el efecto de carga no se dispare en cada render.
  const params = useMemo(() => (ventana ? { ventana } : {}), [ventana]);

  const recargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const r = await estadisticas.global(params);
      setDatos(r.data);
    } catch (err) {
      setError(mensajeError(err, "No se pudieron cargar las estadísticas"));
    } finally {
      setCargando(false);
    }
  }, [params]);

  useEffect(() => {
    let cancelado = false;
    // El cuerpo va dentro del efecto para que setState no se llame de
    // forma sincronica durante el render.
    (async () => {
      try {
        const r = await estadisticas.global(params);
        if (!cancelado) {
          setDatos(r.data);
          setError("");
        }
      } catch (err) {
        if (!cancelado) setError(mensajeError(err, "No se pudieron cargar las estadísticas"));
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();
    return () => { cancelado = true; };
  }, [params]);

  const abrirDetalle = async (tipo, id) => {
    setVista(tipo);
    setSeleccion(id);
    setCargandoDetalle(true);
    setDetalle(null);
    try {
      const r =
        tipo === "grupo"
          ? await estadisticas.grupo(id, params())
          : await estadisticas.investigador(id, params());
      setDetalle(r.data);
    } catch (err) {
      setError(mensajeError(err, "No se pudo cargar el detalle"));
    } finally {
      setCargandoDetalle(false);
    }
  };

  const volver = () => {
    setVista("global");
    setSeleccion("");
    setDetalle(null);
  };

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

  if (error && !datos) return <MensajeError mensaje={error} onReintentar={recargar} />;
  if (!datos) return <MensajeError mensaje="No hay datos disponibles todavia" />;

  const tipoData = Object.entries(datos.por_tipo || {}).map(([k, v]) => ({ name: k, value: v }));
  const anioData = Object.entries(datos.por_anio || {})
    .map(([k, v]) => ({ name: k, value: v }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const validacionData = Object.entries(datos.por_validacion || {}).map(([k, v]) => ({ name: k, value: v }));
  const grupoData = Object.entries(datos.por_grupo || {})
    .map(([k, v]) => ({ name: k, value: v }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);

  const kpis = [
    { label: "Productos", value: datos.n_productos, color: "text-primary", Icon: Package },
    { label: "Grupos", value: datos.n_grupos, color: "text-accent", Icon: FolderKanban },
    { label: "Investigadores", value: datos.n_investigadores, color: "text-success", Icon: Users },
  ];

  const sinDatos = tipoData.length === 0 && anioData.length === 0;
  const rango = datos.ventana?.desde || datos.ventana?.hasta
    ? `${datos.ventana.desde ?? "…"} – ${datos.ventana.hasta ?? "…"}`
    : null;

  // ---- Vista de detalle: un grupo o un investigador ----
  if (vista !== "global") {
    const listaOpciones = vista === "grupo" ? opciones.grupos : opciones.investigadores;
    const tituloDetalle = detalle
      ? detalle.grupo?.nombre || detalle.investigador?.nombre || ""
      : "";

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Boton variante="ghost" onClick={volver} className="mb-1">← Volver al resumen</Boton>
            <h2 className="text-2xl font-bold text-foreground">
              {vista === "grupo" ? "Vista por grupo" : "Vista por investigador"}
            </h2>
          </div>
          <div>
            <label htmlFor="sel-entity" className="label">Seleccionar</label>
            <select
              id="sel-entity"
              className="input sm:w-72"
              value={seleccion}
              onChange={(e) => e.target.value && abrirDetalle(vista, e.target.value)}
            >
              <option value="">Elegir {vista === "grupo" ? "un grupo" : "un investigador"}…</option>
              {listaOpciones.map((o) => (
                <option key={o.cod || o.id} value={o.cod || o.id}>
                  {o.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        {rango && (
          <p className="text-sm text-muted-foreground">
            Ventana de observación: {rango}
            <button type="button" onClick={volver} className="ml-2 text-primary hover:underline">
              cambiar
            </button>
          </p>
        )}

        {cargandoDetalle && <MensajeError mensaje="Cargando detalle..." compacto />}

        {detalle && (
          <>
            <div className="card">
              <h3 className="font-semibold text-foreground">{tituloDetalle}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {detalle.n_productos} producto{detalle.n_productos === 1 ? "" : "s"}
                {detalle.ventana?.desde && ` entre ${detalle.ventana.desde} y ${detalle.ventana.hasta ?? "hoy"}`}
              </p>
            </div>

            <div className="card">
              <h4 className="mb-4 text-sm font-semibold text-slate-700">Productos</h4>
              {detalle.productos?.length ? (
                <div className="table-wrap !shadow-none !rounded-lg border border-border">
                  <table className="table">
                    <thead>
                      <tr>
                        <th scope="col">ID</th>
                        <th scope="col">Título</th>
                        <th scope="col">Tipo</th>
                        <th scope="col" className="text-right">Año</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalle.productos.map((p) => (
                        <tr key={p.id}>
                          <td className="nowrap font-medium">{p.id}</td>
                          <td>{p.titulo}</td>
                          <td className="nowrap">{p.tipo?.replace(/_/g, " ")}</td>
                          <td className="nowrap text-right">{p.anio || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Este {vista} no tiene productos en el periodo seleccionado.
                </p>
              )}
            </div>
          </>
        )}

        {!detalle && !cargandoDetalle && (
          <EstadoVacio
            titulo="Elige un elemento"
            descripcion={`Selecciona ${vista === "grupo" ? "un grupo" : "un investigador"} del listado para ver sus productos.`}
          />
        )}
      </div>
    );
  }

  // ---- Vista global ----
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="f-ventana" className="label">Ventana de observación</label>
            <select
              id="f-ventana"
              className="input sm:w-48"
              value={ventana}
              onChange={(e) => setVentana(e.target.value)}
            >
              {VENTANAS.map((v) => (
                <option key={v.valor} value={v.valor}>{v.texto}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="f-vista" className="label">Ver</label>
            <select
              id="f-vista"
              className="input sm:w-48"
              value="global"
              onChange={(e) => {
                if (e.target.value === "global") volver();
                else {
                  setVista(e.target.value);
                  setSeleccion("");
                }
              }}
            >
              {VISTAS.map((v) => (
                <option key={v.clave} value={v.clave}>{v.texto}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && <MensajeError mensaje={error} onReintentar={recargar} compacto />}

      {rango && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar size={14} aria-hidden="true" />
          Mostrando datos de {rango}
        </p>
      )}

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
          <p className="font-medium text-slate-700">No hay datos en el periodo seleccionado</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {ventana
              ? "Prueba con una ventana más amplia o con 'Todos los años'."
              : "Registra investigadores, grupos y productos para ver las estadísticas."}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="card">
              <h3 className="mb-4 text-sm font-semibold text-slate-700">Productos por tipo</h3>
              {tipoData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={tipoData} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={90}>
                      {tipoData.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
                    </Pie>
                    <Legend verticalAlign="bottom" height={48}
                      formatter={(v) => <span className="text-xs text-slate-600">{v.replace(/_/g, " ")}</span>} />
                    <Tooltip formatter={(v, n) => [v, n.replace(/_/g, " ")]} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-20 text-center text-sm text-slate-400">Sin datos</p>
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
                <p className="py-20 text-center text-sm text-slate-400">Sin datos</p>
              )}
            </div>

            <div className="card">
              <h3 className="mb-4 text-sm font-semibold text-slate-700">Estado de validación</h3>
              {validacionData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={validacionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                      {validacionData.map((_, i) => <Cell key={i} fill={COLORES[(i + 2) % COLORES.length]} />)}
                    </Pie>
                    <Legend verticalAlign="bottom" height={40}
                      formatter={(v) => <span className="text-xs text-slate-600">{v.replace(/_/g, " ")}</span>} />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-16 text-center text-sm text-slate-400">Sin datos</p>
              )}
            </div>

            <div className="card">
              <h3 className="mb-4 text-sm font-semibold text-slate-700">Producción por grupo</h3>
              {grupoData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={grupoData} layout="vertical">
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(var(--emerald-500))" radius={[0, 4, 4, 0]} name="Productos" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-16 text-center text-sm text-slate-400">Sin datos</p>
              )}
            </div>
          </div>

          {grupoData.length > 0 && (
            <div className="card">
              <h3 className="mb-4 text-sm font-semibold text-slate-700">Comparar grupos</h3>
              <p className="mb-3 text-sm text-muted-foreground">
                Selecciona dos grupos para ver su evolución por año.
              </p>
              <Comparador grupos={opciones.grupos} ventana={ventana} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Comparador de dos grupos: evolución anual de sus productos. */
function Comparador({ grupos, ventana }) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [serie, setSerie] = useState([]);
  // Si falta una de las dos selecciones no hay nada que comparar. Se deriva
  // en el render en lugar de un efecto, para no disparar un render extra.
  const comparar = Boolean(a && b);
  const serieVigente = comparar ? serie : [];

  useEffect(() => {
    let cancelado = false;
    if (!a || !b) {
      // Sin comparacion no hay serie. Se limpia en el render en vez de
      // llamar a setSerie dentro del efecto.
      return;
    }
    (async () => {
      try {
        const params = ventana ? { ventana } : {};
        const [ra, rb] = await Promise.all([
          estadisticas.grupo(a, params),
          estadisticas.grupo(b, params),
        ]);
        if (cancelado) return;
        const anios = [
          ...new Set([
            ...ra.data.productos.map((p) => p.anio),
            ...rb.data.productos.map((p) => p.anio),
          ]),
        ].filter(Boolean).sort();
        setSerie(
          anios.map((anio) => ({
            anio,
            [a]: ra.data.productos.filter((p) => p.anio === anio).length,
            [b]: rb.data.productos.filter((p) => p.anio === anio).length,
          }))
        );
      } catch {
        if (!cancelado) setSerie([]);
      }
    })();
    return () => { cancelado = true; };
  }, [a, b, ventana]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="cmp-a" className="label">Grupo A</label>
          <select id="cmp-a" className="input" value={a} onChange={(e) => setA(e.target.value)}>
            <option value="">Elegir…</option>
            {grupos.filter((g) => g.cod !== b).map((g) => (
              <option key={g.cod} value={g.cod}>{g.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="cmp-b" className="label">Grupo B</label>
          <select id="cmp-b" className="input" value={b} onChange={(e) => setB(e.target.value)}>
            <option value="">Elegir…</option>
            {grupos.filter((g) => g.cod !== a).map((g) => (
              <option key={g.cod} value={g.cod}>{g.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {serieVigente.length > 0 ? (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={serieVigente}>
            <XAxis dataKey="anio" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey={a} stroke="hsl(var(--blue-500))" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey={b} stroke="hsl(var(--emerald-500))" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {a && b ? "Los grupos no tienen productos en el periodo seleccionado." : "Elige dos grupos para comparar."}
        </p>
      )}
    </div>
  );
}