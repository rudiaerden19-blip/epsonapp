/**
 * Lijst COM-poorten (Windows: COM1, COM4, …) om config.json in te vullen.
 */

import { SerialPort } from 'serialport'

const ports = await SerialPort.list()
if (ports.length === 0) {
  console.log('Geen seriële poorten gevonden. USB-kabel + Epson-driver installeren (COM-poort).')
  process.exit(0)
}

console.log('Beschikbare poorten — zet "serialPath" in config.json:\n')
for (const p of ports) {
  const pathLabel = p.path
  const manufacturer = p.manufacturer || ''
  const vendor = p.vendorId != null ? `vid:${p.vendorId}` : ''
  const product = p.productId != null ? `pid:${p.productId}` : ''
  console.log(`  ${pathLabel.padEnd(14)} ${manufacturer} ${vendor} ${product}`.trim())
}
console.log('\nTypische Epson TM: COM3–COM9 na USB-install.')
