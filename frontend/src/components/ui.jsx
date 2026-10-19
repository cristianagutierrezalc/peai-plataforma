/**
 * Primitivas de interfaz.
 *
 * Antes cada pagina repetia la misma cadena de clases:
 *   "flex min-h-[44px] items-center gap-2 rounded-lg bg-primary-600 px-4
 *    py-2 text-sm font-medium text-white hover:bg-primary-700"
 *
 * Eso hacia que cambiar el boton principal significara editar 5 archivos,
 * y era la causa de que algunos tuvieran 44px de area tactil y otros no.
 * Ahora la especificacion vive en index.css (capa de componentes) y aqui
 * solo se envuelve lo que necesita estado de React.
 */
import { Children, forwardRef } from "react";

/* -------------------------------------------------------------------------- */
/* Botones                                                                    */
/* -------------------------------------------------------------------------- */

const VARIANTES = {
  primary: "btn btn-primary",
  ghost: "btn btn-ghost",
  dangerIcon: "btn-danger-icon",
};

export const Boton = forwardRef(function Boton(
  { variante = "primary", className = "", type = "button", children, ...props },
  ref
) {
  return (
    <button ref={ref} type={type} className={`${VARIANTES[variante]} ${className}`} {...props}>
      {children}
    </button>
  );
});

/* -------------------------------------------------------------------------- */
/* Badge de estado                                                            */
/* -------------------------------------------------------------------------- */

export function Badge({ activo, children }) {
  return (
    <span className={`badge ${activo ? "badge-success" : "badge-neutral"}`}>
      {children ?? (activo ? "Activo" : "Inactivo")}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Campo de formulario con label                                               */
/* -------------------------------------------------------------------------- */

export function Campo({ id, label, error, className = "", children }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
      </label>
      {typeof children === "function" ? children({ id, error }) : children}
      {error && (
        <p role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Badge neutro para etiquetas de catalogo                                     */
/* -------------------------------------------------------------------------- */

export function Etiqueta({ children, tono = "primary" }) {
  const tonos = {
    primary: "bg-primary-subtle text-primary-700",
    neutral: "bg-muted text-muted-foreground",
  };
  return <span className={`badge ${tonos[tono]}`}>{children}</span>;
}

/* -------------------------------------------------------------------------- */
/* Tabla con esqueleto de carga integrado                                     */
/* -------------------------------------------------------------------------- */

export function Tabla({ caption, cabeceras, cargando, filas = 5, children, vacio }) {
  // El estado vacio solo tiene sentido si no hay filas. Si no se comprueba
  // aqui, aparece debajo de una tabla con datos.
  const hayFilas = Children.count(children) > 0;

  return (
    <div className="table-wrap">
      <table className="table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {cabeceras.map((c) => (
              <th
                key={c.clave ?? c}
                scope="col"
                className={c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : ""}
              >
                {c.texto ?? c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cargando ? (
            Array.from({ length: filas }).map((_, f) => (
              <tr key={f} className="border-t">
                {cabeceras.map((c, i) => (
                  <td key={i}>
                    <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
                  </td>
                ))}
              </tr>
            ))
          ) : (
            children
          )}
        </tbody>
      </table>
      {!cargando && !hayFilas && vacio}
    </div>
  );
}