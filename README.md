# API do Finpal

Finpal é uma API REST de finanças pessoais construída com NestJS, Prisma e PostgreSQL. Ela entrega autenticação JWT, categorias, transações, resumo financeiro, documentação Swagger e execução via Docker.

## O que a API entrega

- cadastro e login com JWT
- rotas protegidas para categorias e transações
- filtros por tipo, categoria, mês e ano
- resumo financeiro com receitas, despesas e saldo
- documentação interativa em `/api/docs`
- testes unitários e e2e

## Requisitos

Você precisa de:

- Node.js 22+ e `npm`
- Docker e Docker Compose para o fluxo mais simples

Verifique no terminal:

```bash
node -v
npm -v
docker version
docker compose version
```

Se ainda não tiver essas ferramentas:

- `Node.js`: instale a versão LTS em [nodejs.org](https://nodejs.org/)
- `Docker`: instale Docker Desktop no Windows/macOS ou Docker Engine + Compose no Linux

## Preparação do ambiente

Abra a pasta do projeto e instale as dependências:

```bash
npm install
```

Copie o arquivo de ambiente:

```powershell
Copy-Item .env.example .env
```

No macOS/Linux:

```bash
cp .env.example .env
```

Antes de usar fora de desenvolvimento, altere pelo menos:

- `JWT_SECRET`
- credenciais do PostgreSQL, se necessário
- `SEED_SAMPLE_DATA`, se você quiser habilitar dados de exemplo em ambiente local

Regras de segurança desta versão:

- a API não sobe em produção com `JWT_SECRET` padrão
- a API não sobe em produção com `SEED_SAMPLE_DATA=true`
- login e cadastro possuem rate limit para reduzir tentativas automatizadas

Os dados do banco ficam no volume Docker `projeto-nassau_postgres_data`.

## Como rodar

### 1. Stack completa com Docker

É o caminho recomendado.

```bash
npm run docker:up:build
```

Acessos:

- Swagger: `http://localhost:3000/api/docs`
- API: `http://localhost:3000/api`

`GET /api` retorna `404` de propósito. O endpoint existe como prefixo global, não como página inicial.

Para parar:

```bash
npm run docker:down
```

### 2. PostgreSQL no Docker + API local

Bom para desenvolvimento com hot reload.

```bash
npm run docker:db
npm run prisma:generate
npx prisma migrate deploy
npm run prisma:seed
npm run start:dev
```

### 3. Execução local estilo produção

Use quando quiser validar o build compilado:

```bash
npm run build
npm run start:prod
```

Nesse modo, a `DATABASE_URL` precisa apontar para um PostgreSQL acessível.

## Dados de exemplo

O seed sempre garante estas categorias do sistema:

- Alimentação
- Salário
- Transporte
- Lazer
- Moradia
- Saúde
- Educação
- Outros

Se `SEED_SAMPLE_DATA=true`, o seed também cria:

- usuário: `demo@finpal.local`
- senha: `demo123456`
- algumas transações de exemplo

Em produção, mantenha `SEED_SAMPLE_DATA=false`.

## Como usar a API

O jeito mais simples é pelo Swagger.

1. Abra `http://localhost:3000/api/docs`
2. Use `POST /auth/login` com o usuário demo ou crie uma conta em `POST /auth/register`
3. Copie o valor de `access_token`
4. Clique em `Authorize`
5. Cole o token
6. Teste rotas como `GET /categories`, `POST /transactions` e `GET /transactions/summary`

Exemplo de login com `curl`:

```bash
curl -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"demo@finpal.local\",\"password\":\"demo123456\"}"
```

Exemplo de rota autenticada:

```bash
curl -X GET "http://localhost:3000/api/categories" \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN"
```

## Endpoints principais

| Método | Rota | Finalidade |
|--------|------|------------|
| `POST` | `/auth/register` | Criar conta |
| `POST` | `/auth/login` | Autenticar e obter JWT |
| `GET` | `/auth/me` | Retornar usuário autenticado |
| `GET` | `/categories` | Listar categorias do sistema e do usuário |
| `POST` | `/categories` | Criar categoria personalizada |
| `PATCH` | `/categories/:id` | Atualizar categoria do usuário |
| `DELETE` | `/categories/:id` | Excluir categoria do usuário |
| `GET` | `/transactions` | Listar transações com filtros |
| `POST` | `/transactions` | Criar transação |
| `GET` | `/transactions/:id` | Buscar transação |
| `PATCH` | `/transactions/:id` | Atualizar transação |
| `DELETE` | `/transactions/:id` | Excluir transação |
| `GET` | `/transactions/summary` | Obter resumo financeiro |

Rotas públicas:

- `POST /auth/register`
- `POST /auth/login`

Rotas protegidas:

- `GET /auth/me`
- todas as rotas de `/categories`
- todas as rotas de `/transactions`

## Docker e dados

Comandos úteis:

```bash
npm run docker:ps
npm run docker:logs
npm run docker:restart:safe
npm run docker:rebuild:clean
npm run docker:recover
```

Regras importantes:

- `npm run docker:down` preserva os dados
- `npm run docker:down:volumes` apaga os dados persistidos
- `npm run docker:rebuild:clean` refaz a imagem da app sem apagar o banco
- `npm run docker:recover` ajuda quando o cache de build do Docker quebra
- o contexto de build do Docker ignora arquivos `.env` locais

## Testes

Unitários:

```bash
npm test -- --runInBand
```

End-to-end:

```bash
npm run test:e2e
```

Os testes e2e sobem um PostgreSQL descartável em Docker.

## Scripts úteis

| Comando | Uso |
|---------|-----|
| `npm run start:dev` | API local com watch |
| `npm run build` | Compilar a aplicação |
| `npm run start:prod` | Rodar build compilado |
| `npm run prisma:generate` | Gerar client Prisma |
| `npm run prisma:seed` | Rodar seed |
| `npm run docker:up:build` | Subir stack Docker com rebuild |
| `npm run docker:db` | Subir só o PostgreSQL |
| `npm run docker:down` | Parar stack sem apagar banco |

## Checklist técnico

Existe um checklist técnico de hardening em [docs/technical-checklist.md](./docs/technical-checklist.md).

## Estrutura resumida

```text
src/
  auth/
  categories/
  transactions/
  prisma/
  common/
test/
prisma/
docker/
```

Para explorar contratos, exemplos de payload e autenticação, use o Swagger em `http://localhost:3000/api/docs`.
