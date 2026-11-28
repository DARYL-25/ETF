#!/usr/bin/env python3
"""Builds the ETF Intelligence portfolio import templates (English and French) in public/templates/.

The first sheet is what the importer reads: one header row whose names it recognises, then one position per row.
The example lives on the second sheet, so it is never imported by mistake. Needs openpyxl and cairosvg.
Run: python3 scripts/dev/portfolio_template.py"""
import io
from pathlib import Path

import cairosvg
from openpyxl import Workbook
from openpyxl.drawing.image import Image
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.worksheet.datavalidation import DataValidation

NAVY, BLUE, ICE, CLOUD, LINE, MUTED = "0A2A5E", "1A8CFF", "BFE0FF", "F2F8FF", "D5E6F8", "4A5D7E"
OUT = Path("public/templates")
ROWS = 300

TEXT = {
    "en": {
        "file": "etf-intelligence-portfolio-template.xlsx", "sheet": "Portfolio", "help": "How to fill it",
        "title": "Portfolio import template",
        "subtitle": "One position or purchase per row. ISIN and quantity are required; the rest helps us track your returns.",
        "headers": ["ISIN", "Name (optional)", "Quantity", "Purchase price", "Purchase date", "Currency", "Fees", "Broker (optional)"],
        "notes": ["12 characters, e.g. IE00B4L5Y983. A ticker such as VWCE also works.", "Only for you: we take the name from the ISIN.",
                  "Number of shares or units. Use a dot or a comma for decimals.", "Price paid per share, in the currency of the next column.",
                  "Day of the purchase, e.g. 2026-03-15 or 15/03/2026.", "EUR, CHF, USD, GBP…", "Broker fees paid on the purchase, if any.", "Where you hold it."],
        "steps": ["1. Fill the Portfolio sheet: one row per position, or one row per purchase if you want your returns tracked.",
                  "2. Save the file (keep the .xlsx format).", "3. On ETF Intelligence, go to Portfolio > Import and upload it.",
                  "4. Check every row we read before adding it. Nothing is kept until you confirm."],
        "example": "Example (not imported)", "privacy": "We read the file in memory and do not keep it.",
    },
    "fr": {
        "file": "etf-intelligence-modele-portefeuille.xlsx", "sheet": "Portefeuille", "help": "Mode d'emploi",
        "title": "Modèle d'import de portefeuille",
        "subtitle": "Une position ou un achat par ligne. L'ISIN et la quantité sont obligatoires ; le reste nous aide à suivre votre performance.",
        "headers": ["ISIN", "Nom (facultatif)", "Quantité", "Prix d'achat", "Date d'achat", "Devise", "Frais", "Courtier (facultatif)"],
        "notes": ["12 caractères, par ex. IE00B4L5Y983. Un mnémonique comme VWCE fonctionne aussi.", "Pour vous seulement : nous déduisons le nom de l'ISIN.",
                  "Nombre de parts. Virgule ou point pour les décimales.", "Prix payé par part, dans la devise de la colonne suivante.",
                  "Jour de l'achat, par ex. 15/03/2026 ou 2026-03-15.", "EUR, CHF, USD, GBP…", "Frais de courtage payés à l'achat, le cas échéant.", "Où vous détenez la ligne."],
        "steps": ["1. Remplissez la feuille Portefeuille : une ligne par position, ou une ligne par achat pour suivre votre performance.",
                  "2. Enregistrez le fichier (gardez le format .xlsx).", "3. Sur ETF Intelligence, allez dans Portefeuille > Importer et déposez-le.",
                  "4. Vérifiez chaque ligne lue avant de l'ajouter. Rien n'est conservé avant votre confirmation."],
        "example": "Exemple (non importé)", "privacy": "Nous lisons le fichier en mémoire et ne le conservons pas.",
    },
}
EXAMPLE = [["IE00B4L5Y983", "iShares Core MSCI World", 12, 98.40, "2026-03-15", "EUR", 1.00, "Degiro"],
           ["IE00BK5BQT80", "Vanguard FTSE All-World Acc", 8.5, 128.10, "2026-04-02", "EUR", 0, "Trade Republic"]]
WIDTHS = [18, 34, 12, 15, 15, 11, 10, 22]

thin = Side(style="thin", color=LINE)
logo_png = cairosvg.svg2png(url="public/brand/logo.svg", output_height=64)


def header_row(ws, row, labels):
    for i, label in enumerate(labels, 1):
        c = ws.cell(row=row, column=i, value=label)
        c.font = Font(name="Calibri", bold=True, color="FFFFFF", size=11)
        c.fill = PatternFill("solid", fgColor=NAVY)
        c.alignment = Alignment(vertical="center", horizontal="left", indent=1)
        c.border = Border(bottom=Side(style="medium", color=BLUE))
    ws.row_dimensions[row].height = 26


def banner(ws, t, cols):
    ws.sheet_view.showGridLines = False
    for r in (1, 2, 3):
        for col in range(1, cols + 1): ws.cell(row=r, column=col).fill = PatternFill("solid", fgColor=CLOUD)
    ws.row_dimensions[1].height = 54
    img = Image(io.BytesIO(logo_png)); img.anchor = "A1"; ws.add_image(img)
    ws.cell(row=1, column=4, value=t["title"]).font = Font(name="Calibri", bold=True, size=16, color=NAVY)
    ws.cell(row=1, column=4).alignment = Alignment(vertical="center")
    ws.cell(row=2, column=1, value=t["subtitle"]).font = Font(name="Calibri", size=10, color=MUTED)
    ws.cell(row=3, column=1, value=t["privacy"]).font = Font(name="Calibri", size=9, italic=True, color=MUTED)


for lang, t in TEXT.items():
    wb = Workbook()
    ws = wb.active; ws.title = t["sheet"]
    banner(ws, t, len(t["headers"]))
    header_row(ws, 4, t["headers"])
    ws.freeze_panes = "A5"
    for i, w in enumerate(WIDTHS, 1): ws.column_dimensions[chr(64 + i)].width = w
    for r in range(5, 5 + ROWS):
        band = PatternFill("solid", fgColor="FFFFFF" if r % 2 else "F7FBFF")
        for col in range(1, len(t["headers"]) + 1):
            c = ws.cell(row=r, column=col); c.fill = band; c.border = Border(bottom=thin)
            c.font = Font(name="Calibri", size=11, color=NAVY)
        ws.cell(row=r, column=3).number_format = "#,##0.####"
        ws.cell(row=r, column=4).number_format = "#,##0.00##"
        ws.cell(row=r, column=5).number_format = "yyyy-mm-dd"
        ws.cell(row=r, column=7).number_format = "#,##0.00"
    for col, note in enumerate(t["notes"], 1):
        dv = DataValidation(type="custom", formula1="TRUE", allow_blank=True, showInputMessage=True, promptTitle=t["headers"][col - 1][:32], prompt=note[:255])
        ws.add_data_validation(dv); dv.add(f"{chr(64 + col)}5:{chr(64 + col)}{4 + ROWS}")
    qty = DataValidation(type="decimal", operator="greaterThan", formula1="0", allow_blank=True, showErrorMessage=True, error=t["notes"][2])
    ws.add_data_validation(qty); qty.add(f"C5:C{4 + ROWS}")
    ccy = DataValidation(type="list", formula1='"EUR,CHF,USD,GBP,MAD,JPY,CAD,AUD,SEK,NOK,DKK,PLN,HKD"', allow_blank=True)
    ws.add_data_validation(ccy); ccy.add(f"F5:F{4 + ROWS}")

    help_ws = wb.create_sheet(t["help"])
    banner(help_ws, t, len(t["headers"]))
    for i, w in enumerate(WIDTHS, 1): help_ws.column_dimensions[chr(64 + i)].width = w
    for i, step in enumerate(t["steps"]):
        help_ws.cell(row=5 + i, column=1, value=step).font = Font(name="Calibri", size=11, color=NAVY)
    r0 = 5 + len(t["steps"]) + 1
    help_ws.cell(row=r0, column=1, value=t["example"]).font = Font(name="Calibri", bold=True, size=12, color=BLUE)
    header_row(help_ws, r0 + 1, t["headers"])
    for j, ex in enumerate(EXAMPLE):
        for col, v in enumerate(ex, 1):
            c = help_ws.cell(row=r0 + 2 + j, column=col, value=v); c.font = Font(name="Calibri", italic=True, color=MUTED); c.border = Border(bottom=thin)
    r1 = r0 + 3 + len(EXAMPLE)
    for col, (h, note) in enumerate(zip(t["headers"], t["notes"])):
        help_ws.cell(row=r1 + col, column=1, value=h).font = Font(name="Calibri", bold=True, color=NAVY)
        help_ws.cell(row=r1 + col, column=2, value=note).font = Font(name="Calibri", color=MUTED)
    wb.properties.creator = "ETF Intelligence"; wb.properties.title = t["title"]
    OUT.mkdir(parents=True, exist_ok=True)
    wb.save(OUT / t["file"])
    print("wrote", OUT / t["file"])
