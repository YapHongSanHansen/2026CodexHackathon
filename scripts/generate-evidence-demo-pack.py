"""Generate a coherent, fictional Evidence Locker demo pack.

The output is intentionally watermarked and safe for demos. It must never be
represented as an official SSM, JAKIM, training, or service-provider record.
"""

from __future__ import annotations

import shutil
import zipfile
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.platypus import (
    Flowable,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "output" / "pdf" / "evidence-locker-demo"
PUBLIC_DIR = ROOT / "public" / "demo"
ZIP_PATH = ROOT / "output" / "pdf" / "evidence-locker-demo-pack.zip"
PUBLIC_ZIP_PATH = PUBLIC_DIR / "evidence-locker-demo-pack.zip"

FOREST = colors.HexColor("#2D4A3E")
FOREST_DARK = colors.HexColor("#1D332A")
LIME = colors.HexColor("#C5E86C")
CREAM = colors.HexColor("#F5F1E8")
SAND = colors.HexColor("#E7DFCF")
AMBER = colors.HexColor("#D79032")
MUTED = colors.HexColor("#6D786F")
WHITE = colors.white
RED = colors.HexColor("#B94C45")

BUSINESS = "Selera Kampung Harmoni Sdn. Bhd."
PREMISE = "Dapur Harmoni"
REG_NO = "202401012345 (1588192-X)"
ADDRESS = "18, Jalan Seri Murni 3, Taman Seri Murni, 43000 Kajang, Selangor"
MANAGER = "Farid bin Abdullah"
HALAL_LEAD = "Nur Aisyah binti Rahman"

FILES = [
    ("business_profile", "01-business-profile-ssm.pdf", "Business Profile / SSM"),
    ("menu_list", "02-menu-list.pdf", "Menu List"),
    ("ingredient_list", "03-ingredient-list.pdf", "Ingredient List"),
    ("supplier_certificate", "04-supplier-halal-certificates.pdf", "Supplier Halal Certificates"),
    ("flow_chart", "05-production-flow-chart.pdf", "Production Flow Chart"),
    ("training_certificate", "06-halal-training-certificate.pdf", "Training Certificate"),
    ("halal_policy", "07-halal-policy.pdf", "Halal Policy"),
    ("pest_control", "08-pest-control-contract.pdf", "Pest Control Contract"),
]


def para_text(value: object) -> str:
    return str(value).replace("&", "&amp;")


styles = getSampleStyleSheet()
styles.add(
    ParagraphStyle(
        name="PackTitle",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=24,
        leading=28,
        textColor=FOREST_DARK,
        spaceAfter=6 * mm,
    )
)
styles.add(
    ParagraphStyle(
        name="PackSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=15,
        textColor=MUTED,
        spaceAfter=4 * mm,
    )
)
styles.add(
    ParagraphStyle(
        name="Section",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=16,
        textColor=FOREST,
        spaceBefore=4 * mm,
        spaceAfter=2.5 * mm,
    )
)
styles.add(
    ParagraphStyle(
        name="BodySmall",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=8.6,
        leading=12.2,
        textColor=FOREST_DARK,
        spaceAfter=2 * mm,
    )
)
styles.add(
    ParagraphStyle(
        name="Body",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=14,
        textColor=FOREST_DARK,
        spaceAfter=2.5 * mm,
    )
)
styles.add(
    ParagraphStyle(
        name="BulletSmall",
        parent=styles["BodySmall"],
        leftIndent=5 * mm,
        firstLineIndent=-3 * mm,
        bulletIndent=1 * mm,
        spaceAfter=1.2 * mm,
    )
)
styles.add(
    ParagraphStyle(
        name="Label",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=7.5,
        leading=10,
        textColor=MUTED,
        uppercase=True,
        spaceAfter=1 * mm,
    )
)
styles.add(
    ParagraphStyle(
        name="Callout",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=13,
        textColor=FOREST,
    )
)
styles.add(
    ParagraphStyle(
        name="TableHead",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=7.2,
        leading=9,
        textColor=WHITE,
        alignment=TA_LEFT,
    )
)
styles.add(
    ParagraphStyle(
        name="TableCell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=6.8,
        leading=9,
        textColor=FOREST_DARK,
        alignment=TA_LEFT,
    )
)
styles.add(
    ParagraphStyle(
        name="CertTitle",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=22,
        leading=26,
        textColor=FOREST_DARK,
        alignment=TA_CENTER,
        spaceAfter=4 * mm,
    )
)
styles.add(
    ParagraphStyle(
        name="CenterBody",
        parent=styles["Body"],
        alignment=TA_CENTER,
    )
)


def p(text: object, style: str = "Body") -> Paragraph:
    return Paragraph(para_text(text), styles[style])


def rich(text: str, style: str = "Body") -> Paragraph:
    return Paragraph(text, styles[style])


def bullet(text: str) -> Paragraph:
    return Paragraph(para_text(text), styles["BulletSmall"], bulletText="-")


def document_header(title: str, subtitle: str) -> list:
    return [
        p("EVIDENCE LOCKER DEMO", "Label"),
        p(title, "PackTitle"),
        p(subtitle, "PackSubtitle"),
        info_band(
            [
                ("Business", BUSINESS),
                ("Premise", PREMISE),
                ("Prepared", "18 July 2026"),
            ]
        ),
        Spacer(1, 4 * mm),
    ]


def info_band(items: list[tuple[str, str]], widths: list[float] | None = None) -> Table:
    cells = []
    for label, value in items:
        cells.append(rich(f"<font size='7' color='#6D786F'><b>{para_text(label).upper()}</b></font><br/>{para_text(value)}", "BodySmall"))
    table = Table([cells], colWidths=widths, hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), CREAM),
                ("BOX", (0, 0), (-1, -1), 0.6, SAND),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, SAND),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return table


def callout(title: str, body: str, color=LIME) -> Table:
    table = Table(
        [[rich(f"<b>{para_text(title)}</b><br/>{para_text(body)}", "BodySmall")]],
        colWidths=[None],
        hAlign="LEFT",
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.Color(color.red, color.green, color.blue, alpha=0.22)),
                ("BOX", (0, 0), (-1, -1), 0.8, color),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    return table


def data_table(
    headers: list[str],
    rows: list[list[object]],
    widths: list[float] | None = None,
    font_size: float = 6.8,
) -> Table:
    head_style = ParagraphStyle("DynamicHead", parent=styles["TableHead"], fontSize=font_size, leading=font_size + 2)
    cell_style = ParagraphStyle("DynamicCell", parent=styles["TableCell"], fontSize=font_size, leading=font_size + 2.2)
    data = [[Paragraph(para_text(value), head_style) for value in headers]]
    for row in rows:
        data.append([Paragraph(para_text(value), cell_style) for value in row])
    table = Table(data, colWidths=widths, repeatRows=1, hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), FOREST),
                ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, CREAM]),
                ("GRID", (0, 0), (-1, -1), 0.45, SAND),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return table


def signature_block(name: str, role: str, date: str) -> Table:
    rows = [
        [p("SIGNED FOR DEMO", "Label"), p("DATE", "Label")],
        [p(name, "Callout"), p(date, "Callout")],
        [p(role, "BodySmall"), p("Electronic demo endorsement", "BodySmall")],
    ]
    table = Table(rows, colWidths=[100 * mm, 55 * mm], hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("LINEABOVE", (0, 1), (-1, 1), 0.8, FOREST),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ]
        )
    )
    return table


def draw_page(canvas, doc, title: str):
    canvas.saveState()
    width, height = doc.pagesize
    canvas.setFillColor(FOREST)
    canvas.rect(0, height - 11 * mm, width, 11 * mm, stroke=0, fill=1)
    canvas.setFillColor(LIME)
    canvas.circle(13 * mm, height - 5.5 * mm, 3.2 * mm, stroke=0, fill=1)
    canvas.setFillColor(FOREST_DARK)
    canvas.setFont("Helvetica-Bold", 7)
    canvas.drawCentredString(13 * mm, height - 7.6 * mm, "HB")
    canvas.setFillColor(WHITE)
    canvas.setFont("Helvetica-Bold", 8)
    canvas.drawString(20 * mm, height - 7 * mm, "HALALBOLEH - EVIDENCE LOCKER")
    canvas.setFont("Helvetica", 7.5)
    canvas.drawRightString(width - 14 * mm, height - 7 * mm, title)

    canvas.saveState()
    canvas.translate(width / 2, height / 2)
    canvas.rotate(34)
    canvas.setFillColor(colors.Color(0.72, 0.30, 0.27, alpha=0.07))
    canvas.setFont("Helvetica-Bold", 38 if width < 700 else 48)
    canvas.drawCentredString(0, 0, "DEMO SAMPLE - NOT OFFICIAL")
    canvas.restoreState()

    canvas.setStrokeColor(SAND)
    canvas.line(14 * mm, 13 * mm, width - 14 * mm, 13 * mm)
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 7)
    canvas.drawString(14 * mm, 8 * mm, "Fictional evidence for product demonstration only")
    canvas.drawRightString(width - 14 * mm, 8 * mm, f"Page {doc.page}")
    canvas.restoreState()


def build_pdf(filename: str, title: str, story: list, pagesize=A4):
    path = OUTPUT_DIR / filename
    doc = SimpleDocTemplate(
        str(path),
        pagesize=pagesize,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title=title,
        author="HalalBoleh Demo",
        subject="Fictional Evidence Locker demo artifact",
    )
    draw = lambda canvas, document: draw_page(canvas, document, title)
    doc.build(story, onFirstPage=draw, onLaterPages=draw)


def business_profile_story() -> list:
    story = document_header(
        "Business Profile / SSM Registration",
        "Synthetic company profile extract and premise particulars for the HalalBoleh walkthrough.",
    )
    story += [
        callout("Registration status: ACTIVE", "Company status checked for the demo on 1 July 2026. No expiry or dissolution is recorded in this fictional profile."),
        p("Company registration", "Section"),
        data_table(
            ["Field", "Registered information"],
            [
                ["Legal name", BUSINESS],
                ["Registration number", REG_NO],
                ["Entity type", "Private company limited by shares"],
                ["Incorporation date", "2 April 2024"],
                ["Business status", "Active"],
                ["Registered address", ADDRESS],
                ["Nature of business", "Preparation and sale of Malaysian meals and beverages; dine-in and takeaway"],
            ],
            widths=[48 * mm, 125 * mm],
            font_size=8,
        ),
        p("Premise and operating scope", "Section"),
        data_table(
            ["Field", "Premise detail"],
            [
                ["Trading name", PREMISE],
                ["Operating address", ADDRESS],
                ["Premise type", "Restaurant with on-site preparation kitchen"],
                ["Operating hours", "Monday to Sunday, 7:00 am to 9:30 pm"],
                ["Halal application scope", "Five menu products prepared, stored, cooked, and served at this single premise"],
                ["Management representative", MANAGER + " - Managing Director"],
                ["Halal person-in-charge", HALAL_LEAD + " - Operations Supervisor"],
            ],
            widths=[48 * mm, 125 * mm],
            font_size=8,
        ),
        p("Business declarations", "Section"),
        bullet("No pork, pork derivatives, alcohol, or non-halal meat is purchased, stored, prepared, or served at the premise."),
        bullet("All animal-derived and processed critical ingredients are purchased only from approved suppliers listed in the ingredient register."),
        bullet("The business maintains receiving, storage, cleaning, training, pest control, and traceability records under its internal halal control system."),
    ]
    return story


MENU_ROWS = [
    ["M01", "Nasi Lemak Ayam Berempah", "Coconut rice, spiced chicken, sambal, egg, anchovies, cucumber", "Breakfast / main", "RM 12.90"],
    ["M02", "Mee Kari Sayur", "Yellow noodles, coconut curry broth, tofu, bean sprouts, long beans", "Main", "RM 10.90"],
    ["M03", "Rendang Daging", "Beef slow-cooked with coconut milk, spices, lemongrass, and galangal", "Main", "RM 15.90"],
    ["M04", "Teh Tarik", "Black tea, evaporated milk, condensed milk, and sugar", "Beverage", "RM 3.50"],
    ["M05", "Kuih Seri Muka", "Glutinous rice, coconut milk, pandan custard, egg, and sugar", "Dessert", "RM 4.50"],
]


def menu_story() -> list:
    story = document_header(
        "Menu List",
        "Controlled menu register for the single-premise halal application scope.",
    )
    story += [
        info_band([("Document ID", "DH-MENU-001"), ("Version", "2.0"), ("Effective", "1 July 2026")]),
        p("Approved menu", "Section"),
        data_table(
            ["ID", "Menu item", "Description", "Category", "Price"],
            MENU_ROWS,
            widths=[13 * mm, 43 * mm, 75 * mm, 25 * mm, 18 * mm],
            font_size=7.1,
        ),
        p("Scope and controls", "Section"),
        bullet("Only the five products above are included in this demo application scope."),
        bullet("Each menu item maps to a complete bill of materials in DH-ING-001, the Ingredient List."),
        bullet("No alcoholic beverages, cooking wine, lard, gelatin, or non-halal meat is offered."),
        bullet("Seasonal specials require halal lead approval and ingredient register updates before sale."),
        p("Cross-reference", "Section"),
        data_table(
            ["Menu ID", "Ingredient register lines", "Production route"],
            [
                ["M01", "I01-I06", "R1 - Cooked rice and poultry meal"],
                ["M02", "I02, I07-I10", "R2 - Noodle and vegetable meal"],
                ["M03", "I02, I11-I14", "R3 - Beef meal"],
                ["M04", "I15-I18", "R4 - Beverage"],
                ["M05", "I02, I05, I16, I18-I20", "R5 - Chilled dessert"],
            ],
            widths=[24 * mm, 72 * mm, 78 * mm],
            font_size=7.5,
        ),
        Spacer(1, 5 * mm),
        signature_block(HALAL_LEAD, "Halal Person-in-Charge", "1 July 2026"),
    ]
    return story


INGREDIENT_ROWS = [
    ["I01", "Fragrant rice", "Tani Murni Rice Trading", "Rice", "Low", "M01"],
    ["I02", "Coconut milk", "Murni Coconut Products Sdn. Bhd.", "HC-MCP-2026-0094", "High", "M01, M02, M03, M05"],
    ["I03", "Whole chicken", "Aman Poultry Foods Sdn. Bhd.", "HC-APF-2026-0148", "High", "M01"],
    ["I04", "Sambal base", "Prepared in-house from I06, I18, I21", "In-house", "Medium", "M01"],
    ["I05", "Chicken egg", "Telur Segar Kajang Enterprise", "Farm source record", "Medium", "M01, M05"],
    ["I06", "Dried anchovies", "Laut Bersih Trading", "Fish source record", "Low", "M01"],
    ["I07", "Yellow noodles", "Bersih Noodle Foods Sdn. Bhd.", "HC-BNF-2026-0310", "High", "M02"],
    ["I08", "Curry powder", "Saji Murni Ingredients Sdn. Bhd.", "HC-SMI-2026-0182", "High", "M02"],
    ["I09", "Fried tofu", "Bersih Noodle Foods Sdn. Bhd.", "HC-BNF-2026-0310", "Medium", "M02"],
    ["I10", "Fresh vegetables", "Pasar Segar Murni", "Produce delivery record", "Low", "M01, M02"],
    ["I11", "Fresh beef", "Barakah Beef Supply Sdn. Bhd.", "HC-BBS-2026-0221", "High", "M03"],
    ["I12", "Rendang spice mix", "Saji Murni Ingredients Sdn. Bhd.", "HC-SMI-2026-0182", "High", "M03"],
    ["I13", "Lemongrass", "Pasar Segar Murni", "Produce delivery record", "Low", "M03"],
    ["I14", "Galangal", "Pasar Segar Murni", "Produce delivery record", "Low", "M03"],
    ["I15", "Black tea", "Serambi Tea Trading", "Tea product specification", "Low", "M04"],
    ["I16", "Evaporated milk", "Dairy Aman Supplies Sdn. Bhd.", "HC-DAS-2026-0077", "High", "M04, M05"],
    ["I17", "Condensed milk", "Dairy Aman Supplies Sdn. Bhd.", "HC-DAS-2026-0077", "High", "M04"],
    ["I18", "Cane sugar", "Tani Murni Rice Trading", "Sugar product specification", "Low", "M01, M04, M05"],
    ["I19", "Glutinous rice", "Tani Murni Rice Trading", "Rice", "Low", "M05"],
    ["I20", "Pandan extract", "Saji Murni Ingredients Sdn. Bhd.", "HC-SMI-2026-0182", "High", "M05"],
    ["I21", "Dried chili", "Pasar Segar Murni", "Produce delivery record", "Low", "M01"],
]


def ingredient_story() -> list:
    story = document_header(
        "Ingredient List",
        "Master ingredient register with supplier source, halal evidence reference, risk, and menu mapping.",
    )
    story += [
        info_band([("Document ID", "DH-ING-001"), ("Version", "2.0"), ("Review due", "1 January 2027")]),
        p("Ingredient master register", "Section"),
        data_table(
            ["ID", "Ingredient", "Approved supplier / source", "Halal evidence", "Risk", "Used in"],
            INGREDIENT_ROWS,
            widths=[12 * mm, 31 * mm, 62 * mm, 48 * mm, 18 * mm, 31 * mm],
            font_size=6.6,
        ),
        p("Approval controls", "Section"),
        bullet("High-risk ingredients cannot be received unless the supplier, product scope, and certificate reference match the approved supplier evidence bundle."),
        bullet("Receiving staff check product name, lot, packaging integrity, expiry date, and halal mark before acceptance."),
        bullet("Substitution is prohibited without written approval from the halal person-in-charge and an updated register."),
        bullet("All ingredient lots are traceable through delivery orders, receiving logs, and daily preparation records."),
        p("Menu completeness check", "Section"),
        data_table(
            ["Menu item", "Ingredient coverage", "Result"],
            [[row[1], row[2], "Complete - mapped to ingredient register"] for row in MENU_ROWS],
            widths=[55 * mm, 85 * mm, 62 * mm],
            font_size=7,
        ),
    ]
    return story


CERTIFICATES = [
    ("Aman Poultry Foods Sdn. Bhd.", "HC-APF-2026-0148", "JAKIM (demo issuer label)", "Whole dressed chicken and chicken cuts", "15 January 2026", "14 January 2027"),
    ("Barakah Beef Supply Sdn. Bhd.", "HC-BBS-2026-0221", "JAKIM (demo issuer label)", "Chilled and frozen halal beef cuts", "10 March 2026", "9 March 2027"),
    ("Murni Coconut Products Sdn. Bhd.", "HC-MCP-2026-0094", "JAKIM (demo issuer label)", "Coconut milk and coconut cream", "1 February 2026", "31 January 2027"),
    ("Bersih Noodle Foods Sdn. Bhd.", "HC-BNF-2026-0310", "JAKIM (demo issuer label)", "Yellow noodles and fried tofu", "5 April 2026", "4 April 2027"),
    ("Saji Murni Ingredients Sdn. Bhd.", "HC-SMI-2026-0182", "JAKIM (demo issuer label)", "Curry powder, rendang spice mix, pandan extract", "20 February 2026", "19 February 2027"),
    ("Dairy Aman Supplies Sdn. Bhd.", "HC-DAS-2026-0077", "JAKIM (demo issuer label)", "Evaporated milk and sweetened condensed milk", "1 December 2025", "30 November 2026"),
]


def supplier_cert_story() -> list:
    story = document_header(
        "Supplier Halal Certificate Bundle",
        "Synthetic certificate evidence for critical ingredients. Every page is a demo specimen and has no legal validity.",
    )
    story += [
        callout("Six current supplier records", "The product scopes cover poultry, beef, coconut products, noodles, processed seasonings, and dairy used by the five menu products."),
        p("Certificate register", "Section"),
        data_table(
            ["Supplier", "Reference", "Product scope", "Valid through"],
            [[row[0], row[1], row[3], row[5]] for row in CERTIFICATES],
            widths=[48 * mm, 37 * mm, 64 * mm, 25 * mm],
            font_size=7,
        ),
        p("Verification procedure", "Section"),
        bullet("The halal person-in-charge checks the official Malaysia Halal Directory before first purchase and at each quarterly review."),
        bullet("The reference, supplier legal name, manufacturing site, product scope, and validity dates must match the delivered product."),
        bullet("Expired, suspended, unverifiable, or out-of-scope evidence blocks the ingredient from receiving."),
        callout("Important", "The issuer labels and all certificate references in this bundle are fictional. Use them only to demonstrate extraction and readiness workflows.", AMBER),
    ]
    for idx, cert in enumerate(CERTIFICATES, start=1):
        story.append(PageBreak())
        supplier, number, issuer, scope, issued, expires = cert
        story += [
            Spacer(1, 13 * mm),
            p("DEMO SPECIMEN", "Label"),
            p("Halal Certificate Evidence", "CertTitle"),
            p("This fictional record is included solely for the HalalBoleh product demonstration.", "CenterBody"),
            Spacer(1, 7 * mm),
            info_band([("Certificate reference", number), ("Record", f"{idx} of {len(CERTIFICATES)}")], widths=[95 * mm, 65 * mm]),
            Spacer(1, 8 * mm),
            rich(f"<para align='center'><font size='8' color='#6D786F'><b>CERTIFICATE HOLDER</b></font><br/><font size='16' color='#1D332A'><b>{para_text(supplier)}</b></font></para>", "Body"),
            Spacer(1, 5 * mm),
            data_table(
                ["Field", "Certificate detail"],
                [
                    ["Issuing body", issuer],
                    ["Certified product scope", scope],
                    ["Issue date", issued],
                    ["Expiry date", expires],
                    ["Status for demo", "Current on 18 July 2026"],
                    ["Application user", BUSINESS],
                ],
                widths=[48 * mm, 125 * mm],
                font_size=8,
            ),
            Spacer(1, 7 * mm),
            callout("Scope confirmation", f"The listed scope supports ingredients supplied to {PREMISE}. Products outside this scope require separate evidence."),
            Spacer(1, 12 * mm),
            signature_block("Demo Certification Record", "Not an authorized signatory", issued),
            Spacer(1, 8 * mm),
            callout("NOT AN OFFICIAL HALAL CERTIFICATE", "Do not submit, publish as proof, or use this page to make a halal certification claim.", RED),
        ]
    return story


class FlowChart(Flowable):
    def __init__(self, width: float, height: float):
        super().__init__()
        self.width = width
        self.height = height

    def draw_box(self, canvas, x, y, w, h, title, detail, control=False):
        canvas.setFillColor(colors.HexColor("#EDF4DB") if control else CREAM)
        canvas.setStrokeColor(LIME if control else SAND)
        canvas.setLineWidth(1.4 if control else 0.8)
        canvas.roundRect(x, y, w, h, 5, stroke=1, fill=1)
        canvas.setFillColor(FOREST_DARK)
        canvas.setFont("Helvetica-Bold", 8)
        canvas.drawCentredString(x + w / 2, y + h - 11, title)
        canvas.setFillColor(MUTED)
        canvas.setFont("Helvetica", 6.3)
        max_width = w - 10
        words = detail.split()
        lines, line = [], ""
        for word in words:
            trial = (line + " " + word).strip()
            if stringWidth(trial, "Helvetica", 6.3) <= max_width:
                line = trial
            else:
                lines.append(line)
                line = word
        if line:
            lines.append(line)
        for i, text in enumerate(lines[:3]):
            canvas.drawCentredString(x + w / 2, y + h - 22 - i * 8, text)

    def arrow(self, canvas, x1, y1, x2, y2):
        canvas.setStrokeColor(FOREST)
        canvas.setFillColor(FOREST)
        canvas.setLineWidth(1.2)
        canvas.line(x1, y1, x2, y2)
        if abs(x2 - x1) > abs(y2 - y1):
            direction = 1 if x2 > x1 else -1
            canvas.line(x2, y2, x2 - direction * 6, y2 + 3)
            canvas.line(x2, y2, x2 - direction * 6, y2 - 3)
        else:
            direction = 1 if y2 > y1 else -1
            canvas.line(x2, y2, x2 - 3, y2 - direction * 6)
            canvas.line(x2, y2, x2 + 3, y2 - direction * 6)

    def draw(self):
        c = self.canv
        w, h = 78 * mm, 21 * mm
        gap_x, gap_y = 18 * mm, 9 * mm
        x0 = 3 * mm
        y_top = self.height - h - 3 * mm
        boxes = [
            (x0, y_top, "1. APPROVED ORDERING", "Use approved supplier and current halal evidence", True),
            (x0 + w + gap_x, y_top, "2. RECEIVING - HCP-01", "Check supplier, halal mark, lot, expiry, packaging", True),
            (x0 + 2 * (w + gap_x), y_top, "3. SEGREGATED STORAGE", "Chilled, frozen, dry; labelled and off floor", False),
            (x0 + 2 * (w + gap_x), y_top - h - gap_y, "4. PREPARATION - HCP-02", "Hand wash; clean tools; prevent cross-contact", True),
            (x0 + w + gap_x, y_top - h - gap_y, "5. COOKING - HCP-03", "Controlled recipe, time, and temperature checks", True),
            (x0, y_top - h - gap_y, "6. HOT / COLD HOLDING", "Covered, labelled, and temperature controlled", False),
            (x0, y_top - 2 * (h + gap_y), "7. PLATING AND SERVING", "Clean utensils and halal-only service area", False),
            (x0 + w + gap_x, y_top - 2 * (h + gap_y), "8. CLEANING / SANITIZING", "Wash, rinse, sanitize, air dry; log completion", True),
            (x0 + 2 * (w + gap_x), y_top - 2 * (h + gap_y), "9. RECORD AND TRACE", "Batch log, waste log, corrective action, recall link", False),
        ]
        for x, y, title, detail, control in boxes:
            self.draw_box(c, x, y, w, h, title, detail, control)
        self.arrow(c, x0 + w, y_top + h / 2, x0 + w + gap_x - 3, y_top + h / 2)
        self.arrow(c, x0 + 2 * w + gap_x, y_top + h / 2, x0 + 2 * (w + gap_x) - 3, y_top + h / 2)
        self.arrow(c, x0 + 2 * (w + gap_x) + w / 2, y_top, x0 + 2 * (w + gap_x) + w / 2, y_top - gap_y + 3)
        self.arrow(c, x0 + 2 * (w + gap_x), y_top - h - gap_y + h / 2, x0 + 2 * w + gap_x + 3, y_top - h - gap_y + h / 2)
        self.arrow(c, x0 + w + gap_x, y_top - h - gap_y + h / 2, x0 + w + 3, y_top - h - gap_y + h / 2)
        self.arrow(c, x0 + w / 2, y_top - h - gap_y, x0 + w / 2, y_top - 2 * gap_y - h + 3)
        self.arrow(c, x0 + w, y_top - 2 * (h + gap_y) + h / 2, x0 + w + gap_x - 3, y_top - 2 * (h + gap_y) + h / 2)
        self.arrow(c, x0 + 2 * w + gap_x, y_top - 2 * (h + gap_y) + h / 2, x0 + 2 * (w + gap_x) - 3, y_top - 2 * (h + gap_y) + h / 2)


def flow_chart_story() -> list:
    story = document_header(
        "Production Flow Chart (Carta Alir)",
        "End-to-end process from approved ordering through receiving, storage, preparation, serving, cleaning, and traceability.",
    )
    story += [
        info_band([("Document ID", "DH-FLOW-001"), ("Version", "2.0"), ("Effective", "1 July 2026")]),
        p("Core process flow", "Section"),
        FlowChart(272 * mm, 86 * mm),
        Spacer(1, 3 * mm),
        callout("Halal critical control point (HCP)", "Green-outlined boxes require a recorded verification. A failed check triggers hold, reject, segregate, investigate, and record corrective action."),
        p("Control point register", "Section"),
        data_table(
            ["Point", "Required check", "Record", "If check fails"],
            [
                ["HCP-01 Receiving", "Approved supplier; current certificate; product scope; seal; lot; expiry", "Receiving log", "Reject or quarantine delivery"],
                ["HCP-02 Preparation", "Hand washing; clean halal-only utensils; no unapproved material", "Opening checklist", "Stop work, clean, investigate"],
                ["HCP-03 Cooking", "Approved recipe and safe time / temperature", "Batch cooking log", "Continue cooking or discard"],
                ["Cleaning", "Wash, rinse, sanitize, air dry; sertu if severe impurity is confirmed", "Cleaning log", "Repeat procedure and notify halal lead"],
            ],
            widths=[35 * mm, 93 * mm, 48 * mm, 75 * mm],
            font_size=7,
        ),
        p("Routes covered", "Section"),
        bullet("R1-R3 cooked meals: receiving - segregated storage - preparation - cooking - holding - serving."),
        bullet("R4 beverage: receiving - dry or chilled storage - preparation - immediate serving."),
        bullet("R5 chilled dessert: receiving - segregated storage - preparation - cooking - cooling - chilled holding - serving."),
        Spacer(1, 3 * mm),
        signature_block(HALAL_LEAD, "Process owner", "1 July 2026"),
    ]
    return story


def training_story() -> list:
    story = document_header(
        "Halal Awareness Training Certificate",
        "Synthetic training completion certificate and course record for the appointed halal person-in-charge.",
    )
    story += [
        Spacer(1, 7 * mm),
        p("CERTIFICATE OF COMPLETION", "CertTitle"),
        p("This demo certificate records that", "CenterBody"),
        rich(f"<para align='center'><font size='20' color='#1D332A'><b>{HALAL_LEAD}</b></font></para>", "Body"),
        p("of " + BUSINESS + " completed the course", "CenterBody"),
        rich("<para align='center'><font size='15' color='#2D4A3E'><b>Halal Awareness and Internal Halal Control</b></font></para>", "Body"),
        Spacer(1, 5 * mm),
        info_band(
            [
                ("Certificate", "AIH-DEMO-2026-0519"),
                ("Training date", "19-20 May 2026"),
                ("Valid through", "19 May 2028"),
            ]
        ),
        p("Course record", "Section"),
        data_table(
            ["Provider", "Recognition record", "Duration", "Assessment"],
            [["Akademi Integriti Halal (fictional demo provider)", "HPB-DEMO-TP-104", "16 hours", "Passed - 88%"]],
            widths=[62 * mm, 45 * mm, 28 * mm, 39 * mm],
            font_size=7.8,
        ),
        p("Learning outcomes", "Section"),
        bullet("Apply basic MPPHM 2020 document and premise controls for a food premise."),
        bullet("Verify approved suppliers, ingredient evidence, receiving records, and traceability links."),
        bullet("Monitor hygiene, segregation, cleaning, sertu escalation, and corrective actions."),
        bullet("Maintain halal awareness communication and annual refresher planning for staff."),
        p("Refresher plan", "Section"),
        data_table(
            ["Activity", "Audience", "Frequency", "Next due"],
            [
                ["Halal induction", "All new staff", "Before first shift", "As hired"],
                ["Awareness refresher", "All food handlers", "Every 12 months", "20 May 2027"],
                ["Internal control review", "Halal lead and management", "Every 6 months", "20 November 2026"],
            ],
            widths=[52 * mm, 48 * mm, 38 * mm, 36 * mm],
            font_size=7.5,
        ),
        Spacer(1, 6 * mm),
        signature_block("Dr. Sara Idris", "Course Director - fictional provider", "20 May 2026"),
    ]
    return story


def policy_story() -> list:
    story = document_header(
        "Halal Policy",
        "Management-endorsed policy covering the premise, products, people, suppliers, and internal controls.",
    )
    story += [
        info_band([("Document ID", "DH-POL-001"), ("Effective", "1 July 2026"), ("Review due", "1 July 2027")]),
        p("Our commitment", "Section"),
        rich(
            "<b>Selera Kampung Harmoni Sdn. Bhd.</b> is committed to preparing and serving food that complies with applicable Malaysian halal requirements. Management will provide the people, approved materials, facilities, training, monitoring, and records needed to protect halal integrity at <b>Dapur Harmoni</b>.",
            "Body",
        ),
        p("Policy commitments", "Section"),
        bullet("Purchase and use only materials approved in the ingredient register, with current halal evidence for animal-derived and processed critical ingredients."),
        bullet("Prohibit pork, pork derivatives, alcohol, non-halal meat, and unauthorized ingredient substitution from the premise."),
        bullet("Maintain segregation, hygiene, hand-washing, cleaning, sanitizing, pest control, and corrective-action controls throughout operations."),
        bullet("Train food handlers in halal awareness and assign clear authority to the halal person-in-charge."),
        bullet("Trace every menu product to approved ingredients, suppliers, receiving records, and production records."),
        bullet("Stop, isolate, investigate, and report any material or process that may compromise halal integrity."),
        bullet("Review this policy and the internal halal control system at least annually or whenever products, suppliers, or processes change."),
        p("Scope", "Section"),
        data_table(
            ["Area", "Policy scope"],
            [
                ["Premise", ADDRESS],
                ["Products", "M01-M05 in DH-MENU-001"],
                ["Operations", "Ordering, receiving, storage, preparation, cooking, holding, serving, cleaning, and traceability"],
                ["People", "Management, food handlers, temporary workers, delivery receivers, cleaners, and service contractors"],
            ],
            widths=[38 * mm, 136 * mm],
            font_size=7.8,
        ),
        p("Communication and availability", "Section"),
        bullet("Displayed at the staff entrance and dry-store notice board in Bahasa Malaysia and English."),
        bullet("Explained during induction and reinforced at monthly toolbox briefings."),
        bullet("Available to suppliers, auditors, and customers on request; staff acknowledgements are retained."),
        Spacer(1, 5 * mm),
        signature_block(MANAGER, "Managing Director - management endorsement", "1 July 2026"),
    ]
    return story


def pest_story() -> list:
    story = document_header(
        "Pest Control Service Contract",
        "Synthetic active service agreement covering the full application period and premise.",
    )
    story += [
        callout("Contract status: ACTIVE", "Service term 1 June 2026 to 31 May 2027. Monthly routine service plus call-out response is included."),
        p("Parties and premises", "Section"),
        data_table(
            ["Field", "Contract detail"],
            [
                ["Client", BUSINESS + " trading as " + PREMISE],
                ["Service address", ADDRESS],
                ["Provider", "SafeGuard Pest Management Sdn. Bhd. (fictional demo provider)"],
                ["Provider license", "PCO-DEMO-SGR-2048"],
                ["Contract number", "SGPM-DH-2026-0601"],
                ["Contract period", "1 June 2026 through 31 May 2027"],
            ],
            widths=[45 * mm, 129 * mm],
            font_size=8,
        ),
        p("Service scope and frequency", "Section"),
        data_table(
            ["Area / pest", "Control activity", "Frequency", "Evidence"],
            [
                ["Kitchen and dry store", "Cockroach and crawling-insect inspection; approved gel or trap as needed", "Monthly", "Service report and device map"],
                ["Waste and rear access", "Rodent inspection and tamper-resistant bait station check", "Monthly", "Numbered station log"],
                ["Dining and service", "Fly activity check; UV unit inspection", "Monthly", "Unit cleaning record"],
                ["Whole premise", "Trend review and proofing recommendations", "Quarterly", "Trend report and action list"],
                ["Urgent infestation", "Investigate and make safe", "Within 24 hours", "Corrective action report"],
            ],
            widths=[42 * mm, 78 * mm, 28 * mm, 26 * mm],
            font_size=7.2,
        ),
        p("Halal and food-safety controls", "Section"),
        bullet("Only registered products suitable for food premises may be used; product labels and safety data sheets are retained."),
        bullet("No treatment is applied to exposed food, food-contact surfaces, utensils, or open ingredients."),
        bullet("Food and movable equipment are protected or removed before treatment; the area is released only after cleaning and inspection."),
        bullet("Any bait or treatment material with doubtful origin must be declared and approved by the halal person-in-charge before use."),
        bullet("Provider personnel sign the visitor and service logs and report any infestation, dead pest, contamination risk, or proofing defect."),
        p("Responsibilities", "Section"),
        data_table(
            ["Provider", "Client"],
            [["Perform scheduled inspections; maintain device map; issue reports; notify urgent risks; use approved materials.", "Provide access; protect food; complete housekeeping actions; retain reports; verify closure with halal lead."]],
            widths=[87 * mm, 87 * mm],
            font_size=7.7,
        ),
        Spacer(1, 5 * mm),
        signature_block("Amirul Hakim", "Service Manager - fictional provider", "1 June 2026"),
        Spacer(1, 3 * mm),
        signature_block(MANAGER, "Client representative", "1 June 2026"),
        Spacer(1, 4 * mm),
        callout("DEMO CONTRACT - NO LEGAL VALIDITY", "The provider, license, contract, and signatures are fictional and cannot be used to obtain services or certification.", RED),
    ]
    return story


def write_readme():
    rows = [
        "# Evidence Locker Demo Pack",
        "",
        "This folder contains a coherent set of fictional documents for the HalalBoleh Evidence Locker.",
        "Every PDF is watermarked `DEMO SAMPLE - NOT OFFICIAL` and has no legal validity.",
        "",
        "## Upload map",
        "",
        "| Evidence Locker category | File |",
        "| --- | --- |",
    ]
    for _, filename, label in FILES:
        rows.append(f"| {label} | `{filename}` |")
    rows += [
        "",
        "## Suggested walkthrough",
        "",
        "1. Open `/journey/evidence` in the app.",
        "2. Upload each PDF into its matching category.",
        "3. Wait for the AI analysis badge before moving to the next file.",
        "4. Open each row to show its extracted summary and any cautious demo warnings.",
        "5. Continue to Gap Report after all eight categories show coverage.",
        "",
        "The pack deliberately uses one business, one premise, one menu, and matching supplier references so downstream drafting and traceability demonstrations remain internally consistent.",
        "",
    ]
    (OUTPUT_DIR / "README.md").write_text("\n".join(rows), encoding="utf-8")


def build_zip():
    with zipfile.ZipFile(ZIP_PATH, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(OUTPUT_DIR.iterdir()):
            if path.is_file():
                archive.write(path, arcname=path.name)
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
    shutil.copy2(ZIP_PATH, PUBLIC_ZIP_PATH)


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for existing in OUTPUT_DIR.iterdir():
        if existing.is_file():
            existing.unlink()

    build_pdf("01-business-profile-ssm.pdf", "Business Profile / SSM", business_profile_story())
    build_pdf("02-menu-list.pdf", "Menu List", menu_story())
    build_pdf("03-ingredient-list.pdf", "Ingredient List", ingredient_story(), pagesize=landscape(A4))
    build_pdf("04-supplier-halal-certificates.pdf", "Supplier Halal Certificates", supplier_cert_story())
    build_pdf("05-production-flow-chart.pdf", "Production Flow Chart", flow_chart_story(), pagesize=landscape(A4))
    build_pdf("06-halal-training-certificate.pdf", "Training Certificate", training_story())
    build_pdf("07-halal-policy.pdf", "Halal Policy", policy_story())
    build_pdf("08-pest-control-contract.pdf", "Pest Control Contract", pest_story())
    write_readme()
    build_zip()
    print(f"Generated {len(FILES)} PDFs in output/pdf/evidence-locker-demo")
    print("Pack: output/pdf/evidence-locker-demo-pack.zip")
    print("Public demo pack: public/demo/evidence-locker-demo-pack.zip")


if __name__ == "__main__":
    main()
