# =========================================================
# Multi-stage Dockerfile para SmartMarket Backend (Spring Boot)
# =========================================================

# Estagio 1: Build da aplicacao
FROM eclipse-temurin:17-jdk-alpine AS builder
WORKDIR /workspace

# Copia arquivos de build do Maven
COPY pom.xml mvnw ./
COPY .mvn .mvn

# Concede permissao de execucao ao wrapper Maven
RUN chmod +x mvnw

# Baixa dependencias em cache
RUN ./mvnw dependency:go-offline -B

# Copia o codigo-fonte
COPY src src

# Realiza o empacotamento do JAR executavel sem rodar testes na imagem
RUN ./mvnw clean package -DskipTests -B

# Estagio 2: Runtime enxuto e seguro (JRE)
FROM eclipse-temurin:17-jre-alpine AS runner
WORKDIR /app

# Criacao de usuario nao-root para seguranca corporativa
RUN addgroup -S smartmarket && adduser -S smartmarket -G smartmarket

# Copia o artefato compilado a partir do estagio de build
COPY --from=builder /workspace/target/smartmarket-backend-*.jar app.jar

# Define permissoes adequadas
RUN chown -R smartmarket:smartmarket /app
USER smartmarket

# Variaveis de ambiente padrao
ENV SPRING_PROFILES_ACTIVE=prod \
    JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -Djava.security.egd=file:/dev/./urandom"

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
