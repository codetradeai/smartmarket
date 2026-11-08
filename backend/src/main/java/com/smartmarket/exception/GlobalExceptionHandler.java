package com.smartmarket.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import jakarta.validation.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.ErrorResponse;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    // ResourceNotFoundException e lancada por Favorito/Alerta/Mercado/Preco/
    // Promocao/AdminService. Sem este mapeamento ela sobe como 500 (e, no
    // MockMvc, como ServletException) em vez do 404 que a API documenta.
    @ExceptionHandler({ListaNaoEncontradaException.class, ItemListaNaoEncontradoException.class,
                       ProdutoNaoEncontradoException.class, ResourceNotFoundException.class})
    public ResponseEntity<Map<String, Object>> naoEncontrado(RuntimeException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(Map.of("erro", ex.getMessage()));
    }

    @ExceptionHandler(FiltroInvalidoException.class)
    public ResponseEntity<Map<String, Object>> filtroInvalido(FiltroInvalidoException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(Map.of("erro", ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> dadosInvalidos(MethodArgumentNotValidException ex) {
        Map<String, String> campos = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors()
            .forEach(erro -> campos.put(erro.getField(), erro.getDefaultMessage()));

        Map<String, Object> corpo = new LinkedHashMap<>();
        corpo.put("erro", "Dados invalidos");
        corpo.put("campos", campos);

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(corpo);
    }

    // Entrada malformada do cliente e erro 4xx, nao falha do servidor: sem log ERROR com stack e
    // sem expor o detalhe do parser. Antes caia no fallback e virava 500.
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> corpoIlegivel(HttpMessageNotReadableException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(Map.of("erro", "Corpo da requisicao invalido"));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, Object>> parametroComTipoErrado(MethodArgumentTypeMismatchException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(Map.of("erro", "Parametro invalido: " + ex.getName()));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<Map<String, Object>> restricaoViolada(ConstraintViolationException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(Map.of("erro", "Requisicao invalida"));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> argumentoInvalido(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(Map.of("erro", ex.getMessage()));
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<Map<String, Object>> credenciaisInvalidas(BadCredentialsException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
            .body(Map.of("erro", "Email ou senha incorretos"));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> acessoNegado(AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(Map.of("erro", "Acesso negado. Permissao insuficiente."));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> conflito(DataIntegrityViolationException ex) {
        // So a primeira linha da causa (ex.: nome da constraint): a linha "Detail" do Postgres traz
        // os valores gravados, que nao devem ir para o log. O cliente nunca ve a causa.
        String causa = String.valueOf(ex.getMostSpecificCause().getMessage()).lines().findFirst().orElse("");
        log.warn("Violacao de integridade de dados: {}", causa);
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(Map.of("erro", "Violacao de integridade de dados"));
    }

    // Fallback: qualquer erro nao mapeado vira 500 com corpo generico. O detalhe
    // fica apenas no log, ligado ao identificador devolvido ao cliente.
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> erroInesperado(Exception ex) {
        // Excecoes do proprio Spring MVC (405, 404, 400 de corpo ilegivel...) ja carregam
        // o status correto; preserva-o no mesmo formato {"erro": ...}.
        if (ex instanceof ErrorResponse er && er.getStatusCode().is4xxClientError()) {
            return ResponseEntity.status(er.getStatusCode())
                .body(Map.of("erro", "Requisicao invalida"));
        }
        String id = UUID.randomUUID().toString();
        log.error("Erro interno nao tratado [id={}]", id, ex);
        Map<String, Object> corpo = new LinkedHashMap<>();
        corpo.put("erro", "Erro interno do servidor");
        corpo.put("id", id);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(corpo);
    }
}
