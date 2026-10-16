# SmartMarket — Design System & Tailwind CSS

> **Status da Entrega**: Concluído e Validado  
> **Frameworks**: React 19 + Vite 8 + Tailwind CSS v4  
> **Referência de Design**: Figma Oficial SmartMarket (`Friendly Consumer & Brand Guide`)  

---

## 1. Visão Geral

Este documento descreve o **Design System** oficial do projeto **SmartMarket**, estabelecendo a base visual, tipográfica e de componentes reutilizáveis para o frontend da aplicação.

O sistema foi construído sobre o **Tailwind CSS v4** utilizando a diretiva `@theme`, integrando uma paleta de cores moderna inspirada na economia inteligente (Verde Esmeralda e Teal) e na robustez tecnológica (Navy e Slate), com componentes acessíveis, responsivos e compostos.

---

## 2. Paleta de Cores e Tokens do Tema

Configurados diretamente em [`src/index.css`](src/index.css) através do `@theme` do Tailwind CSS v4:

| Token Tailwind | Cor Hexadecimal | Papel no Design |
|---|---|---|
| `bg-brand-navy` | `#0D2137` | Cor principal da marca, cabeçalhos, sidebars e texto de alto contraste |
| `bg-brand-navy-light` | `#16324F` | Hover e estados interativos de superfícies escuras |
| `bg-brand-green` | `#22A95E` | Verde oficial SmartMarket (ações primárias, economia, sucesso) |
| `bg-brand-green-hover`| `#1B8C4D` | Hover do botão primário |
| `bg-brand-green-light`| `#E8F8F0` | Fundo suave para badges, itens ativos e alertas de economia |
| `bg-brand-emerald` | `#00C853` | Ponto de partida do gradiente oficial do logo |
| `bg-brand-teal` | `#1DB4A3` | Cor secundária de destaque, tags e transição do gradiente |
| `bg-brand-bg` | `#F4FAF7` | Fundo principal da aplicação (clean e agradável) |
| `bg-brand-card` | `#FFFFFF` | Superfície padrão dos cards e modais |
| `border-brand-border`| `#D4E8DC` | Borda padrão dos elementos, inputs e divisores |
| `text-brand-muted` | `#6B8A7A` | Textos secundários, legendas e rótulos auxiliares |
| `text-brand-error` | `#D63B3B` | Mensagens de validação e alertas de erro |
| `bg-brand-amber` | `#F59E0B` | Avaliações, estrelas de favoritos e avisos |
| `bg-brand-coral` | `#FF6B4A` | Ofertas especiais e destaque promocional |

---

## 3. Tipografia

* **Fonte Principal (Interface e Texto)**: `Poppins` (Google Fonts: 300, 400, 500, 600, 700, 800)
* **Fonte de Destaque (Display / Logo)**: `Plus Jakarta Sans` (Google Fonts: 600, 700, 800)

---

## 4. Componentes UI Reutilizáveis Base

Todos os componentes residem em [`src/components/ui/`](src/components/ui/) e são exportados de forma unificada através de [`src/components/ui/index.js`](src/components/ui/index.js).

### 4.1. `Button`
Suporta múltiplas variantes visuais, tamanhos, estados interativos e spinner de carregamento integrado.

```jsx
import { Button } from "@/components/ui"

// Primário com ícone
<Button variant="primary" size="md">Adicionar à Lista</Button>

// Estado de loading
<Button variant="primary" isLoading={true}>Salvando...</Button>

// Variantes suportadas
<Button variant="secondary">Navy</Button>
<Button variant="teal">Teal</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="danger">Excluir</Button>
<Button variant="subtle">Subtle Green</Button>
```

### 4.2. `Input`
Campo de formulário com rótulo, suporte a ícones prefixados/sufixados, estado de erro e modo de busca especializado com botão de limpeza rápida.

```jsx
import { Input } from "@/components/ui"

// Input comum com label
<Input label="E-mail" placeholder="seu@email.com" helperText="Nunca compartilharemos seu e-mail" />

// Input com erro
<Input label="Senha" type="password" error="A senha deve ter no mínimo 8 caracteres" />

// Input de busca com botão de limpar
<Input
  isSearch
  placeholder="Buscar produto por nome ou marca..."
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
  onClear={() => setSearchTerm("")}
/>
```

### 4.3. `Card`
Sistema de cards modulares e composables (`Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`) com variantes padrão, elevada e interativa (com elevação suave no hover).

```jsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Button } from "@/components/ui"

<Card variant="interactive">
  <CardHeader>
    <CardTitle>Arroz Branco 5kg</CardTitle>
    <CardDescription>Marca: Camil</CardDescription>
  </CardHeader>
  <CardContent>
    <div className="flex justify-between">
      <span>Fort Atacadista</span>
      <span className="font-bold">R$ 26,90</span>
    </div>
  </CardContent>
  <CardFooter>
    <Button size="sm" className="w-full">Comparar</Button>
  </CardFooter>
</Card>
```

### 4.4. `Modal`
Janela modal acessível renderizada via React Portal, com backdrop-blur suave, suporte a fechamento com tecla `ESC`, clique fora do diálogo e botão `X` acessível.

```jsx
import { useState } from "react"
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter, Button } from "@/components/ui"

function MeuComponente() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Abrir Modal</Button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} size="md">
        <ModalHeader>
          <ModalTitle>Alerta de Oferta</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <p>Deseja ser notificado quando este produto baixar de preço?</p>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
          <Button variant="primary" onClick={() => setIsOpen(false)}>Confirmar</Button>
        </ModalFooter>
      </Modal>
    </>
  )
}
```

### 4.5. `Navbar`
Barra de navegação topo responsiva e moderna com logo oficial do SmartMarket, links de navegação com marcador de página ativa, barra de pesquisa rápida, badge com contador numérico de itens na lista de compras e menu lateral (drawer) para telas mobile.

```jsx
import { Navbar } from "@/components/ui"

<Navbar
  cartCount={3}
  onSearch={(termo) => console.log("Buscando:", termo)}
  user={{ name: "Davi Cardozo", email: "davi@smartmarket.com.br" }}
/>
```

---

## 5. Como Executar e Validar

No diretório `frontend`:

```bash
# Instalação das dependências
npm install

# Executar servidor de desenvolvimento com Hot Reload
npm run dev

# Validação do build de produção
npm run build
```
Resultado do build: **100% de sucesso sem warnings**.
