import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import logoImg from '../assets/logo.png'

const C = {
  navy: '#0D2137', green: '#22A95E', teal: '#1DB4A3',
  greenDark: '#17864A', bg: '#F4FAF7', muted: '#6B8A7A',
  border: '#D4E8DC', error: '#D63B3B', errorBg: '#FEF2F2',
  errorBorder: '#FECACA', white: '#FFFFFF',
}

function Field({ label, type = 'text', placeholder, value, onChange, error, hint }) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <label style={{ fontSize: '13px', fontWeight: 600, color: C.navy }}>{label}</label>
      <input
        type={type} placeholder={placeholder} value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          padding: '12px 16px', borderRadius: '12px',
          border: `1.5px solid ${error ? C.error : focused ? C.green : C.border}`,
          background: error ? C.errorBg : C.white,
          color: C.navy, fontSize: '15px', fontFamily: 'Poppins, sans-serif',
          outline: 'none', transition: 'border-color 0.18s', width: '100%', boxSizing: 'border-box',
        }}
      />
      {error && hint && <span style={{ fontSize: '11px', color: C.error, fontWeight: 500 }}>{hint}</span>}
    </div>
  )
}

function PasswordStrength({ password }) {
  const checks = [password.length >= 8, /[A-Z]/.test(password), /[0-9]/.test(password), /[^A-Za-z0-9]/.test(password)]
  const score = checks.filter(Boolean).length
  const levels = [
    { label: 'Muito fraca', color: C.error }, { label: 'Fraca', color: '#F59E0B' },
    { label: 'Média', color: '#F59E0B' }, { label: 'Forte', color: C.green }, { label: 'Muito forte', color: C.teal },
  ]
  const level = levels[score]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <div style={{ display: 'flex', gap: '4px' }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ flex: 1, height: '3px', borderRadius: '2px', background: i < score ? level.color : C.border, transition: 'background 0.2s' }} />
        ))}
      </div>
      <span style={{ fontSize: '11px', fontWeight: 600, color: level.color }}>Senha {level.label}</span>
    </div>
  )
}

function PrimaryButton({ label }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button type="submit"
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%', padding: '13px', borderRadius: '13px',
        background: `linear-gradient(135deg, ${C.green} 0%, ${C.teal} 100%)`,
        color: C.white, fontFamily: 'Poppins, sans-serif', fontSize: '15px',
        fontWeight: 700, border: 'none', cursor: 'pointer',
        boxShadow: hovered ? '0 6px 20px rgba(34,169,94,0.45)' : '0 2px 10px rgba(34,169,94,0.25)',
        transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
        transition: 'all 0.2s',
      }}
    >
      {label}
    </button>
  )
}

function Alert({ type, title, desc }) {
  const isError = type === 'error'
  return (
    <div style={{
      display: 'flex', gap: '10px', alignItems: 'flex-start',
      background: isError ? C.errorBg : '#F0FDF4',
      border: `1px solid ${isError ? C.errorBorder : '#BBF7D0'}`,
      borderRadius: '12px', padding: '12px 14px',
    }}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: '1px' }}>
        <circle cx="8" cy="8" r="7" stroke={isError ? C.error : C.green} strokeWidth="1.5"/>
        {isError
          ? <><path d="M8 5v3.5" stroke={C.error} strokeWidth="1.5" strokeLinecap="round"/><circle cx="8" cy="11.5" r=".75" fill={C.error}/></>
          : <path d="M5 8.5l2 2 4-4" stroke={C.green} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>}
      </svg>
      <div>
        <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: isError ? C.error : C.greenDark }}>{title}</p>
        {desc && <p style={{ margin: '2px 0 0', fontSize: '12px', color: isError ? '#B91C1C' : '#15803D' }}>{desc}</p>}
      </div>
    </div>
  )
}

export default function AuthPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('login')
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState(false)
  const [nome, setNome] = useState('')
  const [cadEmail, setCadEmail] = useState('')
  const [cadPassword, setCadPassword] = useState('')
  const [cadConfirm, setCadConfirm] = useState('')
  const [cadError, setCadError] = useState(false)
  const [cadSuccess, setCadSuccess] = useState(false)

  function switchTab(t) {
    setTab(t); setLoginError(false); setCadError(false); setCadSuccess(false)
  }

  function handleLogin(e) {
    e.preventDefault()
    if (!loginEmail || !loginPassword) return setLoginError(true)
    navigate('/catalog')
  }

  function handleCadastro(e) {
    e.preventDefault()
    if (!nome || !cadEmail || !cadPassword || cadPassword !== cadConfirm) return setCadError(true)
    setCadError(false); setCadSuccess(true)
    setTimeout(() => { switchTab('login') }, 1500)
  }

  const pwMismatch = cadError && cadPassword && cadConfirm && cadPassword !== cadConfirm

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1fr' }} className="auth-grid">
      <style>{`@media(max-width:768px){.brand-col{display:none!important}.auth-grid{grid-template-columns:1fr!important}}`}</style>

      {/* Left — Brand */}
      <div className="brand-col" style={{
        background: 'linear-gradient(145deg, #0D2137 0%, #0A3D2E 100%)',
        padding: '48px 44px', display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -80, right: -80, width: 280, height: 280, borderRadius: '50%', background: C.green, opacity: 0.08 }} />
        <div style={{ position: 'absolute', bottom: -60, left: -60, width: 220, height: 220, borderRadius: '50%', background: C.teal, opacity: 0.10 }} />

        <div>
          <img src={logoImg} alt="SmartMarket" style={{ height: '52px', objectFit: 'contain', filter: 'brightness(0) invert(1)', marginBottom: '40px' }} />
          <h1 style={{ color: C.white, fontSize: '28px', fontWeight: 800, lineHeight: 1.25, marginBottom: '12px', letterSpacing: '-0.5px' }}>
            Economize em cada<br/>
            <span style={{ color: C.teal }}>compra de supermercado</span>
          </h1>
          <p style={{ color: '#A0BFB0', fontSize: '15px', lineHeight: 1.6, marginBottom: '40px', maxWidth: '320px' }}>
            Monte sua lista, compare os preços entre os mercados e saiba exatamente onde comprar mais barato.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {[
              { icon: '🛒', title: 'Monte sua lista', desc: 'Adicione os produtos que você precisa comprar' },
              { icon: '📊', title: 'Compare preços', desc: 'Veja o total em cada supermercado da sua região' },
              { icon: '💰', title: 'Economize de verdade', desc: 'Escolha o mercado mais barato para sua lista' },
            ].map((b, i) => (
              <div key={i} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(29,180,163,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                  {b.icon}
                </div>
                <div>
                  <p style={{ color: C.white, fontSize: '14px', fontWeight: 700, margin: 0 }}>{b.title}</p>
                  <p style={{ color: '#90AFA2', fontSize: '13px', margin: '2px 0 0', lineHeight: 1.5 }}>{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: '48px', padding: '14px 20px', background: 'rgba(255,255,255,0.06)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.10)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `linear-gradient(135deg, ${C.green}, ${C.teal})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>⭐</div>
          <div>
            <p style={{ color: C.white, fontSize: '13px', fontWeight: 600, margin: 0 }}>Projeto Acadêmico — Grupo 40</p>
            <p style={{ color: '#90AFA2', fontSize: '12px', margin: '1px 0 0' }}>Codifica / +praTI · Dev Full Stack Jr 2026</p>
          </div>
        </div>
      </div>

      {/* Right — Form */}
      <div style={{ background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 32px' }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <div style={{ marginBottom: '28px' }}>
            <p style={{ fontSize: '12px', color: C.muted, fontWeight: 500, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {tab === 'login' ? 'Bem-vindo de volta' : 'Crie sua conta'}
            </p>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: C.navy, margin: 0, letterSpacing: '-0.3px' }}>
              {tab === 'login' ? 'Acesse sua conta' : 'Comece a economizar'}
            </h2>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', background: C.white, borderRadius: '14px', padding: '4px', marginBottom: '24px', border: `1px solid ${C.border}`, boxShadow: '0 1px 4px rgba(13,33,55,0.06)' }}>
            {['login', 'cadastro'].map(t => (
              <button key={t} onClick={() => switchTab(t)} style={{
                flex: 1, padding: '9px', borderRadius: '11px', border: 'none',
                fontFamily: 'Poppins, sans-serif', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.2s',
                background: tab === t ? C.green : 'transparent',
                color: tab === t ? C.white : C.muted,
                boxShadow: tab === t ? '0 2px 8px rgba(34,169,94,0.30)' : 'none',
              }}>
                {t === 'login' ? 'Entrar' : 'Criar conta'}
              </button>
            ))}
          </div>

          {/* Card */}
          <div style={{ background: C.white, borderRadius: '20px', padding: '28px', boxShadow: '0 4px 24px rgba(13,33,55,0.08)', border: `1px solid ${C.border}` }}>
            {tab === 'login' ? (
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <Field label="E-mail" type="email" placeholder="seu@email.com" value={loginEmail}
                  onChange={v => { setLoginEmail(v); setLoginError(false) }} error={loginError && !loginEmail} />
                <Field label="Senha" type="password" placeholder="••••••••" value={loginPassword}
                  onChange={v => { setLoginPassword(v); setLoginError(false) }} error={loginError && !loginPassword} />
                {loginError && <Alert type="error" title="E-mail ou senha inválidos" desc="Verifique seus dados e tente novamente." />}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-6px' }}>
                  <a href="#" style={{ fontSize: '12px', color: C.green, fontWeight: 600, textDecoration: 'none' }}>Esqueceu a senha?</a>
                </div>
                <PrimaryButton label="Entrar" />
                <p style={{ textAlign: 'center', fontSize: '13px', color: C.muted, margin: 0 }}>
                  Não tem conta?{' '}
                  <button type="button" onClick={() => switchTab('cadastro')} style={{ background: 'none', border: 'none', color: C.green, fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins, sans-serif', fontSize: '13px', padding: 0 }}>
                    Criar conta grátis
                  </button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleCadastro} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <Field label="Nome completo" placeholder="João da Silva" value={nome}
                  onChange={v => { setNome(v); setCadError(false) }} error={cadError && !nome} hint="Campo obrigatório" />
                <Field label="E-mail" type="email" placeholder="seu@email.com" value={cadEmail}
                  onChange={v => { setCadEmail(v); setCadError(false) }} error={cadError && !cadEmail} hint="Campo obrigatório" />
                <Field label="Senha" type="password" placeholder="Mínimo 8 caracteres" value={cadPassword}
                  onChange={v => { setCadPassword(v); setCadError(false) }} error={cadError && !cadPassword} hint="Campo obrigatório" />
                <Field label="Confirmar Senha" type="password" placeholder="Repita a senha" value={cadConfirm}
                  onChange={v => { setCadConfirm(v); setCadError(false) }} error={!!pwMismatch} hint="As senhas não coincidem" />
                {cadPassword.length > 0 && <PasswordStrength password={cadPassword} />}
                {cadError && !pwMismatch && <Alert type="error" title="Preencha todos os campos corretamente." />}
                {cadSuccess && <Alert type="success" title="Conta criada! Redirecionando para o login…" />}
                <PrimaryButton label="Criar conta" />
                <p style={{ textAlign: 'center', fontSize: '13px', color: C.muted, margin: 0 }}>
                  Já tem conta?{' '}
                  <button type="button" onClick={() => switchTab('login')} style={{ background: 'none', border: 'none', color: C.green, fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins, sans-serif', fontSize: '13px', padding: 0 }}>
                    Entrar
                  </button>
                </p>
              </form>
            )}
          </div>

          <p style={{ textAlign: 'center', fontSize: '11px', color: '#A0BFB0', marginTop: '16px' }}>
            Ao continuar, você concorda com os{' '}
            <a href="#" style={{ color: C.muted, textDecoration: 'underline' }}>Termos de Uso</a>{' '}e a{' '}
            <a href="#" style={{ color: C.muted, textDecoration: 'underline' }}>Política de Privacidade</a>
          </p>
        </div>
      </div>
    </div>
  )
}
