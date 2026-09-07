"""가상 회사·공고 데이터의 참조·범위·표시 규칙을 검사한다."""

from __future__ import annotations

import json
from collections import Counter
from datetime import date
from pathlib import Path


REPO = Path(__file__).resolve().parents[2]
DATA = REPO / "data"
EXPECTED_COMPANIES = 18
EXPECTED_POSTINGS = 48
FORBIDDEN_NAMES = {"원티드랩", "네이버", "카카오", "쿠팡", "토스", "배달의민족", "당근"}


def load(name: str):
    return json.loads((DATA / name).read_text(encoding="utf-8"))


def run() -> None:
    companies = load("demo-companies.json")
    postings = load("demo-job-postings.json")
    meta = load("demo-company-meta.json")
    jobs = load("interim/jobs.json")
    skills = load("interim/skills.json")
    errors: list[str] = []

    def duplicate_ids(rows: list[dict]) -> list[str]:
        counts = Counter(r.get("id") for r in rows)
        return [str(k) for k, n in counts.items() if n > 1]

    if len(companies) != EXPECTED_COMPANIES:
        errors.append(f"회사 수 {len(companies)} (예상 {EXPECTED_COMPANIES})")
    if len(postings) != EXPECTED_POSTINGS:
        errors.append(f"공고 수 {len(postings)} (예상 {EXPECTED_POSTINGS})")
    if duplicate_ids(companies):
        errors.append(f"중복 회사 id: {duplicate_ids(companies)}")
    if duplicate_ids(postings):
        errors.append(f"중복 공고 id: {duplicate_ids(postings)}")

    company_ids = {c["id"] for c in companies}
    job_ids = {j["id"] for j in jobs}
    skill_ids = {s["id"] for s in skills}

    if meta.get("schemaVersion") != "1.0":
        errors.append("meta: schemaVersion must be 1.0")
    if meta.get("seed") != 20260907:
        errors.append("meta: unexpected deterministic seed")
    if meta.get("isSynthetic") is not True:
        errors.append("meta: isSynthetic must be true")
    if meta.get("replaceableContracts") != ["Company", "JobPosting"]:
        errors.append("meta: replaceable contracts are missing")
    if not meta.get("fieldModelSources"):
        errors.append("meta: field model sources are missing")

    for company in companies:
        if company.get("isSynthetic") is not True:
            errors.append(f"{company['id']}: isSynthetic 누락")
        if company.get("name") in FORBIDDEN_NAMES:
            errors.append(f"{company['id']}: 실존 주요 기업명 사용")
        if company.get("websiteUrl") is not None or company.get("imageUrls"):
            errors.append(f"{company['id']}: 가상 회사에 실제 URL/이미지 사용")
        if not company.get("synthesisBasis"):
            errors.append(f"{company['id']}: 생성 근거 누락")

    covered_jobs = set()
    for posting in postings:
        pid = posting["id"]
        if posting.get("companyId") not in company_ids:
            errors.append(f"{pid}: 없는 회사 참조")
        if posting.get("jobId") not in job_ids:
            errors.append(f"{pid}: 없는 직무 참조")
        else:
            covered_jobs.add(posting["jobId"])
        if posting.get("isSynthetic") is not True:
            errors.append(f"{pid}: isSynthetic 누락")
        if not posting.get("synthesisBasis"):
            errors.append(f"{pid}: 생성 근거 누락")
        for skill_id in posting.get("mustSkillIds", []) + posting.get("niceSkillIds", []):
            if skill_id not in skill_ids:
                errors.append(f"{pid}: 없는 스킬 {skill_id}")
        salary = posting.get("salary") or {}
        if salary.get("min") is not None and salary.get("max") is not None and salary["min"] > salary["max"]:
            errors.append(f"{pid}: 연봉 범위 역전")
        if posting.get("deadlineType") == "date":
            if not posting.get("deadline"):
                errors.append(f"{pid}: 날짜 마감인데 deadline 누락")
            else:
                date.fromisoformat(posting["deadline"])
        if posting.get("deadlineType") == "rolling" and posting.get("deadline") is not None:
            errors.append(f"{pid}: 상시채용인데 deadline 존재")

    missing_jobs = sorted(job_ids - covered_jobs)
    if missing_jobs:
        errors.append(f"공고가 없는 직무: {', '.join(missing_jobs)}")

    counts = Counter(p["jobId"] for p in postings)
    if meta.get("distribution", {}).get("postingsByJob") != dict(sorted(counts.items())):
        errors.append("meta: postingsByJob distribution does not match generated postings")

    if errors:
        raise SystemExit("가상 회사 데이터 오류\n- " + "\n- ".join(errors))

    print(f"통과: 가상 회사 {len(companies)}개 · 공고 {len(postings)}개 · 직무 {len(covered_jobs)}개")
    print(f"직무별 공고 최소 {min(counts.values())}개 · 최대 {max(counts.values())}개")


if __name__ == "__main__":
    run()
