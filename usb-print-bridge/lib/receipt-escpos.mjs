/**
 * JSON bon (zelfde velden als Vysion Print :3001) → ESC/POS buffer.
 * Codepage CP858 (Euro). 48 tekens ≈ 80mm rol.
 */

import iconv from 'iconv-lite'

const WIDTH = 48

const ESC = '\x1B'
const GS = '\x1D'

function alignLeft() {
  return ESC + '\x61\x00'
}
function alignCenter() {
  return ESC + '\x61\x01'
}
function boldOn() {
  return ESC + '\x45\x01'
}
function boldOff() {
  return ESC + '\x45\x00'
}
function initPrinter() {
  return ESC + '@'
}
/** Feed + partiele cut (gangbaar Epson TM) */
function cut() {
  return '\n\n\n' + GS + '\x56\x41\x03'
}

function padLine(left, right, w = WIDTH) {
  const L = String(left ?? '').trimEnd()
  const R = String(right ?? '').trimStart()
  const space = w - L.length - R.length
  if (space < 1) {
    return L.slice(0, w)
  }
  return L + ' '.repeat(space) + R
}

function wrapText(text, w = WIDTH) {
  const s = String(text ?? '').replace(/\r\n/g, '\n').trim()
  if (!s) return []
  const lines = []
  for (const para of s.split('\n')) {
    let rest = para.trim()
    while (rest.length > 0) {
      lines.push(rest.slice(0, w))
      rest = rest.slice(w).trimStart()
    }
  }
  return lines
}

function money(n) {
  const x = Number(n)
  if (Number.isNaN(x)) return '0.00'
  return x.toFixed(2)
}

function buildChunks(order, businessInfo, printType) {
  const chunks = []
  const pushText = (t) => chunks.push(iconv.encode(t, 'cp858'))

  chunks.push(Buffer.from(initPrinter(), 'binary'))
  pushText(alignLeft())

  const bi = businessInfo || {}
  const isKitchen = printType === 'kitchen'

  if (!isKitchen) {
    pushText(alignCenter())
    pushText(boldOn())
    pushText(`${String(bi.name || '—').slice(0, WIDTH)}\n`)
    pushText(boldOff())
    if (bi.address) pushText(`${String(bi.address).slice(0, WIDTH)}\n`)
    const cityLine = [bi.postalCode, bi.city].filter(Boolean).join(' ')
    if (cityLine) pushText(`${cityLine.slice(0, WIDTH)}\n`)
    if (bi.phone) pushText(`${String(bi.phone).slice(0, WIDTH)}\n`)
    if (bi.btw_number) pushText(`${String(bi.btw_number).slice(0, WIDTH)}\n`)
    pushText('-'.repeat(WIDTH) + '\n')
    pushText(alignLeft())
  } else {
    pushText(alignCenter())
    pushText(boldOn())
    pushText('KEUKEN\n')
    pushText(boldOff())
    pushText(alignLeft())
    pushText('-'.repeat(WIDTH) + '\n')
  }

  const on = order.order_number ?? order.orderNumber
  pushText(alignCenter())
  pushText(boldOn())
  pushText(`ORDER #${on}\n`)
  pushText(boldOff())
  pushText(alignLeft())
  pushText('-'.repeat(WIDTH) + '\n')

  if (order.customer_name) {
    for (const ln of wrapText(String(order.customer_name), WIDTH)) pushText(`${ln}\n`)
  }
  if (order.customer_phone) pushText(`${String(order.customer_phone).slice(0, WIDTH)}\n`)
  if (order.order_type) pushText(`${padLine('Type:', String(order.order_type))}\n`)

  pushText('-'.repeat(WIDTH) + '\n')

  const items = Array.isArray(order.items) ? order.items : []
  for (const it of items) {
    const qty = Number(it.quantity) || 0
    const name = String(it.product_name || it.name || '—').slice(0, 32)
    const lineTotal = money(it.total_price ?? it.total ?? 0)
    pushText(`${padLine(`${qty}x ${name}`, `EUR ${lineTotal}`)}\n`)
    const opts = it.options || it.choices
    if (Array.isArray(opts)) {
      for (const o of opts) {
        const oname = String(o.name || o.choiceName || '').slice(0, 36)
        if (oname) pushText(`   ${oname}\n`)
      }
    }
  }

  pushText('-'.repeat(WIDTH) + '\n')

  if (!isKitchen) {
    pushText(`${padLine('Subtotaal:', `EUR ${money(order.subtotal)}`)}\n`)
    if (Number(order.delivery_fee) > 0) {
      pushText(`${padLine('Levering:', `EUR ${money(order.delivery_fee)}`)}\n`)
    }
    if (Number(order.discount) > 0) {
      pushText(`${padLine('Korting:', `EUR ${money(order.discount)}`)}\n`)
    }
    pushText(boldOn())
    pushText(`${padLine('TOTAAL:', `EUR ${money(order.total)}`)}\n`)
    pushText(boldOff())
    const btw = bi.btw_percentage
    if (btw != null && order.tax != null) {
      pushText(`${padLine(`BTW (${btw}%):`, `EUR ${money(order.tax)}`)}\n`)
    }
    if (order.payment_method) pushText(`${padLine('Betaald:', String(order.payment_method))}\n`)
  }

  if (order.notes || order.customer_notes) {
    pushText('-'.repeat(WIDTH) + '\n')
    for (const ln of wrapText(String(order.notes || order.customer_notes), WIDTH)) pushText(`${ln}\n`)
  }

  const printed = order.created_at ? new Date(order.created_at).toLocaleString('nl-BE') : new Date().toLocaleString('nl-BE')
  pushText('-'.repeat(WIDTH) + '\n')
  pushText(alignCenter())
  pushText(`${printed}\n`)
  pushText(alignLeft())

  chunks.push(Buffer.from(cut(), 'binary'))
  return Buffer.concat(chunks)
}

export function buildEscPosReceipt(payload) {
  const { order, businessInfo, printType } = payload
  if (!order || typeof order !== 'object') {
    throw new Error('Missing order')
  }
  const pt = printType === 'kitchen' ? 'kitchen' : 'customer'
  return buildChunks(order, businessInfo, pt)
}
