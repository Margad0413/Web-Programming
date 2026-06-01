const STEAM_API_KEY = 'E75FB6ADFCD1B4FD77C480B3B73E0DB5';
const STEAM_ID = '76561198839807017';
const CORS_PROXY = 'https://cors-anywhere.herokuapp.com/';

async function loadSteamProfile() {
    try {
        const profileResponse = await fetch(
            `${CORS_PROXY}https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAM_API_KEY}&steamids=${STEAM_ID}`
        );
        const profileData = await profileResponse.json();
        const player = profileData.response.players[0];

        const gamesResponse = await fetch(
            `${CORS_PROXY}https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${STEAM_API_KEY}&steamid=${STEAM_ID}&include_played_free_games=true`
        );
        const gamesData = await gamesResponse.json();

        document.getElementById('profileImg').innerHTML = 
            `<img src="${player.avatarmedium}" alt="프로필 이미지" style="width:100%; border-radius:8px;">`;
        document.getElementById('nickname').textContent = player.personaname;
        document.getElementById('gameCount').textContent = gamesData.response.game_count;

        // 최근 플레이 게임 조회
        await loadRecentPlayedGames();

    } catch (error) {
        console.error('스팀 프로필 로드 실패:', error);
        document.getElementById('profileInfo').innerHTML = 
            '<p style="color: red;">프로필 정보를 불러올 수 없습니다</p>';
    }
}

async function loadRecentPlayedGames() {
    try {
        const recentResponse = await fetch(
            `${CORS_PROXY}https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/?key=${STEAM_API_KEY}&steamid=${STEAM_ID}&count=3`
        );
        const recentData = await recentResponse.json();

        console.log('최근 플레이 게임:', recentData);

        if (!recentData.response.games || recentData.response.games.length === 0) {
            const genreList = document.getElementById('genreList');
            genreList.innerHTML = '<li>최근 플레이 기록 없음</li>';
            return;
        }

        let recentGames = recentData.response.games;
        
        // 게임 이름 추가 (API에 name이 포함되어 있을 가능성 높음)
        recentGames = await enrichGameNames(recentGames);

        const genreList = document.getElementById('genreList');
        genreList.innerHTML = recentGames.map(game => {
            const lastPlayDate = new Date(game.rtime_lastp * 1000);
            const now = new Date();
            const daysAgo = Math.floor((now - lastPlayDate) / (1000 * 60 * 60 * 24));
            
            let timeLabel = '';
            if (daysAgo === 0) timeLabel = '오늘';
            else if (daysAgo === 1) timeLabel = '어제';
            else if (daysAgo < 7) timeLabel = `${daysAgo}일 전`;
            else if (daysAgo < 30) timeLabel = `${Math.floor(daysAgo / 7)}주 전`;
            else timeLabel = `${Math.floor(daysAgo / 30)}개월 전`;
            
            const gameName = game.name || `Game ${game.appid}`;
            return `<li>${gameName} (${timeLabel})</li>`;
        }).join('');

    } catch (error) {
        console.error('최근 플레이 게임 조회 실패:', error);
        const genreList = document.getElementById('genreList');
        genreList.innerHTML = '<li>최근 플레이 정보 조회 실패</li>';
    }
}

// Steam Store API에서 게임 이름 조회
async function enrichGameNames(games) {
    for (let game of games) {
        if (!game.name) {
            try {
                const response = await fetch(
                    `https://store.steampowered.com/api/appdetails?appids=${game.appid}&json=1`
                );
                const data = await response.json();
                
                if (data[game.appid] && data[game.appid].data) {
                    game.name = data[game.appid].data.name;
                } else {
                    game.name = `Game ${game.appid}`;
                }
                
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                console.warn(`게임 ${game.appid} 이름 조회 실패:`, error);
                game.name = `Game ${game.appid}`;
            }
        }
    }
    return games;
}

document.addEventListener('DOMContentLoaded', loadSteamProfile);