import {
  AlignmentType, BorderStyle, Document, Packer, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType,
} from "docx";
import { blank, todayISO, type Attachments, type ClaimData } from "./claim-fields";

const W = 9026; // A4 content width with 1" margins
const border = { style: BorderStyle.SINGLE, size: 4, color: "999999" };
const borders = { top: border, bottom: border, left: border, right: border };

function cell(text: string, width: number, bold = false, fill?: string) {
  return new TableCell({
    borders, width: { size: width, type: WidthType.DXA },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    ...(fill ? { shading: { fill, type: ShadingType.CLEAR, color: "auto" } } : {}),
    children: [new Paragraph({ children: [new TextRun({ text, bold })] })],
  });
}

function partyTable(title: string, nameLabel: string, rows: [string, string][]) {
  const c1 = 3200, c2 = W - c1;
  return new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: [c1, c2],
    rows: [
      new TableRow({ children: [cell("Details", c1, true, "E7E6E6"), cell(title, c2, true, "E7E6E6")] }),
      ...rows.map(([l, v], i) => new TableRow({ children: [cell(i === 0 ? nameLabel : l, c1, true), cell(blank(v), c2)] })),
    ],
  });
}

const p = (text: string, opts: { bold?: boolean; after?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}) =>
  new Paragraph({ alignment: opts.align, spacing: { after: opts.after ?? 160 }, children: [new TextRun({ text, bold: opts.bold })] });

export async function buildClaimDocx(d: ClaimData, att: Attachments): Promise<Blob> {
  const box = (on: boolean) => (on ? "☒" : "☐");
  const doc = new Document({
    styles: { default: { document: { run: { font: "Arial", size: 22 } } } },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
      children: [
        p("MOTOR CLAIMS DEPARTMENT", { bold: true, align: AlignmentType.CENTER, after: 360 }),
        p("Messrs."),
        p("Motor Claims Department", { after: 240 }),
        p(`OUR REFERENCE: Claim No: ${blank(d.claimNo)}`, { bold: true, after: 240 }),
        p("Dear Sirs,"),
        p(`On ${blank(d.accidentDate)}, an accident occurred between the following parties:`, { after: 240 }),
        p("OUR INSURED", { bold: true }),
        partyTable("Our Insured", "Insured Name", [
          ["Insured Name", d.insuredName], ["Policy No.", d.insuredPolicyNo], ["Vehicle", d.insuredVehicle], ["Plate No.", d.insuredPlateNo],
        ]),
        p("", { after: 120 }),
        p("OTHER PARTY", { bold: true }),
        partyTable("Other Party", "Insured / Driver Name", [
          ["Name", d.otherName], ["Policy No.", d.otherPolicyNo], ["Vehicle", d.otherVehicle], ["Plate No.", d.otherPlateNo],
        ]),
        p("", { after: 120 }),
        p(`You are kindly requested to settle the amount of ${blank(d.amount)}, representing your ${blank(d.responsibility)}% responsibility share, as per the expert report.`, { after: 240 }),
        p("Furthermore, please find attached copies of the documents related to the above claim:"),
        p(`${box(att.discharge)} Signed Discharge`, { after: 80 }),
        p(`${box(att.bills)} Repairs & Spare Parts Bills`, { after: 80 }),
        p(`${box(att.expert)} Expert Report`, { after: 360 }),
        p("Sincerely yours,"),
        p("Motor Claims Department", { after: 240 }),
        p(`Beirut, ${todayISO()}`),
      ],
    }],
  });
  return Packer.toBlob(doc);
}
