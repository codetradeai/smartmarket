// CEP brasileiro: máscara de digitação (00000-000), extração só dos dígitos e validação.

export const TAMANHO_CEP = 8

/** Remove tudo que não é dígito e corta em 8 (colar "90010-000" ou " 90010000 " funciona). */
export function somenteDigitosCep(valor) {
  return String(valor ?? "").replace(/\D/g, "").slice(0, TAMANHO_CEP)
}

/** Aplica a máscara 00000-000 enquanto o usuário digita (o hífen só aparece a partir do 6º dígito). */
export function mascararCep(valor) {
  const digitos = somenteDigitosCep(valor)
  return digitos.length > 5 ? `${digitos.slice(0, 5)}-${digitos.slice(5)}` : digitos
}

/** CEP válido = exatamente 8 dígitos (a existência real é conferida pelo backend). */
export function cepValido(valor) {
  return somenteDigitosCep(valor).length === TAMANHO_CEP
}
