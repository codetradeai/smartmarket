import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { Input } from "./ui"

/**
 * Campo de senha com botão de mostrar/ocultar, para conferir o que foi digitado (login, senha e confirmação).
 * Cada campo guarda a própria visibilidade; o botão não envia o formulário.
 */
export default function CampoSenha({ nomeAcessivel = "senha", ...props }) {
  const [visivel, setVisivel] = useState(false)
  return (
    <Input
      {...props}
      type={visivel ? "text" : "password"}
      rightIcon={
        <button
          type="button"
          onClick={() => setVisivel((v) => !v)}
          aria-label={`${visivel ? "Ocultar" : "Mostrar"} ${nomeAcessivel}`}
          aria-pressed={visivel}
          className="rounded-full p-1 text-brand-muted transition-colors hover:text-brand-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
        >
          {visivel ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      }
    />
  )
}
