/**
 * Windows: RAW ESC/POS naar een geïnstalleerde printer (zelfde USB als Epson-driver).
 * Gebruikt Winspool + WritePrinter (datatype RAW). Geen COM nodig.
 */

import fs from 'fs'
import path from 'path'
import os from 'os'
import { spawnSync } from 'child_process'

/**
 * @param {string} printerName Exacte naam zoals onder Instellingen → Printers en scanners
 * @param {Buffer} buffer
 */
export function sendRawToWindowsPrinter(printerName, buffer) {
  if (process.platform !== 'win32') {
    throw new Error('windowsPrinterName wordt alleen ondersteund op Windows')
  }
  if (!printerName || typeof printerName !== 'string') {
    throw new Error('Ongeldige printer naam')
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vysion-print-'))
  const binPath = path.join(dir, 'job.bin')
  const psPath = path.join(dir, 'raw.ps1')

  try {
    fs.writeFileSync(binPath, buffer)

    const psScript = `
$ErrorActionPreference = 'Stop'
$printerName = ${JSON.stringify(printerName)}
$binPath = ${JSON.stringify(binPath)}
$bytes = [System.IO.File]::ReadAllBytes($binPath)

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public class VysionRawPrinter {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public struct DOCINFO {
    public string pDocName;
    public string pOutputFile;
    public string pDatatype;
  }

  [DllImport("winspool.drv", EntryPoint = "OpenPrinterW", SetLastError = true, CharSet = CharSet.Unicode)]
  public static extern bool OpenPrinter(string szPrinter, out IntPtr hPrinter, IntPtr pd);

  [DllImport("winspool.drv", EntryPoint = "ClosePrinter", SetLastError = true)]
  public static extern bool ClosePrinter(IntPtr hPrinter);

  [DllImport("winspool.drv", EntryPoint = "StartDocPrinterW", SetLastError = true, CharSet = CharSet.Unicode)]
  public static extern bool StartDocPrinter(IntPtr hPrinter, int level, ref DOCINFO di);

  [DllImport("winspool.drv", EntryPoint = "EndDocPrinter", SetLastError = true)]
  public static extern bool EndDocPrinter(IntPtr hPrinter);

  [DllImport("winspool.drv", EntryPoint = "StartPagePrinter", SetLastError = true)]
  public static extern bool StartPagePrinter(IntPtr hPrinter);

  [DllImport("winspool.drv", EntryPoint = "EndPagePrinter", SetLastError = true)]
  public static extern bool EndPagePrinter(IntPtr hPrinter);

  [DllImport("winspool.drv", EntryPoint = "WritePrinter", SetLastError = true)]
  public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

  public static void Send(string name, byte[] data) {
    IntPtr h = IntPtr.Zero;
    if (!OpenPrinter(name, out h, IntPtr.Zero))
      throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error(), "OpenPrinter failed");
    try {
      DOCINFO di = new DOCINFO();
      di.pDocName = "Vysion bon";
      di.pOutputFile = null;
      di.pDatatype = "RAW";
      if (!StartDocPrinter(h, 1, ref di))
        throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error(), "StartDocPrinter failed");
      try {
        if (!StartPagePrinter(h))
          throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error(), "StartPagePrinter failed");
        try {
          IntPtr p = Marshal.AllocCoTaskMem(data.Length);
          try {
            Marshal.Copy(data, 0, p, data.Length);
            int written;
            if (!WritePrinter(h, p, data.Length, out written))
              throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error(), "WritePrinter failed");
          } finally {
            Marshal.FreeCoTaskMem(p);
          }
        } finally {
          EndPagePrinter(h);
        }
      } finally {
        EndDocPrinter(h);
      }
    } finally {
      ClosePrinter(h);
    }
  }
}
'@

[VysionRawPrinter]::Send($printerName, $bytes)
`

    fs.writeFileSync(psPath, `\uFEFF${psScript}`, 'utf8')

    const r = spawnSync(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', psPath],
      { encoding: 'utf8', windowsHide: true, timeout: 60000 }
    )

    if (r.error) throw r.error
    if (r.status !== 0) {
      const errOut = (r.stderr || '') + (r.stdout || '') || `exit ${r.status}`
      throw new Error(errOut.trim() || `PowerShell exit ${r.status}`)
    }
  } finally {
    try {
      fs.rmSync(dir, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
  }
}
