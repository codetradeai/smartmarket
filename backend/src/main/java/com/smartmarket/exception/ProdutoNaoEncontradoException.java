package com.smartmarket.exception;

public class ProdutoNaoEncontradoException extends RuntimeException {

    public ProdutoNaoEncontradoException(Long id) {
        super("Produto com id " + id + " nao encontrado");
    }
}
