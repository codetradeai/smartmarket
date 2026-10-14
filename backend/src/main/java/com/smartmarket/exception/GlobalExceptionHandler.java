package com.smartmarket.exception;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler({ListaNaoEncontradaException.class, ItemListaNaoEncontradoException.class,
            ProdutoNaoEncontradoException.class})
    public ResponseEntity<Map<String, Object>> naoEncontrado(RuntimeException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
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

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> conflito(DataIntegrityViolationException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(Map.of("erro", "Violacao de integridade de dados"));
    }
}
