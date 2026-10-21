import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import type { DescuentoTitular } from "../src/dominio/reporte.js";
import { ExportadorExcel, ExportadorPdf } from "../src/infraestructura/exportadores.js";

const descuentos: DescuentoTitular[] = [
  {
    codigoTitular: "UB-103",
    nombreTitular: "Pedro Flores",
    totalBs: 384,
    lineas: [
      { personaId: "UB-103", nombreCompleto: "Pedro Flores", tipo: "EMPLEADO", parentesco: null, modalidad: "PENSION", cantidad: 12, precioUnitarioBs: 15, subtotalBs: 180 },
      { personaId: "FAM-2001", nombreCompleto: "María Flores", tipo: "FAMILIAR", parentesco: "Cónyuge", modalidad: "PENSION", cantidad: 10, precioUnitarioBs: 15, subtotalBs: 150 },
      { personaId: "FAM-2002", nombreCompleto: "Juan Flores", tipo: "FAMILIAR", parentesco: "Hijo", modalidad: "ESPORADICO", cantidad: 3, precioUnitarioBs: 18, subtotalBs: 54 },
    ],
  },
];

describe("HU11 CA3 exportadores", () => {
  it("Excel: una fila por persona con todas las columnas y el total por titular", async () => {
    const contenido = await new ExportadorExcel().generar(2026, 10, descuentos);

    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(Buffer.from(contenido) as unknown as ArrayBuffer);
    const hoja = libro.worksheets[0];
    const filas = hoja.getSheetValues().filter(Boolean) as unknown[][];
    expect(String(filas[0][1])).toContain("octubre de 2026");
    expect(filas[1].slice(1)).toEqual([
      "Código titular", "Empleado titular", "Persona", "Parentesco", "Modalidad",
      "Cantidad", "Precio unitario (Bs)", "Subtotal (Bs)", "Total titular (Bs)",
    ]);
    expect(filas[2].slice(1, 9)).toEqual(["UB-103", "Pedro Flores", "Pedro Flores", "Titular", "Pensionado", 12, 15, 180]);
    expect(filas[4].slice(1)).toEqual(["UB-103", "Pedro Flores", "Juan Flores", "Hijo", "No pensionado", 3, 18, 54, 384]);
    expect(filas[5][9]).toBe(384);
  });

  it("PDF: un archivo PDF válido", async () => {
    const contenido = await new ExportadorPdf().generar(2026, 10, descuentos);

    expect(Buffer.from(contenido.slice(0, 5)).toString()).toBe("%PDF-");
    expect(contenido.length).toBeGreaterThan(800);
  });

  it("PDF sin consumos también se genera", async () => {
    const contenido = await new ExportadorPdf().generar(2026, 10, []);

    expect(Buffer.from(contenido.slice(0, 5)).toString()).toBe("%PDF-");
  });
});
