import { visualizeData } from "./visualize.js";

const URL = "https://ws.audioscrobbler.com/2.0/";
const API_KEY = "ac1c292ec5b818756c598865b49168f7";
const userInfo = 'user.getInfo';

const monthlyTracks = {};
const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

$(document).ready(() => {
    $("#begin").on("click", retrieveUser);
    $("#visualize").on("click", () => visualizeData(monthlyTracks)).hide();
});

async function retrieveUser() {
    const username = $("#username").val().trim();
    if (!username) {
        alert("Please enter a valid Last.fm username.");
        return;
    }

    resetProgress();
    $("#visualize").hide();
    Object.keys(monthlyTracks).forEach(key => delete monthlyTracks[key]);

    try {
        const regTime = await getTime(username);
        if (regTime === null) {
            throw new Error("Invalid username provided");
        }

        let startDate = new Date(regTime * 1000);
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);

        let activeWorkers = 0;
        const maxWorkers = 10;
        const workerPromises = [];
        var i = 0;
        while (startDate < Date.now()) {
            updateProgress(`Fetching data for ${monthNames[startDate.getMonth()]} ${startDate.getFullYear()}`);
            const nextDate = new Date(startDate);
            nextDate.setMonth(startDate.getMonth() + 1);

            const timeFrom = Math.floor(startDate.getTime() / 1000);
            const timeTo = Math.floor(nextDate.getTime() / 1000);

            const worker = new Worker("worker.js");
            activeWorkers++;

            const promise = new Promise((resolve) => {
                worker.onmessage = (event) => {
                    const { success, listensBySong, month, i } = event.data;
                    console.log(`Worker message: success=${success}, songs count=${Object.keys(listensBySong).length}`);

                    if (success) {
                        const monthKey = `${i} ${monthNames[month.getMonth()]} ${month.getFullYear()}`;
                        if (!(monthKey in monthlyTracks)) {
                            monthlyTracks[monthKey] = {};
                        }

                        Object.entries(listensBySong).forEach(([key, count]) => {
                            monthlyTracks[monthKey][key] = (monthlyTracks[monthKey][key] || 0) + count;
                        });
                    }

                    worker.terminate();
                    activeWorkers--;
                    resolve(success);
                };
                i++;
                worker.postMessage({
                    username,
                    timeFrom,
                    timeTo,
                    i,
                });
            });

            workerPromises.push(promise);

            if (activeWorkers >= maxWorkers) {
                await Promise.all(workerPromises);
                workerPromises.length = 0;
            }

            startDate.setMonth(startDate.getMonth() + 1);
        }

        if (workerPromises.length) {
            await Promise.all(workerPromises);
        }

        console.log(monthlyTracks);
        $("#visualize").show();
        updateProgress("Done scraping!");
    } catch (error) {
        console.error("Error in retrieveUser:", error);
        alert("Invalid username provided or an error occurred while fetching data.");
        updateProgress("Error occurred");
    }
}

async function getTime(username) {
    const queryParams = new URLSearchParams({
        method: userInfo,
        user: username,
        api_key: API_KEY,
        format: 'json',
    });

    const fullURL = `${URL}?${queryParams}`;
    try {
        const response = await fetch(fullURL);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        if (data.error) {
            throw new Error(`Invalid username: ${username}`);
        }

        console.log(`User registration time for ${username}: ${data.user.registered.unixtime}`);
        return data.user.registered.unixtime;
    } catch (error) {
        console.error("Failed to retrieve user registration time:", error);
        return null;
    }
}

function updateProgress(message) {
    $("#progress").text(message);
    console.log(message);
}

function resetProgress() {
    $("#progress").empty();
    console.log("Progress reset.");
}

