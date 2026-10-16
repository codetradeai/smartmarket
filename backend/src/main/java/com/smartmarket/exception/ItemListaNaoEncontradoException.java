package com.smartmarket.exception;

public class ItemListaNaoEncontradoException extends RuntimeException {

    public ItemListaNaoEncontradoException(Long id) {
        super("Item da lista com id " + id + " nao encontrado");
    }
}
