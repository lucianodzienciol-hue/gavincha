/**
 * Comprobante de pedidos web: helpers puros (sin DOM) compartidos por la
 * tienda y los tests. La tienda los usa desde `window.NexusReceipt`.
 */

function toDate(value) {
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number') return new Date(value);
  const s = String(value || '').trim();
  if (!s) return null;
  // SQLite guarda UTC como "YYYY-MM-DD HH:MM:SS", sin zona.
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
  const d = m
    ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)))
    : new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export function orderDateText(value, options = {}) {
  const d = toDate(value);
  if (!d) return '';
  const opts = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  };
  if (options.timeZone) opts.timeZone = options.timeZone;
  try {
    return new Intl.DateTimeFormat('es-AR', opts).format(d).replace(',', '');
  } catch {
    delete opts.timeZone;
    return new Intl.DateTimeFormat('es-AR', opts).format(d).replace(',', '');
  }
}

export function normalizeOrder(order, options = {}) {
  const src = order && typeof order === 'object' ? order : {};
  const items = (Array.isArray(src.items) ? src.items : [])
    .map(it => {
      const quantity = Math.max(0, Math.floor(Number(it && it.quantity) || 0));
      const price = Number(it && it.price) || 0;
      return {
        name: String((it && (it.name || it.productName)) || '').trim(),
        quantity,
        price,
        subtotal: quantity * price,
      };
    })
    .filter(it => it.name);

  const sum = items.reduce((s, i) => s + i.subtotal, 0);
  const rawTotal = src.total;
  const total = rawTotal !== null && rawTotal !== undefined && rawTotal !== '' && Number.isFinite(Number(rawTotal))
    ? Number(rawTotal)
    : sum;

  return {
    id: String(src.id || '').trim(),
    dateText: orderDateText(src.date || src.createdAt || new Date().toISOString(), { timeZone: options.timeZone }),
    clientName: String(src.clientName || '').trim(),
    clientPhone: String(src.clientPhone || '').trim(),
    notes: String(src.notes || '').trim(),
    items,
    total,
  };
}

export function receiptFileName(model, options = {}) {
  const id = String((model && model.id) || '').trim();
  if (id) return id.replace(/[^A-Za-z0-9._-]/g, '_') + '.pdf';

  let d = options.now instanceof Date ? options.now : new Date(options.now || Date.now());
  if (isNaN(d.getTime())) d = new Date();
  const opts = {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  };
  if (options.timeZone) opts.timeZone = options.timeZone;
  const parts = {};
  for (const p of new Intl.DateTimeFormat('en-GB', opts).formatToParts(d)) parts[p.type] = p.value;
  return `pedido-web-${parts.year}${parts.month}${parts.day}-${parts.hour}${parts.minute}.pdf`;
}

export function orderWhatsappText(model, options = {}) {
  const companyName = options.companyName || 'la tienda';
  const formatMoney = options.formatMoney || (n => String(n));
  const m = model || {};
  const lines = [`Hola ${companyName}! Te envío el detalle del pedido${m.id ? ' ' + m.id : ''}:`, ''];
  for (const it of m.items || []) {
    lines.push(`• ${it.quantity} x ${it.name} - ${formatMoney(it.subtotal)}`);
  }
  lines.push('', `Total: ${formatMoney(m.total)}`);
  if (m.clientName) lines.push(`Cliente: ${m.clientName}`);
  if (m.clientPhone) lines.push(`Tel: ${m.clientPhone}`);
  if (m.dateText) lines.push(`Fecha: ${m.dateText}`);
  return lines.join('\n');
}

if (typeof window !== 'undefined') {
  window.NexusReceipt = { normalizeOrder, orderDateText, receiptFileName, orderWhatsappText };
}
