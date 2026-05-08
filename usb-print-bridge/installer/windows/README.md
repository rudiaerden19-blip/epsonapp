# Één Windows-installatieprogramma (bridge + optioneel Epson-drivers)

Doel: **één `.exe`** voor de kassa-PC die:

1. De **usb-print-bridge** naar `Program Files\Vysion\UsbPrintBridge\bridge` kopieert  
2. Optioneel **direct daarna** de Epson multi-model setup draait (als je die bijbouwt)  
3. **`npm ci`** op de bridge uitvoert als **Node.js** al op het systeem staat  

## Epson-driver “in één bestand”

- **Wij zetten geen Epson‑bestanden in Git** (copyright / herdistributie).
- Jij downloadt **één groot TM-/thermal‑pakket** van Epson dat **veel oudere bonprinters** dekt en zet het hier:

  `installer/windows/vendor/Epson_TM_Driver.exe`

- Daarna compiler je Inno Setup → het output‑`.exe` **bevat** die driver-setup **én** de bridge.

**Let op:** stille install‑parameters (`/S`, `/quiet`, …) verschillen per Epson‑versie. Pas zo nodig regel `[Run]` in het `.iss`‑bestand aan na jouw test op een echte PC.

## Vereisten om te bouwen

1. [Inno Setup 6](https://jrsoftware.org/isdl.php)  
2. (Optioneel) het Epson‑bestand als `vendor\Epson_TM_Driver.exe`

## Compileren

1. Open `VysionUsbPrintBundle.iss` in Inno Setup  
2. Build → Compile  
3. Output staat in `installer/windows/output/` (zie `#define OutputDir` in het script)

## Runtime op de kassa

**“Installeren + USB in → werkt het?”** Bijna — dit moet kloppen:

1. **Node.js LTS** op die PC (https://nodejs.org), **vóór of ná** setup; zonder Node mislukt `npm ci` tijdens setup → dan handmatig in `...\bridge`: `npm ci --omit=dev`.
2. **Epson-driver**: óf meegebundeld als `Epson_TM_Driver.exe`, óf al eerder geïnstalleerd — tot Windows een **COM-poort** (of jouw gekozen pad) voor de printer heeft.
3. **`config.json`** in de bridge-map (kopie van `config.example.json`): **`serialPath`** = juiste **COM** op **die** PC (`COM4` kan elders `COM5` zijn).
4. **Bridge laten draaien** (Startmenu-snelkoppeling), niet alleen installeren.
5. In het **platform**: printer-IP **`127.0.0.1`** voor thermisch printen op die kassa.

Pas dan: zelfde `.exe` op elke kassa, maar **COM-poort in config** kan per machine verschillen.

## Geen driver meegebundeld?

Als `vendor\Epson_TM_Driver.exe` **ontbreekt**, bouwt Inno nog steeds een setup die **alleen de bridge** installeert; Epson moet de gebruiker dan eerder zelf hebben geïnstalleerd.
