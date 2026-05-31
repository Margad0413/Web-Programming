/**
 * @file igdb_api.js
 * @brief Twitch OAuth2 프로토콜 기반 런타임 토큰 발급 및 IGDB 외부 통신 API 인터페이스
 * @note 브라우저 CORS 제약 우회를 위해 공개 프록시를 서버 브릿지로 활용
 */

'use strict';

const IGDB_CONFIG = {
    CLIENT_ID: "6o7gdg065ca1s6nge9do03fhu9tp4r",
    CLIENT_SECRET: "dpm5rrzb41tked220o1w2yz1hcfaqq",
    PROXY_PREFIX: "https://cors-anywhere.herokuapp.com/",
    API_BASE_URL: "https://api.igdb.com/v4",
    cachedToken: ""
};

/**
 * @brief Twitch 토큰 인증 상태 유효성 검증 및 유기적 자동 갱신 처리
 * @return {Promise<string|null>} 발급 완료된 OAuth2 Bearer 토큰 문자열
 */
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

/**
 * @brief 실시간 명세 키워드 텍스트 기반 쿼리 서치
 * @param {string} keyword 인풋 데이터 필터
 * @return {Promise<Array>} 컴파일 파싱 완료된 JSON 데이터 리스트
 */
async function searchGamesFromIGDB(keyword) {
    const token = await getValidToken();
    if (!token) return [];

    const endpoint = `${IGDB_CONFIG.PROXY_PREFIX}${IGDB_CONFIG.API_BASE_URL}/games`;
    const apicalypseQuery = `
        fields name, cover.url, first_release_date, aggregated_rating, genres.name;
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

/**
 * @brief 알고리즘 연동 주 타겟 선호 장르 세그먼트 가치 고평가 리스트 임의 추출
 * @param {string} genreName 쿼리 타겟 장르 명칭
 * @return {Promise<Array>} 슬롯머신에 적재할 3개 카드 배열 리턴
 */
async function getRecommendedGamesByGenre(genreName) {
    const token = await getValidToken();
    if (!token) return [];

    const endpoint = `${IGDB_CONFIG.PROXY_PREFIX}${IGDB_CONFIG.API_BASE_URL}/games`;
    const apicalypseQuery = `
        fields name, cover.url, aggregated_rating;
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
        // 셔플 가중치 처리 후 슬롯머신 3종 규격 스위칭 리턴
        return dataset.sort(() => 0.5 - Math.random()).slice(0, 3);
    } catch (error) {
        console.error("[CORS/API Error] Algorithm pipeline stack trace error:", error);
        return [];
    }
}