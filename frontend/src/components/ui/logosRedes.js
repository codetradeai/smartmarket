import dados from "./logosRedes.dados.json"
import asun from "../../assets/logos-redes/asun.png"
import atacadao from "../../assets/logos-redes/atacadao.png"
import carrefour from "../../assets/logos-redes/carrefour.png"
import fort from "../../assets/logos-redes/fort.png"
import master from "../../assets/logos-redes/master.png"
import rissul from "../../assets/logos-redes/rissul.png"
import stok from "../../assets/logos-redes/stok.png"
import zaffari from "../../assets/logos-redes/zaffari.png"

const ARQUIVOS = { asun, atacadao, carrefour, fort, master, rissul, stok, zaffari }

/**
 * Logos das redes: PNG com transparência, sem margens, e o tamanho de exibição (px CSS) de cada um.
 * Os arquivos e `logosRedes.dados.json` são gerados por `scripts/logos-redes/processar_logos.py`, que dá
 * a todos a mesma área visual (um logo quase quadrado e um muito largo têm o mesmo peso na faixa).
 * Para trocar um logo, substitua o arquivo de origem e rode o script; não edite estes arquivos à mão.
 */
export const LOGOS_REDES = Object.fromEntries(
  Object.entries(ARQUIVOS).map(([id, src]) => [id, { src, largura: dados[id].largura, altura: dados[id].altura }]),
)
