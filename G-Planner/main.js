// 현재 화면에 표시 중인 연도와 월을 관리하는 변수 (월은 0부터 시작)
let currentYear = 2026;
let currentMonth = 5; 

// 다크/라이트 테마에 모두 잘 어울리는 고대비 시그니처 5색 프리셋
const COLOR_PRESETS = {
    steamBlue: "#66c0f4",
    emerald: "#2ecc71",
    violet: "#9b59b6",
    sunset: "#e67e22",
    crimson: "#e74c3c"
};

// DOM 로드와 관계없이 스크립트 실행 즉시 테마 클래스를 강제 매핑 (FOUC 해결)
(function applyThemeImmediately() {
    const savedTheme = localStorage.getItem("gplanner-theme") || "dark";
    if (savedTheme === "light") {
        document.documentElement.classList.add("light-mode");
    } else {
        document.documentElement.classList.remove("light-mode");
    }
})();

document.addEventListener("DOMContentLoaded", () => {
    initThemeButton();          
    setupThemeToggle();   

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

function initThemeButton() {
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
            document.documentElement.classList.add("light-mode");
            localStorage.setItem("gplanner-theme", "light");
            updateThemeButtonText("☀️ 라이트모드");
        } else {
            document.documentElement.classList.remove("light-mode");
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
   [데이터 스토리지] 로컬 스토리지 입출력 및 날짜 처리 유틸
   ========================================================================== */

function getSchedulesFromStorage() {
    return JSON.parse(localStorage.getItem("gplanner-schedules")) || [];
}

function saveScheduleToStorage(schedules) {
    localStorage.setItem("gplanner-schedules", JSON.stringify(schedules));
}

function resetTime(dateObj) {
    return new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
}

/* ==========================================================================
   [캘린더 메인] 메인 달력 생성 및 이전/다음 달 네비게이션 제어
   ========================================================================== */

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

function renderCalendar() {
    const calendarTitle = document.getElementById("calendarTitle");
    const calendarGrid = document.getElementById("calendarGrid");
    if (!calendarGrid) return;

    calendarTitle.innerText = `${currentYear}년 ${currentMonth + 1}월`;

    const existingCells = calendarGrid.querySelectorAll(".calendar-cell");
    existingCells.forEach(cell => cell.remove());

    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const lastDate = new Date(currentYear, currentMonth + 1, 0).getDate();

    for (let i = 0; i < firstDayIndex; i++) {
        const dummyCell = document.createElement("div");
        dummyCell.className = "calendar-cell dummy";
        calendarGrid.appendChild(dummyCell);
    }

    const schedules = getSchedulesFromStorage();

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
                tagNode.className = "game-tag-tooltip-wrapper"; // 툴팁의 기준점이 될 부모 컨테이너 생성

                const gameTag = document.createElement("div");
                gameTag.className = "game-tag";
                gameTag.setAttribute("data-schedule-id", item.id);
                gameTag.style.cursor = "pointer";
                gameTag.style.backgroundColor = item.gameColor || COLOR_PRESETS.steamBlue;

                // 마우스 hover 시 보여줄 텍스트를 포맷팅하여 데이터 속성에 주입 (메모가 없으면 기본 문구 출력)
                const memoText = item.memo ? item.memo.replace(/"/g, '&quot;') : "등록된 메모가 없습니다.";
                const tooltipContent = `⏱️ 목표: ${item.targetTime}시간\n📝 메모: ${memoText}`;
                gameTag.setAttribute("data-tooltip", tooltipContent);

                const titleSpan = document.createElement("span");
                titleSpan.innerText = `${item.gameIcon || "🎮"} ${item.gameTitle}`;
                gameTag.appendChild(titleSpan);

                const delBtn = document.createElement("button");
                delBtn.className = "delete-tag-btn";
                delBtn.innerText = "✕";
                delBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    if (confirm(`[${item.gameTitle}] 스케줄 일정을 완전 삭제하시겠습니까?`)) {
                        deleteSchedule(item.id);
                    }
                });

                gameTag.addEventListener("click", (e) => {
                    if (e.target !== delBtn && !e.target.closest(".delete-tag-btn")) {
                        showScheduleDetail(item.id);
                    }
                });

                gameTag.appendChild(delBtn);
                tagNode.appendChild(gameTag);
                cell.appendChild(tagNode);
            }
        });

        calendarGrid.appendChild(cell);
    }
}

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

async function showScheduleDetail(scheduleId) {
    const schedules = getSchedulesFromStorage();
    const schedule = schedules.find(s => s.id === scheduleId);
    if (!schedule) return;

    const placeholder = document.getElementById("detailPlaceholder");
    const content = document.getElementById("detailContent");
    if (!placeholder || !content) return;

    // 화면 제어 전환 및 로딩 상태 연출
    placeholder.style.display = "none";
    content.style.display = "block";
    
    const titleNode = document.getElementById("panelTitle");
    titleNode.innerText = "IGDB 동기화 중...";

    // 외부 IGDB 에셋 인출 및 원본 커버 규격 교체 처리
    let coverImgUrl = "https://via.placeholder.com/80x110?text=No+Image";
    if (typeof searchGamesFromIGDB === "function") {
        const gameData = await searchGamesFromIGDB(schedule.gameTitle);
        if (gameData && gameData.length > 0) {
            const matchedGame = gameData.find(g => g.name.toLowerCase() === schedule.gameTitle.toLowerCase()) || gameData[0];
            if (matchedGame.cover && matchedGame.cover.url) {
                const rawUrl = matchedGame.cover.url;
                coverImgUrl = rawUrl.startsWith("http") ? rawUrl.replace("t_thumb", "t_cover_big") : `https:${rawUrl.replace("t_thumb", "t_cover_big")}`;
            }
        }
    }

    // 기 수립된 마크업 엘리먼트 타겟 엘리먼트 값 전사 (Pure 데이터 바인딩)
    const startDateObj = new Date(schedule.startDate);
    const endDateObj = new Date(schedule.endDate);
    const daysCount = Math.ceil((endDateObj - startDateObj) / (1000 * 60 * 60 * 24)) + 1;

    document.getElementById("panelCoverImg").src = coverImgUrl;
    titleNode.innerText = `${schedule.gameIcon || "🎮"} ${schedule.gameTitle}`;
    document.getElementById("panelPeriod").innerText = `📅 ${schedule.startDate} ~ ${schedule.endDate}`;
    document.getElementById("panelDaysCount").innerText = `(기간: ${daysCount}일간)`;
    document.getElementById("detail-icon").value = schedule.gameIcon || "🎮";
    document.getElementById("detail-targetTime").value = schedule.targetTime;
    document.getElementById("detail-memo").value = schedule.memo || "";

    // 프리셋 색상 일치성 선택 검증 및 테두리 시각 반응 연동
    const currentColor = schedule.gameColor || COLOR_PRESETS.steamBlue;
    const radios = content.querySelectorAll('input[name="detailPresetColor"]');
    
    radios.forEach(r => {
        r.nextElementSibling.style.border = "1px solid rgba(0,0,0,0.4)"; // 초기화
        if (r.value === currentColor) {
            r.checked = true;
            r.nextElementSibling.style.border = "2px solid #fff"; // 하이라이트
        }
    });

    // 버튼 이벤트들에 고유 ID 런타임 클로저 래핑 바인딩 (인라인 제거 대응)
    setupDetailPanelEvents(scheduleId);
}

// 정보창 내부 버튼들의 액션을 바인딩하고 프리셋 체인지에 반응하도록 이벤트를 정돈하는 함수
function setupDetailPanelEvents(scheduleId) {
    const saveBtn = document.getElementById("detailSaveBtn");
    const deleteBtn = document.getElementById("detailDeleteBtn");
    const cancelBtn = document.getElementById("detailCancelBtn");
    const presetGroup = document.getElementById("detailPresetGroup");

    // 이전 바인딩 누적 처리를 방지하기 위해 완전 초기화 교체 후 재생성
    saveBtn.onclick = () => saveScheduleDetail(scheduleId);
    deleteBtn.onclick = () => deleteAndCloseDetail(scheduleId);
    cancelBtn.onclick = () => cancelScheduleDetail();

    // 프리셋 라디오 변화 감지 핸들러
    if (presetGroup) {
        const radios = presetGroup.querySelectorAll('input[name="detailPresetColor"]');
        radios.forEach(r => {
            r.onchange = (e) => {
                radios.forEach(rad => rad.nextElementSibling.style.border = "1px solid rgba(0,0,0,0.4)");
                e.target.nextElementSibling.style.border = "2px solid #fff";
            };
        });
    }
}

function saveScheduleDetail(scheduleId) {
    const schedules = getSchedulesFromStorage();
    const schedule = schedules.find(s => s.id === scheduleId);
    if (!schedule) return;
    
    const targetTime = document.getElementById("detail-targetTime").value;
    const memo = document.getElementById("detail-memo").value;
    const gameIcon = document.getElementById("detail-icon").value;
    
    const selectedColorRadio = document.querySelector('input[name="detailPresetColor"]:checked');
    const gameColor = selectedColorRadio ? selectedColorRadio.value : COLOR_PRESETS.steamBlue;
    
    if (!targetTime || targetTime <= 0) {
        alert("목표 플레이 타임을 1시간 이상 입력해주세요.");
        return;
    }
    
    schedule.targetTime = parseInt(targetTime);
    schedule.memo = memo;
    schedule.gameIcon = gameIcon;
    schedule.gameColor = gameColor;
    
    saveScheduleToStorage(schedules);
    alert("✅ 스케줄 데이터가 업데이트되었습니다.");
    renderCalendar();
    showScheduleDetail(scheduleId);
}

function deleteAndCloseDetail(scheduleId) {
    const schedules = getSchedulesFromStorage();
    const schedule = schedules.find(s => s.id === scheduleId);
    const gameTitle = schedule ? schedule.gameTitle : "스케줄";
    
    if (confirm(`[${gameTitle}] 스케줄을 삭제하시겠습니까?`)) {
        deleteSchedule(scheduleId);
        cancelScheduleDetail();
    }
}

function cancelScheduleDetail() {
    const placeholder = document.getElementById("detailPlaceholder");
    const content = document.getElementById("detailContent");
    if (placeholder && content) {
        placeholder.style.display = "block";
        content.style.display = "none";
    }
}

/* ==========================================================================
   [추천 및 검색] IGDB API 데이터 패치 연동 및 슬롯 제어
   ========================================================================== */

function initRecommendPage() {
    const searchForm = document.getElementById("searchForm");
    const searchInput = document.getElementById("searchInput");
    const searchResults = document.getElementById("searchResults");
    const rollBtn = document.getElementById("rollBtn");

    runSlotMachine();

    document.body.addEventListener("click", (e) => {
        if (e.target && e.target.classList.contains("add-sched-btn")) {
            const card = e.target.closest(".game-card");
            const title = card.querySelector(".game-title-link").innerText.trim();
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

async function runSlotMachine() {
    const slotContainer = document.getElementById("slotMachineContainer");
    if (!slotContainer) return;

    slotContainer.innerHTML = `<p style="padding:20px;">추천 슬롯 분석 중...</p>`;
    const selectedSlots = await getRecommendedGamesByGenre("Simulator");
    genre2 = await getRecommendedGamesByGenre("RPG");
    selectedSlots.push(...genre2);

    slotContainer.innerHTML = "";
    if (!selectedSlots || selectedSlots.length === 0) {
        slotContainer.innerHTML = `<p style="padding:20px;">추천 데이터를 불러오지 못했습니다.</p>`;
        return;
    }

    selectedSlots.forEach(game => {
        slotContainer.appendChild(createGameCardNode(game));
    });
}

function createGameCardNode(game) {
    const card = document.createElement("div");
    card.className = "game-card";
    
    let coverUrl = "https://via.placeholder.com/80x110?text=No+Image";
    if (game.cover && game.cover.url) {
        const rawUrl = game.cover.url;
        coverUrl = rawUrl.startsWith("http") ? rawUrl.replace("t_thumb", "t_cover_big") : `https:${rawUrl.replace("t_thumb", "t_cover_big")}`;
    }
        
    const score = game.aggregated_rating ? Math.round(game.aggregated_rating) : "N/A";

    const slugifiedName = game.name.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
    const igdbDetailsUrl = `https://www.igdb.com/games/${slugifiedName}`;

    card.innerHTML = `
        <div class="game-cover"><img src="${coverUrl}" alt="cover" style="width:100%; height:100%; object-fit:cover; border-radius:4px;"></div>
        <div class="game-details">
            <h4><a href="${igdbDetailsUrl}" target="_blank" class="game-title-link" title="자세한 정보 보러가기">${game.name}</a></h4>
            <p class="meta-score">메타스코어: ${score}</p>
            <button class="add-sched-btn">[일정에 추가]</button>
        </div>
    `;
    return card;
}

/* ==========================================================================
   [등록 폼] 인풋 양식 입력값 검증 및 가상 폼 전송 핸들링
   ========================================================================== */

function initFormPage() {
    const form = document.getElementById("scheduleForm");
    const gameSelect = document.getElementById("gameSelect");
    if (!form) return;

    const colorRadios = form.querySelectorAll('input[name="presetColor"]');

    // 프리셋 라디오 선택 시 테두리 스타일 실시간 하이라이팅 처리
    colorRadios.forEach(radio => {
        radio.addEventListener("change", (e) => {
            colorRadios.forEach(rad => {
                rad.nextElementSibling.style.border = "1px solid rgba(0,0,0,0.4)";
            });
            e.target.nextElementSibling.style.border = "2px solid #fff";
        });
    });

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

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const startDate = document.getElementById("startDate").value;
        const endDate = document.getElementById("endDate").value;
        const targetTime = document.getElementById("targetTime").value;
        const memo = document.getElementById("memo").value;
        const gameIcon = document.getElementById("gameIcon").value;
        
        const selectedRadio = form.querySelector('input[name="presetColor"]:checked');
        const gameColor = selectedRadio ? selectedRadio.value : COLOR_PRESETS.steamBlue;

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
            memo,
            gameIcon,
            gameColor
        };

        const currentLists = getSchedulesFromStorage();
        currentLists.push(scheduleItem);
        saveScheduleToStorage(currentLists);

        alert(`🎯 [${scheduleItem.gameTitle}] 스케줄 저장이 완료되었습니다.`);
        window.location.href = "index.html";
    });
}