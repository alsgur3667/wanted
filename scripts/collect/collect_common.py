"""수집 스크립트 공통 모듈 — 매니페스트 · robots 확인 · 예의 있는 요청.

원칙
  1) 수집 1건 = 매니페스트 1줄. source_url 은 예외 없이 남긴다.
  2) 기간 정보(posted_at/expires_at)가 없으면 None 으로 둔다. 추정해 채우지 않는다.
  3) robots.txt 를 확인하고, 같은 호스트에 연속 요청하지 않는다.
"""
from __future__ import annotations

import hashlib
import json
import os
import time
import urllib.robotparser as robotparser
from datetime import datetime, timezone, timedelta
from pathlib import Path
from urllib.parse import urlparse

import requests

RAW = Path(__file__).resolve().parents[2] / "data" / "raw"   # 수집 원본 (git 비추적)
VAULT = Path(r"C:\Users\user\wanted-data")          # 저장소 바깥 (개인정보·키)
MANIFEST = RAW / "_manifest.jsonl"

KST = timezone(timedelta(hours=9))
UA = "wanted-ai-championship-research/0.1 (student project; contact via GitHub)"
MIN_INTERVAL = 1.0                                  # 같은 호스트 최소 간격(초)

_last_hit: dict[str, float] = {}
_robots: dict[str, robotparser.RobotFileParser | None] = {}


# ---------------------------------------------------------------- 환경 변수
def load_env() -> dict[str, str]:
    """VAULT/.env 를 읽는다. 키 값은 로그에 찍지 않는다."""
    env: dict[str, str] = {}
    f = VAULT / ".env"
    if f.exists():
        for line in f.read_text(encoding="utf-8").splitlines():
            line = line.split("#", 1)[0].strip()
            if "=" in line:
                k, v = line.split("=", 1)
                if v.strip():
                    env[k.strip()] = v.strip()
    return env


def now_kst() -> str:
    return datetime.now(KST).isoformat(timespec="seconds")


def sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


# ---------------------------------------------------------------- robots
def robots_allowed(url: str) -> bool:
    """robots.txt 로 허용 여부를 확인한다. 읽을 수 없으면 보수적으로 True(공식 API 대상)."""
    p = urlparse(url)
    base = f"{p.scheme}://{p.netloc}"
    if base not in _robots:
        rp = robotparser.RobotFileParser()
        rp.set_url(base + "/robots.txt")
        try:
            rp.read()
        except Exception:
            rp = None
        _robots[base] = rp
    rp = _robots[base]
    return True if rp is None else rp.can_fetch(UA, url)


# ---------------------------------------------------------------- 요청
def polite_get(url: str, *, params=None, headers=None, timeout=20, retries=3):
    """호스트별 최소 간격을 지키며 GET. 실패 시 지수 백오프."""
    host = urlparse(url).netloc
    wait = MIN_INTERVAL - (time.monotonic() - _last_hit.get(host, 0.0))
    if wait > 0:
        time.sleep(wait)

    h = {"User-Agent": UA, "Accept": "application/json, text/html;q=0.8"}
    if headers:
        h.update(headers)

    last = None
    for attempt in range(retries):
        try:
            r = requests.get(url, params=params, headers=h, timeout=timeout)
            _last_hit[host] = time.monotonic()
            if r.status_code == 429 or 500 <= r.status_code < 600:
                last = r
                time.sleep(2 ** attempt)
                continue
            return r
        except requests.RequestException as e:
            last = e
            time.sleep(2 ** attempt)
    _last_hit[host] = time.monotonic()
    if isinstance(last, requests.Response):
        return last
    raise RuntimeError(f"GET 실패: {url} ({last})")


# ---------------------------------------------------------------- 매니페스트
def _seen() -> set[str]:
    if not MANIFEST.exists():
        return set()
    out = set()
    with MANIFEST.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rec = json.loads(line)
                out.add(rec.get("sha256", ""))
                out.add(rec.get("source_url", ""))
    out.discard("")
    return out


def next_id(prefix: str) -> str:
    n = sum(1 for _ in MANIFEST.open(encoding="utf-8")) if MANIFEST.exists() else 0
    return f"{prefix}_{n + 1:05d}"


def save(
    *,
    prefix: str,
    source: str,
    source_url: str,
    payload: dict,
    subdir: str,
    posted_at: str | None = None,
    expires_at: str | None = None,
    job_family: str | None = None,
    license_: str = "public-job-board",
    http_status: int | None = 200,
    seen: set[str] | None = None,
) -> str | None:
    """원본을 저장하고 매니페스트에 1줄 남긴다. 중복이면 None."""
    body = json.dumps(payload, ensure_ascii=False, sort_keys=True)
    digest = sha256(body)
    if seen is not None and (digest in seen or source_url in seen):
        return None

    rid = next_id(prefix)
    rel = Path(subdir) / f"{rid}.json"
    out = RAW / rel
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(body, encoding="utf-8")

    rec = {
        "id": rid,
        "source": source,
        "source_url": source_url,
        "collected_at": now_kst(),
        "posted_at": posted_at,
        "expires_at": expires_at,
        "job_family": job_family,
        "license": license_,
        "http_status": http_status,
        "sha256": digest,
        "raw_path": rel.as_posix(),
    }
    with MANIFEST.open("a", encoding="utf-8") as f:
        f.write(json.dumps(rec, ensure_ascii=False) + "\n")
    if seen is not None:
        seen.add(digest)
        seen.add(source_url)
    return rid


def load_seen() -> set[str]:
    return _seen()


def stats() -> dict:
    """매니페스트 요약."""
    if not MANIFEST.exists():
        return {"total": 0}
    by_source: dict[str, int] = {}
    by_family: dict[str, int] = {}
    dated = 0
    total = 0
    with MANIFEST.open(encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            r = json.loads(line)
            total += 1
            by_source[r["source"]] = by_source.get(r["source"], 0) + 1
            fam = r.get("job_family") or "미분류"
            by_family[fam] = by_family.get(fam, 0) + 1
            if r.get("posted_at"):
                dated += 1
    return {"total": total, "posted_at 있음": dated, "출처별": by_source, "직군별": by_family}


if __name__ == "__main__":
    print(json.dumps(stats(), ensure_ascii=False, indent=2))
