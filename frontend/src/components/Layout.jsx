import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, FileText, LogOut, Menu } from "lucide-react";
import { useState } from "react";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/grupos", label: "Grupos", icon: Users },
  { to: "/investigadores", label: "Investigadores", icon: Users },
  { to: "/productos", label: "Productos", icon: FileText },
];

export default function Layout({ children }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const logout = () => {
    localStorage.removeItem("peai_token");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 transform bg-white shadow-lg transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <span className="text-xl font-bold text-primary-700">PEA-i</span>
          <span className="text-xs text-slate-500">Plataforma</span>
        </div>
        <nav className="space-y-1 p-4">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-primary-50 text-primary-700"
                    : "text-slate-600 hover:bg-slate-100"
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-4 left-4 right-4">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={18} />
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
          <button className="lg:hidden" onClick={() => setOpen(true)}>
            <Menu size={20} />
          </button>
          <h1 className="text-lg font-semibold text-slate-800">
            Universidad Popular del Cesar
          </h1>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}