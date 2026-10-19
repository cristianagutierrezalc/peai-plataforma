import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, FileText, LogOut, Menu, X, Upload } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/grupos", label: "Grupos", icon: Users },
  { to: "/investigadores", label: "Investigadores", icon: Users },
  { to: "/productos", label: "Productos", icon: FileText },
  { to: "/importar", label: "Importar", icon: Upload },
];

export default function Layout({ children }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { usuario, cerrarSesion } = useAuth();

  const logout = () => {
    cerrarSesion();
    navigate("/login", { replace: true });
  };

  const initials = (usuario?.nombre || usuario?.username || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 transform bg-white shadow-lg transition-transform duration-normal lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Menu principal"
      >
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <span className="text-xl font-bold text-primary">PEA-i</span>
          <span className="text-xs text-muted-foreground">Plataforma</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="ml-auto rounded-lg p-2 text-muted-foreground hover:bg-muted lg:hidden"
            aria-label="Cerrar menu de navegacion"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <nav className="space-y-1 p-4">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-fast ${
                  isActive ? "bg-primary-subtle text-primary-700" : "text-slate-600 hover:bg-muted"
                }`
              }
            >
              <Icon size={18} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <button
            type="button"
            onClick={logout}
            className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors duration-fast hover:bg-danger-subtle hover:text-danger-fg"
          >
            <LogOut size={18} aria-hidden="true" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Overlay móvil */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Contenido */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-white px-6 shadow-sm">
          <button
            type="button"
            className="rounded-lg p-2 text-slate-600 hover:bg-muted lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Abrir menu de navegacion"
            aria-expanded={open}
          >
            <Menu size={20} aria-hidden="true" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Universidad Popular del Cesar</h1>

          {usuario && (
            <div className="ml-auto flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium text-slate-700">{usuario.nombre || usuario.username}</p>
                <p className="text-xs capitalize text-muted-foreground">{usuario.rol}</p>
              </div>
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-subtle text-sm font-semibold text-primary-700"
                aria-hidden="true"
              >
                {initials}
              </div>
            </div>
          )}
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}