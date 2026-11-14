package com.smartmarket.config;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.filter.ShallowEtagHeaderFilter;

/** ETag só para a lista pública de filiais: quem já tem a lista recebe 304 em vez de reenviá-la. */
@Configuration
public class FiliaisHttpConfig {

    @Bean
    public FilterRegistrationBean<ShallowEtagHeaderFilter> etagDasFiliais() {
        FilterRegistrationBean<ShallowEtagHeaderFilter> registro = new FilterRegistrationBean<>(new ShallowEtagHeaderFilter());
        registro.addUrlPatterns("/api/lojas/filiais");
        registro.setName("etagDasFiliais");
        return registro;
    }
}
