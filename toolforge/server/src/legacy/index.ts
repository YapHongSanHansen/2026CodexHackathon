// server/src/legacy/index.ts — in-memory simulation of the running Sage UBS Accounting v9 app.
// Stands in for the live legacy app: the generated REST API and the MCP server both delegate here.
// Deep-copies the SEED_* fixtures on init so mutations never touch the shared contract data.
import type { Customer, StockItem, Invoice, InvoiceLine, Payment } from '../shared';
import {
  SEED_CUSTOMERS,
  SEED_STOCK,
  SEED_INVOICES,
  SEED_PAYMENTS,
} from '../shared';

/* ----------------------------- helpers ----------------------------- */

/** Round a money value to 2 decimal places, guarding against FP drift. */
function money(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Deep clone via structured JSON copy — sufficient for our plain-data fixtures. */
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Today's date as ISO yyyy-mm-dd (UTC). */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Parse an ISO yyyy-mm-dd date string to a UTC timestamp; throws on invalid input. */
function parseIsoDate(value: string, label: string): number {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid ${label}: expected ISO date yyyy-mm-dd, got "${value}"`);
  }
  const ts = Date.parse(`${value}T00:00:00Z`);
  if (Number.isNaN(ts)) {
    throw new Error(`Invalid ${label}: "${value}" is not a real date`);
  }
  return ts;
}

/** Whole days between two UTC timestamps (asAt - invoiceDate), floored at 0. */
function ageInDays(invoiceTs: number, asAtTs: number): number {
  const ms = asAtTs - invoiceTs;
  if (ms <= 0) return 0;
  return Math.floor(ms / 86_400_000);
}

/* ----------------------------- types ----------------------------- */

export interface CreateCustomerInput {
  code: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  creditLimit?: number;
}

export interface CreateInvoiceLineInput {
  stockCode: string;
  qty: number;
}

export interface CreateInvoiceInput {
  customerCode: string;
  lines: CreateInvoiceLineInput[];
  date?: string;
}

export interface RecordPaymentInput {
  invoiceNumber: string;
  amount: number;
  method?: string;
  date?: string;
}

export interface AgingBuckets {
  current: number;
  d30: number;
  d60: number;
  d90plus: number;
  total: number;
}

export interface AgingCustomerRow extends AgingBuckets {
  customerCode: string;
  customerName: string;
}

export interface AgingReport extends AgingBuckets {
  asAt: string;
  customers: AgingCustomerRow[];
}

/* ----------------------------- store ----------------------------- */

class LegacyStore {
  private customers: Customer[] = clone(SEED_CUSTOMERS);
  private stock: StockItem[] = clone(SEED_STOCK);
  private invoices: Invoice[] = clone(SEED_INVOICES);
  private payments: Payment[] = clone(SEED_PAYMENTS);

  // Running sequence for invoice numbers (IV-2024-####). Seeded past the fixtures.
  private invoiceSeq = this.computeInitialInvoiceSeq();
  private idSeq = 1;

  private computeInitialInvoiceSeq(): number {
    let max = 0;
    for (const inv of this.invoices) {
      const m = /^IV-2024-(\d+)$/.exec(inv.number);
      if (m) max = Math.max(max, Number(m[1]));
    }
    return max;
  }

  private nextId(prefix: string): string {
    return `${prefix}_gen_${(this.idSeq++).toString(36)}`;
  }

  private nextInvoiceNumber(): string {
    this.invoiceSeq += 1;
    return `IV-2024-${String(this.invoiceSeq).padStart(4, '0')}`;
  }

  /* ---------- customers ---------- */

  listCustomers(): Customer[] {
    return clone(this.customers);
  }

  getCustomer(code: string): Customer | undefined {
    const found = this.customers.find((c) => c.code === code);
    return found ? clone(found) : undefined;
  }

  /** Internal: locate the live customer record (no clone) for mutation. */
  private findCustomer(code: string): Customer | undefined {
    return this.customers.find((c) => c.code === code);
  }

  createCustomer(data: CreateCustomerInput): Customer {
    if (!data || typeof data !== 'object') {
      throw new Error('createCustomer requires a body');
    }
    const code = String(data.code ?? '').trim();
    const name = String(data.name ?? '').trim();
    if (!code) throw new Error('Customer code is required');
    if (!name) throw new Error('Customer name is required');
    if (this.findCustomer(code)) {
      throw new Error(`Customer code "${code}" already exists`);
    }
    if (data.creditLimit != null) {
      if (typeof data.creditLimit !== 'number' || !Number.isFinite(data.creditLimit) || data.creditLimit < 0) {
        throw new Error('creditLimit must be a non-negative number');
      }
    }
    const customer: Customer = {
      id: this.nextId('c'),
      code,
      name,
      email: data.email != null ? String(data.email) : '',
      phone: data.phone != null ? String(data.phone) : '',
      address: data.address != null ? String(data.address) : '',
      creditLimit: data.creditLimit != null ? money(data.creditLimit) : 0,
      balance: 0,
    };
    this.customers.push(customer);
    return clone(customer);
  }

  /* ---------- stock ---------- */

  listStock(): StockItem[] {
    return clone(this.stock);
  }

  getStockItem(code: string): StockItem | undefined {
    const found = this.stock.find((s) => s.code === code);
    return found ? clone(found) : undefined;
  }

  private findStock(code: string): StockItem | undefined {
    return this.stock.find((s) => s.code === code);
  }

  /* ---------- invoices ---------- */

  listInvoices(): Invoice[] {
    return clone(this.invoices);
  }

  getInvoice(number: string): Invoice | undefined {
    const found = this.invoices.find((i) => i.number === number);
    return found ? clone(found) : undefined;
  }

  private findInvoice(number: string): Invoice | undefined {
    return this.invoices.find((i) => i.number === number);
  }

  createInvoice(data: CreateInvoiceInput): Invoice {
    if (!data || typeof data !== 'object') {
      throw new Error('createInvoice requires a body');
    }
    const customerCode = String(data.customerCode ?? '').trim();
    if (!customerCode) throw new Error('customerCode is required');

    const customer = this.findCustomer(customerCode);
    if (!customer) {
      throw new Error(`Unknown customer code "${customerCode}"`);
    }

    if (!Array.isArray(data.lines) || data.lines.length === 0) {
      throw new Error('At least one invoice line is required');
    }

    // Validate the date up front (default: today).
    const date = data.date != null ? data.date : todayIso();
    parseIsoDate(date, 'invoice date');

    // Resolve all lines first; only mutate stock once everything validates.
    const resolved: { stock: StockItem; qty: number; line: InvoiceLine }[] = [];
    for (const raw of data.lines) {
      if (!raw || typeof raw !== 'object') {
        throw new Error('Each invoice line must be an object { stockCode, qty }');
      }
      const stockCode = String(raw.stockCode ?? '').trim();
      if (!stockCode) throw new Error('Each invoice line requires a stockCode');
      const qty = raw.qty;
      if (typeof qty !== 'number' || !Number.isFinite(qty) || qty <= 0) {
        throw new Error(`Invalid qty for stock "${stockCode}": must be a positive number`);
      }
      const stock = this.findStock(stockCode);
      if (!stock) {
        throw new Error(`Unknown stock code "${stockCode}"`);
      }
      const line: InvoiceLine = {
        stockCode: stock.code,
        description: stock.description,
        qty,
        unitPrice: stock.unitPrice,
        amount: money(stock.unitPrice * qty),
      };
      resolved.push({ stock, qty, line });
    }

    const subtotal = money(resolved.reduce((sum, r) => sum + r.line.amount, 0));
    const tax = money(subtotal * 0.06); // SST 6%
    const total = money(subtotal + tax);

    const invoice: Invoice = {
      id: this.nextId('i'),
      number: this.nextInvoiceNumber(),
      customerCode,
      date,
      lines: resolved.map((r) => r.line),
      subtotal,
      tax,
      total,
      status: 'unpaid',
    };

    // Commit side effects: decrement stock, increment customer balance.
    for (const r of resolved) {
      r.stock.qtyOnHand = money(r.stock.qtyOnHand - r.qty);
    }
    customer.balance = money(customer.balance + total);

    this.invoices.push(invoice);
    return clone(invoice);
  }

  /* ---------- payments ---------- */

  listPayments(): Payment[] {
    return clone(this.payments);
  }

  /** Sum of payments already recorded against an invoice. */
  private paidSoFar(invoiceNumber: string): number {
    return money(
      this.payments
        .filter((p) => p.invoiceNumber === invoiceNumber)
        .reduce((sum, p) => sum + p.amount, 0),
    );
  }

  recordPayment(data: RecordPaymentInput): Payment {
    if (!data || typeof data !== 'object') {
      throw new Error('recordPayment requires a body');
    }
    const invoiceNumber = String(data.invoiceNumber ?? '').trim();
    if (!invoiceNumber) throw new Error('invoiceNumber is required');

    const invoice = this.findInvoice(invoiceNumber);
    if (!invoice) {
      throw new Error(`Unknown invoice number "${invoiceNumber}"`);
    }

    const amount = data.amount;
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      throw new Error('Payment amount must be a positive number');
    }
    const rounded = money(amount);

    const date = data.date != null ? data.date : todayIso();
    parseIsoDate(date, 'payment date');

    const payment: Payment = {
      id: this.nextId('p'),
      invoiceNumber: invoice.number,
      customerCode: invoice.customerCode,
      date,
      amount: rounded,
      method: data.method != null && String(data.method).trim() ? String(data.method) : 'Cash',
    };

    this.payments.push(payment);

    // Update invoice status based on cumulative payments.
    const paid = this.paidSoFar(invoice.number);
    if (paid + 1e-9 >= invoice.total) {
      invoice.status = 'paid';
    } else if (paid > 0) {
      invoice.status = 'partial';
    } else {
      invoice.status = 'unpaid';
    }

    // Decrement the customer's outstanding balance.
    const customer = this.findCustomer(invoice.customerCode);
    if (customer) {
      customer.balance = money(customer.balance - rounded);
    }

    return clone(payment);
  }

  /* ---------- aging report ---------- */

  agingReport(asAt?: string): AgingReport {
    const asAtIso = asAt != null ? asAt : todayIso();
    const asAtTs = parseIsoDate(asAtIso, 'asAt date');

    const rows = new Map<string, AgingCustomerRow>();
    const ensureRow = (code: string): AgingCustomerRow => {
      let row = rows.get(code);
      if (!row) {
        const customer = this.findCustomer(code);
        row = {
          customerCode: code,
          customerName: customer ? customer.name : code,
          current: 0,
          d30: 0,
          d60: 0,
          d90plus: 0,
          total: 0,
        };
        rows.set(code, row);
      }
      return row;
    };

    const totals: AgingBuckets = { current: 0, d30: 0, d60: 0, d90plus: 0, total: 0 };

    for (const inv of this.invoices) {
      if (inv.status === 'paid') continue;

      // Outstanding = invoice total minus payments applied.
      const outstanding = money(inv.total - this.paidSoFar(inv.number));
      if (outstanding <= 0) continue;

      const invTs = parseIsoDate(inv.date, 'invoice date');
      const age = ageInDays(invTs, asAtTs);

      let bucket: keyof AgingBuckets;
      if (age <= 30) bucket = 'current';
      else if (age <= 60) bucket = 'd30';
      else if (age <= 90) bucket = 'd60';
      else bucket = 'd90plus';

      const row = ensureRow(inv.customerCode);
      row[bucket] = money(row[bucket] + outstanding);
      row.total = money(row.total + outstanding);

      totals[bucket] = money(totals[bucket] + outstanding);
      totals.total = money(totals.total + outstanding);
    }

    return {
      asAt: asAtIso,
      current: totals.current,
      d30: totals.d30,
      d60: totals.d60,
      d90plus: totals.d90plus,
      total: totals.total,
      customers: [...rows.values()].sort((a, b) =>
        a.customerCode.localeCompare(b.customerCode),
      ),
    };
  }
}

/** Singleton in-memory legacy app simulator. */
export const legacyStore = new LegacyStore();
