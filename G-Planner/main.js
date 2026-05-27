/**
 * G-Planner - 통합 메인 자바스크립트 (1주차 ~ 3주차 고도화 완료)
 */

// [글로벌 상태 관리] 현재 달력 화면에 표시할 연도와 월 (기본값: 2026년 5월)
let currentYear = 2026; 
let currentMonth = 4;   // JavaScript Date 객체에서 5월은 index 4입니다 (0부터 시작)

// [가상 데이터 셋업] IGDB API 연동 전 기능 검증을 위한 샘플 게임 배열
const SAMPLE_GAMES = [
    { id: "stardew", title: "스타듀밸리", score: 89 },
    { id: "witcher", title: "위쳐 3: 와일드 헌트", score: 93 },
    { id: "rimworld", title: "림월드", score: 87 },
    { id: "dontstarve", title: "Don't Starve", score: 86 },
    { id: "cyberpunk", title: "사이버펑크 2077", score: 86 }
];

document.addEventListener("DOMContentLoaded", () => {
    initTheme();          // 테마 상태 로드 및 초기화
    setupThemeToggle();   // 테마 토글 버튼 이벤트 바인딩

    // 현재 열린 페이지의 파일명 분석 후 기능 분기 실행
    const path = window.location.pathname;
    const page = path.substring(path.lastIndexOf("/") + 1);

    if (page === "index.html" || page === "") {
        initCalendar(); // 달력 동적 생성 및 월 이동 활성화
    } else if (page === "recommend.html") {
        initRecommendPage(); // 게임 검색 및 추천 슬롯 제어
    } else if (page === "schedule_form.html") {
        initFormPage(); // 스케줄 등록 폼 제어
    }
});

/* ==========================================================================
   [테마 제어] 다크모드 / 라이트모드 토글 및 LocalStorage 상시 유지 관리
   ========================================================================== */
function initTheme() {
    const savedTheme = localStorage.getItem("gplanner-theme") || "dark";
    if (savedTheme === "light") {
        document.body.classList.add("light-mode");
        updateThemeButtonText("☀️ 라이트모드");
    } else {
        document.body.classList.remove("light-mode");
        updateThemeButtonText("🌙 다크모드");
    }
}

function setupThemeToggle() {
    const toggleBtn = document.getElementById("darkModeBtn");
    if (!toggleBtn) return;

    toggleBtn.addEventListener("click", () => {
        const isLight = document.body.classList.toggle("light-mode");
        if (isLight) {
            localStorage.setItem("gplanner-theme", "light");
            updateThemeButtonText("☀️ 라이트모드");
        } else {
            localStorage.setItem("gplanner-theme", "dark");
            updateThemeButtonText("🌙 다크모드");
        }
    });
}

function updateThemeButtonText(text) {
    const toggleBtn = document.getElementById("darkModeBtn");
    if (toggleBtn) toggleBtn.innerText = text;
}

/* ==========================================================================
   [스토리지 유틸] LocalStorage 데이터 입출력 함수
   ========================================================================== */
function getSchedulesFromStorage() {
    return JSON.parse(localStorage.getItem("gplanner-schedules")) || [];
}

function saveScheduleToStorage(schedules) {
    localStorage.setItem("gplanner-schedules", JSON.stringify(schedules));
}

// 날짜 비교 시 시/분/초 오차를 제거하기 위한 시간 초기화 함수
function resetTime(dateObj) {
    return new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
}


/* ==========================================================================
   [메인 페이지] 달력 동적 생성 및 앞뒤 월 이동 제어 엔진 (index.html)
   ========================================================================== */
function initCalendar() {
    const prevBtn = document.getElementById("prevMonthBtn");
    const nextBtn = document.getElementById("nextMonthBtn");

    if (!prevBtn || !nextBtn) return;

    // 초기 달력 렌더링 호출
    renderCalendar();

    // 이전 달 이동 버튼 클릭 이벤트
    prevBtn.addEventListener("click", () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        renderCalendar();
    });

    // 다음 달 이동 버튼 클릭 이벤트
    nextBtn.addEventListener("click", () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        renderCalendar();
    });
}

function renderCalendar() {
    const calendarTitle = document.getElementById("calendarTitle");
    const calendarGrid = document.getElementById("calendarGrid");
    if (!calendarGrid) return;

    // 1. 헤더 연/월 타이틀 화면 갱신
    calendarTitle.innerText = `${currentYear}년 ${currentMonth + 1}월`;

    // 2. 기존에 동적 생성되었던 날짜 셀(.calendar-cell)만 깔끔하게 제거 (요일 헤더는 유지)
    const existingCells = calendarGrid.querySelectorAll(".calendar-cell");
    existingCells.forEach(cell => cell.remove());

    // 3. 이번 달의 첫 번째 날 요일 인덱스 및 이번 달의 총 일수(마지막 날짜) 계산
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0(일) ~ 6(토)
    const lastDate = new Date(currentYear, currentMonth + 1, 0).getDate();  // 이번 달의 마지막 날짜 (30 또는 31)

    // 4. Grid 시작 지점의 공백 칸(Dummy 셀) 채우기
    for (let i = 0; i < firstDayIndex; i++) {
        const dummyCell = document.createElement("div");
        dummyCell.className = "calendar-cell dummy";
        calendarGrid.appendChild(dummyCell);
    }

    // 5. 이번 달 날짜 셀 생성 및 일정 데이터 매칭 바인딩
    const schedules = getSchedulesFromStorage();

    for (let date = 1; date <= lastDate; date++) {
        const cell = document.createElement("div");
        cell.className = "calendar-cell";

        const dayNumSpan = document.createElement("span");
        dayNumSpan.className = "day-num";
        dayNumSpan.innerText = date;

        // 일요일 요일인 경우 빨간색 지정을 위한 클래스 분기 추가
        const currentDayOfWeek = new Date(currentYear, currentMonth, date).getDay();
        if (currentDayOfWeek === 0) {
            dayNumSpan.classList.add("sun");
        }

        cell.appendChild(dayNumSpan);

        // 6. 스토리지 내 일정 탐색: 현재 생성 중인 날짜가 스케줄 기간 내에 포함되는지 검증
        schedules.forEach(item => {
            const itemStartDate = new Date(item.startDate);
            const itemEndDate = new Date(item.endDate);
            const currentCellDate = new Date(currentYear, currentMonth, date);

            // 유순한 날짜 객체 비교를 통해 범위 내 포함 시 동적으로 스티커 생성 및 추가
            if (currentCellDate >= resetTime(itemStartDate) && currentCellDate <= resetTime(itemEndDate)) {
                const tagNode = document.createElement("div");
                tagNode.className = "game-tag";
                tagNode.innerText = `🎮 ${item.gameTitle}`;
                cell.appendChild(tagNode);
            }
        });

        calendarGrid.appendChild(cell);
    }
}


/* ==========================================================================
   [추천 페이지] 일정 추가 및 슬롯 회전 액션 제어 (recommend.html)
   ========================================================================== */
function initRecommendPage() {
    // "일정에 추가" 버튼 클릭 시 처리 (이벤트 위임 패턴 적용)
    document.body.addEventListener("click", (e) => {
        if (e.target && e.target.classList.contains("add-sched-btn")) {
            const card = e.target.closest(".game-card");
            const title = card.querySelector("h4").innerText.replace("타이틀: ", "").trim();
            
            // 데이터 공유용 브라우저 세션 스토리지에 임시 보관 후 양식 페이지로 래핑 전환
            sessionStorage.setItem("selected-game-title", title);
            alert(`[${title}] 일정을 추가합니다. 플레이 등록 화면으로 전환합니다.`);
            window.location.href = "schedule_form.html";
        }
    });

    // 룰렛(ROLL) 추천 다시 돌리기 이벤트 제어
    const rollBtn = document.querySelector(".roll-btn");
    if (rollBtn) {
        rollBtn.addEventListener("click", () => {
            alert("🎰 딩-동-댕! 스팀 라이브러리 분석 기반 맞춤형 슬롯 추천 목록을 갱신합니다.");
            window.location.reload(); // 3주차 단계에서는 데이터를 섞어 재렌더링하는 코드로 대체됩니다.
        });
    }
}


/* ==========================================================================
   [등록 페이지] 폼 검증 및 가상 Submit 비동기 처리 제어 (schedule_form.html)
   ========================================================================== */
function initFormPage() {
    const form = document.querySelector(".schedule-web-form");
    const gameSelect = document.getElementById("gameSelect");

    if (!form) return;

    // 추천 페이지에서 [일정에 추가]를 클릭하여 넘어온 연동 데이터가 있는지 검사
    const preSelectedGame = sessionStorage.getItem("selected-game-title");
    if (preSelectedGame) {
        let isMatched = false;
        
        // 기존 셀렉트박스 옵션에 존재하는 이름인지 확인
        for (let i = 0; i < gameSelect.options.length; i++) {
            if (gameSelect.options[i].text === preSelectedGame) {
                gameSelect.selectedIndex = i;
                isMatched = true;
                break;
            }
        }
        
        // 만약 기존 선택지에 없는 새로운 추천 게임이라면 옵션을 동적으로 추가해줌
        if (!isMatched) {
            const newOption = document.createElement("option");
            newOption.value = "custom";
            newOption.text = preSelectedGame;
            gameSelect.appendChild(newOption);
            gameSelect.value = "custom";
        }
        
        // 매핑 처리 완료 후 사용한 세션 데이터 삭제 (휘발성)
        sessionStorage.removeItem("selected-game-title");
    }

    // 폼 제출(Submit) 이벤트 핸들러 바인딩
    form.addEventListener("submit", (e) => {
        e.preventDefault(); // 백엔드 부재로 인한 새로고침 현상 전면 차단 (논블로킹 제어)

        const dateInputs = form.querySelectorAll("input[type='date']");
        const targetTimeInput = document.getElementById("targetTime");
        const memoTextarea = document.getElementById("memo");

        // 입력값 객체 배열 캡슐화 구조 설계
        const newSchedule = {
            id: Date.now(), // 고유 스케줄 키 구분을 위한 타임스탬프 ID 생성
            gameTitle: gameSelect.options[gameSelect.selectedIndex].text,
            startDate: dateInputs[0].value,
            endDate: dateInputs[1].value,
            targetTime: targetTimeInput.value,
            memo: memoTextarea.value
        };

        // 기초 유효성 데이터 검증 필터링
        if (!newSchedule.startDate || !newSchedule.endDate) {
            alert("시작 날짜와 종료 날짜를 정확하게 선택해 주세요.");
            return;
        }

        // 스토리지 배열에 축적 세이브
        const currentLists = getSchedulesFromStorage();
        currentLists.push(newSchedule);
        saveScheduleToStorage(currentLists);

        alert(`🎯 [${newSchedule.gameTitle}] 스케줄이 등록되었습니다. 메인 달력으로 이동합니다!`);
        window.location.href = "index.html"; // 등록 완료 후 메인 달력 페이지로 리다이렉트
    });
}