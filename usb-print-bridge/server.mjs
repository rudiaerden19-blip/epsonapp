/**
 * Lokale print-bridge: zelfde HTTP-contract als Vysion Print op poort 3001.
 * Alleen 127.0.0.1 — POST /print, GET /status
 *
 * Twee transporten:
 * - serialPath + baudRate (COM-poort, klassieke Epson Virtual COM)
 * - windowsPrinterName (Windows RAW via Epson USB-driver — geen COM nodig)
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import express from 'express'
import { SerialPort } from 'serialport'
import { buildEscPosReceipt } from './lib/receipt-escpos.mjs'
import { sendRawToWindowsPrinter } from './lib/winspool-raw.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function loadConfig() {
  const cfgPath = path.join(__dirname, 'config.json')
  if (!fs.existsSync(cfgPath)) {
    console.error(
      'Geen config.json. Kopieer config.example.json naar config.json en vul serialPath (COMx) óf windowsPrinterName in.'
    )
    process.exit(1)
  }
  const raw = JSON.parse(fs.readFileSync(cfgPath, 'utf8'))
  const listenHost = raw.listenHost || '127.0.0.1'
  const listenPort = Number(raw.listenPort) || 3001
  const serialPath = typeof raw.serialPath === 'string' ? raw.serialPath.trim() : ''
  const baudRate = Number(raw.baudRate) || 9600
  const windowsPrinterName =
    typeof raw.windowsPrinterName === 'string' ? raw.windowsPrinterName.trim() : ''

  const useWinspool = Boolean(windowsPrinterName) && process.platform === 'win32'
  const useSerial = Boolean(serialPath)

  if (!useWinspool && !useSerial) {
    console.error(
      'config.json: zet serialPath (bijv. COM4) óf windowsPrinterName (exacte Windows-printernaam, alleen Windows).'
    )
    process.exit(1)
  }

  if (useWinspool && windowsPrinterName && useSerial) {
    console.warn('Let op: windowsPrinterName en serialPath zijn beide gezet; Windows RAW-modus (windowsPrinterName) wordt gebruikt.')
  }

  return {
    listenHost,
    listenPort,
    serialPath,
    baudRate,
    windowsPrinterName,
    useWinspool: Boolean(windowsPrinterName) && process.platform === 'win32',
    useSerial: useSerial && !(Boolean(windowsPrinterName) && process.platform === 'win32'),
  }
}

const cfg = loadConfig()

/** Laatste succesvolle schrijfactie (voor simpele status) */
let lastOkAt = 0
let lastError = ''

function writeToPrinterSerial(buffer) {
  return new Promise((resolve, reject) => {
    const port = new SerialPort({
      path: cfg.serialPath,
      baudRate: cfg.baudRate,
      autoOpen: false,
    })
    port.open((err) => {
      if (err) {
        reject(err)
        return
      }
      port.write(buffer, (wErr) => {
        if (wErr) {
          port.close(() => reject(wErr))
          return
        }
        port.drain((dErr) => {
          port.close((cErr) => {
            if (dErr) reject(dErr)
            else if (cErr) reject(cErr)
            else resolve()
          })
        })
      })
    })
  })
}

function writeToPrinter(buffer) {
  if (cfg.useWinspool) {
    return Promise.resolve().then(() => sendRawToWindowsPrinter(cfg.windowsPrinterName, buffer))
  }
  return writeToPrinterSerial(buffer)
}

const app = express()
app.use(express.json({ limit: '512kb' }))

app.get('/status', (_req, res) => {
  const base = {
    status: 'online',
    bridge: 'usb-print-bridge',
    transport: cfg.useWinspool ? 'windows_raw' : 'serial',
    lastOkAt,
    lastError: lastError || undefined,
  }
  if (cfg.useWinspool) {
    base.windowsPrinterName = cfg.windowsPrinterName
  } else {
    base.serialPath = cfg.serialPath
    base.baudRate = cfg.baudRate
  }
  res.json(base)
})

app.post('/print', async (req, res) => {
  try {
    const body = req.body
    const buf = buildEscPosReceipt(body)
    await writeToPrinter(buf)
    lastOkAt = Date.now()
    lastError = ''
    res.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    lastError = msg
    console.error('Print error:', msg)
    res.status(500).json({ success: false, error: msg })
  }
})

app.listen(cfg.listenPort, cfg.listenHost, () => {
  if (cfg.useWinspool) {
    console.log(
      `USB print-bridge op http://${cfg.listenHost}:${cfg.listenPort} → Windows RAW → "${cfg.windowsPrinterName}"`
    )
  } else {
    console.log(
      `USB print-bridge op http://${cfg.listenHost}:${cfg.listenPort} → ${cfg.serialPath} @ ${cfg.baudRate} baud`
    )
  }
})
