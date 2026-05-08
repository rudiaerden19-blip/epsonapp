# USB print-bridge (Windows, Epson via USB)

Lokale mini-server op **de kassa-PC**: luistert alleen op **`127.0.0.1:3001`** en stuurt bonnen naar een Epson bonprinter op **USB**.

**Twee manieren (allebei USB, geen netwerk naar de printer nodig):**

1. **COM-poort** (`serialPath`) — als Epson een virtuele COM aanmaakt.  
2. **Windows-printernaam** (`windowsPrinterName`) — als je **geen COM** hebt maar de printer **wél** in Windows staat en **testafdruk** werkt. De bridge stuurt dan **RAW ESC/POS** via de Windows-printwachtrij — nog steeds dezelfde USB-kabel.

Zelfde HTTP-contract als Vysion Print / iPad-app:

- `GET /status` → `{ "status": "online", ... }`
- `POST /print` → JSON met `order`, `businessInfo`, `printType` (`customer` | `kitchen`)

In het platform: bij printerinstellingen **`127.0.0.1`** (poort **3001**).

## Vereisten

1. **Windows** + **Node.js LTS** (https://nodejs.org).  
2. Epson geïnstalleerd zodat **testafdruk** uit de utility **lukt**.

## Config (`config.json`)

Kopieer `config.example.json` naar `config.json`.

### Optie A — COM

```json
{
  "listenHost": "127.0.0.1",
  "listenPort": 3001,
  "serialPath": "COM4",
  "baudRate": 9600,
  "windowsPrinterName": ""
}
```

### Optie B — geen COM, wel printer in Windows (RAW)

Exacte naam uit **Instellingen → Printers en scanners**:

```json
{
  "listenHost": "127.0.0.1",
  "listenPort": 3001,
  "serialPath": "",
  "baudRate": 9600,
  "windowsPrinterName": "EPSON TM-T88V Receipt"
}
```

Staan **beide** `serialPath` en `windowsPrinterName` op Windows ingevuld, dan wint **`windowsPrinterName`**.

## Installatie

1. Map **`usb-print-bridge`** op de PC zetten.  
2. **`npm install`**  
3. **`config.json`** invullen.  
4. **`npm start`** of **`start-bridge.bat`** — venster open laten.

**`npm run ports`** — alleen relevant bij COM-modus.

## Problemen

- **`OpenPrinter failed`**: naam klopt niet — exact overnemen uit Windows.  
- **COM `Access denied`**: ander programma sluiten dat de poort gebruikt.  
- **Vreemde tekens op bon**: driver/Epson-instelling of baudrate (COM-modus).
