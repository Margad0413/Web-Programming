// IGDB API 통신 및 Twitch 인증에 필요한 기본 설정 정보 객체
const IGDB_CONFIG = {
    CLIENT_ID: "6o7gdg065ca1s6nge9do03fhu9tp4r",
    CLIENT_SECRET: "dpm5rrzb41tked220o1w2yz1hcfaqq",
    PROXY_PREFIX: "https://cors-anywhere.herokuapp.com/",
    API_BASE_URL: "https://api.igdb.com/v4",
    cachedToken: ""
};

// Twitch 인증 서버로부터 유효한 액세스 토큰을 발급 및 갱신하는 함수
async function getValidToken() {
    if (IGDB_CONFIG.cachedToken) return IGDB_CONFIG.cachedToken;

    const authUrl = `https://id.twitch.tv/oauth2/token?client_id=${IGDB_CONFIG.CLIENT_ID}&client_secret=${IGDB_CONFIG.CLIENT_SECRET}&grant_type=client_credentials`;

    try {
        const response = await fetch(authUrl, { method: 'POST' });
        if (!response.ok) throw new Error(`Auth Server Exception: ${response.status}`);

        const data = await response.json();
        IGDB_CONFIG.cachedToken = data.access_token;
        console.warn("[System] Twitch OAuth Credentials Security Token Cached Successfully.");
        return IGDB_CONFIG.cachedToken;
    } catch (error) {
        console.error("[Runtime Error] Failed to retrieve authentication payload:", error);
        return null;
    }
}

// 입력한 키워드를 기반으로 IGDB 데이터베이스에서 해당 게임들을 검색하는 함수
async function searchGamesFromIGDB(keyword) {
    const token = await getValidToken();
    if (!token) return [];

    const endpoint = `${IGDB_CONFIG.PROXY_PREFIX}${IGDB_CONFIG.API_BASE_URL}/games`;
    const apicalypseQuery = `
        fields name, cover.url, first_release_date, aggregated_rating, first_release_date, genres.name;
        search "${keyword}";
        limit 9;
    `;

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Client-ID': IGDB_CONFIG.CLIENT_ID,
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'text/plain'
            },
            body: apicalypseQuery
        });

        if (!response.ok) throw new Error(`Endpoint Access Refused: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error("[CORS/API Error] Database response tracking failure:", error);
        return [];
    }
}

// 특정 장르의 고평가 게임 리스트를 패치한 뒤 무작위로 3개를 추출하여 슬롯머신에 제공하는 함수
async function getRecommendedGamesByGenre(genreName) {
    const token = await getValidToken();
    if (!token) return [];

    const endpoint = `${IGDB_CONFIG.PROXY_PREFIX}${IGDB_CONFIG.API_BASE_URL}/games`;
    const apicalypseQuery = `
        fields name, cover.url, aggregated_rating, first_release_date;
        where genres.name = "${genreName}" & aggregated_rating != null;
        sort aggregated_rating desc;
        limit 20;
    `;

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Client-ID': IGDB_CONFIG.CLIENT_ID,
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            },
            body: apicalypseQuery
        });

        if (!response.ok) throw new Error(`Endpoint Access Refused: ${response.status}`);
        
        const dataset = await response.json();
        return dataset.sort(() => 0.5 - Math.random()).slice(0, 3);
    } catch (error) {
        console.error("[CORS/API Error] Algorithm pipeline stack trace error:", error);
        return [];
    }
}