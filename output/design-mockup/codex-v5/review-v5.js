Object.keys(decisions).forEach(key=>{decisions[key]='공통 아이보리 바탕과 흰색 패널을 적용했습니다. 같은 이미지·200px 높이·명암 기준의 상단 배너를 사용하며, 넓은 영역에 녹색을 넣지 않았습니다.'});
Object.assign(decisions,{
'login-personal':'프로젝트의 LoginJourney와 CareerMap을 직접 사용합니다. 나의 경험에서 5개 직무로 선이 뻗고 사라진 뒤, 겹치지 않는 새 위치·직무·강조 경로로 반복됩니다. 사진은 사용하지 않습니다.',
'login-employer':'동일한 기존 SVG에서 방향만 기업의 기존 설정을 유지합니다. 사방의 경험자가 중앙 Career Navi로 모입니다. Navi의 색상, 랜덤 위치·라벨·강조선과 일시정지를 유지합니다.',
'loading':'프로젝트의 RouteSearchLoader를 그대로 연결했습니다. 개인 로그인과 같은 SVG가 반복되고, 기존의 분석 문구가 순환합니다. 가운데 사진은 제거했습니다.',
'complete':'같은 RouteSearchLoader의 완료 상태입니다. 기존 최소 문구 순환 후 완료로 바뀌므로 처음 열면 약 4.5초 뒤 완료 상태가 표시됩니다. 자동 이동 없이 결과 보기 버튼을 사용합니다.',
'personal':'일반 화면과 동일한 상단 배너를 적용했습니다. 서비스 안내 이미지와 하단 산 배너는 원본을 유지하고, 오른쪽 안내의 녹색 바탕도 중립 색상으로 바꿨습니다.',
'employer':'기업 전용의 녹색 바탕과 진한 현황 박스를 제거했습니다. 개인과 동일한 바탕·패널·상단 배너를 사용하면서, 지원 현황과 검토 목록의 구성은 유지합니다.',
'results':'진한 녹색 출발점 박스를 흰색 요약 영역으로 바꿨습니다. 다른 화면과 같은 상단 이미지 배너를 적용하고, 경로 비교와 보완 역량은 동일한 위치에 유지합니다.',
'companies':'개인 경험 입력과 같은 상단 배너 이미지·높이·명암을 사용합니다. 하단 CTA도 개인 탐색과 같은 원본 산 배너로 통일했습니다.'
});
const liveScreens5=['login-personal','login-employer','loading','complete'];
const paintV4Base5=paint;
let observer5;
paint=function(){observer5?.disconnect();paintV4Base5();const live=liveScreens5.includes(current);document.getElementById('live').textContent=live?'애니메이션 크게 보기 ↗':'직접 열기 ↗';if(!live||mode!=='after')return;const width=mobile?390:1440,height=mobile?(current.startsWith('login')?1120:850):910;const host=document.getElementById('screenwrap');host.className='screenwrap'+(mobile?' mobile':'');host.innerHTML=`<div class="screenframe new"><label>개선 시안 v5 · 기존 프로젝트 SVG 실행 중</label><div class="livecanvas5"><iframe title="${document.getElementById('title').textContent} SVG 애니메이션 시안" src="index.html?capture=1#${current}" style="width:${width}px;height:${height}px"></iframe></div><div class="livecaption5"><span>반복·일시정지 동작을 직접 확인할 수 있습니다.</span><a href="shots/${current}${mobile?'-mobile':''}.png">정지 이미지 보기 ↗</a></div></div>`;const canvas=host.querySelector('.livecanvas5'),frame=host.querySelector('iframe');const resize=()=>{const scale=canvas.clientWidth/width;frame.style.transform=`scale(${scale})`;canvas.style.height=height*scale+'px'};observer5=new ResizeObserver(resize);observer5.observe(canvas);resize()};
display();
