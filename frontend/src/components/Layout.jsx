import { NavLink, Outlet, useNavigate } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import logoImg from "../assets/logo.png"

const C = {
  navy: "#0D2137",
  green: "#22A95E",
  teal: "#1DB4A3",
  bg: "#F4FAF7",
  border: "#D4E8DC",
  muted: "#6B8A7A",
  white: "#FFFFFF",
}

function IconGrid() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="1" y="1" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <rect x="10" y="1" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <rect x="1" y="10" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <rect x="10" y="10" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function IconHeart() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <path
        d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconList() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M6 4h10M6 9h10M6 14h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="2.5" cy="4" r="1.2" fill="currentColor" />
      <circle cx="2.5" cy="9" r="1.2" fill="currentColor" />
      <circle cx="2.5" cy="14" r="1.2" fill="currentColor" />
    </svg>
  )
}

function IconSettings() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M9 1v2M9 15v2M1 9h2M15 9h2M3.22 3.22l1.42 1.42M13.36 13.36l1.42 1.42M3.22 14.78l1.42-1.42M13.36 4.64l1.42-1.42"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconLogout() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M11 11l3-3-3-3M14 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function Layout() {
  const navigate = useNavigate()
  const { user, isAdmin, logout } = useAuth()

  // Links de navegação: O link Admin só aparece se o usuário for ADMIN
  const navItems = [
    { to: "/catalog", label: "Catálogo", icon: IconGrid },
    { to: "/favorites", label: "Favoritos", icon: IconHeart },
    { to: "/list", label: "Minha Lista", icon: IconList },
    ...(isAdmin ? [{ to: "/admin", label: "Administração", icon: IconSettings }] : []),
  ]

  const handleLogout = () => {
    logout()
    navigate("/")
  }

  const initialLetter = user?.nome ? user.nome[0].toUpperCase() : "U"

  return (
    <div style={{ display: "flex", minHeight: "100%", background: C.bg }}>
      {/* Sidebar */}
      <aside
        style={{
          width: "260px",
          flexShrink: 0,
          background: C.navy,
          display: "flex",
          flexDirection: "column",
          padding: "18px 12px",
          position: "sticky",
          top: 0,
          height: "100vh",
        }}
      >
        {/* Logo */}
        <NavLink
          to="/"
          title="Ir para a página inicial"
          style={{
            marginBottom: "24px",
            padding: "10px 8px",
            background: "#fff",
            borderRadius: "16px",
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 22px -8px rgba(0, 0, 0, 0.4)",
            textDecoration: "none",
            overflow: "hidden",
          }}
        >
          <img
            src={logoImg}
            alt="SmartMarket"
            style={{
              width: "100%",
              maxHeight: "72px",
              height: "auto",
              objectFit: "contain",
              display: "block",
              transform: "scale(1.08)",
            }}
          />
        </NavLink>

        {/* Nav links */}
        <nav style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 14px",
                borderRadius: "12px",
                textDecoration: "none",
                fontSize: "14px",
                fontFamily: "Poppins, sans-serif",
                fontWeight: isActive ? 700 : 500,
                color: isActive ? C.white : "#7FAAA0",
                background: isActive ? "rgba(34,169,94,0.18)" : "transparent",
                borderLeft: isActive ? `3px solid ${C.green}` : "3px solid transparent",
                transition: "all 0.15s",
              })}
            >
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User pill + logout */}
        <div
          style={{
            marginTop: "auto",
            padding: "12px 14px",
            borderRadius: "12px",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${C.green}, ${C.teal})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "13px",
                fontWeight: 700,
                color: C.white,
                flexShrink: 0,
              }}
            >
              {initialLetter}
            </div>
            <div style={{ overflow: "hidden" }}>
              <p style={{ margin: 0, fontSize: "12px", fontWeight: 700, color: C.white, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                {user?.nome || "Usuário"}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span
                  style={{
                    fontSize: "9px",
                    fontWeight: 800,
                    padding: "1px 6px",
                    borderRadius: "6px",
                    background: isAdmin ? "rgba(34,169,94,0.25)" : "rgba(255,255,255,0.12)",
                    color: isAdmin ? C.green : "#A0BFB0",
                  }}
                >
                  {isAdmin ? "ADMINISTRADOR" : "USUÁRIO"}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#A0BFB0",
              fontSize: "12px",
              fontFamily: "Poppins, sans-serif",
              fontWeight: 500,
              padding: 0,
              width: "100%",
            }}
          >
            <IconLogout /> Sair da conta
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
        <Outlet />
      </main>
    </div>
  )
}
