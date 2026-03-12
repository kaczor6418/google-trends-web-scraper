import path from 'path';
import express from 'express';
import trendsRoutes from './routes/trends.routes';
import { apiReference } from '@scalar/express-api-reference'

// BIGINT FIX: Prisma returns BigInt for some fields, which JSON.stringify cannot handle.
(BigInt.prototype as any).toJSON = function () { return this.toString(); };

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.use(
  '/api/docs',
  apiReference({
      url: '/openapi.json',
      theme: 'purple',
      showSidebar: true,
  })
);

// Routes
app.use('/api/v1/trends', trendsRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Trend Scraper Service running on port ${PORT}`);
  console.log(`📖 Docs available at http://localhost:${PORT}/api/docs`);
});

export default app;