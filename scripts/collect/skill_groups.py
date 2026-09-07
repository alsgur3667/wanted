"""택일 관계인 역량 묶음 — "이 중 하나만 있으면 된다".

왜 필요한가
  요구 역량을 평평한 목록으로 두면 **양립할 수 없는 것을 동시에 요구**하게 된다.

    모바일 개발자 필수 = Android · Kotlin · iOS · UX/UI · MVVM

  8년차 iOS 개발자가 이 목록을 보면 Kotlin 이 '부족 역량'으로 뜬다. iOS 개발자가
  Kotlin 을 못 가진 것은 결함이 아니라 **다른 길을 간 것**이다.
  실제로 그 사람의 적합도가 47 로 나왔고 "요구 역량 5개 중 2개"라고 표시됐다.

근거 — 셋을 함께 봤다. 하나만으로는 못 가른다.
  ① 우리 공고 원문의 동시 등장률(자카드). 낮으면 같은 공고가 둘을 함께 요구하지 않는다.
  ② 웹에서 확인한 직무 정의. 예) 백엔드 공고 원문 "Modern Web Framework (Rails, Django,
     Node.js 등)으로 개발한 경력" — 대체 가능하다고 공고가 직접 적는다.
  ③ 우리가 모은 직무 해설 글 73건의 교차검증 결과(verified.json).

  ⚠️ ①만 쓰면 안 된다 — Docker/Kubernetes 는 겹침 33% 로 낮게 나오지만 택일이 아니라
     함께 쓰는 것이다. Photoshop/Illustrator 는 71% 로 보완 관계다. 숫자만으로는 못 가른다.

넣지 않은 것
  Docker · Kubernetes      함께 쓴다 (겹침 33% 인데도 보완 관계)
  Photoshop · Illustrator  함께 쓴다 (겹침 71%)
  React · TypeScript       함께 쓴다 (겹침 44%)
  Airflow · Spark          역할이 달라 함께 쓰는 경우가 많다 (겹침 42%)
  Java                     백엔드 언어이자 안드로이드 언어다. 모바일 묶음에 넣으면
                           백엔드 개발자가 모바일 자격을 얻는다. Kotlin 을 표지로 쓴다.
"""

GROUPS = {
    # 모바일 플랫폼 — iOS 와 Android 는 채용 자체가 갈린다.
    #   우리 공고 15건: Android 만 11 · iOS 만 1 · 둘 다 3   (Swift↔Kotlin 겹침 18%)
    #   웹: iOS = Swift/Objective-C · Xcode · UIKit/SwiftUI / Android = Kotlin/Java · Jetpack
    #   해설 글: React Native · Flutter 도 confirmed — 크로스플랫폼도 같은 자리를 메운다
    "mobile_platform": {
        "label": "모바일 플랫폼",
        "skills": ["iOS", "Swift", "Objective-C", "UIKit", "SwiftUI", "Xcode",
                   "Android", "Kotlin", "Jetpack",
                   "Flutter", "React Native", "Dart"],
    },
    # 프론트엔드 프레임워크 — 한 회사가 셋을 다 쓰지 않는다.
    #   우리 공고 26건: React↔Vue 19% · Vue↔Angular 8% · React↔Angular 29%
    "frontend_framework": {
        "label": "프론트엔드 프레임워크",
        "skills": ["React", "Vue", "Vue.js", "Angular", "Svelte", "Next.js", "Nuxt"],
    },
    # 백엔드 프레임워크 — 언어가 갈리면 프레임워크도 갈린다.
    #   우리 공고: Spring↔Django 0% · Spring↔FastAPI 0% · Spring↔Node.js 9%
    "backend_framework": {
        "label": "백엔드 프레임워크",
        "skills": ["Spring", "Spring Boot", "Django", "FastAPI", "Node.js",
                   "Express", "Ruby on Rails", "Laravel", "NestJS"],
    },
    # 서버 언어 — 백엔드는 언어가 갈린다. 하나를 깊게 쓰지 여럿을 같이 쓰지 않는다.
    #
    #   실측(설문 백엔드 14,614명) — Java 를 쓰는 사람이 37% 뿐이다.
    #     JavaScript 52% · Python 48% · Java 37% · C# 24% · Go 22% · PHP 16% · Rust 13%
    #   그런데 우리 백엔드 필수에 Java·Spring 이 박혀 있어 **63% 가 필수를 못 채운다.**
    #   실제로 C# 백엔드 개발자를 넣었더니 백엔드가 후보 4위 안에도 안 들었다.
    #
    #   모바일에서 iOS/Android 를 택일로 묶은 것과 같은 문제다. 언어도 마찬가지다.
    #   ⚠️ JavaScript·TypeScript 는 넣지 않는다 — 프론트와 공유해서, 넣으면
    #      프론트 개발자가 백엔드 언어 요구까지 채운 것으로 잡힌다.
    "backend_language": {
        "label": "서버 언어",
        #  ⚠️ Kotlin 을 넣지 않는다. 서버에도 쓰이지만 우리 사전에서는 **안드로이드의 표지**다.
        #     두 묶음에 함께 넣었더니 나중 것이 이겨서, Java 를 가진 사람이
        #     모바일 개발자의 Kotlin 요구를 '서버 언어' 자격으로 채웠다.
        #     화면 문구도 "Android·iOS 으로 서버 언어 요구를 충족" 이라는 말이 안 되는 문장이 됐다.
        "skills": ["Java", "C#", "Python", "Go", "Golang", "PHP", "Ruby",
                   "Rust", "Scala", "Elixir"],
    },
    # 클라우드 — 한 곳을 주로 쓴다. 겹치는 공고는 멀티클라우드거나 마이그레이션이다.
    #   우리 공고: AWS↔Azure 31% · AWS↔GCP 29%
    "cloud": {
        "label": "클라우드",
        "skills": ["AWS", "Azure", "GCP"],
    },
    # BI 도구 — 회사마다 하나를 쓴다. Looker↔Power BI 는 함께 나온 공고가 0건이다.
    "bi_tool": {
        "label": "BI 도구",
        "skills": ["Tableau", "Looker", "Power BI", "Redash", "Metabase", "Superset"],
    },
    # 화면 설계 도구 — Figma 가 사실상 표준이 됐고 나머지는 대체재다.
    #   Figma↔Sketch 0% · Figma↔Adobe XD 0%
    #   ⚠️ Photoshop·Illustrator 는 넣지 않는다. 겹침 71% 로 함께 쓰는 도구다.
    "ui_design_tool": {
        "label": "화면 설계 도구",
        "skills": ["Figma", "Sketch", "Adobe XD", "Zeplin", "Framer"],
    },
}


def build(skill_names: set[str]) -> dict:
    """사전에 실제로 있는 이름만 남겨 내보낸다."""
    #  한 역량이 두 묶음에 들면 안 된다. 앱은 skillId→묶음을 Map 하나로 만들어서
    #  나중에 넣은 쪽이 이긴다 — 조용히 엉뚱한 묶음으로 판정된다.
    seen = {}
    dup = []
    for key, g in GROUPS.items():
        for n in g["skills"]:
            if n in seen:
                dup.append(f"{n}: {seen[n]} · {key}")
            seen[n] = key
    if dup:
        raise SystemExit("한 역량이 두 묶음에 들어 있다 — 하나만 남겨라:\n  " + "\n  ".join(dup))

    out = {}
    for key, g in GROUPS.items():
        have = [s for s in g["skills"] if s in skill_names]
        if len(have) >= 2:                      # 하나뿐이면 택일이 성립하지 않는다
            out[key] = {"label": g["label"], "skills": have}
    return out
