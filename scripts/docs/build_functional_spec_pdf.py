"""Build the instructor-facing Career Navi functional specification PDF."""

from __future__ import annotations

import argparse
import html
import re
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    HRFlowable,
    KeepTogether,
    ListFlowable,
    ListItem,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

INK = colors.HexColor('#171717')
BODY = colors.HexColor('#4d4d4d')
MUTE = colors.HexColor('#666666')
FAINT = colors.HexColor('#767676')
HAIRLINE = colors.HexColor('#e5e7eb')
CANVAS = colors.HexColor('#f8faf9')
TEAL = colors.HexColor('#0f766e')
TEAL_DEEP = colors.HexColor('#115e59')
TEAL_SOFT = colors.HexColor('#d7f0ec')
AMBER = colors.HexColor('#b06f0a')
AMBER_SOFT = colors.HexColor('#fff4dd')

PAGE_WIDTH, PAGE_HEIGHT = A4
LEFT = 19 * mm
RIGHT = 19 * mm
TOP = 20 * mm
BOTTOM = 18 * mm
CONTENT_WIDTH = PAGE_WIDTH - LEFT - RIGHT


def register_fonts() -> None:
    regular = Path(r'C:\Windows\Fonts\malgun.ttf')
    bold = Path(r'C:\Windows\Fonts\malgunbd.ttf')
    if not regular.exists() or not bold.exists():
        raise FileNotFoundError('맑은 고딕 글꼴을 찾을 수 없습니다.')
    pdfmetrics.registerFont(TTFont('Malgun', str(regular)))
    pdfmetrics.registerFont(TTFont('MalgunBold', str(bold)))
    pdfmetrics.registerFontFamily('Malgun', normal='Malgun', bold='MalgunBold')


def inline_markup(text: str) -> str:
    escaped = html.escape(text.strip())
    escaped = re.sub(r'`([^`]+)`', r'<font color="#0f766e">\1</font>', escaped)
    escaped = re.sub(r'\*\*([^*]+)\*\*', r'<b>\1</b>', escaped)
    return escaped


def styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        'cover_label': ParagraphStyle(
            'CoverLabel', parent=base['Normal'], fontName='MalgunBold', fontSize=9,
            leading=13, textColor=TEAL, tracking=1.8, alignment=TA_LEFT,
        ),
        'cover_title': ParagraphStyle(
            'CoverTitle', parent=base['Title'], fontName='MalgunBold', fontSize=29,
            leading=38, textColor=INK, spaceAfter=7 * mm, wordWrap='CJK',
        ),
        'cover_subtitle': ParagraphStyle(
            'CoverSubtitle', parent=base['Normal'], fontName='Malgun', fontSize=12,
            leading=20, textColor=BODY, wordWrap='CJK',
        ),
        'h2': ParagraphStyle(
            'H2', parent=base['Heading2'], fontName='MalgunBold', fontSize=17,
            leading=24, textColor=INK, spaceBefore=7 * mm, spaceAfter=3.5 * mm,
            keepWithNext=True, wordWrap='CJK',
        ),
        'h3': ParagraphStyle(
            'H3', parent=base['Heading3'], fontName='MalgunBold', fontSize=11.5,
            leading=17, textColor=TEAL_DEEP, spaceBefore=4 * mm, spaceAfter=2 * mm,
            keepWithNext=True, wordWrap='CJK',
        ),
        'body': ParagraphStyle(
            'Body', parent=base['BodyText'], fontName='Malgun', fontSize=9.4,
            leading=15.5, textColor=BODY, spaceAfter=2.6 * mm, wordWrap='CJK',
        ),
        'small': ParagraphStyle(
            'Small', parent=base['BodyText'], fontName='Malgun', fontSize=8.2,
            leading=13, textColor=MUTE, wordWrap='CJK',
        ),
        'table_head': ParagraphStyle(
            'TableHead', parent=base['BodyText'], fontName='MalgunBold', fontSize=8.2,
            leading=12, textColor=colors.white, wordWrap='CJK',
        ),
        'table_cell': ParagraphStyle(
            'TableCell', parent=base['BodyText'], fontName='Malgun', fontSize=8.2,
            leading=12.5, textColor=BODY, wordWrap='CJK',
        ),
        'code': ParagraphStyle(
            'Code', parent=base['BodyText'], fontName='Malgun', fontSize=8.5,
            leading=14, textColor=TEAL_DEEP, wordWrap='CJK',
        ),
        'list': ParagraphStyle(
            'List', parent=base['BodyText'], fontName='Malgun', fontSize=9.2,
            leading=15, textColor=BODY, leftIndent=2 * mm, wordWrap='CJK',
        ),
        'callout': ParagraphStyle(
            'Callout', parent=base['BodyText'], fontName='MalgunBold', fontSize=10,
            leading=16, textColor=TEAL_DEEP, wordWrap='CJK',
        ),
    }


class FunctionalSpecDoc(BaseDocTemplate):
    def __init__(self, filename: str, **kwargs) -> None:
        super().__init__(filename, **kwargs)
        frame = Frame(LEFT, BOTTOM, CONTENT_WIDTH, PAGE_HEIGHT - TOP - BOTTOM, id='body')
        self.addPageTemplates(PageTemplate(id='main', frames=frame, onPage=self.draw_page))

    @staticmethod
    def draw_page(canvas, doc) -> None:
        canvas.saveState()
        if doc.page == 1:
            canvas.setFillColor(TEAL)
            canvas.rect(0, PAGE_HEIGHT - 5 * mm, PAGE_WIDTH, 5 * mm, fill=1, stroke=0)
        else:
            canvas.setFont('MalgunBold', 7.5)
            canvas.setFillColor(FAINT)
            canvas.drawString(LEFT, PAGE_HEIGHT - 11 * mm, 'CAREER NAVI  ·  FUNCTIONAL SPECIFICATION')
            canvas.setStrokeColor(HAIRLINE)
            canvas.line(LEFT, PAGE_HEIGHT - 13 * mm, PAGE_WIDTH - RIGHT, PAGE_HEIGHT - 13 * mm)
        canvas.setFont('Malgun', 7.5)
        canvas.setFillColor(FAINT)
        canvas.drawString(LEFT, 9 * mm, '원티드 AI Championship 2026  ·  강사 설명용')
        canvas.drawRightString(PAGE_WIDTH - RIGHT, 9 * mm, f'{doc.page:02d}')
        canvas.restoreState()


def cover_story(style: dict[str, ParagraphStyle]) -> list:
    stat_style = ParagraphStyle(
        'Stat', parent=style['small'], fontName='MalgunBold', fontSize=16,
        leading=20, textColor=TEAL_DEEP, alignment=TA_CENTER,
    )
    label_style = ParagraphStyle(
        'StatLabel', parent=style['small'], fontSize=7.8, leading=11,
        textColor=MUTE, alignment=TA_CENTER,
    )
    stats = Table(
        [[
            Paragraph('24<br/><font size="8" color="#666666">직무</font>', stat_style),
            Paragraph('298<br/><font size="8" color="#666666">역량</font>', stat_style),
            Paragraph('18<br/><font size="8" color="#666666">가상 회사</font>', stat_style),
            Paragraph('72<br/><font size="8" color="#666666">가상 후보</font>', stat_style),
        ]],
        colWidths=[CONTENT_WIDTH / 4] * 4,
        rowHeights=[23 * mm],
    )
    stats.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), CANVAS),
        ('BOX', (0, 0), (-1, -1), 0.7, HAIRLINE),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, HAIRLINE),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 4 * mm),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4 * mm),
    ]))
    del label_style

    info = Table([
        [Paragraph('<b>기능 기준</b>', style['small']), Paragraph('feat/employer-mock · c0b304e', style['small'])],
        [Paragraph('<b>확인일</b>', style['small']), Paragraph('2026-09-08', style['small'])],
        [Paragraph('<b>문서 목적</b>', style['small']), Paragraph('현재 구현 기능과 목업 범위를 강사에게 설명', style['small'])],
    ], colWidths=[28 * mm, CONTENT_WIDTH - 28 * mm])
    info.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.white),
        ('BOX', (0, 0), (-1, -1), 0.7, HAIRLINE),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, HAIRLINE),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 4 * mm),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4 * mm),
        ('TOPPADDING', (0, 0), (-1, -1), 2.5 * mm),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5 * mm),
    ]))

    return [
        Spacer(1, 27 * mm),
        Paragraph('CAREER NAVI · FUNCTIONAL SPECIFICATION', style['cover_label']),
        Spacer(1, 5 * mm),
        Paragraph('커리어 내비<br/>기능 명세 요약', style['cover_title']),
        Paragraph(
            '직무명이 아니라 역량으로 연결하는 양방향 커리어·채용 목업<br/>'
            '현재 구현 범위, 점수 원칙, 가상 데이터와 시연 순서를 한 문서로 정리했습니다.',
            style['cover_subtitle'],
        ),
        Spacer(1, 11 * mm),
        HRFlowable(width='100%', thickness=1.5, color=TEAL, spaceAfter=8 * mm),
        stats,
        Spacer(1, 12 * mm),
        info,
        Spacer(1, 8 * mm),
        Table(
            [[Paragraph('이 문서는 실제 서비스 완성 보고서가 아니라, 가상 데이터로 구현한 기능 목업의 현재 상태를 설명합니다.', style['callout'])]],
            colWidths=[CONTENT_WIDTH],
            style=TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), TEAL_SOFT),
                ('BOX', (0, 0), (-1, -1), 0.8, TEAL),
                ('LEFTPADDING', (0, 0), (-1, -1), 5 * mm),
                ('RIGHTPADDING', (0, 0), (-1, -1), 5 * mm),
                ('TOPPADDING', (0, 0), (-1, -1), 4 * mm),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4 * mm),
            ]),
        ),
        PageBreak(),
    ]


def table_widths(column_count: int) -> list[float]:
    if column_count == 2:
        return [CONTENT_WIDTH * 0.30, CONTENT_WIDTH * 0.70]
    if column_count == 3:
        return [CONTENT_WIDTH * 0.22, CONTENT_WIDTH * 0.48, CONTENT_WIDTH * 0.30]
    if column_count == 4:
        return [CONTENT_WIDTH * 0.17, CONTENT_WIDTH * 0.16, CONTENT_WIDTH * 0.32, CONTENT_WIDTH * 0.35]
    return [CONTENT_WIDTH / column_count] * column_count


def make_table(rows: list[list[str]], style: dict[str, ParagraphStyle]) -> Table:
    data = []
    for row_index, row in enumerate(rows):
        cell_style = style['table_head'] if row_index == 0 else style['table_cell']
        data.append([Paragraph(inline_markup(cell), cell_style) for cell in row])
    table = Table(data, colWidths=table_widths(len(rows[0])), repeatRows=1, hAlign='LEFT')
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), TEAL_DEEP),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, CANVAS]),
        ('BOX', (0, 0), (-1, -1), 0.7, HAIRLINE),
        ('INNERGRID', (0, 0), (-1, -1), 0.45, HAIRLINE),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 3 * mm),
        ('RIGHTPADDING', (0, 0), (-1, -1), 3 * mm),
        ('TOPPADDING', (0, 0), (-1, -1), 2.5 * mm),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5 * mm),
    ]))
    return table


def make_list(items: list[str], ordered: bool, style: dict[str, ParagraphStyle]):
    list_options = {
        'bulletType': '1' if ordered else 'bullet',
        'leftIndent': 5 * mm,
        'bulletFontName': 'Malgun',
        'bulletFontSize': 8,
        'bulletColor': INK if ordered else TEAL,
        'spaceAfter': 3 * mm,
    }
    if ordered:
        list_options['start'] = 1
    else:
        list_options['bulletChar'] = '•'
    return ListFlowable(
        [ListItem(Paragraph(inline_markup(item), style['list']), leftIndent=4 * mm) for item in items],
        **list_options,
    )


def markdown_story(markdown: str, style: dict[str, ParagraphStyle]) -> list:
    lines = markdown.splitlines()
    story = []
    paragraph: list[str] = []
    index = 0

    def flush_paragraph() -> None:
        if paragraph:
            story.append(Paragraph(inline_markup(' '.join(paragraph)), style['body']))
            paragraph.clear()

    while index < len(lines):
        line = lines[index].rstrip()
        stripped = line.strip()

        if not stripped:
            flush_paragraph()
            index += 1
            continue
        if stripped.startswith('# '):
            flush_paragraph()
            index += 1
            continue
        if stripped.startswith('> '):
            flush_paragraph()
            index += 1
            continue
        if stripped.startswith('## '):
            flush_paragraph()
            title = stripped[3:]
            if title.startswith(('5.', '9.', '12.')):
                story.append(PageBreak())
            story.append(Paragraph(inline_markup(title), style['h2']))
            story.append(HRFlowable(width='100%', thickness=0.7, color=HAIRLINE, spaceAfter=1.5 * mm))
            index += 1
            continue
        if stripped.startswith('### '):
            flush_paragraph()
            story.append(Paragraph(inline_markup(stripped[4:]), style['h3']))
            index += 1
            continue
        if stripped.startswith('```'):
            flush_paragraph()
            code_lines = []
            index += 1
            while index < len(lines) and not lines[index].strip().startswith('```'):
                code_lines.append(html.escape(lines[index]).replace(' ', '&nbsp;'))
                index += 1
            code = Paragraph('<br/>'.join(code_lines), style['code'])
            story.append(Table([[code]], colWidths=[CONTENT_WIDTH], style=TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), CANVAS),
                ('BOX', (0, 0), (-1, -1), 0.7, HAIRLINE),
                ('LEFTPADDING', (0, 0), (-1, -1), 5 * mm),
                ('RIGHTPADDING', (0, 0), (-1, -1), 5 * mm),
                ('TOPPADDING', (0, 0), (-1, -1), 4 * mm),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4 * mm),
            ])))
            story.append(Spacer(1, 3 * mm))
            index += 1
            continue
        if stripped.startswith('|') and stripped.endswith('|'):
            flush_paragraph()
            table_lines = []
            while index < len(lines) and lines[index].strip().startswith('|'):
                table_lines.append(lines[index].strip())
                index += 1
            rows = [[cell.strip() for cell in row.strip('|').split('|')] for row in table_lines]
            if len(rows) > 1 and all(re.fullmatch(r':?-{3,}:?', cell) for cell in rows[1]):
                rows.pop(1)
            story.append(make_table(rows, style))
            story.append(Spacer(1, 3 * mm))
            continue
        if stripped.startswith('- '):
            flush_paragraph()
            items = []
            while index < len(lines) and lines[index].strip().startswith('- '):
                items.append(lines[index].strip()[2:])
                index += 1
            story.append(make_list(items, False, style))
            continue
        if re.match(r'^\d+\.\s+', stripped):
            flush_paragraph()
            items = []
            while index < len(lines) and re.match(r'^\d+\.\s+', lines[index].strip()):
                items.append(re.sub(r'^\d+\.\s+', '', lines[index].strip()))
                index += 1
            story.append(make_list(items, True, style))
            continue

        paragraph.append(stripped)
        index += 1

    flush_paragraph()
    story.append(Spacer(1, 4 * mm))
    story.append(KeepTogether([
        Table(
            [[Paragraph('상세 화면·API 계약과 후속 작업 표는 docs/FUNCTIONAL_SPEC.md에서 확인할 수 있습니다.', style['callout'])]],
            colWidths=[CONTENT_WIDTH],
            style=TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), AMBER_SOFT),
                ('BOX', (0, 0), (-1, -1), 0.7, AMBER),
                ('LEFTPADDING', (0, 0), (-1, -1), 5 * mm),
                ('RIGHTPADDING', (0, 0), (-1, -1), 5 * mm),
                ('TOPPADDING', (0, 0), (-1, -1), 4 * mm),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4 * mm),
            ]),
        ),
    ]))
    return story


def build(input_path: Path, output_path: Path) -> None:
    register_fonts()
    style = styles()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    document = FunctionalSpecDoc(
        str(output_path),
        pagesize=A4,
        leftMargin=LEFT,
        rightMargin=RIGHT,
        topMargin=TOP,
        bottomMargin=BOTTOM,
        title='커리어 내비 기능 명세 요약',
        author='Career Navi Team',
        subject='원티드 AI Championship 2026 기능 명세',
    )
    story = cover_story(style)
    story.extend(markdown_story(input_path.read_text(encoding='utf-8'), style))
    document.build(story)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', type=Path, default=Path('docs/FUNCTIONAL_SPEC_BRIEF.md'))
    parser.add_argument('--output', type=Path, default=Path('output/pdf/CAREER_NAVI_FUNCTIONAL_SPEC.pdf'))
    args = parser.parse_args()
    build(args.input, args.output)
    print(args.output.resolve())


if __name__ == '__main__':
    main()
