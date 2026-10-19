import { useCallback, useState } from "react";
import { Plus, Trash2, Pencil, Eye } from "lucide-react";
import { investigadores } from "../services/api";
import { useColeccion, mensajeError } from "../hooks/useColeccion";
import { MensajeError, EstadoVacio } from "../components/Feedback";
import { Boton, Badge, Tabla } from "../components/ui";
import Formulario from "../components/Formulario";

const FORM_VACIO = { id: "", nombre: "", categoria: "SIN_CATEGORIA", formacion: "", email: "" };
const CATEGORIAS = ["SENIOR", "JUNIOR", "SIN_CATEGORIA"];

const CABECERAS = [
  { clave: "id", texto: "ID" },
  { clave: "nombre", texto: "Nombre" },
  { clave: "categoria", texto: "Categoría" },
  { clave: "formacion", texto: "Formación" },
  { clave: "email", texto: "Correo" },
  { clave: "activo", texto: "Estado", align: "center" },
  { clave: "acciones", texto: "Acciones", align: "right" },
];

const CAMPOS_EDICION = [
  { name: "nombre", etiqueta: "Nombre", required: true },
  { name: "categoria", etiqueta: "Categoría", tipo: "select", opciones: CATEGORIAS },
  { name: "formacion", etiqueta: "Formación" },
  { name: "email", etiqueta: "Correo institucional", tipo: "email" },
  { name: "activo", etiqueta: "Activo", tipo: "select", opciones: ["true", "false"] },
];

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
  const [editando, setEditando] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [perfil, setPerfil] = useState(null);
  const [cargandoPerfil, setCargandoPerfil] = useState(false);

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

  const guardarEdicion = async (cambios) => {
    if (typeof cambios.activo === "string") {
      cambios.activo = cambios.activo === "true";
    }
    await investigadores.actualizar(editando.id, cambios);
    setEditando(null);
    await recargar();
  };

  const eliminar = async (id) => {
    if (!window.confirm(`¿Eliminar el investigador ${id}? Esta accion no se puede deshacer.`)) return;
    try {
      await investigadores.eliminar(id);
      if (editando?.id === id) setEditando(null);
      await recargar();
    } catch (err) {
      setErrorForm(mensajeError(err, "No se pudo eliminar el investigador"));
    }
  };

  const verPerfil = async (id) => {
    setCargandoPerfil(true);
    setPerfil(null);
    try {
      const r = await investigadores.vista(id);
      setPerfil(r.data);
    } catch (err) {
      setErrorForm(mensajeError(err, "No se pudo cargar el perfil"));
    } finally {
      setCargandoPerfil(false);
    }
  };

  const abrirForm = () => {
    setErrorForm("");
    setShowForm((v) => !v);
  };

  const set = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  const filtrada = lista.filter((i) => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return true;
    return [i.id, i.nombre, i.email, i.formacion, i.categoria].some((v) =>
      String(v ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-foreground">Investigadores</h2>
        <Boton onClick={abrirForm} aria-expanded={showForm}>
          <Plus size={16} aria-hidden="true" />
          {showForm ? "Cerrar" : "Nuevo investigador"}
        </Boton>
      </div>

      {showForm && (
        <form onSubmit={crear} className="card space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="i-id" className="label">ID</label>
              <input id="i-id" className="input" placeholder="Ej: INV-001" value={form.id} onChange={set("id")} required />
            </div>
            <div>
              <label htmlFor="i-nombre" className="label">Nombre</label>
              <input id="i-nombre" className="input" placeholder="Nombre completo" value={form.nombre} onChange={set("nombre")} required />
            </div>
            <div>
              <label htmlFor="i-categoria" className="label">Categoría</label>
              <select id="i-categoria" className="input" value={form.categoria} onChange={set("categoria")}>
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="i-formacion" className="label">Formación</label>
              <input id="i-formacion" className="input" placeholder="Doctor, Magíster, Profesional..." value={form.formacion} onChange={set("formacion")} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="i-email" className="label">Correo institucional</label>
              <input id="i-email" type="email" className="input" placeholder="nombre@dominio.edu.co" value={form.email} onChange={set("email")} />
            </div>
          </div>

          {errorForm && <MensajeError mensaje={errorForm} />}

          <Boton type="submit" disabled={guardando} aria-busy={guardando}>
            {guardando ? "Guardando..." : "Crear investigador"}
          </Boton>
        </form>
      )}

      {editando && (
        <Formulario
          titulo={`Editando ${editando.id}`}
          campos={CAMPOS_EDICION}
          valoresIniciales={{
            nombre: editando.nombre,
            categoria: editando.categoria,
            formacion: editando.formacion || "",
            email: editando.email || "",
            activo: String(editando.activo ?? true),
          }}
          onGuardar={guardarEdicion}
          onCancelar={() => setEditando(null)}
        />
      )}

      {error && <MensajeError mensaje={error} onReintentar={() => recargar()} />}

      {!cargando && lista.length > 3 && (
        <div>
          <label htmlFor="i-buscar" className="label">Buscar</label>
          <input
            id="i-buscar"
            className="input"
            placeholder="ID, nombre, correo o formación"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
      )}

      <Tabla
        caption="Listado de investigadores"
        cabeceras={CABECERAS}
        cargando={cargando}
        filas={5}
        vacio={
          !error && (
            <EstadoVacio
              titulo={busqueda ? "Ningún investigador coincide con la búsqueda" : "No hay investigadores registrados"}
              descripcion={
                busqueda
                  ? `No se encontró nada para "${busqueda}". Prueba con otro texto.`
                  : "Registra al primer investigador para poder asociarlo a grupos y productos."
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
        {filtrada.map((i) => (
          <tr key={i.id}>
            <td className="nowrap font-medium">{i.id}</td>
            <td>{i.nombre}</td>
            <td className="nowrap">{i.categoria}</td>
            <td>{i.formacion || "—"}</td>
            <td>
              {i.email ? (
                <a href={`mailto:${i.email}`} className="text-primary hover:underline">
                  {i.email}
                </a>
              ) : (
                "—"
              )}
            </td>
            <td className="text-center"><Badge activo={i.activo} /></td>
            <td className="text-right">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => verPerfil(i.id)}
                  aria-label={`Ver perfil del investigador ${i.id}`}
                  title={`Ver perfil ${i.id}`}
                  className="btn-danger-icon hover:bg-primary-subtle hover:text-primary"
                >
                  <Eye size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditando(i)}
                  aria-label={`Editar el investigador ${i.id}`}
                  title={`Editar ${i.id}`}
                  className="btn-danger-icon hover:bg-primary-subtle hover:text-primary"
                >
                  <Pencil size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => eliminar(i.id)}
                  aria-label={`Eliminar el investigador ${i.id}`}
                  title={`Eliminar ${i.id}`}
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
          Mostrando {filtrada.length} de {lista.length} investigadores.
        </p>
      )}

      {/* Modal de perfil del investigador */}
      {(perfil || cargandoPerfil) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => { setPerfil(null); setCargandoPerfil(false); }}>
          <div className="card max-w-2xl w-full max-h-[80vh] overflow-auto space-y-4" onClick={(e) => e.stopPropagation()}>
            {cargandoPerfil && <p className="text-muted-foreground">Cargando perfil...</p>}
            {perfil && (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-foreground">{perfil.investigador.nombre}</h3>
                  <button type="button" onClick={() => setPerfil(null)} className="btn-danger-icon" aria-label="Cerrar perfil">
                    ✕
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div><span className="font-semibold">ID:</span> {perfil.investigador.id}</div>
                  <div><span className="font-semibold">Categoría:</span> {perfil.investigador.categoria}</div>
                  <div><span className="font-semibold">Formación:</span> {perfil.investigador.formacion || "—"}</div>
                  <div><span className="font-semibold">Correo:</span> {perfil.investigador.email || "—"}</div>
                  <div><span className="font-semibold">Estado:</span> {perfil.investigador.activo ? "Activo" : "Inactivo"}</div>
                  <div><span className="font-semibold">Productos:</span> {perfil.n_productos}</div>
                </div>
                {perfil.productos && perfil.productos.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-foreground">Productos ({perfil.n_productos})</h4>
                    <ul className="space-y-1 text-sm">
                      {perfil.productos.map((p) => (
                        <li key={p.id} className="border-b border-border pb-1">
                          <span className="font-medium">{p.titulo}</span>
                          <span className="text-muted-foreground"> — {p.tipo} ({p.anio})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {(!perfil.productos || perfil.productos.length === 0) && (
                  <p className="text-sm text-muted-foreground">Este investigador no tiene productos registrados.</p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}