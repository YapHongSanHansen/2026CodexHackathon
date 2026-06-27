// server/src/generated-api/index.ts — the generated REST API router.
// Mounted by the integration layer at `/g/:projectId`. Auth via project API key.
// Delegates all domain logic to the in-memory legacy app simulator.
import express, { type Router, type Request, type Response, type NextFunction } from 'express';
import { legacyStore } from '../legacy';
import { projectIdForApiKey, getProject } from '../store';

/** Build the Express router for the generated, API-key-protected REST API. */
export function createGeneratedApiRouter(): Router {
  const router = express.Router({ mergeParams: true });

  router.use(express.json());
  router.use(authMiddleware);

  /* ---------- customers ---------- */

  router.get('/customers', (_req, res) => {
    res.json(legacyStore.listCustomers());
  });

  router.get('/customers/:code', (req, res) => {
    const customer = legacyStore.getCustomer(req.params.code);
    if (!customer) {
      res.status(404).json({ error: `Customer "${req.params.code}" not found` });
      return;
    }
    res.json(customer);
  });

  router.post('/customers', (req, res) => {
    try {
      res.json(legacyStore.createCustomer(req.body ?? {}));
    } catch (err) {
      res.status(400).json({ error: errorMessage(err) });
    }
  });

  /* ---------- stock ---------- */

  router.get('/stock', (_req, res) => {
    res.json(legacyStore.listStock());
  });

  router.get('/stock/:code', (req, res) => {
    const item = legacyStore.getStockItem(req.params.code);
    if (!item) {
      res.status(404).json({ error: `Stock item "${req.params.code}" not found` });
      return;
    }
    res.json(item);
  });

  /* ---------- invoices ---------- */

  router.get('/invoices', (_req, res) => {
    res.json(legacyStore.listInvoices());
  });

  router.get('/invoices/:number', (req, res) => {
    const invoice = legacyStore.getInvoice(req.params.number);
    if (!invoice) {
      res.status(404).json({ error: `Invoice "${req.params.number}" not found` });
      return;
    }
    res.json(invoice);
  });

  router.post('/invoices', (req, res) => {
    try {
      res.json(legacyStore.createInvoice(req.body ?? {}));
    } catch (err) {
      res.status(400).json({ error: errorMessage(err) });
    }
  });

  /* ---------- payments ---------- */

  router.get('/payments', (_req, res) => {
    res.json(legacyStore.listPayments());
  });

  router.post('/payments', (req, res) => {
    try {
      res.json(legacyStore.recordPayment(req.body ?? {}));
    } catch (err) {
      res.status(400).json({ error: errorMessage(err) });
    }
  });

  /* ---------- reports ---------- */

  router.get('/reports/aging', (req, res) => {
    try {
      const asAt = typeof req.query.asAt === 'string' ? req.query.asAt : undefined;
      res.json(legacyStore.agingReport(asAt));
    } catch (err) {
      res.status(400).json({ error: errorMessage(err) });
    }
  });

  return router;
}

/* ----------------------------- auth ----------------------------- */

function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const key = req.header('x-api-key');
  const owner = key ? projectIdForApiKey(key) : undefined;
  const projectId = req.params.projectId;

  const ok =
    !!key &&
    !!owner &&
    owner === projectId &&
    getProject(owner)?.phase === 'deployed';

  if (!ok) {
    res.status(401).json({ error: 'Invalid or missing API key' });
    return;
  }
  next();
}

/* ----------------------------- helpers ----------------------------- */

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Bad request';
}
