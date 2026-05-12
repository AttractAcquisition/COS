import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { ROUTE_CONFIG } from '../lib/route-config'
import { Home, LogOut, Menu, X } from 'lucide-react'

export default function Layout() {
  const { role, signOut } = useAuth()
  const location = useLocation()
  const logoSrc = `${import.meta.env.BASE_URL}logo.svg`
  const [drawerOpen, setDrawerOpen] = useState(false)

  const routes = Object.values(ROUTE_CONFIG).filter(route => route.roles.includes((role || 'client') as any))
  const activeHome = location.pathname === '/' || location.pathname === '/dashboard'

  function closeDrawer() { setDrawerOpen(false) }

  function NavLinks() {
    return (
      <>
        {role !== 'distribution' && role !== 'delivery' && (
          <div style={{ display: 'grid', gap: 8, marginBottom: 18 }}>
            <Link
              to="/"
              onClick={closeDrawer}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 12, textDecoration: 'none',
                border: `1px solid ${activeHome ? 'var(--teal)' : 'var(--border2)'}`,
                background: activeHome ? 'rgba(0,229,195,0.05)' : 'var(--bg2)',
                color: 'var(--white)', minHeight: 48,
              }}
            >
              <Home size={16} color={activeHome ? 'var(--teal)' : 'var(--grey)'} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Main Dashboard</div>
                <div style={{ fontSize: 10, fontFamily: 'DM Mono', textTransform: 'uppercase', color: 'var(--grey)' }}>Console Hub</div>
              </div>
            </Link>
          </div>
        )}

        <div style={{ display: 'grid', gap: 8, flex: 1 }}>
          {routes.map(route => {
            const Icon = route.icon
            const active = location.pathname === route.path || location.pathname.startsWith(`${route.path}/`)
            return (
              <Link
                key={route.path}
                to={route.path}
                onClick={closeDrawer}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', borderRadius: 12, textDecoration: 'none',
                  border: `1px solid ${active ? 'var(--teal)' : 'var(--border2)'}`,
                  background: active ? 'rgba(0,229,195,0.05)' : 'var(--bg2)',
                  color: 'var(--white)', minHeight: 48,
                }}
              >
                <Icon size={16} color={active ? 'var(--teal)' : 'var(--grey)'} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{route.label}</div>
                  <div style={{ fontSize: 10, fontFamily: 'DM Mono', textTransform: 'uppercase', color: 'var(--grey)' }}>{route.section}</div>
                </div>
              </Link>
            )
          })}
        </div>

        <button
          onClick={() => { closeDrawer(); signOut() }}
          style={{
            marginTop: 20, display: 'flex', alignItems: 'center', gap: 10,
            width: '100%', padding: '12px 14px', borderRadius: 12,
            border: '1px solid var(--border2)', background: 'transparent',
            color: 'var(--grey)', cursor: 'pointer', minHeight: 48,
          }}
        >
          <LogOut size={16} /> Sign out
        </button>
      </>
    )
  }

  return (
    <div className="layout-grid">

      {/* ── Mobile top bar ── */}
      <div className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src={logoSrc} alt="Attract Acquisition" style={{ width: 32, height: 32, objectFit: 'contain' }} />
          <div style={{ fontSize: 14, fontWeight: 700 }}>Attract Acquisition OS</div>
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation"
          style={{
            background: 'none', border: 'none', color: 'var(--white)', cursor: 'pointer',
            padding: 8, minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Menu size={24} />
        </button>
      </div>

      {/* ── Mobile slide-over drawer ── */}
      {drawerOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100 }}>
          <div
            onClick={closeDrawer}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)' }}
          />
          <div style={{
            position: 'absolute', top: 0, left: 0, bottom: 0, width: 280,
            background: 'var(--bg2)', borderRight: '1px solid var(--border2)',
            padding: 20, display: 'flex', flexDirection: 'column', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <img src={logoSrc} alt="Attract Acquisition" style={{ width: 36, height: 36, objectFit: 'contain' }} />
                <div>
                  <div style={{ fontFamily: 'DM Mono', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--grey)' }}>AIOS</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Attract Acquisition OS</div>
                </div>
              </div>
              <button
                onClick={closeDrawer}
                aria-label="Close navigation"
                style={{
                  background: 'none', border: 'none', color: 'var(--grey)', cursor: 'pointer',
                  padding: 4, minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={20} />
              </button>
            </div>
            <NavLinks />
          </div>
        </div>
      )}

      {/* ── Desktop sidebar ── */}
      <aside className="layout-sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <img src={logoSrc} alt="Attract Acquisition" style={{ width: 48, height: 48, objectFit: 'contain' }} />
          <div>
            <div style={{ fontFamily: 'DM Mono', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--grey)' }}>AIOS</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Attract Acquisition OS</div>
          </div>
        </div>
        <NavLinks />
      </aside>

      {/* ── Main content ── */}
      <main className="layout-main">
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <Outlet />
        </div>
      </main>

    </div>
  )
}
