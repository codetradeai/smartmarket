# Entrega de João — coleta e pipeline local SmartMarket

05/10/2026 — entrega para revisão em branch de feature baseada em `develop` (`cdf905a642b0d0802a281e54760e1d18c9eb518e`). O piloto Fort original é de Davi (PR #7); este incremento de João acrescenta robustez, normalização conservadora, carga em fixture e testes. O PR permanece em rascunho até revisão e aceite do grupo.

## Resultado por cartão

| Referência | Entrega local | Estado e limite |
|---|---|---|
| [Setup 05/10](https://trello.com/c/ZzNZzuo0) | Contrato v1, dependências e snapshot de versões, execução offline, testes e comandos de ambiente isolado | Implementado para revisão; sem mudar política de branches/proteções |
| [Piloto Fort](https://trello.com/c/5S6pJetd) | Mantido adaptador de Davi, IDs de empresa 334/loja 1585 e categorias 1815215/1815285; corrigidos quatro defeitos reproduzidos | Mapeamento histórico preservado; endpoints, robots e preço atual não revalidados em HTTP |
| [Normalização 12/10](https://trello.com/c/P0ePJL2G) | Nome sem acentos/caixa/espaços redundantes; marca preservada; medida simples extraída; ambiguidades sinalizadas; gravação na produto | Implementado conservadoramente. Não une produtos por semelhança textual; vínculo entre redes exige mapeamento revisado |
| [Segunda rede / pipeline 19/10](https://trello.com/c/UXb2gly6) | Extração fixture → normalização → carga local transacional, checkpoint, histórico e idempotência; entradas de múltiplas fontes e mapeamento explícito testados | Pipeline implementado em base descartável. **Segundo scraper real bloqueado: falta nome da rede e loja/cidade/URL**. nenhum adaptador fictício é apresentado como real |
| [Cobertura](https://trello.com/c/BH1n2ro0) | 69 testes, incluindo 27 PostgreSQL, cobertura global Python 88% com branches | Critério técnico local; não equivale a cobertura Java/React nem aceite do grupo |
| [Homologação](https://trello.com/c/FVJqdyp5) | CLI demonstrada, prova de replay sem duplicação, falha parcial bloqueada, roteiro de aceite abaixo | Preparação técnica, sem homologação do time ou fluxo completo da aplicação |
| [Seeds](https://trello.com/c/4OFSMKLy) | Helper cria 3 mercados claramente sintéticos para laboratório | Não substitui seed de 30 produtos/histórico da equipe; nenhuma coleta de 3 redes foi feita |

## Arquivos e contrato de integração

- `coleta_fort_atacadista.py`: adaptação do piloto; valida item/preço/tempo, continua em erro parcial, limita paginação, exporta JSON/CSV e relatório. Contrato completo no README.
- `normalizacao.py`: transformação conservadora de cadastro. Mantém g/kg/ml/l/un como extraídos; não converte unidades nem calcula preço por unidade. Multipacks (também por extenso), múltiplas medidas, medidas assinadas e separador decimal/milhar ambíguo ficam pendentes, sem inferência silenciosa. EAN não é inventado.
- `pipeline.py`: carga de JSON já extraído em PostgreSQL. Usa parâmetros SQL, valida Decimal contra NUMERIC(10,2), rejeita arredondamento implícito, exige ID externo e timestamp com fuso. Insere cadastro produto apenas para origem ainda não conhecida. Não reescreve cadastro existente ou produto ligado manualmente. Uma assinatura da descrição normalizada, marca e medida de origem bloqueia mudanças sob o mesmo ID até revisão explícita, sem associar silenciosamente novo preço a outra embalagem.
- `ingest_schema.sql`: quatro tabelas auxiliares no schema `smartmarket_ingest`: source_store, source_product, run e event. Somente CREATE. Rastreiam loja, identidade externa/assinatura, execução e observação; não alteram DDL/JPA da equipe. As FKs auxiliares impedem exclusão de registros já ingeridos: retenção/arquivamento versus exclusão precisa ser acordado antes da integração com CRUD.
- `executar_pipeline.py`: orquestração por comando manual **somente de fixtures**. Checkpoint impede recoleta durante replay. Conteúdo/configuração alterados sob o mesmo run_id são rejeitados. Extração parcial não é carregada automaticamente.
- `preparar_banco_fixture.py`: cria base NOVA; se já existir, falha. Usa somente a parte CREATE do DDL atual da equipe, sem executar seus DROP. Insere três mercados sintéticos. Não limpa base existente.
- `tests/`: fixtures sintéticas e testes de regressão, contrato, falha parcial, SQL parametrizado, concorrência, rollback e replay.

Compatibilidade: JSON/CSV preservam os dez campos originais. `preco` permanece número JSON para consumidores existentes; HTTP e fixtures são decodificados com Decimal antes da validação; a exportação rejeita valores cuja representação numérica JSON perderia precisão e a carga lê JSON com Decimal. Metadados inválidos são rejeitados por item para não quebrar a serialização de todo o lote. Preço nulo promocional usa regular; promoção zero/negativa rejeita. Datas agora são UTC explícitas. O contrato deste piloto é BRL configurado: campos explícitos currency/moeda diferentes de BRL na página, item ou pricing são rejeitados. Campo ausente no legado não prova moeda: a premissa BRL precisa ser confirmada para cada fonte. Não há conversão cambial; a ingestão recusa moeda declarada incompatível. CSV é intercâmbio de dados brutos, não arquivo sanitizado para abrir em planilhas; nomes externos podem conter fórmulas. A carga lê JSON.

Persistência: tabelas de negócio seguem `backend/smartmarket_ddl_updated.sql` sem alteração. O DDL tem TIMESTAMP sem fuso, então `preco.coletado_em` recebe instante UTC sem tz por convenção; o evento auxiliar usa TIMESTAMPTZ. Essa convenção precisa ser preservada pelo backend. Não executamos migrations de produção, bancos remotos nem o script DROP da equipe.

Idempotência: run_id idêntico com mesmo conteúdo/mapeamento retorna replay, preservando as pendências; com conteúdo diferente falha. Hash v2 canonicaliza valores monetários, ID externo e instante UTC e ignora a ordem do lote; zeros finais/tipos numéricos ou offsets equivalentes não geram conflito falso. Outros dados materialmente alterados continuam a ser rejeitados. Evento único por fonte/loja/ID externo/instante; evento idêntico em outro run é ignorado; conteúdo divergente no mesmo instante falha e reverte a transação inteira. Nova observação em outro instante cria histórico mesmo se preço não mudou. Lock transacional PostgreSQL serializa ingestões e evita duplicação concorrente. A loja não pode mudar silenciosamente de mercado.

Identidade: fonte+loja+ID externo é a chave inicial. Duas redes não são fundidas automaticamente, mesmo com nome idêntico. Para associar a produto existente, usar `--mapping` com JSON `{"id-externo": produto_id}` revisado. Alterar vínculo já existente é bloqueado. Alterar descrição normalizada, marca ou embalagem para o mesmo ID também bloqueia o lote para revisão; mesmo reescritas possivelmente equivalentes do nome não são aceitas automaticamente. Cadastro/embalagem ambíguos aparecem em pendencias; não se afirma equivalência de produto sem revisão.

## Compatibilidade da revisão v2

**Criar base fixture nova.** O schema auxiliar v2 acrescenta source_signature e o hash usa novo contrato de canonicalização. Não foi feita migração dos bancos/checkpoints da primeira entrega: esquema antigo é detectado e rejeitado com mensagem específica. Os dados anteriores foram preservados. Não reutilizar a base demo antiga como prova da versão final.

A escrita por tempfile/replace protege contra interrupção do processo. Não há fsync nem garantia de durabilidade em queda de energia/SO. Os testes cobrem erro antes da carga e erro após COMMIT/antes do relatório; nesse segundo caso o replay recupera o relatório sem duplicar dados.

## Reprodução no Mac

Na raiz do checkout:

```sh
python3 -m venv scraper/.venv
scraper/.venv/bin/python -m pip install -r scraper/requirements-local.lock.txt
python3 -m unittest discover -s scraper/tests -v
```

Sem SMARTMARKET_TEST_DSN, 42 testes independentes passam e 27 testes PostgreSQL são explicitamente ignorados. O snapshot de dependências foi resolvido localmente com Python 3.11.14; testes independentes também executados em Python 3.14.7. PostgreSQL validado: 17 instalado no Mac; o compose da equipe usa 16, que ainda deve ser verificado. Nenhum container da equipe foi iniciado.

Ambiente PostgreSQL novo (cada pessoa deve escolher diretórios ainda inexistentes e porta livre):

```sh
mkdir -p /tmp/smartmarket-minha-coleta-socket
initdb -D /tmp/smartmarket-minha-coleta-db --auth-local=trust --auth-host=reject --no-locale -E UTF8
pg_ctl -D /tmp/smartmarket-minha-coleta-db -l /tmp/smartmarket-minha-coleta.log -o "-k /tmp/smartmarket-minha-coleta-socket -p 55437 -c listen_addresses=''" start
createdb -h /tmp/smartmarket-minha-coleta-socket -p 55437 smartmarket_fixture_admin
export SMARTMARKET_LOCAL_DSN='host=/tmp/smartmarket-minha-coleta-socket port=55437 dbname=smartmarket_fixture_admin'
scraper/.venv/bin/python scraper/preparar_banco_fixture.py --name smartmarket_fixture_demo
export SMARTMARKET_LOCAL_DSN='host=/tmp/smartmarket-minha-coleta-socket port=55437 dbname=smartmarket_fixture_demo'
scraper/.venv/bin/python scraper/executar_pipeline.py --fixture scraper/tests/fixtures/fort_valido.json --run-id demo01 --mercado-id 1
```

Repetir a última linha não duplica nada. Alterar fixture sob demo01 falha; para nova execução usar novo run_id. Para verificar rejeição de lote parcial, trocar por `fort_parcial.json` e run-id `parcial01`: deve falhar sem carregar produtos/preços.

```sh
export SMARTMARKET_TEST_DSN="$SMARTMARKET_LOCAL_DSN"
scraper/.venv/bin/python -m coverage run --rcfile=scraper/.coveragerc -m unittest discover -s scraper/tests -v
scraper/.venv/bin/python -m coverage report --rcfile=scraper/.coveragerc
pg_ctl -D /tmp/smartmarket-minha-coleta-db stop
```

A suite de integração cria novas bases `smartmarket_fixture_<id>` e as preserva como evidência; não apaga bases existentes. Socket apenas local, sem TCP; autenticação trust é exclusiva desse laboratório descartável. A carga recusa host remoto, banco padrão `smartmarket` e nomes fora de `smartmarket_fixture_*`. Não aponta para serviços existentes nem inclui senha no código. Esse bloqueio deve permanecer até revisão da integração pelo time.

Para carregar JSON de contrato validado separadamente, usar `pipeline.py --input ... --source ... --store ... --mercado-id ... --run-id ... [--mapping ...]`. Esse comando presume validação/revisão prévia do arquivo; não conhece relatório de extração parcial. Para o Fort fixture, preferir o orquestrador, que verifica o relatório e bloqueia parcial.

## Testes e evidências desta execução

- **Aprovados:** 69 testes (42 independentes + 27 com PostgreSQL), incluindo os quatro defeitos originais; 88% cobertura global combinada de statements/branches, limiar 70% aprovado; `git diff --check` limpo.
- **CLI final aprovada:** fixture completa cria 3 produtos e 3 preços; replay cria 0/0 e preserva os avisos de marca ausente. Dois mercados sintéticos podem compartilhar um produto por mapeamento explícito, validado em teste.
- **Falhas esperadas tratadas:** preço ausente/zero/negativo/NaN, item malformado, página inválida/erro HTTP simulado, lote parcial, conflito de run/evento, edição de checkpoint, tentativa de trocar mercado da loja e base já existente.
- **Não executados:** HTTP real de qualquer supermercado, segundo adaptador real, PostgreSQL16, banco/API remoto, UI/comparador/auth/E2E de toda a aplicação, revisão/aceite do time, scanner de vulnerabilidade das novas dependências Python. Não há retry HTTP automático nem agendamento de produção; existe reexecução segura da carga/checkpoint.
- O primeiro teste de integração da orquestração revelou colisão entre lojas sintéticas dos próprios testes. Os testes foram isolados por loja; a restrição correta de uma loja não mudar de mercado foi mantida. A suite final está verde.

Os comandos acima reproduzem os testes. Evidências da execução de publicação constam na descrição do PR; caminhos privados do ambiente de desenvolvimento não são necessários para o checkout de outro integrante.

## Automação existente e o que falta

Existe **orquestração por comando manual**: uma invocação executa as etapas automaticamente e pode ser repetida com segurança. Não existe cron, launchd, scheduler, timer ou automação de horário instalada/ativada. Assim, o cartão pipeline ainda não está concluído como coleta periódica operacional. Faltam frequência/fuso aprovados, mecanismo de agendamento, monitoramento/alerta, política de retries/limites da fonte, segunda rede e integração aprovada fora do laboratório. Nada disso foi ativado implicitamente.

## Limites após revisão de integração

O backend Java recalcula `nomeNormalizado` apenas no `@PrePersist`; esse problema de edição permanece fora desta entrega de coleta. A carga Python não edita produtos existentes: mudanças de descrição normalizada, marca ou embalagem do mesmo SKU são bloqueadas para revisão. A regressão PostgreSQL verifica que nome, nome normalizado e histórico permanecem coerentes após a tentativa rejeitada.

A fixture é criada pelo DDL versionado de develop, que fornece os defaults usados pela carga. Não foi validada compatibilidade com banco criado automaticamente pelo Hibernate. A criação de fixture não é migration; schema único, UTC, exclusão/retenção e integração com CRUD precisam de acordo com o backend.

## Pendências reais antes de entregar ao time

1. **Identificar segunda rede, loja/cidade e URL/fonte autorizada.** Sem isso não existe segundo scraper real entregue. Contrato/pipeline já aceitam outra fonte, mas isso não substitui seu adaptador.
2. Revalidar acesso autorizado, regras de uso e estrutura atual do Fort; os dados de setembro e as fixtures não atestam preços atuais. Confirmar loja 1585.
3. Revisar mapeamento canônico e embalagem/promoção elegível com Davi/Bruno/backend; os vínculos explícitos precisam de dono. Confirmar UTC no campo sem timezone e schema auxiliar antes de usar dados reais.
4. Resolver divergência main/develop com o responsável pelo projeto. Esta branch só contém coleta, testes e documentação; não incorpora features/testes frontend/JaCoCo de main.
5. O planejamento/PRD original continua não localizado; o PRD consolidado para validação não é aprovação do grupo. Alertas/geo e critérios gerais da aplicação dependem do documento e dos donos respectivos; não foram implementados nesta entrega.
6. Agendamento, retries da fonte, migração aprovada, PostgreSQL16 e integração API exigem etapa seguinte. Não ativar job que colete sites ou grave fora do laboratório sem essa revisão.
7. Homologação: revisar este diff, executar comandos acima, aprovar vínculos e contratos, depois integrar com comparador/seeds da equipe. Comentários de andamento não equivalem a conclusão dos cartões nem aceite externo.
