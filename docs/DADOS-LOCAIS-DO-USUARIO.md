# Dados locais do usuário (favoritos, alertas e lista de compras)

Este documento diz onde ficam os dados privados do usuário no front-end, o que **não** é
sincronizado com o servidor e como a sessão (login, logout, token expirado) trata esses dados.

## Onde cada coisa vive

| Dado | Onde fica | Sincroniza com o backend? |
|---|---|---|
| Favoritos de produto (`sm_fav_products`) | `localStorage` do navegador | Só os ids numéricos (`/favoritos/produtos/{id}`). Os ids do catálogo local (`p123`) **nunca** vão ao servidor. |
| Favoritos de mercado (`sm_fav_markets`) | `localStorage` | Só os ids numéricos (`/favoritos`). |
| Alertas de preço (`sm_price_alerts`) | `localStorage` | **Não.** Não existe `alertaService`; o `AlertaController` do backend não é chamado pelo front. |
| Lista de compras (`sm_list`) | `sessionStorage` (some ao fechar a aba) | **Não.** O `listaService` existe em `frontend/src/services`, mas nenhuma página o usa. |
| Raio das lojas do catálogo (`sm_raio_lojas_km`) | `localStorage` | **Não.** É uma preferência de tela (3, 5, 10 ou 20 km, ou `todos`), não um dado pessoal. |

### CEP e localização: não ficam no navegador

O CEP do usuário, a cidade e as coordenadas moram **na conta**, no backend
(`GET/PUT/DELETE /api/usuarios/me/localizacao`, usados por `lojaService` e pelo hook
`useLocalizacao`). O front **nunca** grava CEP, cidade ou coordenadas em `localStorage` ou
`sessionStorage`; ao remover a localização, o backend apaga os três campos.

As chaves `sm_user_cep` e `sm_user_raio_km`, do seletor antigo (que guardava o CEP no navegador),
**não são mais lidas nem gravadas** e são **apagadas**: `removerChavesLegadasDeLocalizacao()`
(`frontend/src/services/storageKeys.js`) roda na carga do app (`AuthProvider`) e no logout, no 401
e na sessão vencida (todos passam por `guardarDadosPrivados()`). Ela só remove essas duas chaves,
não lança se o `localStorage` falhar e não mexe em mais nada. Assim, o CEP que a versão antiga
deixou num navegador some na primeira visita depois da atualização.

### Raio das lojas (`sm_raio_lojas_km`)

- Valores aceitos: `3`, `5`, `10`, `20` ou `todos`; qualquer outra coisa lida do navegador vira
  `todos` (`normalizarRaio`, em `frontend/src/utils/raioLojas.js`).
- Registrada em `CHAVES.raioLojas` (`frontend/src/services/storageKeys.js`) e **de fora** de
  `PRIVADAS_LOCAL` de propósito: não é arquivada por dono nem apagada no logout. No mesmo
  navegador, o usuário seguinte vê o raio que o anterior deixou, e isso é aceitável porque o
  raio não identifica ninguém.
- Lojas sem distância calculada continuam aparecendo em qualquer raio.

Consequências que o produto precisa assumir (e que a interface deve refletir):

- Um **alerta de preço não envia aviso nenhum**. Ele só é comparado com os preços quando o
  usuário abre a página de Favoritos. Não há e-mail, push, `Notification` nem verificação em
  segundo plano. O alerta existe apenas naquele navegador e não aparece em outro dispositivo.
- A **lista de compras vale só para a aba aberta**: fechar a aba a descarta, e ela não aparece
  em outro dispositivo, embora o backend já tenha endpoints de lista.
- Favoritos do catálogo local e alertas **não têm cópia no servidor**: limpar os dados do
  navegador os perde.

> Pendência de texto: as frases da interface que prometem aviso ativo ("Você será avisado
> assim que...", "receba alertas quando o preço cair", "nós monitoramos nas 8 redes para
> você!", "Você será alertado assim que o valor baixar") ficam em `FavoritesPage.jsx` e
> `Home.jsx` e devem ser trocadas por algo como "alerta salvo neste navegador; o preço é
> conferido quando você abre Favoritos". Integrar alertas e lista ao backend continua sendo
> decisão de produto, fora deste escopo.

## Ciclo de vida da sessão

As páginas leem sempre as mesmas chaves "ativas" (`sm_fav_products`, `sm_fav_markets`,
`sm_price_alerts`, `sm_list`). A regra é: **as chaves ativas só contêm dados do usuário logado**
e **nada é apagado** ao encerrar a sessão. Quem cuida disso é `frontend/src/services/storageKeys.js`.

- **Logout, 401 (token inválido/vencido) e token expirado ao abrir o app**: os dados ativos são
  *guardados* sob o namespace do dono (`sm_fav_products:<e-mail em minúsculas>`, e assim para
  as demais chaves; a lista fica no `sessionStorage`), as chaves ativas ficam vazias e o
  `sm_owner` é removido. Ninguém que use o navegador depois enxerga esses dados.
- **Login/cadastro** (`ativarDadosDoUsuario`): se sobraram dados ativos de **outro** dono
  (sessão não encerrada), eles são guardados no namespace dele; em seguida os dados guardados
  do usuário que entrou voltam para as chaves ativas. Se não for possível guardar (por
  exemplo, cota do navegador cheia), o dado do dono anterior é descartado em vez de ser
  entregue ao novo usuário: **a privacidade vem antes**.
- **401 em `/auth/login` ou `/auth/register`** é senha errada, não sessão expirada: não
  redireciona, não encerra a sessão e não mexe nos dados.
- **Migração**: dados do formato antigo (chaves sem dono, sem `sm_owner`) são adotados pelo
  **primeiro** usuário que entrar, uma única vez (marca `sm_dados_migrados`). Depois disso,
  dado ativo sem dono não é atribuído a ninguém e é descartado no próximo login.

O requisito de privacidade da branch `fix/dados-privados-por-conta` continua valendo: o usuário
B no mesmo navegador nunca vê os dados do usuário A.
