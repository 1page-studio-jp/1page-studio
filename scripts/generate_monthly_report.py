"""
generate_monthly_report.py
月次PDFレポート生成スクリプト

使い方:
  python3 generate_monthly_report.py --store-id <uuid> --year 2026 --month 7
  python3 generate_monthly_report.py --store-id <uuid>   # 今月

依存:
  pip install reportlab supabase python-dotenv
  日本語フォント: DroidSansFallbackFull.ttf または NotoSansCJK

環境変数 (.env):
  SUPABASE_URL=https://xxxx.supabase.co
  SUPABASE_SERVICE_KEY=eyJ...
  FONT_PATH=/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf
  OUTPUT_DIR=./reports
"""

import os, sys, argparse
from datetime import date
from calendar import monthrange
from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, Flowable
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.styles import ParagraphStyle

# ──────────────────────────────────────────────────────────
# フォント登録
# ──────────────────────────────────────────────────────────
FONT_PATH = os.getenv('FONT_PATH', '/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf')
if not Path(FONT_PATH).exists():
    # フォールバック候補
    fallbacks = [
        '/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf',
        '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
        '/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc',
    ]
    for f in fallbacks:
        if Path(f).exists():
            FONT_PATH = f
            break

pdfmetrics.registerFont(TTFont('JP',  FONT_PATH))
pdfmetrics.registerFont(TTFont('JPB', FONT_PATH))

W, H = A4

# ──────────────────────────────────────────────────────────
# カラーパレット
# ──────────────────────────────────────────────────────────
C_WHITE    = colors.white
C_BLACK    = colors.HexColor('#111827')
C_GRAY     = colors.HexColor('#6B7280')
C_LGRAY    = colors.HexColor('#F9FAFB')
C_BORDER   = colors.HexColor('#E5E7EB')
C_INDIGO   = colors.HexColor('#4F46E5')
C_INDIGO_L = colors.HexColor('#EEF2FF')
C_EMERALD  = colors.HexColor('#059669')
C_EMERALD_L= colors.HexColor('#ECFDF5')
C_AMBER    = colors.HexColor('#D97706')
C_RED      = colors.HexColor('#DC2626')
C_SLATE    = colors.HexColor('#1E293B')
C_SLATE2   = colors.HexColor('#334155')
C_SLATE3   = colors.HexColor('#94A3B8')

def st(name, font='JP', size=10, color=C_BLACK, leading=None,
       before=0, after=0, align=0, bold=False):
    return ParagraphStyle(
        name, fontName='JPB' if bold else font,
        fontSize=size, textColor=color,
        leading=leading or size * 1.55,
        spaceBefore=before, spaceAfter=after, alignment=align
    )


# ──────────────────────────────────────────────────────────
# 横棒グラフ Flowable
# ──────────────────────────────────────────────────────────
class HBarChart(Flowable):
    """先月 vs 今月の横棒グラフ"""

    def __init__(self, rows, width=None):
        """rows: list of (label, prev_val, curr_val, unit_str)"""
        super().__init__()
        self.rows = rows
        self._w = width or (W - 36 * mm)
        self._h = len(rows) * 30 + 10

    def wrap(self, aw, ah):
        return self._w, self._h

    def draw(self):
        c = self.canv
        bar_left     = 58
        bar_margin_r = 75
        bar_area     = self._w - bar_left - bar_margin_r
        max_val      = max((max(r[1], r[2]) for r in self.rows), default=1)

        for i, (label, prev, curr, unit) in enumerate(self.rows):
            y_base   = self._h - 22 - i * 30
            prev_w   = (prev / max_val) * bar_area if max_val > 0 else 0
            curr_w   = (curr / max_val) * bar_area if max_val > 0 else 0
            growth   = ((curr - prev) / prev * 100) if prev > 0 else 0

            # ラベル
            c.setFont('JP', 8)
            c.setFillColor(C_GRAY)
            c.drawRightString(bar_left - 5, y_base + 9, label)

            # 先月バー (薄い)
            c.setFillColor(colors.HexColor('#C7D2FE'))
            if prev_w > 0:
                c.roundRect(bar_left, y_base + 13, max(prev_w, 2), 8, 2, fill=1, stroke=0)

            # 今月バー (濃い)
            c.setFillColor(C_INDIGO)
            if curr_w > 0:
                c.roundRect(bar_left, y_base + 3, max(curr_w, 2), 8, 2, fill=1, stroke=0)

            # 今月の数値
            c.setFont('JPB', 8)
            c.setFillColor(C_BLACK)
            val_str = f"{int(curr):,}{unit}"
            c.drawString(bar_left + curr_w + 6, y_base + 4, val_str)

            # 成長バッジ
            is_up       = growth >= 0
            badge_color = C_EMERALD if is_up else C_RED
            badge_bg    = C_EMERALD_L if is_up else colors.HexColor('#FEE2E2')
            sign        = '+' if is_up else ''
            badge       = f"{sign}{growth:.0f}%"
            bw          = c.stringWidth(badge, 'JPB', 7.5) + 9
            bx          = self._w - bw - 2
            c.setFillColor(badge_bg)
            c.roundRect(bx, y_base + 2, bw, 13, 3, fill=1, stroke=0)
            c.setFont('JPB', 7.5)
            c.setFillColor(badge_color)
            c.drawString(bx + 4, y_base + 5, badge)

        # 凡例
        c.setFillColor(colors.HexColor('#C7D2FE'))
        c.roundRect(bar_left, 1, 12, 6, 1, fill=1, stroke=0)
        c.setFont('JP', 7)
        c.setFillColor(C_GRAY)
        c.drawString(bar_left + 15, 2, '先月')
        c.setFillColor(C_INDIGO)
        c.roundRect(bar_left + 44, 1, 12, 6, 1, fill=1, stroke=0)
        c.setFont('JP', 7)
        c.setFillColor(C_GRAY)
        c.drawString(bar_left + 59, 2, '今月')


# ──────────────────────────────────────────────────────────
# セクションヘッダー
# ──────────────────────────────────────────────────────────
def section_header(title, bg=C_INDIGO, cw=None):
    cw = cw or (W - 36 * mm)
    tbl = Table(
        [[Paragraph(title, st('sh', size=10, color=C_WHITE, bold=True))]],
        colWidths=[cw]
    )
    tbl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), bg),
        ('LEFTPADDING', (0, 0), (-1, -1), 4 * mm),
        ('TOPPADDING', (0, 0), (-1, -1), 2.5 * mm),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5 * mm),
        ('ROUNDEDCORNERS', [4, 4, 4, 4]),
    ]))
    return tbl


# ──────────────────────────────────────────────────────────
# メイン: PDFビルド
# ──────────────────────────────────────────────────────────
def build_pdf(data: dict, output_path: str):
    """
    data keys:
      store_name, period, partner_name
      revenue, line_adds, inquiries, lp_views, ad_spend, roas_label
      prev_revenue, prev_line, prev_inquiry, prev_views, prev_spend
      growth_revenue, growth_line, growth_inquiry, growth_views
      improvements: list[str]
      partner_comment: str
      next_month: list[str]
    """
    doc = SimpleDocTemplate(
        output_path, pagesize=A4,
        leftMargin=18*mm, rightMargin=18*mm,
        topMargin=14*mm, bottomMargin=14*mm
    )
    story = []
    cw = W - 36 * mm

    # ── 表紙ヘッダー ─────────────────────────────────────
    cover = Table([[
        Table([
            [Paragraph('1Page Studio', st('logo', size=8, color=C_SLATE3))],
            [Paragraph('月次活動レポート', st('rt', size=18, color=C_WHITE, bold=True, leading=26))],
            [Paragraph(data['period'], st('rp', size=10, color=colors.HexColor('#A5B4FC'), leading=16))],
        ], colWidths=[88*mm]),
        Table([
            [Paragraph(data['store_name'], st('sn', size=11, color=C_WHITE, bold=True, align=2))],
            [Spacer(1, 2*mm)],
            [Paragraph(f"担当パートナー: {data['partner_name']}", st('pn', size=8.5, color=C_SLATE3, align=2))],
        ], colWidths=[cw - 88*mm]),
    ]], colWidths=[88*mm, cw - 88*mm])
    cover.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), C_SLATE),
        ('LEFTPADDING', (0, 0), (0, 0), 5*mm),
        ('RIGHTPADDING', (-1, 0), (-1, -1), 5*mm),
        ('TOPPADDING', (0, 0), (-1, -1), 5*mm),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5*mm),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ROUNDEDCORNERS', [6, 6, 6, 6]),
    ]))
    story.append(cover)
    story.append(Spacer(1, 5*mm))

    # ── ① 今月の成果（4指標カード）───────────────────────
    story.append(section_header('① 今月の成果', cw=cw))
    story.append(Spacer(1, 3*mm))

    def metric_cell(label, value, growth, is_up=True):
        gc = C_EMERALD if is_up else C_RED
        inner = Table([
            [Paragraph(label, st('ml', size=8, color=C_GRAY))],
            [Paragraph(str(value), st('mv', size=20, color=C_BLACK, bold=True, leading=26))],
            [Paragraph(f'先月比 {growth}', st('mg', size=8, color=gc, bold=True))],
        ], colWidths=[cw/4 - 3*mm])
        inner.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), C_WHITE),
            ('LEFTPADDING', (0, 0), (-1, -1), 3*mm),
            ('TOPPADDING', (0, 0), (-1, -1), 2.5*mm),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5*mm),
            ('BOX', (0, 0), (-1, -1), 0.5, C_BORDER),
            ('ROUNDEDCORNERS', [5, 5, 5, 5]),
        ]))
        return inner

    cards = Table([[
        metric_cell('売上（広告経由）', f"¥{data['revenue']:,}",  data['growth_revenue']),
        metric_cell('LINE 新規登録',    f"{data['line_adds']}件", data['growth_line']),
        metric_cell('お問い合わせ',     f"{data['inquiries']}件", data['growth_inquiry']),
        metric_cell('LP 閲覧数',        f"{data['lp_views']:,}PV", data['growth_views']),
    ]], colWidths=[cw/4]*4)
    cards.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 1.5*mm),
        ('RIGHTPADDING', (0, 0), (-1, -1), 1.5*mm),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(cards)
    story.append(Spacer(1, 5*mm))

    # ── ② 先月との成長グラフ ──────────────────────────────
    story.append(section_header('② 先月との成長グラフ', cw=cw))
    story.append(Spacer(1, 3*mm))
    story.append(HBarChart([
        ('LINE登録',     data['prev_line'],    data['line_adds'],  '件'),
        ('問い合わせ',   data['prev_inquiry'], data['inquiries'],  '件'),
        ('LP閲覧数',     data['prev_views'],   data['lp_views'],   'PV'),
        ('売上（¥）',    data['prev_revenue'], data['revenue'],    '円'),
    ], width=cw))
    story.append(Spacer(1, 5*mm))

    # ── ③ 広告結果 ────────────────────────────────────────
    story.append(section_header('③ 広告結果', cw=cw))
    story.append(Spacer(1, 3*mm))
    ad_rows = [
        [Paragraph('項目', st('ah', size=8.5, color=C_INDIGO, bold=True)),
         Paragraph('今月', st('ah', size=8.5, color=C_INDIGO, bold=True, align=1)),
         Paragraph('先月', st('ah', size=8.5, color=C_GRAY, align=1)),
         Paragraph('変化', st('ah', size=8.5, color=C_INDIGO, bold=True, align=1))],
        [Paragraph('広告費用', st('ab', size=9)),
         Paragraph(f"¥{data['ad_spend']:,}", st('av', size=9, align=1)),
         Paragraph(f"¥{data['prev_spend']:,}", st('av', size=9, color=C_GRAY, align=1)),
         Paragraph('—', st('av', size=9, color=C_GRAY, align=1))],
        [Paragraph('売上（広告経由）', st('ab', size=9)),
         Paragraph(f"¥{data['revenue']:,}", st('av', size=9, bold=True, color=C_EMERALD, align=1)),
         Paragraph(f"¥{data['prev_revenue']:,}", st('av', size=9, color=C_GRAY, align=1)),
         Paragraph(data['growth_revenue'], st('av', size=9, bold=True, color=C_EMERALD, align=1))],
        [Paragraph('広告の効果（ROAS）', st('ab', size=9)),
         Paragraph(data['roas_label'], st('av', size=9, bold=True, color=C_INDIGO, align=1)),
         Paragraph('—', st('av', size=9, color=C_GRAY, align=1)),
         Paragraph('—', st('av', size=9, color=C_GRAY, align=1))],
    ]
    ad_tbl = Table(ad_rows, colWidths=[cw*0.4, cw*0.2, cw*0.2, cw*0.2])
    ad_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), C_INDIGO_L),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [C_WHITE, C_LGRAY]),
        ('BOX', (0, 0), (-1, -1), 0.5, C_BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.3, C_BORDER),
        ('LEFTPADDING', (0, 0), (-1, -1), 3*mm),
        ('RIGHTPADDING', (0, 0), (-1, -1), 3*mm),
        ('TOPPADDING', (0, 0), (-1, -1), 2.5*mm),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5*mm),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ROUNDEDCORNERS', [4, 4, 4, 4]),
    ]))
    story.append(ad_tbl)
    story.append(Spacer(1, 5*mm))

    # ── ④ 今月の改善内容 ──────────────────────────────────
    story.append(section_header('④ 今月の改善内容', cw=cw))
    story.append(Spacer(1, 3*mm))
    for item in data['improvements']:
        row = Table([[
            Paragraph('✓', st('ck', size=9, color=C_EMERALD, bold=True)),
            Paragraph(item, st('imp', size=9.5, leading=16)),
        ]], colWidths=[7*mm, cw - 7*mm])
        row.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 1),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        story.append(row)
    story.append(Spacer(1, 5*mm))

    # ── ⑤ 担当パートナーからのコメント ───────────────────
    story.append(section_header('⑤ 担当パートナーからのコメント', bg=C_SLATE2, cw=cw))
    story.append(Spacer(1, 3*mm))
    comment_inner = Table([
        [Paragraph('担当パートナー', st('pnt', size=8.5, color=C_INDIGO, bold=True))],
        [Spacer(1, 1.5*mm)],
        [Paragraph(data['partner_comment'], st('pc', size=9.5, leading=17))],
        [Spacer(1, 3*mm)],
        [Paragraph(f"— {data['partner_name']}", st('sig', size=9, color=C_INDIGO, bold=True))],
    ], colWidths=[cw - 12*mm])
    comment_inner.setStyle(TableStyle([
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    comment_box = Table([[comment_inner]], colWidths=[cw])
    comment_box.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), C_INDIGO_L),
        ('LEFTPADDING', (0, 0), (-1, -1), 6*mm),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6*mm),
        ('TOPPADDING', (0, 0), (-1, -1), 5*mm),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5*mm),
        ('BOX', (0, 0), (-1, -1), 2, C_INDIGO),
        ('ROUNDEDCORNERS', [6, 6, 6, 6]),
    ]))
    story.append(comment_box)
    story.append(Spacer(1, 5*mm))

    # ── ⑥ 来月の提案 ──────────────────────────────────────
    story.append(section_header('⑥ 来月の提案', cw=cw))
    story.append(Spacer(1, 3*mm))
    for i, item in enumerate(data['next_month']):
        row = Table([[
            Table([[Paragraph(str(i+1), st('num', size=9, color=C_WHITE, bold=True, align=1))]],
                  colWidths=[6*mm]),
            Paragraph(item, st('nxt', size=9.5, leading=16)),
        ]], colWidths=[8*mm, cw - 8*mm])
        row.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, 0), C_INDIGO),
            ('BACKGROUND', (1, 0), (1, 0), C_WHITE),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (0, 0), 0),
            ('RIGHTPADDING', (0, 0), (0, 0), 0),
            ('LEFTPADDING', (1, 0), (1, 0), 3*mm),
            ('TOPPADDING', (0, 0), (-1, -1), 2*mm),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2*mm),
            ('BOX', (0, 0), (-1, -1), 0.5, C_BORDER),
            ('ROUNDEDCORNERS', [4, 4, 4, 4]),
        ]))
        story.append(row)
        story.append(Spacer(1, 2*mm))

    # ── フッター ─────────────────────────────────────────
    story.append(Spacer(1, 6*mm))
    story.append(HRFlowable(width='100%', thickness=0.5, color=C_BORDER))
    story.append(Spacer(1, 2*mm))
    footer = Table([[
        Paragraph(f"1Page Studio  |  {data['store_name']}  |  {data['period']}", st('fl', size=8, color=C_GRAY)),
        Paragraph(f"担当: {data['partner_name']}", st('fr', size=8, color=C_INDIGO, align=2)),
    ]], colWidths=[cw * 0.65, cw * 0.35])
    footer.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(footer)

    doc.build(story)
    return output_path


# ──────────────────────────────────────────────────────────
# Supabase からデータ取得
# ──────────────────────────────────────────────────────────
def fetch_store_data(store_id: str, year: int, month: int) -> dict:
    """Supabase からレポートデータを取得"""
    try:
        from supabase import create_client
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        raise RuntimeError("pip install supabase python-dotenv が必要です")

    url = os.environ['SUPABASE_URL']
    key = os.environ['SUPABASE_SERVICE_KEY']
    sb  = create_client(url, key)

    # 今月・先月の日付範囲
    month_start = f"{year}-{month:02d}-01"
    last_day    = monthrange(year, month)[1]
    month_end   = f"{year}-{month:02d}-{last_day}"

    prev_year   = year if month > 1 else year - 1
    prev_month  = month - 1 if month > 1 else 12
    prev_start  = f"{prev_year}-{prev_month:02d}-01"
    prev_last   = monthrange(prev_year, prev_month)[1]
    prev_end    = f"{prev_year}-{prev_month:02d}-{prev_last}"

    # 店舗情報
    store = sb.from_('stores').select('store_name').eq('id', store_id).single().execute().data

    # 集計ヘルパー
    def agg(start, end):
        rows = sb.from_('ad_daily_reports').select('*') \
            .eq('store_id', store_id) \
            .gte('date', start).lte('date', end).execute().data or []
        return {
            'revenue':   sum(float(r.get('revenue') or r.get('sales') or 0) for r in rows),
            'spend':     sum(float(r.get('spend') or r.get('cost') or 0) for r in rows),
            'line_adds': sum(int(r.get('line_adds') or 0) for r in rows),
            'inquiries': sum(int(r.get('inquiries') or 0) for r in rows),
            'lp_views':  sum(int(r.get('lp_views') or 0) for r in rows),
        }

    curr = agg(month_start, month_end)
    prev = agg(prev_start, prev_end)

    def pct(c, p): return f"+{((c-p)/p*100):.0f}%" if p > 0 else "—"
    roas = curr['revenue'] / curr['spend'] if curr['spend'] > 0 else 0

    # マイルストーン（改善内容）
    milestones = sb.from_('store_milestones').select('title, description') \
        .eq('store_id', store_id) \
        .gte('happened_at', month_start).lte('happened_at', month_end) \
        .is_('deleted_at', None).execute().data or []
    improvements = [
        f"{m['title']}{f'（{m[\"description\"]}）' if m.get('description') else ''}"
        for m in milestones
    ] or ['（今月の改善内容はまだ記録されていません）']

    # パートナーコメント
    comment_row = sb.from_('ai_comments').select('content, todos') \
        .eq('store_id', store_id).eq('approved', True) \
        .gte('generated_at', month_start) \
        .order('generated_at', desc=True).limit(1).execute().data
    partner_comment = (comment_row[0]['content'] if comment_row
                       else '今月のコメントはまだ作成されていません。')
    next_month_todos = (comment_row[0].get('todos') or [] if comment_row
                        else ['来月の提案はまだありません。'])

    # パートナー名 (管理者プロフィール)
    partner = sb.from_('profiles').select('full_name') \
        .eq('role', 'admin').limit(1).execute().data
    partner_name = partner[0]['full_name'] if partner else '担当パートナー'

    period = f"{year}年{month}月"
    return {
        'store_name':     store['store_name'],
        'period':         period,
        'partner_name':   partner_name,
        'revenue':        int(curr['revenue']),
        'line_adds':      curr['line_adds'],
        'inquiries':      curr['inquiries'],
        'lp_views':       curr['lp_views'],
        'ad_spend':       int(curr['spend']),
        'roas_label':     f"1円使って {roas:.1f}円 の効果" if roas > 0 else 'データなし',
        'prev_revenue':   int(prev['revenue']),
        'prev_line':      prev['line_adds'],
        'prev_inquiry':   prev['inquiries'],
        'prev_views':     prev['lp_views'],
        'prev_spend':     int(prev['spend']),
        'growth_revenue': pct(curr['revenue'],   prev['revenue']),
        'growth_line':    pct(curr['line_adds'],  prev['line_adds']),
        'growth_inquiry': pct(curr['inquiries'],  prev['inquiries']),
        'growth_views':   pct(curr['lp_views'],   prev['lp_views']),
        'improvements':   improvements,
        'partner_comment': partner_comment,
        'next_month':     next_month_todos if isinstance(next_month_todos, list) else [next_month_todos],
    }


# ──────────────────────────────────────────────────────────
# CLI エントリーポイント
# ──────────────────────────────────────────────────────────
if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='1Page Studio 月次PDFレポート生成')
    parser.add_argument('--store-id', required=True, help='店舗UUID')
    parser.add_argument('--year',  type=int, default=date.today().year,  help='対象年 (デフォルト: 今年)')
    parser.add_argument('--month', type=int, default=date.today().month, help='対象月 (デフォルト: 今月)')
    parser.add_argument('--out',   default=None, help='出力ファイルパス')
    parser.add_argument('--demo',  action='store_true', help='サンプルデータでデモ生成')
    args = parser.parse_args()

    if args.demo:
        data = {
            'store_name': 'サロン美花 渋谷店', 'period': f"{args.year}年{args.month}月",
            'partner_name': '山田 健太',
            'revenue': 238000, 'line_adds': 124, 'inquiries': 38, 'lp_views': 1284, 'ad_spend': 85000,
            'roas_label': '1円使って 2.8円 の効果',
            'prev_revenue': 218000, 'prev_line': 105, 'prev_inquiry': 26, 'prev_views': 1102, 'prev_spend': 85000,
            'growth_revenue': '+9%', 'growth_line': '+18%', 'growth_inquiry': '+46%', 'growth_views': '+16%',
            'improvements': [
                'LPのキャッチコピーを「渋谷で縮毛矯正といえば」に変更し、検索ニーズにマッチさせた',
                'Google口コミ12件に返信。返信率 0% → 100% になりMEO効果が向上',
                'LINE配信「夏のヘアケアキャンペーン」を180名に送信、23件の新規予約につながった',
                '広告キーワードを「渋谷 縮毛矯正」「渋谷 美容院 縮毛」に絞り込み、無駄なクリックを削減',
            ],
            'partner_comment': (
                '今月はLINE登録が先月比 +18%、お問い合わせは +46% と非常に好調でした。\n\n'
                'LINE配信の「夏のヘアケア」キャンペーンが数字に直結しています。この流れを来月も継続していきましょう。'
                'Google口コミの返信を始めたことで、検索結果での表示順位も上がってきています。'
                '来月は口コミ獲得の仕組みを作ることで、さらなる集客が期待できます。'
            ),
            'next_month': [
                'Google口コミを月5件以上獲得する仕組みを作る（来店後のQRコード配布）',
                'LINE配信を月2回に増やし、リピーター向けと新規向けでメッセージを分ける',
                'LPにビフォーアフター写真を追加し、コンバージョン率の向上を狙う',
                '秋のヘアケアシーズンに向けたクーポンを月末に準備する',
            ],
        }
    else:
        data = fetch_store_data(args.store_id, args.year, args.month)

    out_dir = Path(os.getenv('OUTPUT_DIR', './reports'))
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = args.out or str(out_dir / f"report_{args.store_id}_{args.year}{args.month:02d}.pdf")
    build_pdf(data, out_path)
    print(f"レポート生成完了: {out_path}")
