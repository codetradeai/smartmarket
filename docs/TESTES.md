# Guia de testes unitarios — SmartMarket

Meta do grupo: **manter pelo menos 70% de cobertura** no back-end (JaCoCo) e no front-end (Jest). Os comandos abaixo falham se a cobertura global ficar abaixo desse valor.

## Comandos

### Back-end (`backend/`)

JUnit 5, Mockito e AssertJ ja vem com `spring-boot-starter-test`. Os testes usam o perfil `test` (banco H2 em memoria, sem Docker).

```bash
cd backend
./mvnw test
```

No Windows (PowerShell):

```powershell
cd backend
.\mvnw.cmd test
```

Relatorio HTML do JaCoCo: `backend/target/site/jacoco/index.html`

### Front-end (`frontend/`)

Jest + React Testing Library.

```bash
cd frontend
npm test
npm run test:coverage
npm run test:watch
```

Relatorio HTML do Jest: `frontend/coverage/lcov-report/index.html`

---

## Como escrever um teste no back-end

Coloque as classes em `src/test/java`, no mesmo pacote da classe testada (ou em `...teste` se preferirem). Nome: `NomeDaClasseTest`.

### Unidade pura (sem Spring)

Use quando a classe nao precisa de contexto Spring — e o caso mais rapido e o que mais ajuda a cobertura.

```java
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProdutoServiceTest {

    @Mock
    ProdutoRepository produtoRepository;

    @InjectMocks
    ProdutoService produtoService;

    @Test
    void deveRetornarProdutoQuandoIdExiste() {
        Produto produto = new Produto();
        produto.setId(1L);
        produto.setNome("Arroz");

        when(produtoRepository.findById(1L)).thenReturn(Optional.of(produto));

        Produto resultado = produtoService.buscarPorId(1L);

        assertThat(resultado.getNome()).isEqualTo("Arroz");
        verify(produtoRepository).findById(1L);
    }
}
```

Padrao:

1. **Arrange** — dados e `when(...)` nos mocks.
2. **Act** — chama o metodo de producao.
3. **Assert** — `assertThat` (AssertJ) e, se fizer sentido, `verify` no mock.

Nao suba `@SpringBootTest` para testar regra de negocio. Esse annotation e para teste de integracao (o `SmartMarketApplicationTests` ja cobre o contexto).

### O que contar para os 70%

- Cubra servicos, utilitarios e controllers (com `MockMvc` se precisar).
- A classe `SmartMarketApplication` fica fora do JaCoCo (so sobe a aplicacao).
- Teste caminhos felizes **e** erros (ifs, `Optional` vazio, validacao). Branches descobertos derrubam a cobertura de *branch*.

---

## Como escrever um teste no front-end

Arquivos `*.test.jsx` ou `*.spec.jsx` ao lado do componente (exemplo: `App.test.jsx`).

```jsx
import { render, screen } from '@testing-library/react'
import ListaPrecos from './ListaPrecos'

describe('ListaPrecos', () => {
  it('mostra mensagem quando nao ha itens', () => {
    render(<ListaPrecos itens={[]} />)
    expect(screen.getByText(/nenhum preco/i)).toBeInTheDocument()
  })
})
```

Boas praticas:

- Busque o que a pessoa usuaria ve: `getByRole`, `getByLabelText`, `getByText`. Evite `getByTestId` como primeira opcao.
- Teste comportamento, nao CSS de Tailwind.
- `src/main.jsx` (ponto de entrada) nao entra na cobertura.
- Paginas e componentes novos **entram** na cobertura: crie o teste junto com o componente.

Se o componente usa `react-router-dom` (`useNavigate`, `Link`, `useParams`), envolva com `MemoryRouter`:

```jsx
import { MemoryRouter } from 'react-router-dom'

render(
  <MemoryRouter>
    <MeuComponente />
  </MemoryRouter>,
)
```

---

## Checklist da meta de 70%

1. Toda classe/funcao de regra de negocio nova deve nascer com teste.
2. Antes do PR: rode `./mvnw test` e `npm run test:coverage`.
3. Abra o HTML de cobertura e procure vermelho (linhas sem teste).
4. Nao baixe o limiar no `pom.xml` (`coverage.minimum`) nem no `jest.config.cjs` (`coverageThreshold`) sem acordo do grupo.

Se o build falhar por cobertura, o relatorio mostra o percentual atual. Escreva testes para o codigo novo; nao comente o plugin para “passar o CI”.
