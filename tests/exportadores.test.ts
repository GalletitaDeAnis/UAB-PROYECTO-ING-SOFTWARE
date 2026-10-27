import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import type { DescuentoTitular } from "../src/dominio/reporte.js";
import { ExportadorExcel, ExportadorPdf } from "../src/infraestructura/exportadores.js";

const descuentos: DescuentoTitular[] = [
  {
    titularId: "P-PEDRO",
    codigoEmpleado: "UB-103",
    nombreTitular: "Pedro Flores",
    totalBs: 384,
    lineas: [
      { personaId: "P-PEDRO", nombreCompleto: "Pedro Flores", tipo: "EMPLEADO", parentesco: null, modalidad: "PENSIONADO", cantidad: 12, precioUnitarioBs: 15, subtotalBs: 180 },
      { personaId: "F-MARIA", nombreCompleto: "María Flores", tipo: "FAMILIAR", parentesco: "CONYUGE", modalidad: "PENSIONADO", cantidad: 10, precioUnitarioBs: 15, subtotalBs: 150 },
      { personaId: "F-JUAN", nombreCompleto: "Juan Flores", tipo: "FAMILIAR", parentesco: "HIJO", modalidad: "NO_PENSIONADO", cantidad: 3, precioUnitarioBs: 18, subtotalBs: 54 },
    ],
  },
];

describe("HU10 CA3 exportadores", () => {
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

  it("HU10 CA5 un titular sin consumo figura con 0 Bs", async () => {
    const sinConsumo: DescuentoTitular[] = [
      { titularId: "P-CARLOS", codigoEmpleado: "UB-101", nombreTitular: "Carlos Mamani", lineas: [], totalBs: 0 },
    ];

    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(Buffer.from(await new ExportadorExcel().generar(2026, 10, sinConsumo)) as unknown as ArrayBuffer);
    const filas = libro.worksheets[0].getSheetValues().filter(Boolean) as unknown[][];

    expect(filas[2].slice(1, 10)).toEqual(["UB-101", "Carlos Mamani", "Sin consumo en el mes", "", "", 0, undefined, 0, 0]);
    const pdf = await new ExportadorPdf().generar(2026, 10, sinConsumo);
    expect(Buffer.from(pdf.slice(0, 5)).toString()).toBe("%PDF-");
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
