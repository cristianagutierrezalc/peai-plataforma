import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import { productos, grupos, investigadores } from "../services/api";
import { useColeccion, mensajeError } from "../hooks/useColeccion";
import { MensajeError, EstadoVacio, MensajeAviso } from "../components/Feedback";
import { Boton, Badge, Tabla } from "../components/ui";
import Formulario from "../components/Formulario";

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

const CABECERAS = [
  { clave: "id", texto: "ID" },
  { clave: "titulo", texto: "Título" },
  { clave: "tipo", texto: "Tipo" },
  { clave: "anio", texto: "Año", align: "right" },
  { clave: "validacion", texto: "Validación" },
  { clave: "grupo", texto: "Grupo" },
  { clave: "activo", texto: "Estado", align: "center" },
  { clave: "acciones", texto: "Acciones", align: "right" },
];

export default function Productos() {
  const cargarProductos = useCallback(async () => {
    const r = await productos.listar();
    return r.data;
  }, []);

  const { lista, cargando, error, recargar } = useColeccion(cargarProductos);

  // Las listas auxiliares alimentan los desplegables del formulario.
  // Si fallan se avisa, pero no se bloquea la pagina.
  const [gruposList, setGruposList] = useState([]);
  const [invsList, setInvsList] = useState([]);
  const [avisoAux, setAvisoAux] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(formVacio);
  const [errorForm, setErrorForm] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [editando, setEditando] = useState(null);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    let cancelado = false;

    async function cargarAuxiliares() {
      const pendientes = [];
      try {
        const r = await grupos.listar();
        if (!cancelado) setGruposList(r.data || []);
      } catch {
        pendientes.push("los grupos");
      }
      try {
        const r = await investigadores.listar();
        if (!cancelado) setInvsList(r.data || []);
      } catch {
        pendientes.push("los investigadores");
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

  const guardarEdicion = async (cambios) => {
    if (typeof cambios.activo === "string") {
      cambios.activo = cambios.activo === "true";
    }
    await productos.actualizar(editando.id, cambios);
    setEditando(null);
    await recargar();
  };

  const eliminar = async (id) => {
    if (!window.confirm(`¿Eliminar el producto ${id}? Esta accion no se puede deshacer.`)) return;
    try {
      await productos.eliminar(id);
      if (editando?.id === id) setEditando(null);
      await recargar();
    } catch (err) {
      setErrorForm(mensajeError(err, "No se pudo eliminar el producto"));
    }
  };

  // Los campos de edicion se arman aqui porque el desplegable de grupo
  // necesita la lista de grupos y la de autores la de investigadores.
  const camposEdicion = [
    { name: "titulo", etiqueta: "Título", required: true, anchoCompleto: true },
    { name: "tipo", etiqueta: "Tipo", tipo: "select", opciones: TIPOS },
    { name: "categoria", etiqueta: "Categoría" },
    { name: "validacion", etiqueta: "Validación", tipo: "select", opciones: VALIDACIONES },
    { name: "anio", etiqueta: "Año", tipo: "number" },
    {
      name: "grupo_cod",
      etiqueta: "Grupo de investigación",
      tipo: "select",
      opciones: gruposList.map((g) => g.cod),
    },
    { name: "activo", etiqueta: "Activo", tipo: "select", opciones: ["true", "false"] },
    {
      name: "autores",
      etiqueta: "Autores",
      tipo: "chips",
      anchoCompleto: true,
      // Se muestra el nombre, pero lo que se guarda es el ID.
      opciones: invsList.map((i) => ({ valor: i.id, texto: i.nombre })),
    },
  ];

  const filtrada = lista.filter((p) => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return true;
    return [p.id, p.titulo, p.tipo, p.grupo_cod, p.categoria].some((v) =>
      String(v ?? "").toLowerCase().includes(q)
    );
  });

  const abrirForm = () => {
    setErrorForm("");
    setShowForm((v) => !v);
  };

  const set = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-foreground">Productos de Investigación</h2>
        <Boton onClick={abrirForm} aria-expanded={showForm}>
          <Plus size={16} aria-hidden="true" />
          {showForm ? "Cerrar" : "Nuevo producto"}
        </Boton>
      </div>

      {avisoAux && <MensajeAviso>{avisoAux}</MensajeAviso>}

      {showForm && (
        <form onSubmit={crear} className="card space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="p-id" className="label">ID</label>
              <input id="p-id" className="input" placeholder="Ej: PROD-001" value={form.id} onChange={set("id")} required />
            </div>
            <div>
              <label htmlFor="p-titulo" className="label">Título</label>
              <input id="p-titulo" className="input" placeholder="Título del producto" value={form.titulo} onChange={set("titulo")} required />
            </div>
            <div>
              <label htmlFor="p-tipo" className="label">Tipo</label>
              <select id="p-tipo" className="input" value={form.tipo} onChange={set("tipo")}>
                {TIPOS.map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="p-categoria" className="label">Categoría</label>
              <input id="p-categoria" className="input" placeholder="Categoría" value={form.categoria} onChange={set("categoria")} />
            </div>
            <div>
              <label htmlFor="p-validacion" className="label">Validación</label>
              <select id="p-validacion" className="input" value={form.validacion} onChange={set("validacion")}>
                {VALIDACIONES.map((v) => (
                  <option key={v} value={v}>{v.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="p-anio" className="label">Año</label>
              <input id="p-anio" type="number" className="input" value={form.anio} onChange={set("anio")} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="p-grupo" className="label">Grupo de investigación</label>
              <select id="p-grupo" className="input" value={form.grupo_cod} onChange={set("grupo_cod")}>
                <option value="">Sin grupo</option>
                {gruposList.map((g) => (
                  <option key={g.cod} value={g.cod}>{g.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <fieldset>
            <legend className="label">Autores</legend>
            {invsList.length === 0 ? (
              <p className="text-sm text-slate-400">Todavia no hay investigadores registrados.</p>
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
                      className={`min-h-[36px] rounded-full px-3 text-xs font-medium transition-colors duration-fast ${
                        seleccionado
                          ? "bg-primary text-white"
                          : "bg-muted text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {i.nombre}
                    </button>
                  );
                })}
              </div>
            )}
            {form.autores.length > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                {form.autores.length} autor{form.autores.length === 1 ? "" : "es"} seleccionado
                {form.autores.length === 1 ? "" : "s"}
              </p>
            )}
          </fieldset>

          {errorForm && <MensajeError mensaje={errorForm} />}

          <Boton type="submit" disabled={guardando} aria-busy={guardando}>
            {guardando ? "Guardando..." : "Crear producto"}
          </Boton>
        </form>
      )}

      {editando && (
        <Formulario
          titulo={`Editando ${editando.id}`}
          campos={camposEdicion}
          valoresIniciales={{
            titulo: editando.titulo,
            tipo: editando.tipo,
            categoria: editando.categoria || "",
            validacion: editando.validacion,
            anio: editando.anio || 0,
            grupo_cod: editando.grupo_cod || "",
            activo: String(editando.activo ?? true),
            autores: editando.autores || [],
          }}
          onGuardar={guardarEdicion}
          onCancelar={() => setEditando(null)}
        />
      )}

      {error && <MensajeError mensaje={error} onReintentar={() => recargar()} />}

      {!cargando && lista.length > 3 && (
        <div>
          <label htmlFor="p-buscar" className="label">Buscar</label>
          <input
            id="p-buscar"
            className="input"
            placeholder="ID, título, tipo o grupo"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
      )}

      <Tabla
        caption="Listado de productos de investigación"
        cabeceras={CABECERAS}
        cargando={cargando}
        filas={6}
        vacio={
          !error && (
            <EstadoVacio
              titulo={busqueda ? "Ningún producto coincide con la búsqueda" : "No hay productos registrados"}
              descripcion={
                busqueda
                  ? `No se encontró nada para "${busqueda}". Prueba con otro texto.`
                  : "Registra el primer producto de investigación para alimentar las estadísticas."
              }
              accion={
                busqueda ? (
                  <button type="button" onClick={() => setBusqueda("")} className="btn min-h-[44px] mt-1">
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
        {filtrada.map((p) => (
          <tr key={p.id}>
            <td className="nowrap font-medium">{p.id}</td>
            <td className="max-w-xs truncate" title={p.titulo}>{p.titulo}</td>
            <td className="nowrap">{p.tipo?.replace(/_/g, " ")}</td>
            <td className="nowrap text-right">{p.anio || "—"}</td>
            <td className="nowrap">{p.validacion?.replace(/_/g, " ")}</td>
            <td className="nowrap">{p.grupo_cod || "—"}</td>
            <td className="text-center"><Badge ativo={p.activo} /></td>
            <td className="text-right">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setEditando(p)}
                  aria-label={`Editar el producto ${p.id}`}
                  title={`Editar ${p.id}`}
                  className="btn-danger-icon hover:bg-primary-subtle hover:text-primary"
                >
                  <Pencil size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => eliminar(p.id)}
                  aria-label={`Eliminar el producto ${p.id}`}
                  title={`Eliminar ${p.id}`}
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
          Mostrando {filtrada.length} de {lista.length} productos.
        </p>
      )}
    </div>
  );
}