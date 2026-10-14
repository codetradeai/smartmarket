# SmartMarket — Frontend Web

Aplicação web do **SmartMarket** desenvolvida com **React 19**, **Vite 8** e **Tailwind CSS v4**, seguindo rigorosamente o design elaborado no Figma e as diretrizes de Clean Code e acessibilidade.

---

## 1. Tecnologias Utilizadas

* **React 19**: Biblioteca de interfaces reativas com componentes funcionais e hooks.
* **Vite 8**: Build tool e dev server ultrarrápido com HMR nativo.
* **Tailwind CSS v4**: Framework utilitário de estilização configurado via `@theme`.
* **React Router DOM 7**: Roteamento client-side com layouts e navegação fluida.
* **Lucide React**: Conjunto profissional e consistente de ícones vetoriais.
* **clsx & tailwind-merge**: Gerenciador de classes dinâmicas sem conflitos de especificidade via utilitário `cn()`.

---

## 2. Design System e Componentes Base

O projeto conta com uma biblioteca de componentes UI atômicos e composables em `src/components/ui/`:
* `Button`: Variantes `primary`, `secondary`, `teal`, `outline`, `ghost`, `danger`, `subtle`, múltiplos tamanhos e estado `isLoading`.
* `Input`: Rótulo, ícone interno, mensagens de erro, helper text e modo busca com limpeza rápida.
* `Card`: Composição via `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent` e `CardFooter`.
* `Modal`: Diálogo acessível via React Portal com backdrop-blur, fechamento com ESC e clique externo.
* `Navbar`: Barra de navegação responsiva com logo oficial, busca, contador de lista e menu mobile.

Para documentação completa de cores, tipografia e guia dos componentes, consulte [`DESIGN-SYSTEM.md`](DESIGN-SYSTEM.md).

---

## 3. Como Rodar Localmente

Certifique-se de estar dentro do diretório `frontend`:

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar o servidor de desenvolvimento
npm run dev

# 3. Compilar para produção (validação de build)
npm run build
```
