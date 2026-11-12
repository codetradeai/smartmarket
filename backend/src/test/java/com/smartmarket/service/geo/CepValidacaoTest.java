package com.smartmarket.service.geo;

import com.smartmarket.dto.auth.RegisterRequest;
import com.smartmarket.dto.localizacao.CepRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class CepValidacaoTest {

    private static ValidatorFactory fabrica;
    private static Validator validator;

    @BeforeAll
    static void abre() {
        fabrica = Validation.buildDefaultValidatorFactory();
        validator = fabrica.getValidator();
    }

    @AfterAll
    static void fecha() {
        fabrica.close();
    }

    private static Set<ConstraintViolation<RegisterRequest>> errosDoCadastro(String cep) {
        RegisterRequest r = new RegisterRequest();
        r.setNome("Maria");
        r.setEmail("maria@email.com");
        r.setSenha("senha123");
        r.setCep(cep);
        return validator.validate(r);
    }

    @ParameterizedTest
    @ValueSource(strings = {"90010-000", "90010000", "  90010-000  ", "00000-000"})
    void cepBemFormadoPassa(String cep) {
        assertThat(errosDoCadastro(cep)).isEmpty();
    }

    @ParameterizedTest
    @ValueSource(strings = {"9001-000", "90010-00", "900100000", "90010--000", "9001A-000", "abcde-fgh",
        "90.010-000", "90010 000", "-90010000", "90010-0000"})
    void cepMalFormadoFalhaNoCampoCep(String cep) {
        Set<ConstraintViolation<RegisterRequest>> erros = errosDoCadastro(cep);
        assertThat(erros).hasSize(1);
        ConstraintViolation<RegisterRequest> erro = erros.iterator().next();
        assertThat(erro.getPropertyPath().toString()).isEqualTo("cep");
        assertThat(erro.getMessage()).isEqualTo(Cep.MENSAGEM_INVALIDO);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   "})
    void cepAusenteOuEmBrancoEObrigatorio(String cep) {
        Set<ConstraintViolation<RegisterRequest>> erros = errosDoCadastro(cep);
        assertThat(erros).extracting(e -> e.getPropertyPath().toString()).containsOnly("cep");
        assertThat(erros).extracting(ConstraintViolation::getMessage).contains("CEP e obrigatorio");
    }

    @Test
    void trocaDeCepUsaAMesmaRegra() {
        CepRequest ok = new CepRequest();
        ok.setCep(" 90010-000 ");
        assertThat(validator.validate(ok)).isEmpty();

        CepRequest ruim = new CepRequest();
        ruim.setCep("123");
        assertThat(validator.validate(ruim)).hasSize(1);

        assertThat(validator.validate(new CepRequest())).isNotEmpty();
    }

    @Test
    void normalizarTiraOHifenEOsEspacos() {
        assertThat(Cep.normalizar("90010-000")).isEqualTo("90010000");
        assertThat(Cep.normalizar("90010000")).isEqualTo("90010000");
        assertThat(Cep.normalizar("  90010-000 ")).isEqualTo("90010000");
    }
}
