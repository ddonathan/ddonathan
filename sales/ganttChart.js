const GoogleChartsNode = require("google-charts-nodejs");
const svgToImg = require("svg-to-img");
const dayjs = require("dayjs");

// Define your data arrays and calculations here
let items = [
    {
        id: "autoEss",
        type: "product",
        catalogId: 6323,
        catalogName: "BH-IMP-AUTO-01",
        category: "automation",
        method: "$",
        name: "Automation Essentials",
        pricing: 3500,
        weeksLow: 18,
        weeksHigh: 24,
        startAt: 0,
    },
    {
        id: "onbTalentEss",
        type: "product",
        catalogId: 6338,
        catalogName: "BH-IMP-ONB-TLNT-ESS",
        category: "onboarding",
        method: "$",
        name: "Onboarding Talent Essentials",
        pricingHigh: 10000,
        pricingLow: 10000,
        weeksLow: 17,
        weeksHigh: 22,
        startAt: -5,
    },
    {
        id: "vms_sync",
        type: "product",
        catalogName: "BH-IMP-VMS-SYNC",
        include: 0,
        method: "perEach",
        name: "VMS Sync",
        pricingBase: 2500,
        pricingEach: 500,
        weeksLow: 9,
        weeksHigh: 15,
        startAt: -5,
    },
];

let itemsToInclude = ["autoEss", "onbTalentEss", "vms_sync"];

let timelineDetails = {
    products: [],
    baselineLow: 12,
    baselineHigh: 14,
    weeksLow: 0,
    weeksHigh: 0,
};

// Set start date of the project to today plus two weeks using dayjs
timelineDetails.start = dayjs().add(2, "week").toDate();

// Set end date of the ats to the start plus the baselineLow weeks
timelineDetails.end = dayjs(timelineDetails.start).add(timelineDetails.baselineHigh, "week").toDate();

let tasks = itemsToInclude.map((item, index) => {
    let itemDetails = items.find((i) => i.id === item);
    if (itemDetails) {
        let timelineLow = timelineDetails.baselineLow + itemDetails.startAt + itemDetails.weeksLow;
        let timelineHigh = timelineDetails.baselineHigh + itemDetails.startAt + itemDetails.weeksHigh;

        // Set the start date of the item to timelineDetails.end plus startAt plus weeksHigh
        let start = dayjs(timelineDetails.end).add(itemDetails.startAt, "week").toDate();

        // Set the end date to start plus weeksHigh
        let end = dayjs(start).add(itemDetails.weeksHigh, "week").toDate();

        var durationInWeeks = itemDetails.weeksHigh;
        var millisecondsInWeek = 7 * 24 * 60 * 60 * 1000;
        var durationInMilliseconds = durationInWeeks * millisecondsInWeek;

        // Setup for gantt chart
        return [itemDetails.id, itemDetails.name, start, null, durationInMilliseconds, 0, null];
    }
});

// Add ATS to the Gantt tasks at the beginning
var durationInWeeks = timelineDetails.baselineHigh;
var millisecondsInWeek = 7 * 24 * 60 * 60 * 1000;
var durationInMilliseconds = durationInWeeks * millisecondsInWeek;
tasks.unshift(["ats", "ATS", timelineDetails.start, null, durationInMilliseconds, 0, null]);

// Set chart options
var options = {
    height: 400,
    gantt: {
        trackHeight: 30,
        sortTasks: true,
    },
};

// Create a GoogleChartsNode instance
const googleChartsNode = new GoogleChartsNode();

async function generateGanttChart() {
    // Load the Gantt chart package
    await googleChartsNode.start();

    // Create a DataTable with the required columns
    var dataTable = new google.visualization.DataTable();
    dataTable.addColumn("string", "Task ID");
    dataTable.addColumn("string", "Task Name");
    dataTable.addColumn("date", "Start Date");
    dataTable.addColumn("date", "End Date");
    dataTable.addColumn("number", "Duration");
    dataTable.addColumn("number", "Percent Complete");
    dataTable.addColumn("string", "Dependencies");

    // Add the tasks to the DataTable
    dataTable.addRows(tasks);

    // Instantiate and draw the chart
    var chart = new google.visualization.Gantt();
    chart.draw(dataTable, options);

    // Get the SVG of the chart
    var svg = chart.getSVG();

    // Convert SVG to PNG image
    var imageBuffer = await svgToImg.from(svg).toPngBuffer();

    // Save the image to a file
    const fs = require("fs");
    fs.writeFileSync("gantt_chart.png", imageBuffer);

    // Stop the GoogleChartsNode instance
    await googleChartsNode.stop();
}

generateGanttChart().catch(console.error);
