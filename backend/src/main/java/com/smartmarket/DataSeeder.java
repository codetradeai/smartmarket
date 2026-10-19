package com.smartmarket;

import com.smartmarket.model.*;
import com.smartmarket.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Fallback do perfil dev quando data.sql nao carregou.
 * A massa canonica fica em src/main/resources/data.sql.
 * Este runner so preenche um banco ainda sem mercado.
 */
@Slf4j
@Component
@Profile("dev")
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final MercadoRepository mercadoRepository;
    private final ProdutoRepository produtoRepository;
    private final PrecoRepository precoRepository;
    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        if (mercadoRepository.count() > 0) {
            log.info("Banco ja possui dados. Seed ignorado.");
            return;
        }

        log.info("Executando seed de dados de desenvolvimento...");

        // ---------------------------------------------------------------
        // 1. MERCADOS
        // ---------------------------------------------------------------
        Mercado fort = mercadoRepository.save(Mercado.builder()
            .nome("Fort Atacadista").endereco("Florianópolis, SC").logoUrl(null).ativo(true).build());
        Mercado carrefour = mercadoRepository.save(Mercado.builder()
            .nome("Carrefour").endereco("Nacional").logoUrl(null).ativo(true).build());
        Mercado big = mercadoRepository.save(Mercado.builder()
            .nome("Big Bompreço").endereco("Nordeste / Sul").logoUrl(null).ativo(true).build());

        log.info("3 mercados criados: Fort({}), Carrefour({}), Big({})", fort.getId(), carrefour.getId(), big.getId());

        // ---------------------------------------------------------------
        // 2. PRODUTOS — baseados nos dados mockados do frontend
        // ---------------------------------------------------------------
        List<Object[]> produtosData = List.of(
            new Object[]{"Arroz Branco Tipo 1",   "Tio João",    5.0, "kg",    "Grãos, Arroz e Feijão",  22.90, 24.50, 23.80},
            new Object[]{"Arroz Parboilizado",     "Camil",       5.0, "kg",    "Grãos, Arroz e Feijão",  21.49, 22.90, 21.99},
            new Object[]{"Feijão Carioca",         "Camil",       1.0, "kg",    "Grãos, Arroz e Feijão",  7.89,  8.50,  7.99},
            new Object[]{"Feijão Preto",           "Kicaldo",     1.0, "kg",    "Grãos, Arroz e Feijão",  8.49,  9.20,  8.79},
            new Object[]{"Lentilha",               "Yoki",        0.5, "kg",    "Grãos, Arroz e Feijão",  5.49,  6.10,  null},
            new Object[]{"Grão-de-Bico",           "Predilecta",  0.5, "kg",    "Grãos, Arroz e Feijão",  6.29,  6.80,  6.49},
            new Object[]{"Macarrão Espaguete",     "Barilla",     0.5, "kg",    "Grãos, Arroz e Feijão",  4.99,  5.50,  5.19},
            new Object[]{"Macarrão Parafuso",      "Galo",        0.5, "kg",    "Grãos, Arroz e Feijão",  3.49,  3.90,  3.59},
            new Object[]{"Leite Integral UHT",     "Italac",      1.0, "L",     "Leites e Derivados",     4.29,  4.79,  4.49},
            new Object[]{"Leite Desnatado UHT",    "Piracanjuba", 1.0, "L",     "Leites e Derivados",     4.59,  5.10,  4.79},
            new Object[]{"Leite em Pó Integral",   "Ninho",       0.4, "kg",    "Leites e Derivados",     16.90, 18.50, 17.49},
            new Object[]{"Iogurte Natural",        "Danone",      0.17,"kg",    "Leites e Derivados",     3.29,  3.50,  3.39},
            new Object[]{"Creme de Leite",         "Nestlé",      0.2, "kg",    "Leites e Derivados",     3.79,  4.20,  3.99},
            new Object[]{"Óleo de Soja",           "Liza",        0.9, "L",     "Óleos e Gorduras",       6.49,  7.20,  6.89},
            new Object[]{"Óleo de Milho",          "Mazola",      0.9, "L",     "Óleos e Gorduras",       8.99,  9.80,  9.29},
            new Object[]{"Azeite Extra Virgem",    "Gallo",       0.5, "L",     "Óleos e Gorduras",       22.90, 25.50, 23.99},
            new Object[]{"Café Torrado e Moído",   "Pilão",       0.5, "kg",    "Café e Achocolatados",   14.90, 16.50, 15.49},
            new Object[]{"Café Extraforte",        "Melitta",     0.5, "kg",    "Café e Achocolatados",   15.49, 17.20, 15.99},
            new Object[]{"Achocolatado em Pó",     "Toddy",       0.4, "kg",    "Café e Achocolatados",   9.29,  10.50, 9.79},
            new Object[]{"Papel Higiênico",        "Neve",        12.0,"un",    "Higiene e Limpeza",      18.90, 21.00, 19.49},
            new Object[]{"Detergente Líquido",     "Ypê",         0.5, "L",     "Higiene e Limpeza",      2.49,  2.80,  2.59},
            new Object[]{"Sabão em Pó",            "Omo",         1.0, "kg",    "Higiene e Limpeza",      14.49, 15.90, 14.99}
        );

        LocalDateTime agora = LocalDateTime.now();

        for (Object[] dados : produtosData) {
            Produto produto = produtoRepository.save(Produto.builder()
                .nome((String) dados[0])
                .marca((String) dados[1])
                .quantidade((Double) dados[2])
                .unidade((String) dados[3])
                .categoria((String) dados[4])
                .build());

            // Preço Fort Atacadista
            if (dados[5] != null) {
                precoRepository.save(Preco.builder()
                    .produto(produto).mercado(fort)
                    .valor(BigDecimal.valueOf((Double) dados[5]))
                    .coletadoEm(agora).disponivel(true).build());
            }
            // Preço Carrefour
            if (dados[6] != null) {
                precoRepository.save(Preco.builder()
                    .produto(produto).mercado(carrefour)
                    .valor(BigDecimal.valueOf((Double) dados[6]))
                    .coletadoEm(agora).disponivel(true).build());
            }
            // Preço Big Bompreço
            if (dados[7] != null) {
                precoRepository.save(Preco.builder()
                    .produto(produto).mercado(big)
                    .valor(BigDecimal.valueOf((Double) dados[7]))
                    .coletadoEm(agora).disponivel(true).build());
            }
        }

        log.info("{} produtos e seus precos criados.", produtosData.size());

        // ---------------------------------------------------------------
        // 3. USUÁRIO ADMIN
        // ---------------------------------------------------------------
        if (!usuarioRepository.existsByEmail("davi@smartmarket.com.br")) {
            usuarioRepository.save(Usuario.builder()
                .nome("Davi Souza")
                .email("davi@smartmarket.com.br")
                .senha(passwordEncoder.encode("admin123"))
                .papel(Papel.ADMIN)
                .build());
            log.info("Usuario admin criado: davi@smartmarket.com.br");
        }

        if (!usuarioRepository.existsByEmail("maria@email.com")) {
            usuarioRepository.save(Usuario.builder()
                .nome("Maria Santos")
                .email("maria@email.com")
                .senha(passwordEncoder.encode("user123"))
                .papel(Papel.USER)
                .build());
            log.info("Usuario teste criado: maria@email.com");
        }

        log.info("Seed de desenvolvimento concluido com sucesso!");
    }
}
