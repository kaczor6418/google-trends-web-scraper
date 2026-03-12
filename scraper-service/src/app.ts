import express from 'express';
import trendsRoutes from './routes/trends.routes';

// BIGINT FIX: Prisma returns BigInt for some fields, which JSON.stringify cannot handle.
(BigInt.prototype as any).toJSON = function () { return this.toString(); };

const app = express();
app.use(express.json());

// Routes
app.use('/api/v1/trends', trendsRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Trend Scraper Service running on port ${PORT}`);
});

export default app;