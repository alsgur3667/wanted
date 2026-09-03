"""데이터 점검·보정 대시보드를 만든다 → docs/data-dashboard.html

왜 필요한가
  요구 역량이 이상한 것을 계속 사람이 눈으로 찾아 고쳤다 —
  모션·영상 디자이너의 Swift, QA 의 Ruby·Scala, 모바일의 React.
  그때마다 스크립트를 짜서 뽑아 보고 코드를 고쳤다. 같은 일이 반복된다.

  들어간 값을 **그대로** 보여주고, 이상한 것을 그 자리에서 고칠 수 있어야 한다.

무엇을 보여주나
  (직무 × 역량) 한 줄마다 근거를 전부 편다 —
  공고 자격요건/우대 몇 건, 해설 글이 필수라 했나 우대라 했나, 공인 체계에 있나,
  변별력(lift), 강도(importance), 합의 출처 수, 최종 판정(tier).
  숫자만 보면 왜 그렇게 판정됐는지 알 수 없다. 근거를 나란히 놓아야 판단할 수 있다.

무엇을 고칠 수 있나
  화면에서 **필수/우대/제외**를 바꾸고 **강도 배수**를 조절한 뒤 내려받으면
  data/overrides.json 이 된다. 그 파일을 저장소에 두면 export_contract 가 읽어 적용한다.
  → 사람의 판단이 코드가 아니라 **데이터로 남고, 다시 돌려도 유지된다.**

⚠️ 원본 수치는 덮어쓰지 않는다. 보정은 별도 파일에 남고, 화면에 '보정됨'으로 표시된다.
   어떤 값이 사람 손을 탔는지 언제나 구분할 수 있어야 한다.
"""
import json
import re
from collections import defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
D = REPO / "data" / "interim"
OUT = REPO / "docs" / "data-dashboard.html"
OVERRIDES = REPO / "data" / "overrides.json"

LIFT_CAP = 3.0
MUST_REL = 0.4


def run():
    jobs = json.loads((D / "jobs.json").read_text(encoding="utf-8"))
    skills = {s["id"]: s for s in json.loads((D / "skills.json").read_text(encoding="utf-8"))}
    matrix = json.loads((D / "job-skills.json").read_text(encoding="utf-8"))
    groups = json.loads((D / "skill-groups.json").read_text(encoding="utf-8"))
    ov = json.loads(OVERRIDES.read_text(encoding="utf-8")) if OVERRIDES.exists() else {}

    grp_of = {}
    for key, g in groups.items():
        for n in g["skills"]:
            grp_of[n] = g["label"]

    per = defaultdict(list)
    for m in matrix:
        per[m["jobId"]].append(m)

    def imp(m):
        return (m.get("importance") or m.get("evidence") or m["weight"]) * min(LIFT_CAP, m.get("lift") or 1)

    #  몇 개 직무가 이걸 '필수'로 요구하나 — 많으면 그 직무의 특징이 아니다
    generic = defaultdict(int)
    for j in jobs:
        ms = sorted(per[j["id"]], key=lambda m: -imp(m))
        top = max((imp(m) for m in ms), default=0) or 1
        for m in ms:
            if m.get("tier") == "required" and imp(m) >= top * MUST_REL:
                generic[m["skillId"]] += 1

    rows = []
    for j in jobs:
        ms = sorted(per[j["id"]], key=lambda m: -imp(m))
        top = max((imp(m) for m in ms), default=0) or 1
        for rank, m in enumerate(ms, 1):
            s = skills.get(m["skillId"])
            if not s:
                continue
            jd_req, jd_pre = m.get("reqFreq") or 0, m.get("prefFreq") or 0
            g_req, g_pre = m.get("guideRequired") or 0, m.get("guidePreferred") or 0
            onto = m.get("ontology") or None
            score = imp(m)
            #  왜 의심스러운가 — 사람이 눈으로 찾던 것을 규칙으로 적어 둔다.
            #
            #  ⚠️ 수기 항목에는 근거 부족을 묻지 않는다. 공고에 안 나오는 업무 역량을
            #     사람이 직무 정의를 보고 넣은 것이라 docFreq 가 0 인 게 정상이다.
            #     처음엔 그걸 안 걸러서 의심 25건 중 23건이 수기였다 — 쓸모없는 경고였다.
            manual = m.get("source") == "manual"
            flags = []
            if manual:
                flags.append("수기")
            elif m.get("tier") == "required":
                if (m.get("docFreq") or 0) <= 1 and (m.get("guideMentions") or 0) == 0:
                    flags.append("근거 1건 이하")
                if not m.get("docFreq") and not m.get("guideMentions"):
                    flags.append("공인 체계만")
                if (m.get("lift") or 1) < 1:
                    flags.append("이 직무에서 평균 이하")
                if (m.get("lift") or 0) >= 1 and generic.get(m["skillId"], 0) >= 8:
                    flags.append(f"{generic[m['skillId']]}개 직무가 함께 요구")
            if m.get("overridden"):
                flags.append("보정됨")
            rows.append({
                "job": j["id"], "jobTitle": j["title"], "family": j["family"],
                "n": j.get("sampleSize", 0),
                "sid": m["skillId"], "skill": s["name"], "type": s.get("type"),
                "group": grp_of.get(s["name"]),
                "rank": rank,
                "must": m.get("tier") == "required" and score >= top * MUST_REL,
                "tier": m.get("tier"), "src": m.get("source"),
                "jdReq": jd_req, "jdPre": jd_pre, "docFreq": m.get("docFreq"),
                "gReq": g_req, "gPre": g_pre, "gAll": m.get("guideMentions") or 0,
                "gDocs": m.get("guideDocs") or 0,
                "onet": (onto or {}).get("onet"), "onetOf": (onto or {}).get("onetOf"),
                "ncs": (onto or {}).get("ncs"),
                "weight": m.get("weight"), "evidence": m.get("evidence"),
                "importance": m.get("importance"), "lift": m.get("lift"),
                "agree": m.get("agreement"), "score": round(score, 4),
                "rel": round(score / top, 3),
                "flags": flags,
                #  '수기'·'보정됨'은 상태 표시지 의심이 아니다.
                #  세는 곳과 거르는 곳은 이쪽만 본다.
                "warn": [f for f in flags if f not in ("수기", "보정됨")],
            })

    payload = {
        "generatedAt": __import__("datetime").datetime.now().isoformat(timespec="seconds"),
        "jobs": [{"id": j["id"], "title": j["title"], "family": j["family"],
                  "n": j.get("sampleSize", 0)} for j in jobs],
        "rows": rows,
        "overrides": ov,
        "groups": {k: g["label"] for k, g in groups.items()},
    }

    html = TEMPLATE.replace("__PAYLOAD__", json.dumps(payload, ensure_ascii=False))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(html, encoding="utf-8")
    n_flag = sum(1 for r in rows if r["warn"] and r["must"])
    print(f"직무 {len(jobs)}개 · 줄 {len(rows):,}개 · 필수 중 의심 {n_flag}건 · 보정 {len(ov)}건")
    print(f"→ {OUT.relative_to(REPO)}  ({OUT.stat().st_size / 1024:.0f}KB)")


TEMPLATE = r"""<title>데이터 점검판</title>
<style>
:root{--bg:#fbfbfa;--panel:#fff;--line:#e6e4e0;--ink:#1c1b19;--ink2:#5f5c57;--ink3:#94908a;
      --ok:#0f7b46;--warn:#b45309;--bad:#b91c1c;--acc:#2563eb;--chip:#f1efec}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){
  --bg:#141413;--panel:#1c1b1a;--line:#2e2c2a;--ink:#eceae7;--ink2:#a8a49e;--ink3:#75716b;
  --ok:#4ade80;--warn:#fbbf24;--bad:#f87171;--acc:#60a5fa;--chip:#262523}}
:root[data-theme=dark]{--bg:#141413;--panel:#1c1b1a;--line:#2e2c2a;--ink:#eceae7;--ink2:#a8a49e;
  --ink3:#75716b;--ok:#4ade80;--warn:#fbbf24;--bad:#f87171;--acc:#60a5fa;--chip:#262523}
*{box-sizing:border-box}
body{background:var(--bg);color:var(--ink);font:13px/1.55 -apple-system,"Segoe UI",Roboto,"Noto Sans KR",sans-serif;
     margin:0;padding:20px 22px 80px}
h1{font-size:19px;margin:0 0 4px;letter-spacing:-.01em}
.sub{color:var(--ink2);font-size:12.5px;margin:0 0 18px;max-width:78ch}
.bar{position:sticky;top:0;z-index:5;background:var(--bg);padding:10px 0;border-bottom:1px solid var(--line);
     display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:14px}
select,input[type=search]{background:var(--panel);color:var(--ink);border:1px solid var(--line);
     border-radius:7px;padding:5px 9px;font:inherit;font-size:12.5px}
button{background:var(--panel);color:var(--ink);border:1px solid var(--line);border-radius:7px;
     padding:5px 11px;font:inherit;font-size:12.5px;cursor:pointer}
button:hover{border-color:var(--acc)}
button.on{background:var(--acc);border-color:var(--acc);color:#fff}
button.primary{background:var(--ok);border-color:var(--ok);color:#fff;font-weight:600}
.sep{width:1px;height:20px;background:var(--line);margin:0 4px}
.count{color:var(--ink3);font-size:12px;margin-left:auto}
table{width:100%;border-collapse:collapse;font-size:12.5px}
th{position:sticky;top:52px;background:var(--bg);text-align:left;font-weight:600;color:var(--ink2);
   padding:7px 8px;border-bottom:1px solid var(--line);white-space:nowrap;font-size:11.5px}
td{padding:6px 8px;border-bottom:1px solid var(--line);vertical-align:top}
tr:hover td{background:var(--chip)}
.num{text-align:right;font-variant-numeric:tabular-nums;color:var(--ink2)}
.skill{font-weight:600}
.mono{font-family:ui-monospace,"SF Mono",Menlo,monospace;font-size:11.5px}
.tag{display:inline-block;border-radius:999px;padding:1px 7px;font-size:10.5px;line-height:1.6;
     background:var(--chip);color:var(--ink2);white-space:nowrap}
.tag.must{background:color-mix(in srgb,var(--ok) 16%,transparent);color:var(--ok)}
.tag.nice{background:color-mix(in srgb,var(--acc) 14%,transparent);color:var(--acc)}
.tag.flag{background:color-mix(in srgb,var(--warn) 18%,transparent);color:var(--warn)}
.tag.edited{background:color-mix(in srgb,var(--bad) 15%,transparent);color:var(--bad)}
.bars{display:flex;gap:2px;align-items:center}
.b{height:9px;border-radius:2px;min-width:2px}
.b.jd{background:var(--ok)} .b.g{background:var(--acc)} .b.o{background:var(--ink3)}
.grp{color:var(--ink3);font-size:11px}
details.job{border:1px solid var(--line);border-radius:9px;background:var(--panel);margin-bottom:10px;
     overflow:hidden}
details.job>summary{cursor:pointer;list-style:none;padding:10px 13px;display:flex;gap:9px;
     align-items:baseline;font-weight:600}
details.job>summary::-webkit-details-marker{display:none}
summary .n{color:var(--ink3);font-weight:400;font-size:12px}
summary .fl{margin-left:auto;font-weight:400}
.wrap{overflow-x:auto}
.foot{position:fixed;left:0;right:0;bottom:0;background:var(--panel);border-top:1px solid var(--line);
     padding:9px 22px;display:flex;gap:9px;align-items:center;font-size:12.5px}
.foot .msg{color:var(--ink2)}
.hint{color:var(--ink3);font-size:11.5px}
</style>

<h1>데이터 점검판</h1>
<p class="sub">직무마다 어떤 역량을 왜 요구하는지 근거를 그대로 폅니다.
이상한 줄은 <b>필수 / 우대 / 제외</b>를 바꾸거나 <b>강도 배수</b>를 조절한 뒤
아래 <b>보정 내려받기</b>로 <code class="mono">data/overrides.json</code> 을 만들어 저장소에 두면
다음 산출부터 적용됩니다. <b>원본 수치는 덮어쓰지 않습니다.</b></p>

<div class="bar">
  <select id="job"><option value="">직무 전체</option></select>
  <select id="fam"><option value="">직군 전체</option><option>개발</option><option>디자인</option><option>기획</option></select>
  <button id="f-must" class="on">필수만</button>
  <button id="f-flag">의심되는 것만</button>
  <button id="f-edit">보정한 것만</button>
  <span class="sep"></span>
  <input type="search" id="q" placeholder="역량 이름 검색" size="16">
  <span class="count" id="count"></span>
</div>

<div id="list"></div>

<div class="foot">
  <button class="primary" id="save">보정 내려받기</button>
  <button id="reset">보정 전부 지우기</button>
  <span class="msg" id="msg"></span>
  <span class="hint" style="margin-left:auto" id="gen"></span>
</div>

<script id="payload" type="application/json">__PAYLOAD__</script>
<script>
const D = JSON.parse(document.getElementById('payload').textContent);
const ov = { ...(D.overrides || {}) };          // "jobId|skillId" -> {tier?, mul?}
const key = (r) => `${r.job}|${r.sid}`;
const st = { job:'', fam:'', must:true, flag:false, edit:false, q:'' };

document.getElementById('gen').textContent = `산출 ${D.generatedAt}`;
{
  const sel = document.getElementById('job');
  for (const j of D.jobs) {
    const o = document.createElement('option');
    o.value = j.id; o.textContent = `${j.title} (${j.n}건)`;
    sel.append(o);
  }
}

const fmt = (v, d=2) => v === null || v === undefined ? '–' : (+v).toFixed(d);

//  근거를 막대로 보여준다. 숫자만 늘어놓으면 어디서 온 값인지 한눈에 안 들어온다.
function bars(r) {
  const w = (v, k) => v ? `<span class="b ${k}" style="width:${Math.min(46, 3 + v * 3)}px"
      title="${k === 'jd' ? '공고' : k === 'g' ? '해설 글' : '공인 체계'} ${v}"></span>` : '';
  return `<span class="bars">${w(r.docFreq, 'jd')}${w(r.gAll, 'g')}${w(r.onet, 'o')}</span>`;
}

function rowHtml(r) {
  const o = ov[key(r)] || {};
  const tier = o.tier ?? (r.must ? 'required' : (r.tier === 'preferred' ? 'preferred' : 'other'));
  const edited = o.tier !== undefined || (o.mul !== undefined && o.mul !== 1);
  return `<tr data-k="${key(r)}">
    <td class="skill">${r.skill}
      ${r.group ? `<span class="grp">· ${r.group}</span>` : ''}
      ${edited ? '<span class="tag edited">보정됨</span>' : ''}
      ${r.flags.map((f) => `<span class="tag ${r.warn.includes(f) ? 'flag' : ''}">${f}</span>`)
        .join('')}</td>
    <td>${bars(r)}</td>
    <td class="num mono" title="자격요건 / 우대사항 절 등장">${r.jdReq}/${r.jdPre}</td>
    <td class="num mono" title="해설 글: 필수 / 우대 / 전체">${r.gReq}/${r.gPre}/${r.gAll}</td>
    <td class="num mono" title="O*NET 직업 수 / NCS 언급">${r.onet ?? '–'}${r.onetOf ? `/${r.onetOf}` : ''}</td>
    <td class="num mono">${fmt(r.lift)}</td>
    <td class="num mono">${fmt(r.importance, 3)}</td>
    <td class="num mono" title="그 직무 1위 대비">${Math.round(r.rel * 100)}%</td>
    <td class="num">${r.agree ?? '–'}</td>
    <td>
      <select data-act="tier">
        <option value="required" ${tier === 'required' ? 'selected' : ''}>필수</option>
        <option value="preferred" ${tier === 'preferred' ? 'selected' : ''}>우대</option>
        <option value="other" ${tier === 'other' ? 'selected' : ''}>—</option>
        <option value="exclude" ${tier === 'exclude' ? 'selected' : ''}>제외</option>
      </select>
    </td>
    <td><input type="number" data-act="mul" step="0.1" min="0" max="5" style="width:62px"
        value="${o.mul ?? 1}"></td>
  </tr>`;
}

function render() {
  const rows = D.rows.filter((r) =>
    (!st.job || r.job === st.job) && (!st.fam || r.family === st.fam)
    && (!st.must || r.must) && (!st.flag || r.warn.length)
    && (!st.edit || ov[key(r)])
    && (!st.q || r.skill.toLowerCase().includes(st.q)));

  const byJob = new Map();
  for (const r of rows) {
    if (!byJob.has(r.job)) byJob.set(r.job, []);
    byJob.get(r.job).push(r);
  }
  document.getElementById('count').textContent =
    `${rows.length.toLocaleString()}줄 · 보정 ${Object.keys(ov).length}건`;

  const head = `<thead><tr>
    <th>역량</th><th>근거</th><th>공고 필수/우대</th><th>해설 필수/우대/계</th><th>공인</th>
    <th>변별력</th><th>강도</th><th>1위 대비</th><th>출처</th><th>판정</th><th>배수</th></tr></thead>`;

  document.getElementById('list').innerHTML = [...byJob.entries()].map(([jid, rs]) => {
    const j = D.jobs.find((x) => x.id === jid);
    const nf = rs.filter((r) => r.warn.length).length;
    return `<details class="job" open>
      <summary>${j.title}<span class="n">${j.family} · 공고 ${j.n}건 · ${rs.length}줄</span>
        ${nf ? `<span class="fl tag flag">의심 ${nf}</span>` : ''}</summary>
      <div class="wrap"><table>${head}<tbody>${rs.map(rowHtml).join('')}</tbody></table></div>
    </details>`;
  }).join('') || '<p class="sub">조건에 맞는 줄이 없습니다.</p>';
}

document.getElementById('list').addEventListener('change', (e) => {
  const tr = e.target.closest('tr'); if (!tr) return;
  const k = tr.dataset.k;
  const cur = ov[k] || {};
  if (e.target.dataset.act === 'tier') {
    const v = e.target.value;
    const row = D.rows.find((r) => key(r) === k);
    const natural = row.must ? 'required' : (row.tier === 'preferred' ? 'preferred' : 'other');
    if (v === natural) delete cur.tier; else cur.tier = v;
  } else {
    const v = parseFloat(e.target.value);
    if (!v || v === 1) delete cur.mul; else cur.mul = v;
  }
  if (Object.keys(cur).length) ov[k] = cur; else delete ov[k];
  render();
});

for (const [id, k] of [['f-must','must'],['f-flag','flag'],['f-edit','edit']]) {
  document.getElementById(id).onclick = (e) => {
    st[k] = !st[k]; e.target.classList.toggle('on', st[k]); render();
  };
}
document.getElementById('job').onchange = (e) => { st.job = e.target.value; render(); };
document.getElementById('fam').onchange = (e) => { st.fam = e.target.value; render(); };
document.getElementById('q').oninput = (e) => { st.q = e.target.value.toLowerCase().trim(); render(); };

document.getElementById('save').onclick = () => {
  //  브라우저가 파일을 직접 저장하지 못하는 환경이 있어 화면에도 내용을 띄운다.
  const text = JSON.stringify(ov, null, 1);
  navigator.clipboard?.writeText(text).then(
    () => { document.getElementById('msg').textContent =
      `보정 ${Object.keys(ov).length}건을 복사했습니다 — data/overrides.json 에 붙여넣으세요.`; },
    () => { document.getElementById('msg').textContent = '복사 실패 — 아래 창에서 직접 복사하세요.'; });
  const w = document.createElement('textarea');
  w.value = text;
  w.style.cssText = 'position:fixed;inset:12% 12% 20%;z-index:9;padding:12px;font-family:monospace;font-size:12px';
  w.onblur = () => w.remove();
  document.body.append(w); w.focus(); w.select();
};
document.getElementById('reset').onclick = () => {
  if (!confirm('보정을 전부 지웁니다. 계속할까요?')) return;
  for (const k of Object.keys(ov)) delete ov[k];
  document.getElementById('msg').textContent = '보정을 지웠습니다. 내려받아야 파일에 반영됩니다.';
  render();
};

render();
</script>
"""

if __name__ == "__main__":
    run()
