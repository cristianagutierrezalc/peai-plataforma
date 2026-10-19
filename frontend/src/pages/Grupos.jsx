import { useCallback, useState } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import { grupos } from "../services/api";
import { useColeccion, mensajeError } from "../hooks/useColeccion";
import { MensajeError, EstadoVacio } from "../components/Feedback";
import { Boton, Badge, Tabla } from "../components/ui";
import Formulario from "../components/Formulario";

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

/** Campos de edicion. `lider` queda fuera: es una clave foranea. */
const CAMPOS_EDICION = [
  { name: "nombre", etiqueta: "Nombre", required: true },
  { name: "categoria", etiqueta: "Categoría", tipo: "select", opciones: CATEGORIAS },
  { name: "area", etiqueta: "Área" },
  { name: "anio_fund", etiqueta: "Año de fundación", tipo: "number" },
  { name: "activo", etiqueta: "Activo", tipo: "select", opciones: ["true", "false"] },
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
  const [editando, setEditando] = useState(null);
  const [busqueda, setBusqueda] = useState("");

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

  const guardarEdicion = async (cambios) => {
    // El select de activo entrega "true"/"false" como texto.
    if (typeof cambios.activo === "string") {
      cambios.activo = cambios.activo === "true";
    }
    await grupos.actualizar(editando.cod, cambios);
    setEditando(null);
    await recargar();
  };

  const eliminar = async (cod) => {
    if (!window.confirm(`¿Eliminar el grupo ${cod}? Esta accion no se puede deshacer.`)) return;
    try {
      await grupos.eliminar(cod);
      if (editando?.cod === cod) setEditando(null);
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

  // Filtro local por codigo, nombre o area. No hace falta ir al servidor
  // porque la lista ya esta en memoria.
  const filtrada = lista.filter((g) => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return true;
    return [g.cod, g.nombre, g.area, g.categoria].some((v) =>
      String(v ?? "").toLowerCase().includes(q)
    );
  });

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

      {editando && (
        <Formulario
          titulo={`Editando ${editando.cod}`}
          campos={CAMPOS_EDICION}
          valoresIniciales={{
            nombre: editando.nombre,
            categoria: editando.categoria,
            area: editando.area || "",
            anio_fund: editando.anio_fund || 0,
            activo: String(editando.activo ?? true),
          }}
          onGuardar={guardarEdicion}
          onCancelar={() => setEditando(null)}
        />
      )}

      {error && <MensajeError mensaje={error} onReintentar={() => recargar()} />}

      {!cargando && lista.length > 3 && (
        <div>
          <label htmlFor="g-buscar" className="label">Buscar</label>
          <input
            id="g-buscar"
            className="input"
            placeholder="Código, nombre, área o categoría"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
      )}

      <Tabla
        caption="Listado de grupos de investigación"
        cabeceras={CABECERAS}
        cargando={cargando}
        filas={5}
        vacio={
          !error && (
            <EstadoVacio
              titulo={busqueda ? "Ningún grupo coincide con la búsqueda" : "No hay grupos registrados"}
              descripcion={
                busqueda
                  ? `No se encontró nada para "${busqueda}". Prueba con otro texto.`
                  : "Crea el primer grupo de investigación para empezar a construir el registro."
              }
              accion={
                busqueda ? (
                  <button
                    type="button"
                    onClick={() => setBusqueda("")}
                    className="btn min-h-[44px] mt-1"
                  >
                    Limpiar búsqueda
                  </button>
                ) : (
                  <Boton onClick={abrirForm} className="mt-1">
                    <Plus size={16} aria-hidden="true" /> Crear el primero
                  </Boton>
                )
              }
            />
          )
        }
      >
        {filtrada.map((g) => (
          <tr key={g.cod}>
            <td className="nowrap font-medium">{g.cod}</td>
            <td>{g.nombre}</td>
            <td className="nowrap">{g.categoria}</td>
            <td>{g.area || "—"}</td>
            <td className="nowrap text-right">{g.anio_fund || "—"}</td>
            <td className="text-center"><Badge activo={g.activo} /></td>
            <td className="text-right">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setEditando(g)}
                  aria-label={`Editar el grupo ${g.cod}`}
                  title={`Editar ${g.cod}`}
                  className="btn-danger-icon hover:bg-primary-subtle hover:text-primary"
                >
                  <Pencil size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => eliminar(g.cod)}
                  aria-label={`Eliminar el grupo ${g.cod}`}
                  title={`Eliminar ${g.cod}`}
                  className="btn-danger-icon"
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </Tabla>

      {!cargando && busqueda && filtrada.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Mostrando {filtrada.length} de {lista.length} grupos.
        </p>
      )}
    </div>
  );
}