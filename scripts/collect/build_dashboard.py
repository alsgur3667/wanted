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

탭 세 개
  A 직무 기준   그 직무가 무엇을 요구하는가
  B 역량 기준   그 역량이 어느 직무들에 걸쳐 있는가
                — 직무별로만 보면 "Python 이 8개 직무의 필수" 같은 것이 안 보인다
  C 기반 데이터  근거 수치를 직접 고치고, 줄·역량·직무를 넣고 지운다

무엇을 고칠 수 있나 — data/overrides.json 으로 내려받아 저장소에 두면 다음 산출부터 적용된다
  "jobId|skillId": {tier, mul, set:{jdReq,jdPre,gReq,gPre}}   판정·강도 배수·근거 수치
  "_add":    [{job, skill, tier, jdReq, jdPre}]               없던 줄 넣기 (없는 이름이면 역량도 새로 만든다)
  "_skills": {skillId: {name, drop}}                          역량 이름 고치기·지우기
  "_jobs":   {jobId:   {title, drop}}                         직무 이름 고치기·지우기

  적용 순서가 중요하다 — export_contract 가 세 번에 나눠 얹는다.
    (1) 이름·삭제·줄 추가·공고 건수 : 뒤의 계산에 들어가야 하므로 맨 앞
    (2) 해설 필수/우대             : 해설 합산이 그 칸을 덮어쓰므로 판정 직전
    (3) 필수/우대 판정·강도 배수     : 사람의 최종 판단이라 맨 끝

  사람이 '필수'로 지정한 줄에는 pinned 가 붙어 **강도 문턱(1위 대비 40%)을 타지 않는다.**
  그러지 않으면 임베디드의 RTOS 처럼 지정해도 목록에 안 나와, 손으로 고치는 의미가 없다.

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
            if m.get("tier") == "required" and (m.get("pinned") or imp(m) >= top * MUST_REL):
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
                "must": m.get("tier") == "required" and (m.get("pinned") or score >= top * MUST_REL),
                "pinned": bool(m.get("pinned")),
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

    used = defaultdict(int)
    for r in rows:
        used[r["sid"]] += 1

    payload = {
        "generatedAt": __import__("datetime").datetime.now().isoformat(timespec="seconds"),
        "jobs": [{"id": j["id"], "title": j["title"], "family": j["family"],
                  "n": j.get("sampleSize", 0)} for j in jobs],
        #  탭 C(기반 데이터 편집)에서 역량을 고르고 이름을 고치려면 사전 전체가 필요하다.
        "skills": [{"id": k, "name": v["name"], "type": v.get("type"),
                    "jobs": used.get(k, 0)} for k, v in sorted(
                        skills.items(), key=lambda x: -used.get(x[0], 0))],
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
/*  ⚠️ th 를 sticky 로 두면 안 된다.
    .wrap 이 overflow-x:auto 라 세로도 스크롤 컨테이너가 된다(한 축이 visible 이 아니면
    다른 축의 visible 은 auto 로 계산된다). 그러면 sticky 의 기준이 그 상자가 되어
    top:52px 만큼 **표 안에서 아래로 밀리고**, 머리글이 첫 행들을 덮는다. 실제로 그랬다.
    직무마다 카드가 따로 있어 표가 길지 않으니 머리글은 그냥 제자리에 둔다.  */
th{position:static;background:var(--chip);text-align:left;font-weight:600;color:var(--ink2);
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

<style>
.tabs{display:flex;gap:6px;margin:0 0 12px}
.tabs button{padding:6px 13px;font-size:13px}
h2{font-size:14px;margin:0 0 5px;letter-spacing:-.01em}
.card{border:1px solid var(--line);border-radius:9px;background:var(--panel);
      padding:13px 14px;margin-bottom:12px}
.note{color:var(--ink2);font-size:12px;margin:0 0 10px;max-width:82ch}
.form{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:10px}
tr.dropped td{opacity:.42;text-decoration:line-through}
</style>

<h1>데이터 점검판</h1>
<p class="sub">직무마다 어떤 역량을 왜 요구하는지 근거를 그대로 폅니다.
화면에서 고친 것은 <b>보정 내려받기</b>로 <code class="mono">data/overrides.json</code> 을 만들어
저장소에 두면 다음 산출부터 적용됩니다. <b>원본 수치는 덮어쓰지 않습니다.</b></p>

<div class="tabs">
  <button data-tab="A" class="on">A · 직무 기준</button>
  <button data-tab="B">B · 역량 기준</button>
  <button data-tab="C">C · 기반 데이터 편집</button>
</div>

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

<div id="paneA"></div>
<div id="paneB" hidden></div>

<div id="paneC" hidden>
  <div class="card">
    <h2>줄의 기반 수치 고치기</h2>
    <p class="note">공고 자격요건/우대 건수와 해설 글의 필수/우대 판정을 직접 넣습니다.
      비워 두면 원본 값을 그대로 씁니다. 이 값들은 <b>필수/우대 판정과 강도를 다시 계산하는 데</b> 쓰입니다.
      줄이 많아 위 칸에서 직무나 역량으로 좁힌 뒤 고치세요.</p>
    <div id="editRows"></div>
  </div>

  <div class="card">
    <h2>줄 추가</h2>
    <p class="note">공고에도 해설에도 안 나왔지만 그 직무에 필요한 것을 손으로 넣습니다.
      역량 칸에 사전에 없는 이름을 적으면 새 역량으로 만듭니다.</p>
    <div class="form">
      <select id="addJob"></select>
      <input id="addSkill" list="skillNames" placeholder="역량 이름" size="18">
      <datalist id="skillNames"></datalist>
      <select id="addTier"><option value="required">필수</option><option value="preferred">우대</option></select>
      <input id="addJdReq" type="number" min="0" step="1" placeholder="공고필수" style="width:88px">
      <input id="addJdPre" type="number" min="0" step="1" placeholder="공고우대" style="width:88px">
      <button id="addRow">추가</button>
    </div>
    <div id="addList"></div>
  </div>

  <div class="card">
    <h2>역량 이름 고치기 · 지우기</h2>
    <p class="note">이름을 고치면 그 역량이 붙은 모든 직무에서 함께 바뀝니다.
      지우면 계약에서 통째로 빠집니다 — 회사명이나 잘못 뽑힌 말에 씁니다.</p>
    <div class="form"><input type="search" id="qs" placeholder="역량 검색" size="18">
      <span class="hint">많이 쓰인 것부터 120개까지 보입니다</span></div>
    <div id="skillList"></div>
  </div>

  <div class="card">
    <h2>직무 이름 고치기 · 지우기</h2>
    <div id="jobList"></div>
  </div>
</div>

<div class="foot">
  <button class="primary" id="save">보정 내려받기</button>
  <button id="reset">보정 전부 지우기</button>
  <span class="msg" id="msg"></span>
  <span class="hint" style="margin-left:auto" id="gen"></span>
</div>

<script id="payload" type="application/json">__PAYLOAD__</script>
<script>
const D = JSON.parse(document.getElementById('payload').textContent);

//  보정 파일의 모양
//    "jobId|skillId" : {tier?, mul?, set?:{jdReq,jdPre,gReq,gPre}}   줄 하나를 고침
//    "_add"          : [{job, skill, tier, jdReq, jdPre}]            없던 줄을 넣음
//    "_skills"       : {skillId: {name?, drop?}}                     역량 이름·삭제
//    "_jobs"         : {jobId:   {title?, drop?}}                    직무 이름·삭제
const ov = { ...(D.overrides || {}) };
if (!Array.isArray(ov._add)) ov._add = [];
if (!ov._skills) ov._skills = {};
if (!ov._jobs) ov._jobs = {};

const key = (r) => `${r.job}|${r.sid}`;
const st = { tab: 'A', job: '', fam: '', must: true, flag: false, edit: false, q: '', qs: '' };
const $ = (id) => document.getElementById(id);
const ESCMAP = { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' };
const esc = (s) => String(s).replace(/[<>&"]/g, (c) => ESCMAP[c]);
const fmt = (v, d = 2) => (v === null || v === undefined ? '–' : (+v).toFixed(d));

$('gen').textContent = `산출 ${D.generatedAt}`;
const jobTitle = (id) => ov._jobs[id]?.title || (D.jobs.find((j) => j.id === id)?.title ?? id);
const skillName = (r) => ov._skills[r.sid]?.name || r.skill;

for (const j of D.jobs) {
  for (const sel of [$('job'), $('addJob')]) {
    const o = document.createElement('option');
    o.value = j.id; o.textContent = `${j.title} (${j.n}건)`;
    sel.append(o);
  }
}
$('skillNames').innerHTML = D.skills.map((s) => `<option value="${esc(s.name)}">`).join('');

//  근거를 막대로 보여준다. 숫자만 늘어놓으면 어디서 온 값인지 한눈에 안 들어온다.
function bars(r) {
  const w = (v, k) => (v ? `<span class="b ${k}" style="width:${Math.min(46, 3 + v * 3)}px"
      title="${k === 'jd' ? '공고' : k === 'g' ? '해설 글' : '공인 체계'} ${v}"></span>` : '');
  return `<span class="bars">${w(r.docFreq, 'jd')}${w(r.gAll, 'g')}${w(r.onet, 'o')}</span>`;
}

const naturalTier = (r) => (r.must ? 'required' : (r.tier === 'preferred' ? 'preferred' : 'other'));
const isEdited = (k) => {
  const o = ov[k];
  if (!o) return false;
  return o.tier !== undefined || (o.mul !== undefined && o.mul !== 1) || !!o.set;
};

//  판정·배수 칸 — 탭 A 와 B 가 같이 쓴다
function editCells(r) {
  const o = ov[key(r)] || {};
  const tier = o.tier ?? naturalTier(r);
  const sel = (v, t) => `<option value="${v}" ${tier === v ? 'selected' : ''}>${t}</option>`;
  return `<td><select data-act="tier">${sel('required', '필수')}${sel('preferred', '우대')}
      ${sel('other', '—')}${sel('exclude', '제외')}</select></td>
    <td><input type="number" data-act="mul" step="0.1" min="0" max="5" style="width:62px"
        value="${o.mul ?? 1}"></td>`;
}

function tags(r) {
  return `${isEdited(key(r)) ? '<span class="tag edited">보정됨</span>' : ''}
    ${r.flags.map((f) => `<span class="tag ${r.warn.includes(f) ? 'flag' : ''}">${f}</span>`).join('')}`;
}

function evidenceCells(r) {
  return `<td>${bars(r)}</td>
    <td class="num mono" title="자격요건 / 우대사항 절 등장">${r.jdReq}/${r.jdPre}</td>
    <td class="num mono" title="해설 글: 필수 / 우대 / 전체">${r.gReq}/${r.gPre}/${r.gAll}</td>
    <td class="num mono" title="O*NET 직업 수 / NCS 언급">${r.onet ?? '–'}${r.onetOf ? `/${r.onetOf}` : ''}</td>
    <td class="num mono">${fmt(r.lift)}</td>
    <td class="num mono">${fmt(r.importance, 3)}</td>
    <td class="num mono" title="그 직무 1위 대비">${Math.round(r.rel * 100)}%</td>
    <td class="num">${r.agree ?? '–'}</td>`;
}

const EV_HEAD = `<th>근거</th><th>공고 필수/우대</th><th>해설 필수/우대/계</th><th>공인</th>
  <th>변별력</th><th>강도</th><th>1위 대비</th><th>출처</th><th>판정</th><th>배수</th>`;

function visible() {
  return D.rows.filter((r) => !ov._jobs[r.job]?.drop && !ov._skills[r.sid]?.drop
    && (!st.job || r.job === st.job) && (!st.fam || r.family === st.fam)
    && (!st.must || r.must) && (!st.flag || r.warn.length)
    && (!st.edit || isEdited(key(r)))
    && (!st.q || skillName(r).toLowerCase().includes(st.q)));
}

// ── 탭 A · 직무 기준 ────────────────────────────────────────────────
function renderA(rows) {
  const byJob = new Map();
  for (const r of rows) {
    if (!byJob.has(r.job)) byJob.set(r.job, []);
    byJob.get(r.job).push(r);
  }
  const head = `<thead><tr><th>역량</th>${EV_HEAD}</tr></thead>`;
  $('paneA').innerHTML = [...byJob.entries()].map(([jid, rs]) => {
    const j = D.jobs.find((x) => x.id === jid);
    const nf = rs.filter((r) => r.warn.length).length;
    const body = rs.map((r) => `<tr data-k="${key(r)}">
      <td class="skill">${esc(skillName(r))}
        ${r.group ? `<span class="grp">· ${r.group}</span>` : ''}${tags(r)}</td>
      ${evidenceCells(r)}${editCells(r)}</tr>`).join('');
    return `<details class="job" open>
      <summary>${esc(jobTitle(jid))}<span class="n">${j.family} · 공고 ${j.n}건 · ${rs.length}줄</span>
        ${nf ? `<span class="fl tag flag">의심 ${nf}</span>` : ''}</summary>
      <div class="wrap"><table>${head}<tbody>${body}</tbody></table></div>
    </details>`;
  }).join('') || '<p class="sub">조건에 맞는 줄이 없습니다.</p>';
}

// ── 탭 B · 역량 기준 ────────────────────────────────────────────────
//
//  같은 역량이 어느 직무들에 걸쳐 있는지 본다. 직무별로만 보면
//  "Python 이 8개 직무의 필수"  같은 것이 눈에 들어오지 않는다.
function renderB(rows) {
  const bySkill = new Map();
  for (const r of rows) {
    if (!bySkill.has(r.sid)) bySkill.set(r.sid, []);
    bySkill.get(r.sid).push(r);
  }
  const head = `<thead><tr><th>직무</th>${EV_HEAD}</tr></thead>`;
  const order = [...bySkill.entries()]
    .sort((a, b) => b[1].length - a[1].length || a[1][0].skill.localeCompare(b[1][0].skill));
  $('paneB').innerHTML = order.map(([sid, rs]) => {
    const nMust = rs.filter((r) => r.must).length;
    const s = D.skills.find((x) => x.id === sid);
    const body = [...rs].sort((a, b) => b.rel - a.rel).map((r) => `<tr data-k="${key(r)}">
      <td class="skill">${esc(jobTitle(r.job))}
        <span class="grp">· ${r.family} · 공고 ${r.n}건</span>
        ${r.must ? '<span class="tag must">필수</span>' : ''}${tags(r)}</td>
      ${evidenceCells(r)}${editCells(r)}</tr>`).join('');
    return `<details class="job" ${order.length <= 12 ? 'open' : ''}>
      <summary>${esc(skillName(rs[0]))}
        <span class="n">${s?.type ?? ''} · 직무 ${rs.length}개${nMust ? ` · 필수 ${nMust}개` : ''}
          ${rs[0].group ? `· ${rs[0].group}` : ''}</span>
        ${nMust >= 8 ? '<span class="fl tag flag">범용 — 변별력 낮음</span>' : ''}</summary>
      <div class="wrap"><table>${head}<tbody>${body}</tbody></table></div>
    </details>`;
  }).join('') || '<p class="sub">조건에 맞는 줄이 없습니다.</p>';
}

// ── 탭 C · 기반 데이터 편집 ──────────────────────────────────────────
function renderC(rows) {
  //  1,400줄을 한꺼번에 입력칸으로 그리면 화면이 못 버틴다. 좁혀 놓고 고치게 한다.
  const narrowed = st.job || st.q || st.flag || st.edit;
  const rs = narrowed ? rows.slice(0, 300) : rows.filter((r) => r.warn.length || isEdited(key(r)));
  const editBody = rs.map((r) => {
    const set = (ov[key(r)] || {}).set || {};
    const box = (f, v) => `<td><input type="number" min="0" step="1" style="width:76px"
      data-set="${f}" value="${set[f] ?? ''}" placeholder="${v}"></td>`;
    return `<tr data-k="${key(r)}">
      <td>${esc(jobTitle(r.job))}</td>
      <td class="skill">${esc(skillName(r))}${tags(r)}</td>
      ${box('jdReq', r.jdReq)}${box('jdPre', r.jdPre)}${box('gReq', r.gReq)}${box('gPre', r.gPre)}
      <td class="num mono">공고 ${r.jdReq}/${r.jdPre} · 해설 ${r.gReq}/${r.gPre}</td>
    </tr>`;
  }).join('');
  $('editRows').innerHTML = rs.length
    ? `<div class="wrap"><table>
        <thead><tr><th>직무</th><th>역량</th><th>공고 필수</th><th>공고 우대</th>
          <th>해설 필수</th><th>해설 우대</th><th>원래 값</th></tr></thead>
        <tbody>${editBody}</tbody></table></div>`
    : `<p class="note">${narrowed ? '조건에 맞는 줄이 없습니다.'
      : '위 칸에서 직무나 역량을 골라 좁히면 그 줄들이 여기 나옵니다. (지금은 의심·보정된 줄만)'}</p>`;

  $('addList').innerHTML = ov._add.length
    ? `<div class="wrap"><table>
        <thead><tr><th>직무</th><th>역량</th><th>판정</th><th>공고 필수/우대</th><th></th></tr></thead>
        <tbody>${ov._add.map((a, i) => `<tr>
          <td>${esc(jobTitle(a.job))}</td><td class="skill">${esc(a.skill)}</td>
          <td>${a.tier === 'required' ? '필수' : '우대'}</td>
          <td class="num mono">${a.jdReq || 0}/${a.jdPre || 0}</td>
          <td><button data-del-add="${i}">지우기</button></td></tr>`).join('')}</tbody></table></div>`
    : '';

  const list = D.skills.filter((s) => !st.qs || s.name.toLowerCase().includes(st.qs)).slice(0, 120);
  $('skillList').innerHTML = `<div class="wrap"><table>
    <thead><tr><th>역량</th><th>유형</th><th>붙은 직무</th><th>이름 고치기</th><th></th></tr></thead>
    <tbody>${list.map((s) => {
    const o = ov._skills[s.id] || {};
    return `<tr data-sid="${s.id}" class="${o.drop ? 'dropped' : ''}">
      <td class="skill">${esc(s.name)}</td><td class="grp">${s.type ?? ''}</td>
      <td class="num">${s.jobs}</td>
      <td><input data-skill-name value="${esc(o.name ?? '')}" placeholder="${esc(s.name)}" size="16"></td>
      <td><button data-skill-drop>${o.drop ? '되돌리기' : '지우기'}</button></td></tr>`;
  }).join('')}</tbody></table></div>`;

  $('jobList').innerHTML = `<div class="wrap"><table>
    <thead><tr><th>직무</th><th>직군</th><th>공고</th><th>이름 고치기</th><th></th></tr></thead>
    <tbody>${D.jobs.map((j) => {
    const o = ov._jobs[j.id] || {};
    return `<tr data-jid="${j.id}" class="${o.drop ? 'dropped' : ''}">
      <td class="skill">${esc(j.title)}</td><td class="grp">${j.family}</td>
      <td class="num">${j.n}</td>
      <td><input data-job-title value="${esc(o.title ?? '')}" placeholder="${esc(j.title)}" size="18"></td>
      <td><button data-job-drop>${o.drop ? '되돌리기' : '지우기'}</button></td></tr>`;
  }).join('')}</tbody></table></div>`;
}

function render() {
  const rows = visible();
  const nOv = Object.keys(ov).filter((k) => !k.startsWith('_')).length
    + ov._add.length + Object.keys(ov._skills).length + Object.keys(ov._jobs).length;
  $('count').textContent = `${rows.length.toLocaleString()}줄 · 보정 ${nOv}건`;
  for (const t of ['A', 'B', 'C']) $('pane' + t).hidden = st.tab !== t;
  if (st.tab === 'A') renderA(rows);
  else if (st.tab === 'B') renderB(rows);
  else renderC(rows);
}

// ── 입력 처리 ────────────────────────────────────────────────────────
function put(k, patch) {
  const cur = ov[k] || {};
  Object.assign(cur, patch);
  for (const f of Object.keys(cur)) {
    if (cur[f] === undefined) delete cur[f];
  }
  if (Object.keys(cur).length) ov[k] = cur; else delete ov[k];
}

document.body.addEventListener('change', (e) => {
  const t = e.target;
  const tr = t.closest('tr');
  if (tr && tr.dataset.k) {
    const k = tr.dataset.k;
    const row = D.rows.find((r) => key(r) === k);
    if (t.dataset.act === 'tier') {
      put(k, { tier: t.value === naturalTier(row) ? undefined : t.value });
    } else if (t.dataset.act === 'mul') {
      const v = parseFloat(t.value);
      put(k, { mul: (!v || v === 1) ? undefined : v });
    } else if (t.dataset.set) {
      const set = { ...((ov[k] || {}).set || {}) };
      const v = t.value.trim();
      if (v === '') delete set[t.dataset.set];
      else set[t.dataset.set] = Math.max(0, parseInt(v, 10) || 0);
      put(k, { set: Object.keys(set).length ? set : undefined });
    }
    render();
    return;
  }
  if (tr && tr.dataset.sid && t.hasAttribute('data-skill-name')) {
    const sid = tr.dataset.sid;
    const v = t.value.trim();
    const o = { ...(ov._skills[sid] || {}) };
    if (v) o.name = v; else delete o.name;
    if (Object.keys(o).length) ov._skills[sid] = o; else delete ov._skills[sid];
    render();
    return;
  }
  if (tr && tr.dataset.jid && t.hasAttribute('data-job-title')) {
    const jid = tr.dataset.jid;
    const v = t.value.trim();
    const o = { ...(ov._jobs[jid] || {}) };
    if (v) o.title = v; else delete o.title;
    if (Object.keys(o).length) ov._jobs[jid] = o; else delete ov._jobs[jid];
    render();
  }
});

document.body.addEventListener('click', (e) => {
  const t = e.target;
  if (t.dataset.tab) {
    st.tab = t.dataset.tab;
    for (const b of document.querySelectorAll('.tabs button')) b.classList.toggle('on', b === t);
    render();
    return;
  }
  if (t.hasAttribute('data-skill-drop')) {
    const sid = t.closest('tr').dataset.sid;
    const o = { ...(ov._skills[sid] || {}) };
    if (o.drop) delete o.drop; else o.drop = true;
    if (Object.keys(o).length) ov._skills[sid] = o; else delete ov._skills[sid];
    render();
    return;
  }
  if (t.hasAttribute('data-job-drop')) {
    const jid = t.closest('tr').dataset.jid;
    const o = { ...(ov._jobs[jid] || {}) };
    if (o.drop) delete o.drop; else o.drop = true;
    if (Object.keys(o).length) ov._jobs[jid] = o; else delete ov._jobs[jid];
    render();
    return;
  }
  if (t.dataset.delAdd !== undefined) {
    ov._add.splice(+t.dataset.delAdd, 1);
    render();
  }
});

$('addRow').onclick = () => {
  const name = $('addSkill').value.trim();
  if (!name) { $('msg').textContent = '역량 이름을 적으세요.'; return; }
  ov._add.push({
    job: $('addJob').value, skill: name, tier: $('addTier').value,
    jdReq: parseInt($('addJdReq').value, 10) || 0,
    jdPre: parseInt($('addJdPre').value, 10) || 0,
  });
  $('addSkill').value = ''; $('addJdReq').value = ''; $('addJdPre').value = '';
  $('msg').textContent = `${name} 을(를) 넣었습니다. 내려받아야 파일에 반영됩니다.`;
  render();
};

for (const [id, k] of [['f-must', 'must'], ['f-flag', 'flag'], ['f-edit', 'edit']]) {
  $(id).onclick = (e) => { st[k] = !st[k]; e.target.classList.toggle('on', st[k]); render(); };
}
$('job').onchange = (e) => { st.job = e.target.value; render(); };
$('fam').onchange = (e) => { st.fam = e.target.value; render(); };
$('q').oninput = (e) => { st.q = e.target.value.toLowerCase().trim(); render(); };
$('qs').oninput = (e) => { st.qs = e.target.value.toLowerCase().trim(); render(); };

function clean() {
  const out = {};
  for (const [k, v] of Object.entries(ov)) {
    if (k === '_add') { if (v.length) out._add = v; continue; }
    if (k === '_skills' || k === '_jobs') { if (Object.keys(v).length) out[k] = v; continue; }
    out[k] = v;
  }
  return out;
}

$('save').onclick = () => {
  //  브라우저가 파일을 직접 저장하지 못하는 환경이 있어 화면에도 내용을 띄운다.
  const text = JSON.stringify(clean(), null, 1);
  navigator.clipboard?.writeText(text).then(
    () => { $('msg').textContent = '보정을 복사했습니다 — data/overrides.json 에 붙여넣으세요.'; },
    () => { $('msg').textContent = '복사 실패 — 아래 창에서 직접 복사하세요.'; });
  const w = document.createElement('textarea');
  w.value = text;
  w.style.cssText = 'position:fixed;inset:12% 12% 20%;z-index:9;padding:12px;font-family:monospace;font-size:12px';
  w.onblur = () => w.remove();
  document.body.append(w);
  w.focus();
  w.select();
};
$('reset').onclick = () => {
  if (!confirm('보정을 전부 지웁니다. 계속할까요?')) return;
  for (const k of Object.keys(ov)) delete ov[k];
  ov._add = []; ov._skills = {}; ov._jobs = {};
  $('msg').textContent = '보정을 지웠습니다. 내려받아야 파일에 반영됩니다.';
  render();
};

render();
</script>
"""

if __name__ == "__main__":
    run()
