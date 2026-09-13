from pathlib import Path
import re, html, subprocess
from PIL import Image, ImageDraw, ImageFont
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage, KeepTogether
from reportlab.lib.pagesizes import A4

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/submission'
FONT='C:/Windows/Fonts/malgun.ttf'
BOLD='C:/Windows/Fonts/malgunbd.ttf'
pdfmetrics.registerFont(TTFont('Korean',FONT))
pdfmetrics.registerFont(TTFont('KoreanBold',BOLD))
pdfmetrics.registerFontFamily('Korean',normal='Korean',bold='KoreanBold',italic='Korean',boldItalic='KoreanBold')
INK='#172B36'; TEAL='#087F70'; MUTED='#536771'; LIGHT='#EDF7F4'

def diagram(kind):
    im=Image.new('RGB',(1800,760),'#F6F9FA'); d=ImageDraw.Draw(im)
    def txt(x,y,t,size=30,fill=INK,bold=False):
        d.text((x,y),t,font=ImageFont.truetype(BOLD if bold else FONT,size),fill=fill)
    def box(x,y,w,h,title,lines,accent=TEAL):
        d.rounded_rectangle((x,y,x+w,y+h),radius=20,fill='white',outline='#DCE6E8',width=2)
        d.rounded_rectangle((x,y,x+7,y+h),radius=3,fill=accent)
        txt(x+28,y+22,title,33,accent,True)
        for n,line in enumerate(lines):txt(x+28,y+81+n*45,line,28)
    def arrow(x,y,w=48):
        d.line((x,y,x+w,y),fill='#8AA4AC',width=5)
        d.polygon([(x+w,y),(x+w-13,y-10),(x+w-13,y+10)],fill='#8AA4AC')
    if kind=='story':
        txt(55,35,'하나의 경험, 서로 다른 두 가지 판단',43,bold=True)
        txt(55,102,'개인은 다음 직무를 탐색하고, 기업은 공고에 맞는 후보를 검토합니다.',29,MUTED)
        txt(58,187,'개인',32,TEAL,True)
        box(55,245,510,175,'경험 입력',['이력서 또는 직접 작성','보유 역량 · 경력 정리'])
        arrow(580,330)
        box(645,245,510,175,'직무 비교',['직무별 요구사항과 대조','보유 역량과 보완할 점 확인'])
        arrow(1170,330)
        box(1235,245,510,175,'다음 선택 탐색',['추천 경로 3개 확인','관심 직무의 상세 근거 검토'])
        txt(58,460,'기업',32,'#315A8C',True)
        box(55,516,510,175,'채용 조건 설정',['모집 직무와 경력 범위','필수 · 우대 역량 지정'],'#315A8C')
        arrow(580,600)
        box(645,516,510,175,'후보 비교',['공고 조건과 보유 역량 대조','역량 점수와 경력 조건 확인'],'#315A8C')
        arrow(1170,600)
        box(1235,516,510,175,'검토할 후보 선택',['지원 현황과 근거 확인','다른 직무의 후보까지 탐색'],'#315A8C')
    else:
        txt(55,35,'같은 충족률에서도 목적에 따라 계산이 달라집니다',41,bold=True)
        txt(55,103,'가상 예시  |  필수 충족률 80% · 우대 충족률 60%',30,MUTED)
        box(55,190,810,450,'개인 · 직무 탐색',['필수 80 × 3 + 우대 60 × 1','+ 직무 관련성 90 × 2','합계 480 ÷ 6 = 기본 80점','','경력 계수 0.93 적용 → 74.4점','현재 직무 일치 +8점 → 반올림'])
        box(925,190,820,450,'기업 · 공고별 후보 비교',['필수 80 × 3 + 우대 60 × 1','합계 300 ÷ 4 = 75점','','경력 조건 충족 여부는 별도 판정','우대 조건이 없으면 필수만 반영','이 예시에서는 80점'],'#315A8C')
        txt(80,659,'개인 최종 82점',40,TEAL,True)
        txt(950,659,'기업 최종 75점',40,'#315A8C',True)
    path=OUT/'assets'/f'{kind}-flow.png';im.save(path)
    return path

for kind in ('story','score'):diagram(kind)
storypath=OUT/'STORYLINE_SUBMISSION.md'
story=storypath.read_text(encoding='utf-8')
needle='## 1. 직업 비교 아이디어에 서로 다른 고민이 만났습니다'
if 'assets/story-flow.png' not in story:
    story=story.replace(needle,'## 서비스 흐름 한눈에 보기\n\n![개인과 기업의 서비스 이용 흐름](assets/story-flow.png)\n\n개인은 자신의 경험을 바탕으로 다음 직무를 비교하고, 기업은 채용 조건을 바탕으로 후보를 비교합니다. 기업 흐름은 현재 가상 공고·후보를 사용하는 데모입니다.\n\n'+needle)
storypath.write_text(story,encoding='utf-8')
scorepath=OUT/'FIT_SCORE_SUBMISSION.md'
score=scorepath.read_text(encoding='utf-8')
if 'assets/score-flow.png' not in score:
    score=score.replace('### 개인 점수는 이렇게 계산합니다','![개인과 기업의 적합도 계산 예시](assets/score-flow.png)\n\n### 개인 점수는 이렇게 계산합니다',1)
scorepath.write_text(score,encoding='utf-8')

styles={
 'body':ParagraphStyle('body',fontName='Korean',fontSize=10.4,leading=17.5,textColor=colors.HexColor(INK),wordWrap='CJK',spaceAfter=9),
 'h1':ParagraphStyle('h1',fontName='KoreanBold',fontSize=25,leading=34,textColor=colors.HexColor(INK),spaceAfter=21,keepWithNext=True,wordWrap='CJK'),
 'h2':ParagraphStyle('h2',fontName='KoreanBold',fontSize=16,leading=23,textColor=colors.HexColor(TEAL),spaceBefore=17,spaceAfter=11,keepWithNext=True,wordWrap='CJK'),
 'h3':ParagraphStyle('h3',fontName='KoreanBold',fontSize=12,leading=19,textColor=colors.HexColor(INK),spaceBefore=10,spaceAfter=8,keepWithNext=True,wordWrap='CJK'),
 'quote':ParagraphStyle('quote',fontName='Korean',fontSize=10.1,leading=17,textColor=colors.HexColor(TEAL),backColor=colors.HexColor(LIGHT),borderPadding=9,spaceBefore=8,spaceAfter=12,wordWrap='CJK'),
 'cell':ParagraphStyle('cell',fontName='Korean',fontSize=9,leading=14,wordWrap='CJK',textColor=colors.HexColor(INK)),
}
def inline(s):
    s=html.escape(s)
    s=re.sub(r'\[([^\]]+)\]\(([^)]+)\)',r'\1',s)
    s=re.sub(r'\*\*(.*?)\*\*',r'<b>\1</b>',s)
    s=re.sub(r'`([^`]+)`',r'\1',s)
    return s.replace('—','-').replace('–','-').replace('①','1.').replace('②','2.').replace('③','3.').replace('④','4.')
def build(path):
    blocks=[];lines=path.read_text(encoding='utf-8').splitlines();i=0
    while i<len(lines):
        line=lines[i].strip()
        if not line or line=='---':i+=1;continue
        if line.startswith('!['):
            target=re.search(r'\]\((.*?)\)',line).group(1)
            image=RLImage(str(OUT/target),width=481,height=481*760/1800)
            blocks.extend([image,Spacer(1,12)]);i+=1;continue
        if line.startswith('|'):
            rows=[]
            while i<len(lines) and lines[i].strip().startswith('|'):
                cells=[c.strip() for c in lines[i].strip().strip('|').split('|')]
                if not all(re.fullmatch(r'[-: ]+',c) for c in cells):rows.append(cells)
                i+=1
            n=len(rows[0]); widths=[55,213,213] if n==3 else [180,301]
            data=[[Paragraph(('<b>'+inline(c)+'</b>') if j==0 else inline(c),styles['cell']) for c in row] for j,row in enumerate(rows)]
            t=Table(data,colWidths=widths,repeatRows=1,hAlign='LEFT')
            t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor(LIGHT)),('VALIGN',(0,0),(-1,-1),'TOP'),('LINEBELOW',(0,0),(-1,-1),.4,colors.HexColor('#DCE6E8')),('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),9),('BOTTOMPADDING',(0,0),(-1,-1),9)]))
            blocks.extend([t,Spacer(1,12)]);continue
        if line.startswith('>'):
            qs=[]
            while i<len(lines) and lines[i].strip().startswith('>'):
                q=lines[i].strip()[1:].strip()
                if q:qs.append(inline(q))
                i+=1
            blocks.append(Paragraph('<br/>'.join(qs),styles['quote']));continue
        m=re.match(r'^(#{1,3}) (.*)',line)
        if m:blocks.append(Paragraph(inline(m[2]),styles['h'+str(len(m[1]))]));i+=1;continue
        if line.startswith('- '):line='• '+line[2:]
        blocks.append(Paragraph(inline(line),styles['body']));i+=1
    for title in ('개인 점수는 이렇게 계산합니다','기업 점수는 이렇게 계산합니다'):
        start=next((j for j,b in enumerate(blocks) if isinstance(b,Paragraph) and b.getPlainText()==title),None)
        if start is not None:
            end=start+1
            while end<len(blocks) and not (isinstance(blocks[end],Paragraph) and blocks[end].style.name in ('h1','h2','h3')):end+=1
            blocks[start:end]=[KeepTogether(blocks[start:end])]
    label='기획과 개발 이야기' if path.stem.startswith('STORY') else '적합도 계산 방식'
    def page(c,doc):
        c.setTitle('Career Navi | '+label);c.setAuthor('Career Navi')
        w,h=A4;c.setStrokeColor(colors.HexColor('#DCE6E8'));c.line(57,48,w-57,48)
        c.setFont('Korean',8);c.setFillColor(colors.HexColor(MUTED));c.drawString(57,33,'Career Navi  /  '+label);c.drawRightString(w-57,33,str(doc.page))
        if doc.page>1:c.drawString(57,h-33,'CAREER NAVI');c.drawRightString(w-57,h-33,'제출용 설명서')
    doc=SimpleDocTemplate(str(path.with_suffix('.pdf')),pagesize=A4,rightMargin=57,leftMargin=57,topMargin=56,bottomMargin=64)
    doc.build(blocks,onFirstPage=page,onLaterPages=page)
    print(path.with_suffix('.pdf'))
for p in (storypath,scorepath):build(p)
