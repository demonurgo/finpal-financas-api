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

## Itens ainda recomendados

- [ ] Endurecer a imagem final para rodar com usuario nao-root
- [ ] Revisar se o Swagger deve permanecer habilitado em todos os ambientes
- [ ] Ajustar a cobertura para ignorar arquivos gerados do Prisma
- [ ] Melhorar o preflight dos testes e2e quando o Docker daemon nao estiver ativo
