"""기업용 가상 지원자·지원 이력의 계약과 참조 무결성을 검사한다."""

from __future__ import annotations

import json
from collections import Counter
from datetime import date
from pathlib import Path


REPO = Path(__file__).resolve().parents[2]
DATA = REPO / "data"
EXPECTED_CANDIDATES = 72
EXPECTED_APPLICATIONS = 288
EXPECTED_PER_POSTING = 6


def load(name: str):
    return json.loads((DATA / name).read_text(encoding="utf-8"))


def run() -> None:
    candidates = load("demo-employer-candidates.json")
    applications = load("demo-candidate-applications.json")
    meta = load("demo-employer-meta.json")
    postings = load("demo-job-postings.json")
    jobs = load("interim/jobs.json")
    skills = load("interim/skills.json")
    errors: list[str] = []

    candidate_ids = {candidate["id"] for candidate in candidates}
    posting_ids = {posting["id"] for posting in postings}
    job_ids = {job["id"] for job in jobs}
    skill_ids = {skill["id"] for skill in skills}

    if len(candidates) != EXPECTED_CANDIDATES:
        errors.append(f"지원자 {len(candidates)}명 (예상 {EXPECTED_CANDIDATES})")
    if len(applications) != EXPECTED_APPLICATIONS:
        errors.append(f"지원 이력 {len(applications)}건 (예상 {EXPECTED_APPLICATIONS})")
    if len(candidate_ids) != len(candidates):
        errors.append("중복 지원자 id")
    if len({application["id"] for application in applications}) != len(applications):
        errors.append("중복 지원 이력 id")

    for candidate in candidates:
        cid = candidate["id"]
        if candidate.get("currentJobId") not in job_ids:
            errors.append(f"{cid}: 없는 현재 직무")
        if candidate.get("isSynthetic") is not True or not candidate.get("synthesisBasis"):
            errors.append(f"{cid}: 가상 데이터 표시·근거 누락")
        if not candidate.get("summary") or not candidate.get("experienceHighlights"):
            errors.append(f"{cid}: 후보 설명 누락")
        candidate_skills = set(candidate.get("skillIds", []))
        unknown = candidate_skills - skill_ids
        if unknown:
            errors.append(f"{cid}: 없는 스킬 {sorted(unknown)}")
        evidence_skills = {row.get("skillId") for row in candidate.get("skillEvidence", [])}
        if not evidence_skills <= candidate_skills:
            errors.append(f"{cid}: 보유하지 않은 스킬의 근거")

    allowed_stages = {"new", "screening", "interview", "offer", "hold", "rejected"}
    for application in applications:
        aid = application["id"]
        if application.get("candidateId") not in candidate_ids:
            errors.append(f"{aid}: 없는 지원자")
        if application.get("postingId") not in posting_ids:
            errors.append(f"{aid}: 없는 공고")
        if application.get("stage") not in allowed_stages:
            errors.append(f"{aid}: 잘못된 전형 상태")
        if application.get("source") not in {"direct", "recommendation"}:
            errors.append(f"{aid}: 잘못된 지원 경로")
        if application.get("isSynthetic") is not True or not application.get("synthesisBasis"):
            errors.append(f"{aid}: 가상 데이터 표시·근거 누락")
        date.fromisoformat(application["appliedAt"])

    counts = Counter(application["postingId"] for application in applications)
    if set(counts) != posting_ids:
        errors.append("지원자가 없는 공고 존재")
    if any(count != EXPECTED_PER_POSTING for count in counts.values()):
        errors.append("공고별 지원자 수가 6명이 아님")
    if meta.get("seed") != 20260908 or meta.get("isSynthetic") is not True:
        errors.append("meta: 고정 시드 또는 가상 데이터 표시 오류")
    if meta.get("replaceableContracts") != ["EmployerCandidate", "CandidateApplication"]:
        errors.append("meta: 교체 가능 계약 누락")
    if meta.get("counts", {}).get("candidates") != len(candidates):
        errors.append("meta: 지원자 수 불일치")
    if meta.get("counts", {}).get("applications") != len(applications):
        errors.append("meta: 지원 이력 수 불일치")

    if errors:
        raise SystemExit("기업용 가상 데이터 오류\n- " + "\n- ".join(errors))

    print(f"통과: 가상 지원자 {len(candidates)}명 · 지원 이력 {len(applications)}건 · 공고 {len(counts)}개")


if __name__ == "__main__":
    run()
