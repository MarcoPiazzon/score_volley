import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const NAV = [
  { to: '/dashboard', icon: '⊞', label: 'Dashboard' },
  { to: '/matches',   icon: '🏐', label: 'Partite'   },
  { to: '/players',   icon: '👤', label: 'Giocatori' },
  { to: '/stats',     icon: '◉',  label: 'Statistiche' },
];

export default function AppShell({ children, title = '' }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      {/* ── Sidebar ───────────────────────────────────────────── */}
      <aside className="w-16 lg:w-56 flex flex-col bg-surf1 border-r border-white/7 flex-shrink-0">
        {/* Logo */}
        <div className="h-14 flex items-center px-3 lg:px-4 border-b border-white/7 gap-3">
          <span className="text-2xl">🏐</span>
          <span className="hidden lg:block font-condensed font-bold text-lg text-text tracking-wide">
            VOLLEYBALL
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {NAV.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-2 py-2.5 rounded-xl transition-all duration-150
                 font-condensed text-sm font-medium
                 ${isActive
                   ? 'bg-teamA/15 text-teamA border border-teamA/20'
                   : 'text-muted hover:text-text hover:bg-surf2'
                 }`
              }
            >
              <span className="text-base w-6 text-center flex-shrink-0">{icon}</span>
              <span className="hidden lg:block">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User + Logout */}
        <div className="p-2 border-t border-white/7">
          <div className="flex items-center gap-2 px-2 py-2">
            <div className="w-7 h-7 rounded-full bg-teamA/20 flex items-center justify-center
                            text-teamA text-xs font-bold flex-shrink-0">
              {user?.name?.[0] ?? user?.username?.[0] ?? '?'}
            </div>
            <div className="hidden lg:block min-w-0">
              <p className="text-text text-xs font-medium truncate">
                {user?.name ? `${user.name} ${user.surname}` : user?.username}
              </p>
              <p className="text-subtle text-[10px] capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-2 py-2 rounded-xl
                       text-muted hover:text-red hover:bg-red/10 transition-all
                       font-condensed text-sm"
          >
            <span className="text-base w-6 text-center flex-shrink-0">⎋</span>
            <span className="hidden lg:block">Logout</span>
          </button>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        {title && (
          <header className="h-14 flex items-center px-5 border-b border-white/7 bg-surf1 flex-shrink-0">
            <h1 className="font-condensed font-bold text-xl text-text tracking-wide">{title}</h1>
          </header>
        )}

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
