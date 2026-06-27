// shared/sample-app/ubs.ts — fixtures for the sample legacy app under conversion.
// This stands in for a real legacy desktop app: "Sage UBS Accounting v9".
// Group A/B/C "study" these screens; the generated REST API operates on the seed data.
import type { Customer, StockItem, Invoice, Payment, CapturedScreen } from '../types';

export const APP_META = {
  name: 'Sage UBS Accounting v9',
  vendor: 'Sage Software Sdn Bhd',
  platform: 'Windows desktop (legacy, ~1999)',
  notes:
    'No API, no SDK, no exposed database. Operated entirely through keyboard-driven Win32 forms.',
  hasApi: false,
};

// What Group A (vision) and Group B (interaction) "see" — captured screens of the legacy UI.
export const CAPTURED_SCREENS: CapturedScreen[] = [
  {
    id: 'cust',
    title: 'Customer Maintenance',
    kind: 'master-data form',
    fields: [
      { label: 'Cust Code', type: 'text', sample: '300-A001' },
      { label: 'Name', type: 'text', sample: 'Aurora Trading Sdn Bhd' },
      { label: 'Address', type: 'textarea' },
      { label: 'Phone', type: 'text', sample: '03-7788 1234' },
      { label: 'Credit Limit', type: 'number', sample: '50000' },
    ],
    actions: ['Add (F2)', 'Edit', 'Delete', 'Save (F10)', 'Exit (Esc)'],
    notes: 'Function-key driven. List view filtered by code prefix 300-.',
  },
  {
    id: 'inv',
    title: 'Invoice Entry',
    kind: 'transaction form',
    fields: [
      { label: 'Inv No', type: 'text', sample: 'IV-2024-0188' },
      { label: 'Date', type: 'date', sample: '15/06/2024' },
      { label: 'Cust Code', type: 'lookup', sample: '300-A001' },
      { label: 'Item Code', type: 'lookup', sample: 'SKU-1001' },
      { label: 'Qty', type: 'number', sample: '10' },
      { label: 'Unit Price', type: 'number', sample: '120.00' },
    ],
    actions: ['Add Line', 'Post (F10)', 'Print', 'Cancel'],
    notes: 'Footer shows Subtotal, SST 6%, Total. Posting writes to the debtor ledger.',
  },
  {
    id: 'stock',
    title: 'Stock Item Maintenance',
    kind: 'master-data form',
    fields: [
      { label: 'Item Code', type: 'text', sample: 'SKU-1001' },
      { label: 'Description', type: 'text', sample: 'A4 Copier Paper 80gsm' },
      { label: 'Unit', type: 'text', sample: 'REAM' },
      { label: 'Unit Price', type: 'number', sample: '12.50' },
      { label: 'Qty On Hand', type: 'number', sample: '340' },
    ],
    actions: ['Add', 'Update', 'Save (F10)'],
  },
  {
    id: 'pay',
    title: 'Payment Voucher',
    kind: 'transaction form',
    fields: [
      { label: 'Invoice No', type: 'lookup', sample: 'IV-2024-0188' },
      { label: 'Date', type: 'date' },
      { label: 'Amount', type: 'number', sample: '1200.00' },
      { label: 'Method', type: 'select', sample: 'Bank Transfer' },
    ],
    actions: ['Save (F10)', 'Print Receipt'],
  },
  {
    id: 'aging',
    title: 'Debtor Aging Report',
    kind: 'report',
    fields: [{ label: 'As At Date', type: 'date' }],
    actions: ['Generate', 'Export to TXT'],
    notes: 'Buckets: Current, 30, 60, 90+ days.',
  },
];

export const SEED_CUSTOMERS: Customer[] = [
  { id: 'c1', code: '300-A001', name: 'Aurora Trading Sdn Bhd', email: 'ap@aurora.my', phone: '03-7788 1234', address: 'Petaling Jaya, Selangor', creditLimit: 50000, balance: 534.2 },
  { id: 'c2', code: '300-B002', name: 'Bayu Logistics', email: 'finance@bayu.my', phone: '04-229 4567', address: 'George Town, Penang', creditLimit: 30000, balance: 0 },
  { id: 'c3', code: '300-C003', name: 'Cahaya Retail', email: 'admin@cahaya.my', phone: '07-556 8899', address: 'Johor Bahru, Johor', creditLimit: 20000, balance: 2671.2 },
  { id: 'c4', code: '300-D004', name: 'Damai Enterprise', email: 'accounts@damai.my', phone: '088-221 334', address: 'Kota Kinabalu, Sabah', creditLimit: 15000, balance: 0 },
];

export const SEED_STOCK: StockItem[] = [
  { id: 's1', code: 'SKU-1001', description: 'A4 Copier Paper 80gsm', unit: 'REAM', unitPrice: 12.5, qtyOnHand: 340 },
  { id: 's2', code: 'SKU-1002', description: 'Ballpoint Pen (Box 50)', unit: 'BOX', unitPrice: 18.0, qtyOnHand: 120 },
  { id: 's3', code: 'SKU-2001', description: 'Laser Toner CT-200', unit: 'UNIT', unitPrice: 189.0, qtyOnHand: 24 },
  { id: 's4', code: 'SKU-3001', description: 'Office Chair Ergo', unit: 'UNIT', unitPrice: 420.0, qtyOnHand: 15 },
];

export const SEED_INVOICES: Invoice[] = [
  {
    id: 'i1', number: 'IV-2024-0188', customerCode: '300-A001', date: '2024-06-15',
    lines: [
      { stockCode: 'SKU-1001', description: 'A4 Copier Paper 80gsm', qty: 10, unitPrice: 12.5, amount: 125 },
      { stockCode: 'SKU-2001', description: 'Laser Toner CT-200', qty: 5, unitPrice: 189, amount: 945 },
    ],
    subtotal: 1070, tax: 64.2, total: 1134.2, status: 'partial',
  },
  {
    id: 'i2', number: 'IV-2024-0190', customerCode: '300-C003', date: '2024-06-18',
    lines: [{ stockCode: 'SKU-3001', description: 'Office Chair Ergo', qty: 6, unitPrice: 420, amount: 2520 }],
    subtotal: 2520, tax: 151.2, total: 2671.2, status: 'unpaid',
  },
  {
    id: 'i3', number: 'IV-2024-0191', customerCode: '300-A001', date: '2024-06-20',
    lines: [{ stockCode: 'SKU-1002', description: 'Ballpoint Pen (Box 50)', qty: 20, unitPrice: 18, amount: 360 }],
    subtotal: 360, tax: 21.6, total: 381.6, status: 'unpaid',
  },
];

export const SEED_PAYMENTS: Payment[] = [
  { id: 'p1', invoiceNumber: 'IV-2024-0188', customerCode: '300-A001', date: '2024-06-22', amount: 600, method: 'Bank Transfer' },
];
