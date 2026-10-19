import { useCallback, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { grupos } from "../services/api";
import { useColeccion, mensajeError } from "../hooks/useColeccion";
import { MensajeError, EstadoVacio } from "../components/Feedback";
import { Boton, Badge, Tabla } from "../components/ui";

const FORM_VACIO = {
  cod: "",
  nombre: "",
  categoria: "SIN_CLASIFICAR",
  area: "",
  anio_fund: new Date().getFullYear(),
  lider: "",
};

const CATEGORIAS = ["A1", "A", "B", "C", "RECONOCIDO", "SIN_CLASIFICAR"];

const CABECERAS = [
  { clave: "cod", texto: "Código" },
  { clave: "nombre", texto: "Nombre" },
  { clave: "categoria", texto: "Categoría" },
  { clave: "area", texto: "Área" },
  { clave: "anio", texto: "Año", align: "right" },
  { clave: "activo", texto: "Estado", align: "center" },
  { clave: "acciones", texto: "Acciones", align: "right" },
];

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
      setErrorForm(mensajeError(err, "No se pudo eliminar el grupo"));
    }
  };

  const abrirForm = () => {
    setErrorForm("");
    setShowForm((v) => !v);
  };

  const set = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-foreground">Grupos de Investigación</h2>
        <Boton onClick={abrirForm} aria-expanded={showForm}>
          <Plus size={16} aria-hidden="true" />
          {showForm ? "Cerrar" : "Nuevo grupo"}
        </Boton>
      </div>

      {showForm && (
        <form onSubmit={crear} className="card space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="g-cod" className="label">Código</label>
              <input id="g-cod" className="input" placeholder="Ej: G-001" value={form.cod} onChange={set("cod")} required />
            </div>
            <div>
              <label htmlFor="g-nombre" className="label">Nombre</label>
              <input id="g-nombre" className="input" placeholder="Nombre del grupo" value={form.nombre} onChange={set("nombre")} required />
            </div>
            <div>
              <label htmlFor="g-categoria" className="label">Categoría</label>
              <select id="g-categoria" className="input" value={form.categoria} onChange={set("categoria")}>
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="g-area" className="label">Área</label>
              <input id="g-area" className="input" placeholder="Área de investigación" value={form.area} onChange={set("area")} />
            </div>
            <div>
              <label htmlFor="g-anio" className="label">Año de fundación</label>
              <input id="g-anio" type="number" className="input" value={form.anio_fund} onChange={set("anio_fund")} />
            </div>
            <div>
              <label htmlFor="g-lider" className="label">Líder</label>
              <input id="g-lider" className="input" placeholder="ID del investigador" value={form.lider} onChange={set("lider")} />
            </div>
          </div>

          {errorForm && <MensajeError mensaje={errorForm} />}

          <Boton type="submit" disabled={guardando} aria-busy={guardando}>
            {guardando ? "Guardando..." : "Crear grupo"}
          </Boton>
        </form>
      )}

      {error && <MensajeError mensaje={error} onReintentar={() => recargar()} />}

      <Tabla
        caption="Listado de grupos de investigación"
        cabeceras={CABECERAS}
        cargando={cargando}
        filas={5}
        vacio={
          !error && (
            <EstadoVacio
              titulo="No hay grupos registrados"
              descripcion="Crea el primer grupo de investigación para empezar a construir el registro."
              accion={
                <Boton onClick={abrirForm} className="mt-1">
                  <Plus size={16} aria-hidden="true" /> Crear el primero
                </Boton>
              }
            />
          )
        }
      >
        {lista.map((g) => (
          <tr key={g.cod}>
            <td className="nowrap font-medium">{g.cod}</td>
            <td>{g.nombre}</td>
            <td className="nowrap">{g.categoria}</td>
            <td>{g.area || "—"}</td>
            <td className="nowrap text-right">{g.anio_fund || "—"}</td>
            <td className="text-center"><Badge activo={g.activo} /></td>
            <td className="text-right">
              <Boton
                variante="dangerIcon"
                onClick={() => eliminar(g.cod)}
                aria-label={`Eliminar el grupo ${g.cod}`}
                title={`Eliminar ${g.cod}`}
              >
                <Trash2 size={16} aria-hidden="true" />
              </Boton>
            </td>
          </tr>
        ))}
      </Tabla>
    </div>
  );
}