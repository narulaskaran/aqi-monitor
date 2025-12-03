import { prisma } from '../api/_lib/db.js';

async function main() {
  console.log('Testing database connection...');
  try {
    const result = await prisma.$queryRaw`SELECT 1 + 1 AS result`;
    console.log('Successfully connected to the database!');
    console.log('Result:', result);
  } catch (error) {
    console.error('Error connecting to the database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
