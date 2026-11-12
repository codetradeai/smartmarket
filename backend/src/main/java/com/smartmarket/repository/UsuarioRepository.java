package com.smartmarket.repository;

import com.smartmarket.model.Papel;
import com.smartmarket.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.Optional;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    Optional<Usuario> findByEmail(String email);
    boolean existsByEmail(String email);

    // E-mail e tratado sem diferenciar maiusculas. Contas antigas podem ter sido gravadas com
    // maiusculas, e duplicatas legadas por caixa podem existir: a busca devolve a mais antiga.
    boolean existsByEmailIgnoreCase(String email);
    Optional<Usuario> findFirstByEmailIgnoreCaseOrderByIdAsc(String email);
    long countByPapel(Papel papel);

    /** Tira a loja preferida de quem escolheu uma das lojas dadas (usado ao apagar um mercado). */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update Usuario u set u.lojaPreferida = null where u.lojaPreferida.id in :lojaIds")
    int limparLojaPreferida(@Param("lojaIds") Collection<Long> lojaIds);

    /**
     * Grava só a localização (cep, cidade, uf, latitude, longitude) do usuário. Não toca em mais nada:
     * quem leu o usuário antes de esperar a consulta de CEP não sobrescreve, por exemplo, uma troca
     * de papel feita nesse intervalo. Devolve quantas linhas mudaram (0 = usuário não existe).
     */
    @Modifying(clearAutomatically = true)
    @Query("update Usuario u set u.cep = :cep, u.cidade = :cidade, u.uf = :uf, "
        + "u.latitude = :latitude, u.longitude = :longitude where u.email = :email")
    int atualizarLocalizacaoPorEmail(@Param("email") String email, @Param("cep") String cep,
                                     @Param("cidade") String cidade, @Param("uf") String uf,
                                     @Param("latitude") Double latitude, @Param("longitude") Double longitude);
}
