# USB print-bridge (Windows, Epson via USB)

Lokale mini-server op **de kassa-PC**: luistert alleen op **`127.0.0.1:3001`** en stuurt bonnen naar een Epson bonprinter op een **COM-poort** (USB). Geen WiFi naar de printer nodig.

Zelfde HTTP-contract als Vysion Print / iPad-app:

- `GET /status` → `{ "status": "online", ... }`
- `POST /print` → JSON met `order`, `businessInfo`, `printType` (`customer` | `kitchen`)

In het platform: bij printerinstellingen het adres **`127.0.0.1`** opslaan (poort **3001** is vast).

## Vereisten (per PC)

1. **Windows** + **Node.js LTS** (https://nodejs.org) — tijdens installatie optie “Tools” aanvinken als `npm install` native modules niet bouwt.
2. **Epson USB-driver** geïnstalleerd zodat de printer als **COM-poort** verschijnt (Apparaatbeheer → Poorten (COM & LPT)).

## Installatie (map kopiëren)

1. Kopieer de map **`usb-print-bridge`** naar de PC (bijv. `C:\Vysion\usb-print-bridge`).
2. Dubbelklik **`start-bridge.bat`**  
   - eerste keer: `npm install`  
   - daarna start `server.mjs`
3. Of handmatig in PowerShell/cmd:

```bat
cd C:\Vysion\usb-print-bridge
npm install
copy config.example.json config.json
npm run ports
```

4. Open **`config.json`** en zet **`serialPath`** op je COM-poort (bijv. `"COM4"`).  
   **`baudRate`**: meestal **9600** of **115200** (zie Epson-handleiding / driver).

5. Start opnieuw met **`start-bridge.bat`** of `npm start`. Laat dit venster **open** tijdens het werk, of plan later een Windows-service (bv. met NSSM).

## Veel PCs (50+)

- Dezelfde map op elke machine; alleen **`config.json`** kan verschillen (**COM-poort**).
- Optioneel: elk een vaste map `C:\Vysion\usb-print-bridge` + snelkoppeling naar `start-bridge.bat` in Opstarten.

## Problemen

- **Geen COM-poort**: driver/Epson Advanced Printer Driver voor TM-serie.
- **`Access denied` op COM**: andere programma's sluiten die de printer gebruiken.
- **`baudRate` verkeerd**: rare tekens → andere baudrate proberen.
