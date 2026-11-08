package com.smartmarket.dto;

import com.smartmarket.dto.auth.LoginRequest;
import com.smartmarket.dto.auth.RegisterRequest;
import com.smartmarket.dto.lista.ItemListaRequest;
import com.smartmarket.dto.lista.ListaCompraRequest;
import com.smartmarket.dto.lista.ListaRequest;
import com.smartmarket.dto.mercado.MercadoRequest;
import com.smartmarket.dto.produto.ProdutoRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.function.BiConsumer;
import java.util.function.IntFunction;
import java.util.function.Supplier;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Os limites dos DTOs acompanham as colunas do schema (VARCHAR 255/50/500). Sem eles, o excesso
 * estourava no banco e o cliente recebia 409 "Violacao de integridade" sem saber qual campo.
 */
class TamanhoMaximoDosCamposTest {

    private static ValidatorFactory fabrica;
    private static Validator validador;

    @BeforeAll
    static void abrir() {
        fabrica = Validation.buildDefaultValidatorFactory();
        validador = fabrica.getValidator();
    }

    @AfterAll
    static void fechar() {
        fabrica.close();
    }

    private static String texto(int tamanho) {
        return "a".repeat(tamanho);
    }

    /** E-mail valido para o @Email (parte local ate 64, rotulos do dominio ate 63) com o tamanho pedido. */
    private static String emailCom(int tamanho) {
        StringBuilder email = new StringBuilder("a".repeat(60)).append('@');
        int restante = tamanho - email.length();
        while (restante > 67) {
            email.append("b".repeat(60)).append('.');
            restante -= 61;
        }
        return email.append("b".repeat(restante - 4)).append(".com").toString();
    }

    /** Verifica que o campo aceita exatamente o limite e rejeita um caractere a mais. */
    private static <T> void verificarLimite(String campo, int limite, Supplier<T> novo,
                                            BiConsumer<T, String> definir, IntFunction<String> valor) {
        T noLimite = novo.get();
        definir.accept(noLimite, valor.apply(limite));
        assertThat(violacoesDe(noLimite, campo)).as(campo + " com " + limite + " caracteres").isEmpty();

        T acima = novo.get();
        definir.accept(acima, valor.apply(limite + 1));
        assertThat(violacoesDe(acima, campo)).as(campo + " com " + (limite + 1) + " caracteres").hasSize(1);
    }

    private static <T> List<ConstraintViolation<T>> violacoesDe(T objeto, String campo) {
        return validador.validate(objeto).stream()
            .filter(v -> v.getPropertyPath().toString().equals(campo))
            .toList();
    }

    private static RegisterRequest registroValido() {
        RegisterRequest r = new RegisterRequest();
        r.setNome("Maria");
        r.setEmail("maria@email.com");
        r.setSenha("senha123");
        return r;
    }

    private static ProdutoRequest produtoValido() {
        return ProdutoRequest.builder().nome("Arroz").categoria("Mercearia").build();
    }

    @Test
    void registroLimitaNomeEmailESenha() {
        verificarLimite("nome", 255, TamanhoMaximoDosCamposTest::registroValido, RegisterRequest::setNome,
            TamanhoMaximoDosCamposTest::texto);
        verificarLimite("email", 255, TamanhoMaximoDosCamposTest::registroValido, RegisterRequest::setEmail,
            TamanhoMaximoDosCamposTest::emailCom);
        // 72 e o maximo que o BCrypt considera.
        verificarLimite("senha", 72, TamanhoMaximoDosCamposTest::registroValido, RegisterRequest::setSenha,
            TamanhoMaximoDosCamposTest::texto);
    }

    @Test
    void loginLimitaEmail() {
        verificarLimite("email", 255, () -> {
            LoginRequest l = new LoginRequest();
            l.setSenha("senha123");
            return l;
        }, LoginRequest::setEmail, TamanhoMaximoDosCamposTest::emailCom);
    }

    @Test
    void produtoAcompanhaColunasDoSchema() {
        verificarLimite("nome", 255, TamanhoMaximoDosCamposTest::produtoValido, ProdutoRequest::setNome,
            TamanhoMaximoDosCamposTest::texto);
        verificarLimite("marca", 255, TamanhoMaximoDosCamposTest::produtoValido, ProdutoRequest::setMarca,
            TamanhoMaximoDosCamposTest::texto);
        verificarLimite("unidade", 50, TamanhoMaximoDosCamposTest::produtoValido, ProdutoRequest::setUnidade,
            TamanhoMaximoDosCamposTest::texto);
        verificarLimite("codigoBarras", 50, TamanhoMaximoDosCamposTest::produtoValido, ProdutoRequest::setCodigoBarras,
            TamanhoMaximoDosCamposTest::texto);
        verificarLimite("categoria", 255, TamanhoMaximoDosCamposTest::produtoValido, ProdutoRequest::setCategoria,
            TamanhoMaximoDosCamposTest::texto);
        verificarLimite("imagemUrl", 500, TamanhoMaximoDosCamposTest::produtoValido, ProdutoRequest::setImagemUrl,
            TamanhoMaximoDosCamposTest::texto);
    }

    @Test
    void mercadoAcompanhaColunasDoSchema() {
        Supplier<MercadoRequest> valido = () -> MercadoRequest.builder().nome("Mercado").build();
        verificarLimite("nome", 255, valido, MercadoRequest::setNome, TamanhoMaximoDosCamposTest::texto);
        verificarLimite("endereco", 500, valido, MercadoRequest::setEndereco, TamanhoMaximoDosCamposTest::texto);
        verificarLimite("logoUrl", 500, valido, MercadoRequest::setLogoUrl, TamanhoMaximoDosCamposTest::texto);
    }

    @Test
    void listaLimitaONome() {
        verificarLimite("nome", 255, () -> ListaRequest.builder().nome("Lista").build(), ListaRequest::setNome,
            TamanhoMaximoDosCamposTest::texto);
        verificarLimite("nome", 255, () -> ListaCompraRequest.builder().nome("Lista").build(),
            ListaCompraRequest::setNome, TamanhoMaximoDosCamposTest::texto);
    }

    @Test
    void quantidadeDoItemTemTeto() {
        Supplier<ItemListaRequest> valido = () -> new ItemListaRequest(1L, 1);
        verificarLimite("quantidade", 999, valido, (item, q) -> item.setQuantidade(Integer.valueOf(q)),
            n -> String.valueOf(n));
    }

    @Test
    void listasLimitamAQuantidadeDeItens() {
        verificarLimite("itens", 100, () -> ListaRequest.builder().nome("Lista").build(),
            (lista, n) -> lista.setItens(itens(Integer.parseInt(n))), n -> String.valueOf(n));
        verificarLimite("itens", 100, () -> ListaCompraRequest.builder().nome("Lista").build(),
            (lista, n) -> lista.setItens(itens(Integer.parseInt(n))), n -> String.valueOf(n));
    }

    private static List<ItemListaRequest> itens(int quantidade) {
        return java.util.stream.IntStream.range(0, quantidade)
            .mapToObj(i -> new ItemListaRequest((long) i + 1, 1))
            .toList();
    }
}
