// Import dinâmico do corpo do card de login. Fica num módulo próprio para o `lazy` do diálogo e o
// pré-carregamento (hover/foco no "Entrar") compartilharem a mesma promessa: o módulo é baixado uma vez.
export const importarCartaoLogin = () => import("./CartaoLogin")
