import { Link } from "react-router-dom"
import { Button, Card } from "../components/ui"

export default function Sobre() {
  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">
      <header className="bg-white border-b border-brand-border py-4 px-6 md:px-12">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl font-black text-brand-navy tracking-tight">
              Smart<span className="text-brand-green">Market</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/catalog">
              <Button variant="ghost" size="sm">Catálogo</Button>
            </Link>
            <Link to="/favorites">
              <Button variant="ghost" size="sm">Favoritos</Button>
            </Link>
            <Link to="/auth">
              <Button variant="primary" size="sm">Entrar</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto px-6 py-12 md:py-16">
        <div className="text-center mb-12">
          <span className="bg-emerald-100 text-brand-green px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            Nossa Missão
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-brand-navy mt-4 tracking-tight">
            Economia inteligente na palma da sua mão
          </h1>
          <p className="text-sm md:text-base text-brand-muted max-w-xl mx-auto mt-3 leading-relaxed">
            O SmartMarket nasceu com um propósito claro: eliminar o desperdício de tempo e dinheiro na comparação de preços em supermercados.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-12">
          <Card className="p-6">
            <div className="text-3xl mb-3">🤖</div>
            <h3 className="text-sm font-bold text-brand-navy mb-1.5">Coleta Automatizada RS</h3>
            <p className="text-xs text-brand-muted leading-relaxed">
              Robôs especializados que monitoram VTEX, VipCommerce e APIs oficiais das 8 maiores redes do RS.
            </p>
          </Card>

          <Card className="p-6">
            <div className="text-3xl mb-3">📸</div>
            <h3 className="text-sm font-bold text-brand-navy mb-1.5">Fotos em Alta Definição</h3>
            <p className="text-xs text-brand-muted leading-relaxed">
              Catálogo visual enriquecido com imagens originais em até 1000x1000px e especificações técnicas.
            </p>
          </Card>

          <Card className="p-6">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="text-sm font-bold text-brand-navy mb-1.5">Comparação Cesta a Cesta</h3>
            <p className="text-xs text-brand-muted leading-relaxed">
              Calculamos a economia líquida e apontamos o supermercado mais vantajoso para sua compra inteira.
            </p>
          </Card>

          <Card className="p-6">
            <div className="text-3xl mb-3">🛡️</div>
            <h3 className="text-sm font-bold text-brand-navy mb-1.5">Transparência Total</h3>
            <p className="text-xs text-brand-muted leading-relaxed">
              Preços neutros, sem favorecimento de marcas, focados 100% no benefício do consumidor gaúcho.
            </p>
          </Card>
        </div>

        <div className="bg-gradient-to-r from-brand-navy to-brand-navy-light text-white rounded-3xl p-8 md:p-12 text-center shadow-xl">
          <h2 className="text-2xl font-bold mb-3">Pronto para economizar?</h2>
          <p className="text-sm text-slate-300 max-w-md mx-auto mb-6">
            Acesse o catálogo completo ou crie sua lista de compras agora mesmo.
          </p>
          <div className="flex gap-3 justify-center">
            <Link to="/catalog">
              <Button variant="primary" size="md">Ver Catálogo</Button>
            </Link>
            <Link to="/favorites">
              <Button variant="outline" size="md" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                Meus Favoritos
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
