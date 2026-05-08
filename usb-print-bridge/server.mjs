/**
 * Lokale print-bridge: zelfde HTTP-contract als Vysion Print op poort 3001.
 * Alleen 127.0.0.1 — POST /print, GET /status
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import express from 'express'
import { SerialPort } from 'serialport'
import { buildEscPosReceipt } from './lib/receipt-escpos.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function loadConfig() {
  const cfgPath = path.join(__dirname, 'config.json')
  if (!fs.existsSync(cfgPath)) {
    console.error('Geen config.json. Kopieer config.example.json naar config.json en vul serialPath in (bijv. COM4).')
    process.exit(1)
  }
  const raw = JSON.parse(fs.readFileSync(cfgPath, 'utf8'))
  const listenHost = raw.listenHost || '127.0.0.1'
  const listenPort = Number(raw.listenPort) || 3001
  const serialPath = raw.serialPath
  const baudRate = Number(raw.baudRate) || 9600
  if (!serialPath || typeof serialPath !== 'string') {
    console.error('config.json: serialPath ontbreekt (Windows COM-poort, bijv. COM4).')
    process.exit(1)
  }
  return { listenHost, listenPort, serialPath, baudRate }
}

const cfg = loadConfig()

/** Laatste succesvolle schrijfactie (voor simpele status) */
let lastOkAt = 0
let lastError = ''

function writeToPrinter(buffer) {
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

const app = express()
app.use(express.json({ limit: '512kb' }))

app.get('/status', (_req, res) => {
  res.json({
    status: 'online',
    bridge: 'usb-print-bridge',
    serialPath: cfg.serialPath,
    baudRate: cfg.baudRate,
    lastOkAt,
    lastError: lastError || undefined,
  })
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
  console.log(
    `USB print-bridge luistert op http://${cfg.listenHost}:${cfg.listenPort} → ${cfg.serialPath} @ ${cfg.baudRate} baud`
  )
})
