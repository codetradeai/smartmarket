"""Identificação do SmartMarketBot nas requisições às redes.

O contato do User-Agent vem da variável de ambiente SMARTMARKET_CONTATO (ex.: URL do repositório),
nunca do código. Sem ela, qualquer requisição real falha com mensagem clara; o modo offline
(fixtures) não precisa da variável, porque o User-Agent só é montado na hora da requisição.
"""
import os

VAR_CONTATO = "SMARTMARKET_CONTATO"


class ErroConfiguracao(RuntimeError):
    pass


def user_agent(ambiente=None):
    """User-Agent identificável, com o contato de SMARTMARKET_CONTATO."""
    contato = ((ambiente if ambiente is not None else os.environ).get(VAR_CONTATO) or "").strip()
    if not contato:
        raise ErroConfiguracao(
            f"Defina a variável de ambiente {VAR_CONTATO} com um contato do projeto "
            f"(ex.: URL do repositório) antes de consultar as redes."
        )
    return f"SmartMarketBot/0.1 (projeto academico Codifica/+praTI; contato: {contato})"


def com_user_agent(headers=None, ambiente=None):
    """Cópia dos cabeçalhos com o User-Agent do SmartMarketBot."""
    return {**(headers or {}), "User-Agent": user_agent(ambiente)}
