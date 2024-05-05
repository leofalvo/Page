import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const margin = { top: 20, right: 30, bottom: 40, left: 180 };
const width = 500 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

const svg = d3.select("body").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// Text label for displaying the current month
const monthLabel = svg.append("text")
    .attr("class", "monthLabel")
    .attr("x", width / 2) // Position in the middle of the chart
    .attr("y", height + margin.bottom - 10)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("fill", "#666");

// Create navigation buttons
const buttonContainer = d3.select("body").append("div")
    .attr("id", "navigation")
    .style("margin-top", "20px");

const prevButton = buttonContainer.append("button")
    .attr("id", "prevMonth")
    .text("< Previous")
    .style("margin-right", "10px");

const nextButton = buttonContainer.append("button")
    .attr("id", "nextMonth")
    .text("Next >")
    .style("margin-right", "10px");

const allTimeButton = buttonContainer.append("button")
    .attr("id", "allTime")
    .text("All-Time Top Songs")
    .style("margin-right", "10px");

const increaseTopNButton = buttonContainer.append("button")
    .attr("id", "increaseTopN")
    .text("+ Increase Top N")
    .style("margin-right", "10px");

const decreaseTopNButton = buttonContainer.append("button")
    .attr("id", "decreaseTopN")
    .text("- Decrease Top N");

export function visualizeData(monthlyTracks) {
    const months = Object.keys(monthlyTracks)
        .map(monthKey => ({
            key: monthKey,
            order: parseInt(monthKey.split(' ')[0], 10)
        }))
        .sort((a, b) => a.order - b.order)
        .map(d => d.key);

    let monthIndex = 0;
    let topN = 10; // Default top N value

    function aggregateAllTimeData() {
        const allTimeData = {};

        Object.values(monthlyTracks).forEach(monthData => {
            Object.entries(monthData).forEach(([song, count]) => {
                allTimeData[song] = (allTimeData[song] || 0) + count;
            });
        });

        return Object.entries(allTimeData)
            .map(([song, count]) => ({ song, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, topN); // Top N all-time songs
    }

    function showMonth(index) {
        if (index >= 0 && index < months.length) {
            monthIndex = index;
            const currentMonth = months[monthIndex];
            const monthData = Object.entries(monthlyTracks[currentMonth])
                .map(([song, count]) => ({ song, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, topN); // Top N songs for the current month

            updateChart(monthData, currentMonth);
        }
    }

    function showAllTime() {
        const allTimeData = aggregateAllTimeData();
        updateChart(allTimeData, "All-Time Top Songs");
    }

    function changeTopN(delta) {
        topN = Math.max(1, topN + delta); // Ensure Top N is at least 1
        showMonth(monthIndex);
    }

    prevButton.on("click", () => showMonth(monthIndex - 1));
    nextButton.on("click", () => showMonth(monthIndex + 1));
    allTimeButton.on("click", showAllTime);
    increaseTopNButton.on("click", () => changeTopN(1));
    decreaseTopNButton.on("click", () => changeTopN(-1));

    showMonth(0); // Start with the first month
}

function updateChart(data, title) {
    // Update title label
    monthLabel.text(title);

    // Scales
    const y = d3.scaleBand()
        .range([0, height])
        .padding(0.1)
        .domain(data.map(d => d.song));
    const x = d3.scaleLinear()
        .range([0, width])
        .domain([0, d3.max(data, d => d.count)]);

    // Bars
    const bars = svg.selectAll(".bar")
        .data(data, d => d.song);

    // Enter + Update
    bars.enter().append("rect")
        .attr("class", "bar")
        .attr("y", d => y(d.song))
        .attr("height", y.bandwidth())
        .attr("x", 0)
        .attr("width", 0) // Start width at 0 for animation
        .attr("fill", "steelblue")
      .merge(bars)
        .transition()
        .duration(800) // Duration of the animation
        .ease(d3.easeCubicInOut) // Smoother easing function
        .attr("y", d => y(d.song))
        .attr("height", y.bandwidth())
        .attr("x", 0)
        .attr("width", d => x(d.count));

    // Exit (Remove bars no longer in the dataset)
    bars.exit()
        .transition()
        .duration(800)
        .ease(d3.easeCubicInOut)
        .attr("width", 0)
        .remove();

    // Update the y Axis
    svg.select(".y-axis").remove();
    svg.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(y));

    // Update the x Axis
    svg.select(".x-axis").remove();
    svg.append("g")
        .attr("class", "x-axis")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x));
}
