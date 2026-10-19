import { useCallback, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { investigadores } from "../services/api";
import { useColeccion, mensajeError } from "../hooks/useColeccion";
import { MensajeError, EstadoVacio } from "../components/Feedback";
import { Boton, Badge, Tabla } from "../components/ui";

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

  const eliminar = async (id) => {
    if (!window.confirm(`¿Eliminar el investigador ${id}? Esta accion no se puede deshacer.`)) return;
    try {
      await investigadores.eliminar(id);
      await recargar();
    } catch (err) {
      setErrorForm(mensajeError(err, "No se pudo eliminar el investigador"));
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

      {error && <MensajeError mensaje={error} onReintentar={() => recargar()} />}

      <Tabla
        caption="Listado de investigadores"
        cabeceras={CABECERAS}
        cargando={cargando}
        filas={5}
        vacio={
          !error && (
            <EstadoVacio
              titulo="No hay investigadores registrados"
              descripcion="Registra al primer investigador para poder asociarlo a grupos y productos."
              accion={
                <Boton onClick={abrirForm} className="mt-1">
                  <Plus size={16} aria-hidden="true" /> Crear el primero
                </Boton>
              }
            />
          )
        }
      >
        {lista.map((i) => (
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
              <Boton
                variante="dangerIcon"
                onClick={() => eliminar(i.id)}
                aria-label={`Eliminar el investigador ${i.id}`}
                title={`Eliminar ${i.id}`}
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