// worker.js
const URL = "http://ws.audioscrobbler.com/2.0/";
const API_KEY = "ac1c292ec5b818756c598865b49168f7";
const recentTracks = 'user.getRecentTracks';

self.addEventListener('message', async (event) => {
    const { username, timeFrom, timeTo, i } = event.data;

    const queryParams = new URLSearchParams({
        method: recentTracks,
        limit: 200,
        user: username,
        from: timeFrom,
        to: timeTo,
        api_key: API_KEY,
        format: 'json',
    });

    async function fetchPage(page) {
        queryParams.set('page', page);
        const fullURL = `${URL}?${queryParams}`;

        try {
            const response = await fetch(fullURL);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            const tracks = data?.recenttracks?.track;

            if (!tracks || !Array.isArray(tracks) || tracks.length === 0) {
                return { success: false, listensBySong: {} };
            }

            const listensBySong = {};
            tracks.forEach(track => {
                const key = `${track.name} - ${track.artist["#text"]}`;
                listensBySong[key] = (listensBySong[key] || 0) + 1;
            });

            return { success: true, listensBySong, totalPages: data.recenttracks['@attr'].totalPages };

        } catch (error) {
            console.error("Worker Error:", error);
            return { success: false, listensBySong: {} };
        }
    }

    const allTracks = {};
    let page = 1;

    do {
        const { success, listensBySong, totalPages: fetchedTotalPages } = await fetchPage(page);
        if (!success) break;

        Object.entries(listensBySong).forEach(([key, count]) => {
            allTracks[key] = (allTracks[key] || 0) + count;
        });

        totalPages = fetchedTotalPages;
        page += 1;
    } while (true);

    postMessage({ success: Object.keys(allTracks).length > 0, listensBySong: allTracks, month: new Date(timeFrom * 1000), i });
});
