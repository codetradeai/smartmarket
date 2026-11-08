// Contas e credenciais de demonstração. Este módulo só é carregado por import dinâmico, atrás de
// `if (import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_LOGIN === "true")` escrito direto no
// authService.js. Em build de produção o `if` é constante `false`, o Vite não gera este chunk e as
// senhas não vão para o bundle público. Não importe este arquivo de forma estática.

export const DEMO_USERS = [
  {
    id: 1,
    nome: "Davi Souza",
    email: "davi@smartmarket.com.br",
    papel: "ADMIN",
    senha: "admin123",
  },
  {
    id: 2,
    nome: "Gilbert Lima",
    email: "gilbert@smartmarket.com.br",
    papel: "ADMIN",
    senha: "admin123",
  },
  {
    id: 3,
    nome: "Rudinei Silva",
    email: "rudinei@smartmarket.com.br",
    papel: "ADMIN",
    senha: "admin123",
  },
  {
    id: 4,
    nome: "Maria Santos",
    email: "maria@email.com",
    papel: "USER",
    senha: "user123",
  },
]

// Contas preenchidas pelos botões de "Acesso Rápido" da tela de login (somente DEV / modo demo)
export const CREDENCIAIS_ATALHO = {
  admin: { email: "davi@smartmarket.com.br", senha: "admin123" },
  user: { email: "maria@email.com", senha: "user123" },
}

// Gera um mock JWT payload para o fallback
export function gerarTokenDemo(user) {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))
  const payload = btoa(
    JSON.stringify({
      sub: user.email,
      id: user.id,
      nome: user.nome,
      papel: user.papel,
      exp: Math.floor(Date.now() / 1000) + 86400, // 24h
    })
  )
  return `${header}.${payload}.demo_signature_smartmarket`
}
