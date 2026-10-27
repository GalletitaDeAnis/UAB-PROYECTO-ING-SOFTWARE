import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { PARENTESCOS } from "../dominio/modelo.js";
import type { ExportadorReporte } from "../dominio/puertos.js";
import type { DescuentoTitular, LineaDescuento } from "../dominio/reporte.js";

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function periodo(anio: number, mes: number): string {
  return `${MESES[mes - 1]} de ${anio}`;
}

function modalidad(linea: LineaDescuento): string {
  return linea.modalidad === "PENSIONADO" ? "Pensionado" : "No pensionado";
}

function parentesco(linea: LineaDescuento): string {
  return linea.tipo === "EMPLEADO" ? "Titular" : linea.parentesco ? PARENTESCOS[linea.parentesco] : "Familiar";
}

/** HU10 CA3: titular, persona, parentesco, modalidad, cantidad, precio, subtotal y total por titular. */
export class ExportadorExcel implements ExportadorReporte {
  readonly formato = "EXCEL" as const;
  readonly extension = "xlsx";
  readonly tipoContenido = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  async generar(anio: number, mes: number, descuentos: DescuentoTitular[]): Promise<Uint8Array> {
    const libro = new ExcelJS.Workbook();
    libro.creator = "Reservas de almuerzo · Unión Boliviana";
    const hoja = libro.addWorksheet("Descuento por planilla");

    hoja.addRow([`Descuento por planilla · almuerzos de ${periodo(anio, mes)}`]).font = { bold: true, size: 13 };
    hoja.addRow([]);
    const encabezado = hoja.addRow([
      "Código titular", "Empleado titular", "Persona", "Parentesco", "Modalidad",
      "Cantidad", "Precio unitario (Bs)", "Subtotal (Bs)", "Total titular (Bs)",
    ]);
    encabezado.font = { bold: true };

    for (const titular of descuentos) {
      // HU10 CA5: quien no consumió figura igual, con 0 Bs.
      if (titular.lineas.length === 0) {
        hoja.addRow([titular.codigoEmpleado, titular.nombreTitular, "Sin consumo en el mes", "", "", 0, null, 0, 0]);
      }
      titular.lineas.forEach((linea, indice) => {
        hoja.addRow([
          titular.codigoEmpleado,
          titular.nombreTitular,
          linea.nombreCompleto,
          parentesco(linea),
          modalidad(linea),
          linea.cantidad,
          linea.precioUnitarioBs,
          linea.subtotalBs,
          indice === titular.lineas.length - 1 ? titular.totalBs : null,
        ]);
      });
    }
    const total = descuentos.reduce((suma, titular) => suma + titular.totalBs, 0);
    const pie = hoja.addRow(["", "", "", "", "", "", "", "Total del mes", total]);
    pie.font = { bold: true };

    [14, 24, 24, 14, 16, 10, 18, 14, 18].forEach((ancho, i) => (hoja.getColumn(i + 1).width = ancho));
    return new Uint8Array(await libro.xlsx.writeBuffer());
  }
}

export class ExportadorPdf implements ExportadorReporte {
  readonly formato = "PDF" as const;
  readonly extension = "pdf";
  readonly tipoContenido = "application/pdf";

  generar(anio: number, mes: number, descuentos: DescuentoTitular[]): Promise<Uint8Array> {
    return new Promise((resolver, rechazar) => {
      const doc = new PDFDocument({ size: "A4", margin: 40, info: { Title: `Descuento ${periodo(anio, mes)}` } });
      const partes: Buffer[] = [];
      doc.on("data", (parte: Buffer) => partes.push(parte));
      doc.on("end", () => resolver(new Uint8Array(Buffer.concat(partes))));
      doc.on("error", rechazar);

      doc.fontSize(15).text("Descuento por planilla · Restaurante de la Unión Boliviana");
      doc.fontSize(11).fillColor("#444").text(`Almuerzos de ${periodo(anio, mes)}`).fillColor("#000");
      doc.moveDown();

      if (descuentos.length === 0) {
        doc.text("No hay usuarios empleados ni consumos para este periodo.");
      }
      for (const titular of descuentos) {
        if (doc.y > 720) doc.addPage();
        doc.fontSize(12).font("Helvetica-Bold").text(`${titular.nombreTitular} (${titular.codigoEmpleado})`);
        doc.font("Helvetica").fontSize(10);
        if (titular.lineas.length === 0) doc.text("Sin consumo en el mes.", { indent: 14 });
        for (const linea of titular.lineas) {
          doc.text(
            `${linea.nombreCompleto} · ${parentesco(linea)} · ${modalidad(linea)} · ` +
              `${linea.cantidad} × ${linea.precioUnitarioBs} Bs = ${linea.subtotalBs} Bs`,
            { indent: 14 },
          );
        }
        doc.font("Helvetica-Bold").text(`Total a descontar: ${titular.totalBs} Bs`, { indent: 14 });
        doc.font("Helvetica").moveDown(0.6);
      }
      const total = descuentos.reduce((suma, titular) => suma + titular.totalBs, 0);
      doc.moveDown().font("Helvetica-Bold").fontSize(11).text(`Total del mes: ${total} Bs`);
      doc.end();
    });
  }
}
