// server/src/pipeline/artifacts.ts — demo-mode markdown artifact generators.
// Each function returns a Markdown string derived from the captured sample app
// (Sage UBS Accounting v9) fixtures. These are what the user actually reads in
// the artifact viewer, so they are written to be specific and believable.
import {
  APP_META,
  CAPTURED_SCREENS,
  SEED_CUSTOMERS,
  SEED_STOCK,
  SEED_INVOICES,
  SEED_PAYMENTS,
} from '../shared';
import type { CapturedScreen, GeneratedEndpoint } from '../shared';

/* ----------------------------- helpers ----------------------------- */

/** Escape a value for safe inclusion inside a Markdown table cell. */
function cell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

/** Stable, deterministic "confidence" so the demo reads the same every run. */
function pseudoConfidence(seed: string, lo: number, hi: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const t = (h % 1000) / 1000;
  return Math.round((lo + t * (hi - lo)) * 100) / 100;
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

/* ----------------------------- Group A — Vision / OCR ----------------------------- */

export function mockSpec(): string {
  const lines: string[] = [];
  lines.push(`# Group A — Vision / OCR Mock Spec`);
  lines.push('');
  lines.push(`**App:** ${APP_META.name}  `);
  lines.push(`**Vendor:** ${APP_META.vendor}  `);
  lines.push(`**Platform:** ${APP_META.platform}`);
  lines.push('');
  lines.push(
    `_Generated from OCR + vision analysis of captured screenshots and screen ` +
      `recordings. This is a **mock** of how the app appears to behave — not yet ` +
      `validated against the live app (that is Group B's job)._`,
  );
  lines.push('');
  lines.push(`## Capture summary`);
  lines.push('');
  lines.push(`- Screens analysed: **${CAPTURED_SCREENS.length}**`);
  lines.push(
    `- Total fields detected: **${CAPTURED_SCREENS.reduce((n, s) => n + s.fields.length, 0)}**`,
  );
  lines.push(
    `- Total actions detected: **${CAPTURED_SCREENS.reduce((n, s) => n + s.actions.length, 0)}**`,
  );
  lines.push(
    `- UI paradigm: keyboard / function-key driven Win32 forms (no mouse-only flows observed).`,
  );
  lines.push('');

  for (const s of CAPTURED_SCREENS) {
    lines.push(`## ${s.title}`);
    lines.push('');
    lines.push(`> Detected screen kind: \`${s.kind}\``);
    lines.push('');
    lines.push(`**Detected fields**`);
    lines.push('');
    lines.push(`| Field (OCR) | Inferred type | Sample value | Confidence |`);
    lines.push(`| --- | --- | --- | --- |`);
    for (const f of s.fields) {
      const conf = pseudoConfidence(`${s.id}:${f.label}`, 0.74, 0.97);
      lines.push(
        `| ${cell(f.label)} | ${cell(f.type)} | ${cell(f.sample ?? '—')} | ${pct(conf)} |`,
      );
    }
    lines.push('');
    lines.push(`**Detected actions:** ${s.actions.map((a) => `\`${a}\``).join(', ')}`);
    lines.push('');
    lines.push(`**Appears to do:** ${appearsToDo(s)}`);
    lines.push('');

    const flags = lowConfidenceFlags(s);
    if (flags.length) {
      lines.push(`**⚠ Low-confidence flags**`);
      lines.push('');
      for (const fl of flags) lines.push(`- ${fl}`);
      lines.push('');
    }
  }

  lines.push(`## Hand-off to Group B`);
  lines.push('');
  lines.push(
    `Vision could not confirm side-effects (ledger posting, stock decrement, ` +
      `validation rules). These are marked low-confidence above and must be ` +
      `verified by interaction (Group B) and observation (Group C).`,
  );
  lines.push('');
  return lines.join('\n');
}

function appearsToDo(s: CapturedScreen): string {
  switch (s.id) {
    case 'cust':
      return (
        'Maintain a customer master record (code, name, contact, credit limit). ' +
        'List view appears pre-filtered to the `300-` debtor code prefix.'
      );
    case 'inv':
      return (
        'Enter a sales invoice header + line items, compute SST 6% in the footer, ' +
        'and post the total to the debtor ledger on F10.'
      );
    case 'stock':
      return 'Maintain a stock/inventory item (code, description, unit, price, quantity on hand).';
    case 'pay':
      return (
        'Record a payment against an existing invoice and (apparently) reduce the ' +
        'outstanding balance; can print a receipt.'
      );
    case 'aging':
      return 'Generate a debtor aging report bucketed Current / 30 / 60 / 90+ days; export to TXT.';
    default:
      return 'Unclassified screen — see detected fields/actions above.';
  }
}

function lowConfidenceFlags(s: CapturedScreen): string[] {
  const flags: string[] = [];
  for (const f of s.fields) {
    if (f.type === 'lookup')
      flags.push(
        `\`${f.label}\` is a lookup — target master list and validation behaviour unknown from vision alone.`,
      );
    if (f.type === 'select')
      flags.push(`\`${f.label}\` enumeration values not fully visible in capture.`);
  }
  if (s.id === 'inv')
    flags.push('Tax rate read as "SST 6%" from footer text — confirm it is fixed vs. configurable.');
  if (s.id === 'pay')
    flags.push('Whether partial payments are allowed could not be determined from screenshots.');
  return flags;
}

/* ----------------------------- Group B — Interaction ----------------------------- */

export function behaviorSpec(): string {
  const lines: string[] = [];
  lines.push(`# Group B — Interaction Behavior Spec`);
  lines.push('');
  lines.push(
    `_Produced by driving the **live** app in a sandbox VM (computer-use), ` +
      `independently of Group A. Documents **observed** inputs → outputs, ` +
      `validation, and timing. Where this contradicts the vision mock, this ` +
      `document wins._`,
  );
  lines.push('');

  lines.push(`## Function-key map (observed globally)`);
  lines.push('');
  lines.push(`| Key | Effect |`);
  lines.push(`| --- | --- |`);
  lines.push(`| F2 | Begin a new (Add) record on master-data forms |`);
  lines.push(`| F10 | Commit / Save / Post the current form |`);
  lines.push(`| Esc | Exit the current form without saving |`);
  lines.push(`| ↑ / ↓ | Move between list rows; Enter selects in a lookup |`);
  lines.push('');

  lines.push(`## Customer Maintenance — observed flows`);
  lines.push('');
  lines.push(
    '- **Add → Save round-trip:** Add (F2) → fill `Cust Code`, `Name`, `Credit Limit` → ' +
      'Save (F10) completed in ~1.2s; the new row appears in the list immediately.',
  );
  lines.push(
    '- **Validation — Credit Limit:** entering `abc` is rejected ("Numeric value required"); ' +
      'the field will not accept non-numeric input and the caret stays put.',
  );
  lines.push(
    '- **Validation — duplicate code:** re-using `300-A001` raises "Code already exists" on Save.',
  );
  lines.push(
    '- **Code format:** all seeded customers use the `300-XNNN` debtor prefix ' +
      `(e.g. ${SEED_CUSTOMERS.map((c) => c.code).join(', ')}).`,
  );
  lines.push('');

  lines.push(`## Invoice Entry — observed flows`);
  lines.push('');
  lines.push(
    '- **Line entry:** `Item Code` lookup resolves description + unit price; `Qty × Unit Price` ' +
      'fills the line `Amount` on tab-out.',
  );
  lines.push(
    '- **Footer maths:** Subtotal = Σ line amounts; Tax = round(Subtotal × 6%, 2); Total = Subtotal + Tax. ' +
      `Verified against seed invoice ${SEED_INVOICES[0]?.number ?? 'IV-2024-0188'} ` +
      `(subtotal ${SEED_INVOICES[0]?.subtotal}, tax ${SEED_INVOICES[0]?.tax}, total ${SEED_INVOICES[0]?.total}).`,
  );
  lines.push(
    '- **Post (F10):** writes the invoice and increases the customer balance by the total; ' +
      'status starts as `unpaid`.',
  );
  lines.push(
    '- **Validation — unknown customer:** posting with an unmapped `Cust Code` is blocked.',
  );
  lines.push('');

  lines.push(`## Payment Voucher — observed flows`);
  lines.push('');
  lines.push(
    `- **Partial payment confirmed:** recording ${SEED_PAYMENTS[0]?.amount ?? 600} against ` +
      `${SEED_PAYMENTS[0]?.invoiceNumber ?? 'IV-2024-0188'} moved its status to \`partial\` ` +
      '(does not require paying the full total).',
  );
  lines.push('- **Method** is a fixed select; "Bank Transfer", "Cash" and "Cheque" were observable.');
  lines.push('- Saving (F10) prints a receipt and reduces the debtor balance by the amount.');
  lines.push('');

  lines.push(`## Stock Item Maintenance — observed flows`);
  lines.push('');
  lines.push(
    `- Add/Update of an item persists and is visible in the Invoice line lookup ` +
      `(e.g. ${SEED_STOCK.map((s) => s.code).join(', ')}).`,
  );
  lines.push('- `Qty On Hand` accepts integers; negative stock was not reachable through the UI.');
  lines.push('');

  lines.push(`## Sample round-trips (captured)`);
  lines.push('');
  lines.push('```text');
  lines.push('Add customer 300-Z099 "Zenith Supplies" creditLimit=10000  → saved in 1.1s');
  lines.push('Post invoice for 300-A001, 3×SKU-1001 @12.50               → subtotal 37.50, tax 2.25, total 39.75');
  lines.push('Pay 39.75 against that invoice (Bank Transfer)             → status=paid, balance -= 39.75');
  lines.push('```');
  lines.push('');
  return lines.join('\n');
}

/* ----------------------------- Group C — Observation ----------------------------- */

export function internalSpec(): string {
  const lines: string[] = [];
  lines.push(`# Group C — Observational Internal Spec`);
  lines.push('');
  lines.push(
    `_Observational reverse-engineering only: UI-state transition mapping plus ` +
      `passive network/file observation while Group B drove the app. ` +
      `**No binary decompilation, disassembly, or memory inspection was used.** ` +
      `Entities and operations below are *inferred* from observable behaviour._`,
  );
  lines.push('');

  lines.push(`## Inferred data entities`);
  lines.push('');

  lines.push(`### Customer`);
  lines.push('');
  lines.push(`| Field | Type | Notes |`);
  lines.push(`| --- | --- | --- |`);
  lines.push(`| code | string | Primary key, \`300-XNNN\` debtor prefix |`);
  lines.push(`| name | string | Required |`);
  lines.push(`| email | string | Optional |`);
  lines.push(`| phone | string | Optional |`);
  lines.push(`| address | string | Free text |`);
  lines.push(`| creditLimit | number | Numeric, validated |`);
  lines.push(`| balance | number | Derived — moves with posting/payment |`);
  lines.push('');

  lines.push(`### StockItem`);
  lines.push('');
  lines.push(`| Field | Type | Notes |`);
  lines.push(`| --- | --- | --- |`);
  lines.push(`| code | string | Primary key, \`SKU-NNNN\` |`);
  lines.push(`| description | string | Shown in invoice line |`);
  lines.push(`| unit | string | e.g. REAM, BOX, UNIT |`);
  lines.push(`| unitPrice | number | Defaulted into invoice lines |`);
  lines.push(`| qtyOnHand | number | Integer |`);
  lines.push('');

  lines.push(`### Invoice (+ InvoiceLine)`);
  lines.push('');
  lines.push(`| Field | Type | Notes |`);
  lines.push(`| --- | --- | --- |`);
  lines.push(`| number | string | Primary key, \`IV-YYYY-NNNN\` |`);
  lines.push(`| customerCode | string | FK → Customer.code |`);
  lines.push(`| date | string | ISO date |`);
  lines.push(`| lines[] | InvoiceLine | { stockCode, description, qty, unitPrice, amount } |`);
  lines.push(`| subtotal / tax / total | number | tax = round(subtotal × 0.06, 2) |`);
  lines.push(`| status | enum | unpaid \\| partial \\| paid |`);
  lines.push('');

  lines.push(`### Payment`);
  lines.push('');
  lines.push(`| Field | Type | Notes |`);
  lines.push(`| --- | --- | --- |`);
  lines.push(`| invoiceNumber | string | FK → Invoice.number |`);
  lines.push(`| customerCode | string | FK → Customer.code |`);
  lines.push(`| date | string | ISO date |`);
  lines.push(`| amount | number | ≤ outstanding total |`);
  lines.push(`| method | string | Bank Transfer \\| Cash \\| Cheque |`);
  lines.push('');

  lines.push(`## Candidate operations (inferred CRUD)`);
  lines.push('');
  lines.push(`| Entity | Operations inferred |`);
  lines.push(`| --- | --- |`);
  lines.push(`| Customer | list, get, create, update |`);
  lines.push(`| StockItem | list, get, create, update |`);
  lines.push(`| Invoice | list, get, create (post) |`);
  lines.push(`| Payment | list, create |`);
  lines.push(`| Reports | debtor aging (read-only) |`);
  lines.push('');

  lines.push(`## Network / UI-state observations`);
  lines.push('');
  lines.push(
    '- The app is **fully local**: no outbound HTTP/REST traffic was observed during any flow. ' +
      'Persistence appears to be a local on-disk store (file handles opened under the install dir).',
  );
  lines.push(
    '- State machine per master form: `IDLE → ADD/EDIT → DIRTY → (F10) SAVED → IDLE` ' +
      'or `→ (Esc) IDLE` with no write.',
  );
  lines.push(
    '- Invoice posting is **transactional**: a single F10 both writes the invoice and updates ' +
      'the customer balance; no partial-write state was observed.',
  );
  lines.push(
    '- Aging report is derived at generate-time from invoices + payments; it has no own storage.',
  );
  lines.push('');

  lines.push(`## Method note`);
  lines.push('');
  lines.push(
    '> This entity/operation model is an **observational inference**. It was built purely from ' +
      'UI-state transitions and passive I/O observation — no proprietary binaries were decompiled ' +
      'or disassembled, and no protected logic was extracted. Treat field-level constraints as ' +
      'best-effort until confirmed by Group B round-trips.',
  );
  lines.push('');
  return lines.join('\n');
}

/* ----------------------------- Group D — Synthesis ----------------------------- */

export function synthesisSpec(endpoints: GeneratedEndpoint[]): string {
  const lines: string[] = [];
  lines.push(`# Group D — Synthesis & Generation Spec`);
  lines.push('');
  lines.push(`**Target app:** ${APP_META.name}`);
  lines.push('');
  lines.push(
    `_Reconciles **Group B** (observed behaviour) with **Group C** (inferred internal model), ` +
      `using **Group A** as vision context. Produces the proposed REST + MCP surface below. ` +
      `Every endpoint is **proposed** and requires human approval before deployment._`,
  );
  lines.push('');

  lines.push(`## Reconciliation (B + C)`);
  lines.push('');
  lines.push(
    `- **Agreements:** B's observed save/post round-trips line up with C's inferred CRUD set for ` +
      `Customer, StockItem, Invoice and Payment.`,
  );
  lines.push(
    `- **B-over-vision corrections:** Group A flagged the tax rate and partial-payment behaviour ` +
      `as low-confidence; B confirmed SST = 6% fixed and that **partial payments are allowed** — ` +
      `the synthesis adopts B's findings.`,
  );
  lines.push('');

  lines.push(`## Conflicts resolved`);
  lines.push('');
  lines.push(
    `1. **Invoice mutability** — Vision suggested an "Edit" affordance; interaction showed posting ` +
      `is terminal (no in-place edit of a posted invoice). Resolved in favour of **create-only** ` +
      `invoice posting (no PUT /invoices/:number).`,
  );
  lines.push(
    `2. **Payment cap** — C inferred \`amount ≤ outstanding\`; B confirmed over-payment is rejected. ` +
      `Resolved by documenting the constraint on \`POST /payments\`.`,
  );
  lines.push('');

  lines.push(`## Gaps filled`);
  lines.push('');
  lines.push(
    `- The debtor aging report had no observable storage; synthesised as a **read-only derived** ` +
      `endpoint computed from invoices + payments.`,
  );
  lines.push(
    `- Customer \`balance\` is exposed read-only (derived), never directly writable.`,
  );
  lines.push('');

  lines.push(`## Proposed endpoints`);
  lines.push('');
  lines.push(`| Method | Path | MCP tool | Confidence | Source screen |`);
  lines.push(`| --- | --- | --- | --- | --- |`);
  for (const e of endpoints) {
    lines.push(
      `| ${e.method} | \`${cell(e.path)}\` | \`${cell(e.mcpTool)}\` | ${pct(e.confidence)} | ${cell(
        e.sourceScreen ?? '—',
      )} |`,
    );
  }
  lines.push('');
  lines.push(`Total proposed operations: **${endpoints.length}**.`);
  lines.push('');

  lines.push(`## Human-review note`);
  lines.push('');
  lines.push(
    `> ⚠ These endpoints are **drafts** (\`approved: false\`). A human reviewer should approve, ` +
      `edit, or reject each operation. On approval the pipeline regenerates the OpenAPI document, ` +
      `MCP manifest, and docs from the **approved subset only**, mints an API key, and deploys.`,
  );
  lines.push('');
  return lines.join('\n');
}
