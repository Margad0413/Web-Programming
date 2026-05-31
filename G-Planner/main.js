// 현재 화면에 표시 중인 연도와 월을 관리하는 변수 (월은 0부터 시작)
let currentYear = 2026;
let currentMonth = 5;

document.addEventListener("DOMContentLoaded", () => {
    initTheme();          
    setupThemeToggle();   

    // 현재 접속한 페이지 이름에 따라 필요한 초기화 함수 실행
    const page = window.location.pathname.substring(window.location.pathname.lastIndexOf("/") + 1);
    if (page === "index.html" || page === "") {
        initCalendar();
    } else if (page === "recommend.html") {
        initRecommendPage();
    } else if (page === "schedule_form.html") {
        initFormPage();
    }
});

/* ==========================================================================
   [테마 기능] 라이트모드 및 다크모드 상호작용
   ========================================================================== */

// 로컬 스토리지에 저장된 테마 상태를 불러와서 브라우저에 적용하는 함수
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

// 테마 토글 버튼에 클릭 이벤트를 바인딩하고 상태를 저장하는 함수
function setupThemeToggle() {
    const toggleBtn = document.getElementById("darkModeBtn");
    if (!toggleBtn) return;
    toggleBtn.addEventListener("click", () => {
        const isLight = document.body.classList.toggle("light-mode");
        localStorage.setItem("gplanner-theme", isLight ? "light" : "dark");
        updateThemeButtonText(isLight ? "☀️ 라이트모드" : "🌙 다크모드");
    });
}

// 테마 토글 버튼 안의 텍스트 레이블을 변경하는 함수
function updateThemeButtonText(text) {
    const toggleBtn = document.getElementById("darkModeBtn");
    if (toggleBtn) toggleBtn.innerText = text;
}

/* ==========================================================================
   [데이터 스토리지] 로컬 스토리지 입출력 및 날짜 처리 유틸
   ========================================================================== */

// 로컬 스토리지에서 등록된 전체 일정 배열을 파싱해서 가져오는 함수
function getSchedulesFromStorage() {
    return JSON.parse(localStorage.getItem("gplanner-schedules")) || [];
}

// 전달받은 일정 배열을 JSON 문자열로 변환하여 로컬 스토리지에 세이브하는 함수
function saveScheduleToStorage(schedules) {
    localStorage.setItem("gplanner-schedules", JSON.stringify(schedules));
}

// 정확한 날짜 비교를 위해 시간 데이터를 00:00:00으로 초기화하는 함수
function resetTime(dateObj) {
    return new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
}

/* ==========================================================================
   [캘린더 메인] 메인 달력 생성 및 이전/다음 달 네비게이션 제어
   ========================================================================== */

// 달력의 월 이동 버튼 핸들러를 등록하고 초기 달력을 렌더링하는 함수
function initCalendar() {
    const prevBtn = document.getElementById("prevMonthBtn");
    const nextBtn = document.getElementById("nextMonthBtn");
    if (!prevBtn || !nextBtn) return;

    renderCalendar();

    prevBtn.addEventListener("click", () => {
        currentMonth--;
        if (currentMonth < 0) { currentMonth = 11; currentYear--; }
        renderCalendar();
    });

    nextBtn.addEventListener("click", () => {
        currentMonth++;
        if (currentMonth > 11) { currentMonth = 0; currentYear++; }
        renderCalendar();
    });
}

// 연/월 계산 및 일정 스토리지 매핑을 통해 화면에 달력 격자를 그려주는 함수
function renderCalendar() {
    const calendarTitle = document.getElementById("calendarTitle");
    const calendarGrid = document.getElementById("calendarGrid");
    if (!calendarGrid) return;

    calendarTitle.innerText = `${currentYear}년 ${currentMonth + 1}월`;

    const existingCells = calendarGrid.querySelectorAll(".calendar-cell");
    existingCells.forEach(cell => cell.remove());

    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const lastDate = new Date(currentYear, currentMonth + 1, 0).getDate();

    // 시작 요일 전까지의 공백을 채우기 위한 이전 달 더미 셀 생성 루프
    for (let i = 0; i < firstDayIndex; i++) {
        const dummyCell = document.createElement("div");
        dummyCell.className = "calendar-cell dummy";
        calendarGrid.appendChild(dummyCell);
    }

    const schedules = getSchedulesFromStorage();

    // 1일부터 말일까지 일치하는 일정을 조회하며 날짜 노드를 바인딩하는 루프
    for (let date = 1; date <= lastDate; date++) {
        const cell = document.createElement("div");
        cell.className = "calendar-cell";

        const dayNumSpan = document.createElement("span");
        dayNumSpan.className = "day-num";
        dayNumSpan.innerText = date;

        if (new Date(currentYear, currentMonth, date).getDay() === 0) {
            dayNumSpan.classList.add("sun");
        }
        cell.appendChild(dayNumSpan);

        schedules.forEach(item => {
            const itemStartDate = new Date(item.startDate);
            const itemEndDate = new Date(item.endDate);
            const currentCellDate = new Date(currentYear, currentMonth, date);

            if (currentCellDate >= resetTime(itemStartDate) && currentCellDate <= resetTime(itemEndDate)) {
                const tagNode = document.createElement("div");
                tagNode.className = "game-tag";
                tagNode.setAttribute("data-schedule-id", item.id);
                tagNode.style.cursor = "pointer";

                const titleSpan = document.createElement("span");
                titleSpan.innerText = `🎮 ${item.gameTitle}`;
                tagNode.appendChild(titleSpan);

                const delBtn = document.createElement("button");
                delBtn.className = "delete-tag-btn";
                delBtn.innerText = "✕";
                delBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    if (confirm(`[${item.gameTitle}] 스케줄 일정을 완전 삭제하시겠습니까?`)) {
                        deleteSchedule(item.id);
                    }
                });

                tagNode.addEventListener("click", (e) => {
                    if (e.target !== delBtn && !e.target.closest(".delete-tag-btn")) {
                        showScheduleDetail(item.id);
                    }
                });

                tagNode.appendChild(delBtn);
                cell.appendChild(tagNode);
            }
        });

        calendarGrid.appendChild(cell);
    }
}

// 고유 ID 식별자를 조회하여 로컬 스토리지에서 특정 스케줄을 제거하는 함수
function deleteSchedule(id) {
    let lists = getSchedulesFromStorage();
    lists = lists.filter(item => item.id !== id);
    saveScheduleToStorage(lists);
    cancelScheduleDetail(); 
    renderCalendar(); 
}

/* ==========================================================================
   [상세 정보 패널] 선택한 일정 조회 및 실시간 편집 양식 기능
   ========================================================================== */

// 달력에서 선택한 게임의 메모, 기간, 목표 시간을 좌측 패널 폼에 바인딩하는 함수
function showScheduleDetail(scheduleId) {
    const schedules = getSchedulesFromStorage();
    const schedule = schedules.find(s => s.id === scheduleId);
    if (!schedule) return;
    
    const panel = document.getElementById("scheduleDetailPanel");
    const startDateObj = new Date(schedule.startDate);
    const endDateObj = new Date(schedule.endDate);
    const daysCount = Math.ceil((endDateObj - startDateObj) / (1000 * 60 * 60 * 24)) + 1;
    
    panel.innerHTML = `
        <div>
            <h3 style="margin-bottom: 15px; color: var(--point-color);">🎮 ${schedule.gameTitle}</h3>
            <div class="schedule-detail-form">
                <div class="form-group">
                    <label>📅 기간:</label>
                    <p style="font-size: 13px; color: var(--text-color); margin: 5px 0;">${schedule.startDate} ~ ${schedule.endDate} <span style="color: var(--border-color);">(${daysCount}일)</span></p>
                </div>
                <div class="form-group">
                    <label for="detail-targetTime">⏱️ 목표 플레이 타임:</label>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <input type="number" id="detail-targetTime" value="${schedule.targetTime}" min="1" style="flex: 1;">
                        <span style="font-size: 12px;">시간</span>
                    </div>
                </div>
                <div class="form-group">
                    <label for="detail-memo">📝 메모:</label>
                    <textarea id="detail-memo" rows="4">${schedule.memo || ""}</textarea>
                </div>
                <div class="detail-buttons">
                    <button class="detail-btn detail-save-btn" onclick="saveScheduleDetail(${scheduleId})">💾 저장</button>
                    <button class="detail-btn detail-delete-btn" onclick="deleteAndCloseDetail(${scheduleId})">🗑️ 삭제</button>
                    <button class="detail-btn detail-cancel-btn" onclick="cancelScheduleDetail()">✕ 닫기</button>
                </div>
            </div>
        </div>
    `;
}

// 상세 정보 패널 내 인풋 폼에서 수정된 타임과 메모를 스토리지에 업데이트하는 함수
function saveScheduleDetail(scheduleId) {
    const schedules = getSchedulesFromStorage();
    const schedule = schedules.find(s => s.id === scheduleId);
    if (!schedule) return;
    
    const targetTime = document.getElementById("detail-targetTime").value;
    const memo = document.getElementById("detail-memo").value;
    
    if (!targetTime || targetTime <= 0) {
        alert("목표 플레이 타임을 1시간 이상 입력해주세요.");
        return;
    }
    
    schedule.targetTime = parseInt(targetTime);
    schedule.memo = memo;
    
    saveScheduleToStorage(schedules);
    alert("✅ 스케줄이 수정되었습니다.");
    showScheduleDetail(scheduleId);
}

// 패널 내부에서 일정 파기 시 컨펌창을 거쳐 즉각 데이터를 제거하는 함수
function deleteAndCloseDetail(scheduleId) {
    const schedules = getSchedulesFromStorage();
    const schedule = schedules.find(s => s.id === scheduleId);
    const gameTitle = schedule ? schedule.gameTitle : "스케줄";
    
    if (confirm(`[${gameTitle}] 스케줄을 삭제하시겠습니까?`)) {
        deleteSchedule(scheduleId);
        cancelScheduleDetail();
    }
}

// 열려 있던 편집 상세 패널창을 닫고 플레이스홀더 기본 문구로 환원시키는 함수
function cancelScheduleDetail() {
    const panel = document.getElementById("scheduleDetailPanel");
    panel.innerHTML = `<p style="text-align: center; color: var(--border-color); padding: 20px; font-size: 13px;">캘린더에서 게임을 선택하면<br>상세 정보가 표시됩니다</p>`;
}

/* ==========================================================================
   [추천 및 검색] IGDB API 데이터 패치 연동 및 슬롯 제어
   ========================================================================== */

// 검색 폼 이벤트 등록 및 추천 목록 이동 브릿지 세션을 관리하는 초기화 함수
function initRecommendPage() {
    const searchForm = document.getElementById("searchForm");
    const searchInput = document.getElementById("searchInput");
    const searchResults = document.getElementById("searchResults");
    const rollBtn = document.getElementById("rollBtn");

    runSlotMachine();

    // 목록 리스트 내 카드 클릭 시 세션 스토리지를 경유해 폼 페이지로 타겟을 래핑 연동하는 위임 함수
    document.body.addEventListener("click", (e) => {
        if (e.target && e.target.classList.contains("add-sched-btn")) {
            const card = e.target.closest(".game-card");
            const title = card.querySelector("h4").innerText.replace("타이틀: ", "").trim();
            sessionStorage.setItem("selected-game-title", title);
            alert(`[${title}] 스케줄을 추가합니다. 플레이 등록 화면으로 전환합니다.`);
            window.location.href = "schedule_form.html";
        }
    });

    if (searchForm) {
        searchForm.addEventListener("submit", async (e) => { 
            e.preventDefault();
            const keyword = searchInput.value.trim();
            if (!keyword) return;

            searchResults.innerHTML = `<p style="padding:20px;">IGDB에서 게임 검색 중...</p>`;
            const matchingGames = await searchGamesFromIGDB(keyword);
            
            searchResults.innerHTML = ""; 
            if (!matchingGames || matchingGames.length === 0) {
                searchResults.innerHTML = `<p style="padding:20px;">검색 결과가 존재하지 않습니다.</p>`;
                return;
            }

            matchingGames.forEach(game => {
                searchResults.appendChild(createGameCardNode(game));
            });
        });
    }

    if (rollBtn) {
        rollBtn.addEventListener("click", () => runSlotMachine());
    }
}

// 특정 타겟 장르 기반 고평가 게임을 비동기로 패치해서 추천 슬롯 컨테이너에 배치하는 함수
async function runSlotMachine() {
    const slotContainer = document.getElementById("slotMachineContainer");
    if (!slotContainer) return;

    slotContainer.innerHTML = `<p style="padding:20px;">추천 슬롯 분석 중...</p>`;
    const selectedSlots = await getRecommendedGamesByGenre("Simulator");

    slotContainer.innerHTML = "";
    if (!selectedSlots || selectedSlots.length === 0) {
        slotContainer.innerHTML = `<p style="padding:20px;">추천 데이터를 불러오지 못했습니다.</p>`;
        return;
    }

    selectedSlots.forEach(game => {
        slotContainer.appendChild(createGameCardNode(game));
    });
}

// 받아온 실제 IGDB JSON 데이터 형식의 오브젝트를 HTML 게임 카드로 컴파일하는 팩토리 함수
function createGameCardNode(game) {
    const card = document.createElement("div");
    card.className = "game-card";
    
    const coverUrl = game.cover && game.cover.url 
        ? `https:${game.cover.url}` 
        : "https://via.placeholder.com/80x110?text=No+Image";
        
    const score = game.aggregated_rating ? Math.round(game.aggregated_rating) : "N/A";

    card.innerHTML = `
        <div class="game-cover"><img src="${coverUrl}" alt="cover" style="width:100%; height:100%; object-fit:cover; border-radius:4px;"></div>
        <div class="game-details">
            <h4>${game.name}</h4>
            <p class="meta-score">메타스코어: ${score}</p>
            <button class="add-sched-btn">[일정에 추가]</button>
        </div>
    `;
    return card;
}

/* ==========================================================================
   [등록 폼] 인풋 양식 입력값 검증 및 가상 폼 전송 핸들링
   ========================================================================== */

// 이전 추천 페이지에서 인계한 세션 스케줄 값을 파싱해서 셀렉트 박스에 매핑하는 초기화 함수
function initFormPage() {
    const form = document.getElementById("scheduleForm");
    const gameSelect = document.getElementById("gameSelect");
    if (!form) return;

    const preSelectedGame = sessionStorage.getItem("selected-game-title");
    if (preSelectedGame) {
        let matched = false;
        for (let i = 0; i < gameSelect.options.length; i++) {
            if (gameSelect.options[i].text === preSelectedGame) {
                gameSelect.selectedIndex = i;
                matched = true;
                break;
            }
        }
        if (!matched) {
            const opt = document.createElement("option");
            opt.value = preSelectedGame;
            opt.text = preSelectedGame;
            gameSelect.appendChild(opt);
            gameSelect.value = preSelectedGame;
        }
        sessionStorage.removeItem("selected-game-title");
    }

    // 신규 수집된 플레이 기간 및 인풋 데이터 세트를 구조화하여 영구 세이브하는 서브밋 함수
    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const startDate = document.getElementById("startDate").value;
        const endDate = document.getElementById("endDate").value;
        const targetTime = document.getElementById("targetTime").value;
        const memo = document.getElementById("memo").value;

        if (new Date(startDate) > new Date(endDate)) {
            alert("종료 날짜는 시작 날짜보다 빠를 수 없습니다.");
            return;
        }

        const scheduleItem = {
            id: Date.now(), 
            gameTitle: gameSelect.value,
            startDate,
            endDate,
            targetTime,
            memo
        };

        const currentLists = getSchedulesFromStorage();
        currentLists.push(scheduleItem);
        saveScheduleToStorage(currentLists);

        alert(`🎯 [${scheduleItem.gameTitle}] 스케줄 저장이 완료되었습니다.`);
        window.location.href = "index.html";
    });
}