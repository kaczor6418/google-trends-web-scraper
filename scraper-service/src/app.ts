import express from 'express';
import cors from 'cors';
import trendRoutes from './routes/trends.routes';
import phraseRoutes from './routes/phrases.routes';

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/v1/trends', trendRoutes);
app.use('/api/v1/phrases', phraseRoutes);

app.listen(3000, () => console.log('API Server running on port 3000'));

import { prisma } from '../src/lib/prisma';

async function test() {
  try {
    await prisma.$connect();
    console.log("Database connection successful!");
  } catch (e) {
    console.error("Connection failed:", e);
  } finally {
    await prisma.$disconnect();
  }
}
test();