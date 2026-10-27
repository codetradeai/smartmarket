package com.smartmarket.exception;

public class ListaNaoEncontradaException extends RuntimeException {

    public ListaNaoEncontradaException(Long id) {
        super("Lista de compras com id " + id + " nao encontrada");
    }
}
