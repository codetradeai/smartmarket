package com.smartmarket.exception;

public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String recurso, Long id) {
        super(recurso + " com id " + id + " nao encontrado(a)");
    }

    public ResourceNotFoundException(String mensagem) {
        super(mensagem);
    }
}
