package com.smartmarket.service;

import com.smartmarket.dto.admin.PainelAdminResponse;
import com.smartmarket.dto.admin.UsuarioResponse;
import com.smartmarket.exception.ResourceNotFoundException;
import com.smartmarket.model.Papel;
import com.smartmarket.model.Usuario;
import com.smartmarket.repository.AlertaRepository;
import com.smartmarket.repository.MercadoRepository;
import com.smartmarket.repository.ProdutoRepository;
import com.smartmarket.repository.PromocaoRepository;
import com.smartmarket.repository.UsuarioRepository;
import com.smartmarket.security.UsuarioAutenticado;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final ProdutoRepository produtoRepository;
    private final MercadoRepository mercadoRepository;
    private final UsuarioRepository usuarioRepository;
    private final AlertaRepository alertaRepository;
    private final PromocaoRepository promocaoRepository;
    private final UsuarioAutenticado usuarioAutenticado;

    @Transactional(readOnly = true)
    public PainelAdminResponse painel() {
        LocalDate hoje = LocalDate.now();
        return PainelAdminResponse.builder()
            .produtos(produtoRepository.count())
            .mercados(mercadoRepository.count())
            .mercadosAtivos(mercadoRepository.countByAtivoTrue())
            .usuarios(usuarioRepository.count())
            .alertasAtivos(alertaRepository.countByAtivoTrue())
            .promocoesVigentes(promocaoRepository
                .countByDataInicioLessThanEqualAndDataFimGreaterThanEqual(hoje, hoje))
            .build();
    }

    @Transactional(readOnly = true)
    public Page<UsuarioResponse> listarUsuarios(Pageable pageable) {
        return usuarioRepository.findAll(pageable).map(UsuarioResponse::from);
    }

    @Transactional
    public UsuarioResponse alterarPapel(Long usuarioId, String papelInformado) {
        Papel novoPapel = interpretarPapel(papelInformado);
        Usuario usuario = usuarioRepository.findById(usuarioId)
            .orElseThrow(() -> new ResourceNotFoundException("Usuario", usuarioId));

        if (usuario.getPapel() == novoPapel) {
            return UsuarioResponse.from(usuario);
        }

        Usuario ator = usuarioAutenticado.atual();
        if (usuario.getId().equals(ator.getId())) {
            throw new IllegalArgumentException("Voce nao pode alterar o proprio papel.");
        }

        if (usuario.getPapel() == Papel.ADMIN && usuarioRepository.countByPapel(Papel.ADMIN) <= 1) {
            throw new IllegalArgumentException("O sistema precisa manter ao menos um administrador.");
        }

        usuario.setPapel(novoPapel);
        return UsuarioResponse.from(usuarioRepository.save(usuario));
    }

    private Papel interpretarPapel(String papelInformado) {
        try {
            return Papel.valueOf(papelInformado.trim().toUpperCase());
        } catch (IllegalArgumentException | NullPointerException ex) {
            throw new IllegalArgumentException("Papel invalido. Use USER ou ADMIN.");
        }
    }
}
