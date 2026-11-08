import { urlPublica } from "./urlPublica"

// Departamentos com foto e ícone (estilo Master Supermercados), usados na Home, no Catálogo e nos
// Favoritos. Fica num só lugar: antes o mesmo array de 15 itens vivia copiado nas três páginas.
export const CATEGORIAS_VISUAIS = [
  { id: "todos", label: "Todos", img: urlPublica("/images/categorias/master/todos.png"), icon: "🏪" },
  { id: "hortifruti", label: "Hortifrúti", img: urlPublica("/images/categorias/master/hortifruti.png"), icon: "🍎" },
  { id: "carnes", label: "Carnes", img: urlPublica("/images/categorias/master/carnes.png"), icon: "🥩" },
  { id: "padaria", label: "Padaria", img: urlPublica("/images/categorias/master/padaria.png"), icon: "🥖" },
  { id: "leites", label: "Frios e Laticínios", img: urlPublica("/images/categorias/master/leites.png"), icon: "🥛" },
  { id: "bebidas", label: "Bebidas", img: urlPublica("/images/categorias/master/bebidas.png"), icon: "🍺" },
  { id: "congelados", label: "Congelados", img: urlPublica("/images/categorias/master/congelados.png"), icon: "🧊" },
  { id: "graos", label: "Grãos e Arroz", img: urlPublica("/images/categorias/master/graos.png"), icon: "🌾" },
  { id: "cafe", label: "Café e Matinais", img: urlPublica("/images/categorias/master/cafe.png"), icon: "☕" },
  { id: "limpeza", label: "Limpeza", img: urlPublica("/images/categorias/master/limpeza.png"), icon: "🧹" },
  { id: "higiene", label: "Higiene", img: urlPublica("/images/categorias/master/higiene.png"), icon: "🧴" },
  { id: "oleos", label: "Óleos e Azeites", img: urlPublica("/images/categorias/master/oleos.png"), icon: "🫙" },
  { id: "biscoitos", label: "Biscoitos", img: urlPublica("/images/categorias/master/biscoitos.png"), icon: "🍪" },
  { id: "mercearia", label: "Mercearia", img: urlPublica("/images/categorias/master/mercearia.png"), icon: "🛒" },
  { id: "bazar", label: "Bazar", img: urlPublica("/images/categorias/master/bazar.png"), icon: "🍽️" },
]
