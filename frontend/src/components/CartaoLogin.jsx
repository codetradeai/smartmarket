import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ArrowRight, ListChecks, Mail, MapPin, Scale } from "lucide-react"
import { useAuth } from "../hooks/useAuth"
import { Button, Input } from "./ui"
import CampoSenha from "./CampoSenha"

// Mesmo destino padrão da página /auth: quem entra pelo card vai direto para o catálogo.
const DESTINO_APOS_LOGIN = "/catalog"

// Só o que o app faz de verdade; a busca por loja próxima (CEP) ainda não está no ar.
const BENEFICIOS = [
  { icone: Scale, titulo: "Compare entre redes", texto: "O mesmo produto lado a lado nos mercados do RS." },
  { icone: ListChecks, titulo: "Lista de compras", texto: "Monte a lista e veja o total em cada rede." },
  { icone: MapPin, titulo: "Loja mais próxima", texto: "Preços da loja perto de você, pelo CEP.", emBreve: true },
]

/**
 * Corpo do card de login (carregado sob demanda pelo LoginDialogo). Usa o mesmo `login` do AuthContext
 * que a página /auth; o cadastro continua na página /auth?mode=register.
 */
export default function CartaoLogin({ onFechar }) {
  const { login, isLoading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [erro, setErro] = useState("")

  const aoEnviar = async (evento) => {
    evento.preventDefault()
    setErro("")

    if (!email || !senha) {
      setErro("Por favor, preencha o e-mail e a senha.")
      return
    }

    const resultado = await login(email, senha)
    if (resultado.success) {
      onFechar()
      navigate(DESTINO_APOS_LOGIN)
    } else {
      setErro(resultado.error || "Credenciais inválidas.")
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="px-6 pb-7 pt-8 sm:px-10 sm:pt-10 sm:pb-8">
        <h2 className="text-3xl font-medium leading-[1.1] tracking-tight text-brand-navy sm:text-4xl">
          Compare os preços dos <br className="hidden sm:block" />
          <span className="text-slate-500">supermercados do RS.</span>
        </h2>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-500 sm:text-base">
          Entre para comparar preços entre as redes e montar a sua lista de compras.
        </p>

        <form onSubmit={aoEnviar} className="mt-6 flex max-w-md flex-col gap-3">
          <Input
            type="email"
            aria-label="E-mail"
            autoComplete="email"
            placeholder="seu@email.com"
            leftIcon={<Mail size={16} aria-hidden="true" />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-describedby={erro ? "login-erro" : undefined}
          />
          <CampoSenha
            aria-label="Senha"
            autoComplete="current-password"
            placeholder="Sua senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            aria-describedby={erro ? "login-erro" : undefined}
          />

          {erro && (
            <p
              id="login-erro"
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-800"
            >
              {erro}
            </p>
          )}

          <Button
            type="submit"
            variant="secondary"
            size="lg"
            isLoading={isLoading}
            rightIcon={<ArrowRight size={16} aria-hidden="true" />}
            className="w-full"
          >
            Entrar
          </Button>
        </form>

        <p className="mt-3 text-xs text-slate-500">
          Ainda não tem conta?{" "}
          <Link
            to="/auth?mode=register"
            onClick={onFechar}
            className="font-semibold text-brand-navy underline underline-offset-2 hover:text-brand-green-dark"
          >
            Criar conta grátis
          </Link>
        </p>
      </div>

      <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

      <ul className="grid grid-cols-1 divide-y divide-slate-100 bg-slate-50 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {BENEFICIOS.map(({ icone: Icone, titulo, texto, emBreve }) => (
          <li key={titulo} className="flex items-start gap-3 p-4 sm:block sm:p-6">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white sm:mb-3">
              <Icone size={18} className="text-slate-600" aria-hidden="true" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-brand-navy">
                {titulo}
                {emBreve && (
                  <span className="ml-1.5 rounded-full bg-slate-200 px-1.5 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wide text-slate-700">
                    Em breve
                  </span>
                )}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{texto}</p>
            </div>
          </li>
        ))}
      </ul>

      <p className="border-t border-slate-100 bg-white px-6 py-4 text-center text-xs text-slate-500">
        Projeto acadêmico do Grupo 40 · Dev Full Stack 2026
      </p>
    </div>
  )
}
