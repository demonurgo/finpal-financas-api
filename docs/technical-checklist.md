# Checklist Tecnico

Checklist de revisao tecnica e hardening da API do Finpal.

## Hardening concluido nesta branch

- [x] Validar compatibilidade entre `type` e categoria em updates de transacoes, inclusive quando so o tipo muda
- [x] Cobrir a regressao de update de transacao com testes unitarios
- [x] Remover arquivos `.env` e variantes do contexto de build Docker
- [x] Trocar `COPY . .` por copias explicitas no `Dockerfile`
- [x] Desabilitar `SEED_SAMPLE_DATA` por padrao no `.env.example`
- [x] Bloquear `SEED_SAMPLE_DATA=true` em producao
- [x] Bloquear `JWT_SECRET` padrao em producao
- [x] Exigir `JWT_SECRET` presente no startup
- [x] Aplicar `helmet` e remover o header `x-powered-by`
- [x] Aplicar rate limit global na API
- [x] Aplicar rate limit mais restrito em `POST /auth/register`
- [x] Aplicar rate limit mais restrito em `POST /auth/login`
- [x] Cobrir hardening HTTP, autenticacao e Docker com testes automatizados
- [x] Normalizar e-mails no cadastro e no login para evitar duplicidade por caixa e espacos
- [x] Validar UUIDs nas rotas e filtros antes de tocar no banco
- [x] Expor um endpoint publico de healthcheck com verificacao de banco
- [x] Bloquear exclusao de categoria com transacoes vinculadas por regra de negocio explicita
- [x] Executar validacoes automaticas em CI com lint, build, testes e smoke Docker

## Aderencia ao desafio

- [x] Cadastro de usuarios com nome, e-mail e senha
- [x] Autenticacao JWT e rotas privadas protegidas
- [x] Criacao, listagem, edicao e exclusao de transacoes do proprio usuario
- [x] Endpoint de resumo com entradas, saidas e saldo final
- [x] Uso de TypeScript em toda a aplicacao
- [x] Uso de NestJS com adaptador HTTP padrao do Express
- [x] Uso de banco relacional PostgreSQL
- [x] Docker para execucao do projeto
- [x] Testes unitarios e end-to-end cobrindo fluxos felizes e negativos
- [x] Diferenciais valorizados entregues: filtros/paginacao, hash de senha, validacao, seeds, Swagger, separacao modular e boas praticas de seguranca

## Itens ainda recomendados

- [ ] Endurecer a imagem final para rodar com usuario nao-root
- [ ] Revisar se o Swagger deve permanecer habilitado em todos os ambientes
- [ ] Ajustar a cobertura para ignorar arquivos gerados do Prisma
- [ ] Melhorar o preflight dos testes e2e quando o Docker daemon nao estiver ativo
