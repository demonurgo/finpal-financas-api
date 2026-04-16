const bcrypt = require('bcrypt');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const { PrismaClient, TransactionType } = require('../src/generated/prisma/client');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL deve ser informada');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DEFAULT_CATEGORIES = [
  { name: 'Alimenta\u00e7\u00e3o', type: TransactionType.EXPENSE, isSystem: true },
  { name: 'Sal\u00e1rio', type: TransactionType.INCOME, isSystem: true },
  { name: 'Transporte', type: TransactionType.EXPENSE, isSystem: true },
  { name: 'Lazer', type: TransactionType.EXPENSE, isSystem: true },
  { name: 'Moradia', type: TransactionType.EXPENSE, isSystem: true },
  { name: 'Sa\u00fade', type: TransactionType.EXPENSE, isSystem: true },
  { name: 'Educa\u00e7\u00e3o', type: TransactionType.EXPENSE, isSystem: true },
  { name: 'Outros', type: TransactionType.EXPENSE, isSystem: true },
];

const DEMO_USER = {
  email: 'demo@finpal.local',
  name: 'Usuario Demo',
  password: 'demo123456',
};

const DEMO_TRANSACTIONS = [
  {
    amount: 4200,
    categoryName: 'Sal\u00e1rio',
    date: '2026-04-01T12:00:00.000Z',
    description: 'Salario mensal',
    type: TransactionType.INCOME,
  },
  {
    amount: 1350,
    categoryName: 'Moradia',
    date: '2026-04-03T12:00:00.000Z',
    description: 'Aluguel',
    type: TransactionType.EXPENSE,
  },
  {
    amount: 280,
    categoryName: 'Alimenta\u00e7\u00e3o',
    date: '2026-04-05T12:00:00.000Z',
    description: 'Supermercado',
    type: TransactionType.EXPENSE,
  },
];

async function ensureDefaultCategories() {
  const categoriesByName = new Map();

  for (const category of DEFAULT_CATEGORIES) {
    const existing = await prisma.category.findFirst({
      where: {
        isSystem: true,
        name: category.name,
      },
    });

    if (!existing) {
      const createdCategory = await prisma.category.create({ data: category });
      categoriesByName.set(createdCategory.name, createdCategory);
      console.log(`Categoria do sistema criada: ${category.name}`);
      continue;
    }

    const updatedCategory = await prisma.category.update({
      where: { id: existing.id },
      data: {
        isSystem: true,
        type: category.type,
        userId: null,
      },
    });
    categoriesByName.set(updatedCategory.name, updatedCategory);
    console.log(`Categoria do sistema garantida: ${category.name}`);
  }

  return categoriesByName;
}

async function ensureSampleData(categoriesByName) {
  if (process.env.SEED_SAMPLE_DATA !== 'true') {
    console.log('Pulando a carga opcional de dados de exemplo.');
    return;
  }

  const passwordHash = await bcrypt.hash(DEMO_USER.password, 10);
  const user = await prisma.user.upsert({
    where: { email: DEMO_USER.email },
    update: {
      name: DEMO_USER.name,
      password: passwordHash,
    },
    create: {
      name: DEMO_USER.name,
      email: DEMO_USER.email,
      password: passwordHash,
    },
  });

  await prisma.transaction.deleteMany({
    where: {
      userId: user.id,
    },
  });

  for (const transaction of DEMO_TRANSACTIONS) {
    const category = categoriesByName.get(transaction.categoryName);

    if (!category) {
      throw new Error(`Categoria semeada ausente: ${transaction.categoryName}`);
    }

    await prisma.transaction.create({
      data: {
        amount: transaction.amount,
        categoryId: category.id,
        date: new Date(transaction.date),
        description: transaction.description,
        type: transaction.type,
        userId: user.id,
      },
    });
  }

  console.log(`Dados de exemplo garantidos para ${DEMO_USER.email}`);
}

async function main() {
  console.log('Populando o banco de dados...');

  const categoriesByName = await ensureDefaultCategories();
  await ensureSampleData(categoriesByName);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
