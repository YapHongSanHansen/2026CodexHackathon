// server/src/generators/index.ts — Group D generators.
// Produces the canonical endpoint proposals plus the deliverable artifacts:
// an OpenAPI 3.0.3 document, an MCP manifest, and auto-generated markdown docs.
import type { GeneratedEndpoint, McpManifest, McpTool, JsonSchema } from '../shared';

/* ----------------------------- canonical endpoint set ----------------------------- */

interface EndpointSpec {
  method: GeneratedEndpoint['method'];
  path: string;
  summary: string;
  mcpTool: string;
  sourceScreen: string;
  confidence: number;
}

// The 11 canonical endpoints. The MCP server and dashboard agree on exactly this set.
const CANONICAL: EndpointSpec[] = [
  { method: 'GET',  path: '/customers',          summary: 'List all customers (debtors) from Customer Maintenance.',          mcpTool: 'list_customers', sourceScreen: 'Customer Maintenance',   confidence: 0.97 },
  { method: 'GET',  path: '/customers/{code}',   summary: 'Fetch a single customer by code.',                                mcpTool: 'get_customer',   sourceScreen: 'Customer Maintenance',   confidence: 0.95 },
  { method: 'POST', path: '/customers',          summary: 'Create a new customer record.',                                   mcpTool: 'create_customer',sourceScreen: 'Customer Maintenance',   confidence: 0.90 },
  { method: 'GET',  path: '/stock',              summary: 'List all stock items with price and quantity on hand.',           mcpTool: 'list_stock',     sourceScreen: 'Stock Item Maintenance', confidence: 0.97 },
  { method: 'GET',  path: '/stock/{code}',       summary: 'Fetch a single stock item by code.',                              mcpTool: 'get_stock_item', sourceScreen: 'Stock Item Maintenance', confidence: 0.95 },
  { method: 'GET',  path: '/invoices',           summary: 'List all invoices posted to the debtor ledger.',                  mcpTool: 'list_invoices',  sourceScreen: 'Invoice Entry',          confidence: 0.96 },
  { method: 'GET',  path: '/invoices/{number}',  summary: 'Fetch a single invoice by its number.',                           mcpTool: 'get_invoice',    sourceScreen: 'Invoice Entry',          confidence: 0.94 },
  { method: 'POST', path: '/invoices',           summary: 'Create and post a new invoice; applies SST 6% and updates stock.',mcpTool: 'create_invoice', sourceScreen: 'Invoice Entry',          confidence: 0.88 },
  { method: 'GET',  path: '/payments',           summary: 'List all recorded payment vouchers.',                             mcpTool: 'list_payments',  sourceScreen: 'Payment Voucher',        confidence: 0.93 },
  { method: 'POST', path: '/payments',           summary: 'Record a payment against an invoice.',                            mcpTool: 'record_payment', sourceScreen: 'Payment Voucher',        confidence: 0.90 },
  { method: 'GET',  path: '/reports/aging',      summary: 'Debtor aging report bucketed by invoice age.',                    mcpTool: 'aging_report',   sourceScreen: 'Debtor Aging Report',    confidence: 0.86 },
];

/* ----------------------------- proposeEndpoints ----------------------------- */

export function proposeEndpoints(): GeneratedEndpoint[] {
  return CANONICAL.map((e) => ({
    method: e.method,
    path: e.path,
    summary: e.summary,
    mcpTool: e.mcpTool,
    approved: false,
    sourceScreen: e.sourceScreen,
    confidence: e.confidence,
  }));
}

/* ----------------------------- shared helpers ----------------------------- */

/** Slugify an app name into a safe lowercase identifier. */
function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'app'
  );
}

/** Extract `{param}` path-parameter names from a path. */
function pathParams(path: string): string[] {
  const out: string[] = [];
  const re = /\{([^}]+)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(path)) !== null) out.push(m[1]);
  return out;
}

/** OpenAPI tag (and human label) for an endpoint, derived from its path. */
function entityTag(path: string): string {
  if (path.startsWith('/customers')) return 'Customers';
  if (path.startsWith('/stock')) return 'Stock';
  if (path.startsWith('/invoices')) return 'Invoices';
  if (path.startsWith('/payments')) return 'Payments';
  if (path.startsWith('/reports')) return 'Reports';
  return 'General';
}

/** Convert our `/g/:projectId` `{brace}` path into an OpenAPI path (already brace-style). */
function openApiPath(path: string): string {
  return path; // already uses {brace} which is OpenAPI's path-param syntax
}

/* ----------------------------- buildOpenApi ----------------------------- */

export function buildOpenApi(appName: string, endpoints: GeneratedEndpoint[]): any {
  const paths: Record<string, any> = {};

  for (const ep of endpoints) {
    const oaPath = openApiPath(ep.path);
    const params = pathParams(ep.path);
    const tag = entityTag(ep.path);
    const operation: any = {
      tags: [tag],
      summary: ep.summary,
      operationId: ep.mcpTool,
      responses: responsesFor(ep),
    };

    const parameters: any[] = params.map((name) => ({
      name,
      in: 'path',
      required: true,
      description: pathParamDescription(name),
      schema: { type: 'string' },
    }));

    // Query params for the aging report.
    if (ep.mcpTool === 'aging_report') {
      parameters.push({
        name: 'asAt',
        in: 'query',
        required: false,
        description: 'As-at date (ISO yyyy-mm-dd). Defaults to today.',
        schema: { type: 'string', format: 'date' },
      });
    }

    if (parameters.length) operation.parameters = parameters;

    const body = requestBodyFor(ep.mcpTool);
    if (body) operation.requestBody = body;

    const method = ep.method.toLowerCase();
    paths[oaPath] = paths[oaPath] || {};
    paths[oaPath][method] = operation;
  }

  return {
    openapi: '3.0.3',
    info: {
      title: `${appName} API (via ToolForge)`,
      version: '1.0.0',
      description:
        `Auto-generated REST API for "${appName}", reverse-engineered by the ToolForge ` +
        `agent pipeline. No original API, SDK, or source was used.`,
    },
    servers: [
      {
        url: '/g/{projectId}',
        description: 'ToolForge generated API base',
        variables: {
          projectId: { default: '<projectId>', description: 'Your ToolForge project id' },
        },
      },
    ],
    security: [{ ApiKeyAuth: [] }],
    tags: distinctTags(endpoints),
    paths,
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
          description: 'Project API key issued by ToolForge on deploy.',
        },
      },
      schemas: schemaComponents(),
    },
  };
}

function distinctTags(endpoints: GeneratedEndpoint[]): { name: string }[] {
  const seen = new Set<string>();
  const out: { name: string }[] = [];
  for (const ep of endpoints) {
    const tag = entityTag(ep.path);
    if (!seen.has(tag)) {
      seen.add(tag);
      out.push({ name: tag });
    }
  }
  return out;
}

function pathParamDescription(name: string): string {
  switch (name) {
    case 'code':
      return 'Resource code (customer code or stock item code).';
    case 'number':
      return 'Invoice number, e.g. IV-2024-0188.';
    default:
      return `Path parameter "${name}".`;
  }
}

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });

function responsesFor(ep: GeneratedEndpoint): any {
  const tag = entityTag(ep.path);
  const isList = ep.method === 'GET' && !ep.path.includes('{') && ep.mcpTool !== 'aging_report';
  const isGetOne = ep.method === 'GET' && ep.path.includes('{');

  const okContent = (schema: any, example: any) => ({
    description: 'Success',
    content: { 'application/json': { schema, example } },
  });

  const errorResponse = (description: string) => ({
    description,
    content: {
      'application/json': {
        schema: ref('Error'),
        example: { error: 'Invalid or missing API key' },
      },
    },
  });

  if (ep.mcpTool === 'aging_report') {
    return {
      '200': okContent(ref('AgingReport'), EXAMPLES.agingReport),
      '401': errorResponse('Invalid or missing API key'),
    };
  }

  if (isList) {
    const item = listItemSchema(ep.mcpTool);
    return {
      '200': okContent({ type: 'array', items: ref(item.name) }, item.example),
      '401': errorResponse('Invalid or missing API key'),
    };
  }

  if (isGetOne) {
    const item = singleSchema(ep.mcpTool);
    return {
      '200': okContent(ref(item.name), item.example),
      '404': errorResponse('Not found'),
      '401': errorResponse('Invalid or missing API key'),
    };
  }

  // POST creators.
  const created = singleSchema(ep.mcpTool);
  return {
    '200': okContent(ref(created.name), created.example),
    '400': errorResponse('Validation error'),
    '401': errorResponse('Invalid or missing API key'),
  };
}

function listItemSchema(mcpTool: string): { name: string; example: any[] } {
  switch (mcpTool) {
    case 'list_customers':
      return { name: 'Customer', example: [EXAMPLES.customer] };
    case 'list_stock':
      return { name: 'StockItem', example: [EXAMPLES.stockItem] };
    case 'list_invoices':
      return { name: 'Invoice', example: [EXAMPLES.invoice] };
    case 'list_payments':
      return { name: 'Payment', example: [EXAMPLES.payment] };
    default:
      return { name: 'Customer', example: [EXAMPLES.customer] };
  }
}

function singleSchema(mcpTool: string): { name: string; example: any } {
  switch (mcpTool) {
    case 'get_customer':
    case 'create_customer':
      return { name: 'Customer', example: EXAMPLES.customer };
    case 'get_stock_item':
      return { name: 'StockItem', example: EXAMPLES.stockItem };
    case 'get_invoice':
    case 'create_invoice':
      return { name: 'Invoice', example: EXAMPLES.invoice };
    case 'record_payment':
      return { name: 'Payment', example: EXAMPLES.payment };
    default:
      return { name: 'Customer', example: EXAMPLES.customer };
  }
}

function requestBodyFor(mcpTool: string): any | undefined {
  if (mcpTool === 'create_customer') {
    return {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['code', 'name'],
            properties: {
              code: { type: 'string', description: 'Unique customer code, e.g. 300-A001.' },
              name: { type: 'string' },
              email: { type: 'string' },
              phone: { type: 'string' },
              address: { type: 'string' },
              creditLimit: { type: 'number' },
            },
          },
          example: { code: '300-E005', name: 'Embun Solutions', email: 'ar@embun.my', creditLimit: 25000 },
        },
      },
    };
  }
  if (mcpTool === 'create_invoice') {
    return {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['customerCode', 'lines'],
            properties: {
              customerCode: { type: 'string', description: 'Existing customer code.' },
              date: { type: 'string', format: 'date', description: 'Invoice date (ISO). Defaults to today.' },
              lines: {
                type: 'array',
                minItems: 1,
                items: {
                  type: 'object',
                  required: ['stockCode', 'qty'],
                  properties: {
                    stockCode: { type: 'string' },
                    qty: { type: 'number' },
                  },
                },
              },
            },
          },
          example: {
            customerCode: '300-A001',
            lines: [
              { stockCode: 'SKU-1001', qty: 10 },
              { stockCode: 'SKU-2001', qty: 2 },
            ],
          },
        },
      },
    };
  }
  if (mcpTool === 'record_payment') {
    return {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['invoiceNumber', 'amount'],
            properties: {
              invoiceNumber: { type: 'string' },
              amount: { type: 'number' },
              method: { type: 'string', description: 'Payment method, e.g. "Bank Transfer".' },
              date: { type: 'string', format: 'date', description: 'Payment date (ISO). Defaults to today.' },
            },
          },
          example: { invoiceNumber: 'IV-2024-0188', amount: 534.2, method: 'Bank Transfer' },
        },
      },
    };
  }
  return undefined;
}

/* ----------------------------- schema components & examples ----------------------------- */

const EXAMPLES = {
  customer: {
    id: 'c1',
    code: '300-A001',
    name: 'Aurora Trading Sdn Bhd',
    email: 'ap@aurora.my',
    phone: '03-7788 1234',
    address: 'Petaling Jaya, Selangor',
    creditLimit: 50000,
    balance: 534.2,
  },
  stockItem: {
    id: 's1',
    code: 'SKU-1001',
    description: 'A4 Copier Paper 80gsm',
    unit: 'REAM',
    unitPrice: 12.5,
    qtyOnHand: 340,
  },
  invoiceLine: {
    stockCode: 'SKU-1001',
    description: 'A4 Copier Paper 80gsm',
    qty: 10,
    unitPrice: 12.5,
    amount: 125,
  },
  invoice: {
    id: 'i1',
    number: 'IV-2024-0188',
    customerCode: '300-A001',
    date: '2024-06-15',
    lines: [
      { stockCode: 'SKU-1001', description: 'A4 Copier Paper 80gsm', qty: 10, unitPrice: 12.5, amount: 125 },
      { stockCode: 'SKU-2001', description: 'Laser Toner CT-200', qty: 5, unitPrice: 189, amount: 945 },
    ],
    subtotal: 1070,
    tax: 64.2,
    total: 1134.2,
    status: 'partial',
  },
  payment: {
    id: 'p1',
    invoiceNumber: 'IV-2024-0188',
    customerCode: '300-A001',
    date: '2024-06-22',
    amount: 600,
    method: 'Bank Transfer',
  },
  agingReport: {
    asAt: '2024-06-30',
    current: 3052.8,
    d30: 0,
    d60: 0,
    d90plus: 0,
    total: 3052.8,
    customers: [
      { customerCode: '300-A001', customerName: 'Aurora Trading Sdn Bhd', current: 381.6, d30: 0, d60: 0, d90plus: 0, total: 381.6 },
      { customerCode: '300-C003', customerName: 'Cahaya Retail', current: 2671.2, d30: 0, d60: 0, d90plus: 0, total: 2671.2 },
    ],
  },
};

function schemaComponents(): Record<string, JsonSchema> {
  return {
    Customer: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        code: { type: 'string' },
        name: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        address: { type: 'string' },
        creditLimit: { type: 'number' },
        balance: { type: 'number' },
      },
      required: ['id', 'code', 'name', 'creditLimit', 'balance'],
    },
    StockItem: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        code: { type: 'string' },
        description: { type: 'string' },
        unit: { type: 'string' },
        unitPrice: { type: 'number' },
        qtyOnHand: { type: 'number' },
      },
      required: ['id', 'code', 'description', 'unit', 'unitPrice', 'qtyOnHand'],
    },
    InvoiceLine: {
      type: 'object',
      properties: {
        stockCode: { type: 'string' },
        description: { type: 'string' },
        qty: { type: 'number' },
        unitPrice: { type: 'number' },
        amount: { type: 'number' },
      },
      required: ['stockCode', 'description', 'qty', 'unitPrice', 'amount'],
    },
    Invoice: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        number: { type: 'string' },
        customerCode: { type: 'string' },
        date: { type: 'string', format: 'date' },
        lines: { type: 'array', items: ref('InvoiceLine') },
        subtotal: { type: 'number' },
        tax: { type: 'number' },
        total: { type: 'number' },
        status: { type: 'string', enum: ['unpaid', 'partial', 'paid'] },
      },
      required: ['id', 'number', 'customerCode', 'date', 'lines', 'subtotal', 'tax', 'total', 'status'],
    },
    Payment: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        invoiceNumber: { type: 'string' },
        customerCode: { type: 'string' },
        date: { type: 'string', format: 'date' },
        amount: { type: 'number' },
        method: { type: 'string' },
      },
      required: ['id', 'invoiceNumber', 'customerCode', 'date', 'amount', 'method'],
    },
    AgingReport: {
      type: 'object',
      properties: {
        asAt: { type: 'string', format: 'date' },
        current: { type: 'number' },
        d30: { type: 'number' },
        d60: { type: 'number' },
        d90plus: { type: 'number' },
        total: { type: 'number' },
        customers: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              customerCode: { type: 'string' },
              customerName: { type: 'string' },
              current: { type: 'number' },
              d30: { type: 'number' },
              d60: { type: 'number' },
              d90plus: { type: 'number' },
              total: { type: 'number' },
            },
            required: ['customerCode', 'customerName', 'current', 'd30', 'd60', 'd90plus', 'total'],
          },
        },
      },
      required: ['asAt', 'current', 'd30', 'd60', 'd90plus', 'total', 'customers'],
    },
    Error: {
      type: 'object',
      properties: { error: { type: 'string' } },
      required: ['error'],
    },
  };
}

/* ----------------------------- buildMcpManifest ----------------------------- */

export function buildMcpManifest(
  appName: string,
  projectId: string,
  endpoints: GeneratedEndpoint[],
): McpManifest {
  const tools: McpTool[] = endpoints.map((ep) => ({
    name: ep.mcpTool,
    description: ep.summary,
    inputSchema: inputSchemaFor(ep),
    rest: { method: ep.method, path: ep.path }, // keep {brace} params for the MCP server to substitute
  }));

  return {
    name: `${slugify(appName)}-mcp`,
    version: '1.0.0',
    description:
      `MCP server exposing the ToolForge-generated REST API for "${appName}" ` +
      `(project ${projectId}) as agent-callable tools.`,
    tools,
  };
}

function inputSchemaFor(ep: GeneratedEndpoint): JsonSchema {
  const properties: Record<string, JsonSchema> = {};
  const required: string[] = [];

  // Path params are always required string properties.
  for (const name of pathParams(ep.path)) {
    properties[name] = { type: 'string', description: pathParamDescription(name) };
    required.push(name);
  }

  // Query params.
  if (ep.mcpTool === 'aging_report') {
    properties.asAt = {
      type: 'string',
      format: 'date',
      description: 'As-at date (ISO yyyy-mm-dd). Defaults to today.',
    };
  }

  // Body params for POST creators.
  if (ep.mcpTool === 'create_customer') {
    properties.code = { type: 'string', description: 'Unique customer code, e.g. 300-A001.' };
    properties.name = { type: 'string' };
    properties.email = { type: 'string' };
    properties.phone = { type: 'string' };
    properties.address = { type: 'string' };
    properties.creditLimit = { type: 'number' };
    required.push('code', 'name');
  } else if (ep.mcpTool === 'create_invoice') {
    properties.customerCode = { type: 'string', description: 'Existing customer code.' };
    properties.date = { type: 'string', format: 'date', description: 'Invoice date (ISO). Defaults to today.' };
    properties.lines = {
      type: 'array',
      minItems: 1,
      description: 'Invoice lines.',
      items: {
        type: 'object',
        properties: {
          stockCode: { type: 'string' },
          qty: { type: 'number' },
        },
        required: ['stockCode', 'qty'],
      },
    };
    required.push('customerCode', 'lines');
  } else if (ep.mcpTool === 'record_payment') {
    properties.invoiceNumber = { type: 'string' };
    properties.amount = { type: 'number' };
    properties.method = { type: 'string', description: 'Payment method, e.g. "Bank Transfer".' };
    properties.date = { type: 'string', format: 'date', description: 'Payment date (ISO). Defaults to today.' };
    required.push('invoiceNumber', 'amount');
  }

  const schema: JsonSchema = {
    type: 'object',
    properties,
    additionalProperties: false,
  };
  if (required.length) schema.required = required;
  return schema;
}

/* ----------------------------- buildDocs ----------------------------- */

export function buildDocs(appName: string, endpoints: GeneratedEndpoint[]): string {
  const placeholderKey = 'tf_live_xxxxxxxxxxxxxxxx';
  const placeholderBase = 'https://api.toolforge.dev/g/<projectId>';
  const mcpSlug = `${slugify(appName)}-mcp`;
  const lines: string[] = [];

  lines.push(`# ${appName} API — ToolForge`);
  lines.push('');
  lines.push(
    `This REST API and MCP server were **auto-generated by ToolForge** from the legacy ` +
      `application **${appName}**, which ships with no API, SDK, or accessible database. ` +
      `ToolForge's agent pipeline studied the app's screens and behavior, reconciled the findings, ` +
      `and synthesized the callable interface documented below.`,
  );
  lines.push('');

  lines.push('## Base URL');
  lines.push('');
  lines.push('```');
  lines.push(placeholderBase);
  lines.push('```');
  lines.push('');
  lines.push('Replace `<projectId>` with your ToolForge project id.');
  lines.push('');

  lines.push('## Authentication');
  lines.push('');
  lines.push(
    'Every request must include your project API key in the `x-api-key` header. ' +
      'Keys are issued when the project is deployed. Requests without a valid key receive ' +
      '`401 { "error": "Invalid or missing API key" }`.',
  );
  lines.push('');
  lines.push('```');
  lines.push(`x-api-key: ${placeholderKey}`);
  lines.push('```');
  lines.push('');

  lines.push('## Endpoints');
  lines.push('');
  for (const ep of endpoints) {
    lines.push(`### ${ep.method} ${ep.path}`);
    lines.push('');
    lines.push(ep.summary);
    lines.push('');
    if (ep.sourceScreen) {
      lines.push(
        `_Source screen:_ ${ep.sourceScreen} · _Triangulation confidence:_ ${ep.confidence.toFixed(2)} · _MCP tool:_ \`${ep.mcpTool}\``,
      );
      lines.push('');
    }

    const params = pathParams(ep.path);
    const docParams = paramDocs(ep);
    if (params.length || docParams.length) {
      lines.push('**Parameters**');
      lines.push('');
      for (const p of params) {
        lines.push(`- \`${p}\` (path, required) — ${pathParamDescription(p)}`);
      }
      for (const d of docParams) {
        lines.push(`- \`${d.name}\` (${d.location}${d.required ? ', required' : ''}) — ${d.description}`);
      }
      lines.push('');
    }

    lines.push('**Example**');
    lines.push('');
    lines.push('```bash');
    lines.push(curlFor(ep, placeholderBase, placeholderKey));
    lines.push('```');
    lines.push('');
  }

  lines.push('## Use from an AI agent (MCP)');
  lines.push('');
  lines.push(
    'ToolForge also generated a Model Context Protocol (MCP) server that wraps the same endpoints ' +
      'as agent-callable tools. Launch it with:',
  );
  lines.push('');
  lines.push('```bash');
  lines.push(`npm run mcp -- --base ${placeholderBase} --key ${placeholderKey}`);
  lines.push('```');
  lines.push('');
  lines.push(`The server (\`${mcpSlug}\`) exposes ${endpoints.length} tools. Sample tool call:`);
  lines.push('');
  lines.push('```json');
  lines.push(JSON.stringify(sampleToolCall(endpoints), null, 2));
  lines.push('```');
  lines.push('');
  lines.push('Available tools:');
  lines.push('');
  for (const ep of endpoints) {
    lines.push(`- \`${ep.mcpTool}\` — ${ep.method} ${ep.path}`);
  }
  lines.push('');

  return lines.join('\n');
}

interface DocParam {
  name: string;
  location: 'query' | 'body';
  required: boolean;
  description: string;
}

function paramDocs(ep: GeneratedEndpoint): DocParam[] {
  switch (ep.mcpTool) {
    case 'aging_report':
      return [{ name: 'asAt', location: 'query', required: false, description: 'As-at date (ISO yyyy-mm-dd). Defaults to today.' }];
    case 'create_customer':
      return [
        { name: 'code', location: 'body', required: true, description: 'Unique customer code.' },
        { name: 'name', location: 'body', required: true, description: 'Customer name.' },
        { name: 'email', location: 'body', required: false, description: 'Contact email.' },
        { name: 'phone', location: 'body', required: false, description: 'Contact phone.' },
        { name: 'address', location: 'body', required: false, description: 'Postal address.' },
        { name: 'creditLimit', location: 'body', required: false, description: 'Credit limit (number).' },
      ];
    case 'create_invoice':
      return [
        { name: 'customerCode', location: 'body', required: true, description: 'Existing customer code.' },
        { name: 'lines', location: 'body', required: true, description: 'Array of { stockCode, qty }.' },
        { name: 'date', location: 'body', required: false, description: 'Invoice date (ISO). Defaults to today.' },
      ];
    case 'record_payment':
      return [
        { name: 'invoiceNumber', location: 'body', required: true, description: 'Invoice to pay.' },
        { name: 'amount', location: 'body', required: true, description: 'Payment amount (number).' },
        { name: 'method', location: 'body', required: false, description: 'Payment method.' },
        { name: 'date', location: 'body', required: false, description: 'Payment date (ISO). Defaults to today.' },
      ];
    default:
      return [];
  }
}

function curlFor(ep: GeneratedEndpoint, base: string, key: string): string {
  // Build a concrete example path by substituting sample path-param values.
  let samplePath = ep.path
    .replace('{code}', ep.path.startsWith('/customers') ? '300-A001' : 'SKU-1001')
    .replace('{number}', 'IV-2024-0188');

  if (ep.mcpTool === 'aging_report') samplePath += '?asAt=2024-06-30';

  const url = `${base}${samplePath}`;
  const headerKey = `  -H "x-api-key: ${key}"`;

  if (ep.method === 'GET') {
    return `curl -s "${url}" \\\n${headerKey}`;
  }

  const body = postBodyExample(ep.mcpTool);
  return (
    `curl -s -X ${ep.method} "${url}" \\\n` +
    `${headerKey} \\\n` +
    `  -H "Content-Type: application/json" \\\n` +
    `  -d '${JSON.stringify(body)}'`
  );
}

function postBodyExample(mcpTool: string): any {
  switch (mcpTool) {
    case 'create_customer':
      return { code: '300-E005', name: 'Embun Solutions', email: 'ar@embun.my', creditLimit: 25000 };
    case 'create_invoice':
      return { customerCode: '300-A001', lines: [{ stockCode: 'SKU-1001', qty: 10 }, { stockCode: 'SKU-2001', qty: 2 }] };
    case 'record_payment':
      return { invoiceNumber: 'IV-2024-0188', amount: 534.2, method: 'Bank Transfer' };
    default:
      return {};
  }
}

function sampleToolCall(endpoints: GeneratedEndpoint[]): any {
  // Prefer a POST creator if present, else the first endpoint.
  const creator = endpoints.find((e) => e.mcpTool === 'create_invoice') ?? endpoints[0];
  if (!creator) return { tool: 'list_customers', arguments: {} };
  let args: any = {};
  if (creator.mcpTool === 'create_invoice') {
    args = postBodyExample('create_invoice');
  } else if (creator.mcpTool === 'create_customer') {
    args = postBodyExample('create_customer');
  } else if (creator.mcpTool === 'record_payment') {
    args = postBodyExample('record_payment');
  } else if (creator.path.includes('{code}')) {
    args = { code: '300-A001' };
  } else if (creator.path.includes('{number}')) {
    args = { number: 'IV-2024-0188' };
  }
  return { tool: creator.mcpTool, arguments: args };
}
