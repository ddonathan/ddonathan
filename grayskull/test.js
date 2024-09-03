const moment = require('moment-timezone');

// Hardcoded user for testing
const user = {
    id: 1,
    email: 'dan@donathan.com',
    password: 'Dan',
    name: 'Dan',
    age: 44,
    weight: 200,
    workoutDays: [1, 3, 5], // Monday = 1, Wednesday = 3, Friday = 5
    timezone: 'America/Los_Angeles'
};

// Updated lifts for testing with formatted exercise names
const lifts = [
    {
        id: 1,
        userId: 1,
        exercise: 'benchpress',
        weight: 140,
        reps: 5,
        date: '2023-08-26T14:00:00Z',  // Converted to UTC as per the original script
        week: 1,
        day: 1
    },
    {
        id: 2,
        userId: 1,
        exercise: 'squat',
        weight: 185,
        reps: 5,
        date: '2023-08-26T14:00:00Z',
        week: 1,
        day: 1
    },
    {
        id: 3,
        userId: 1,
        exercise: 'overheadpress',
        weight: 120,
        reps: 5,
        date: '2023-08-28T14:00:00Z',
        week: 1,
        day: 2
    },
    {
        id: 4,
        userId: 1,
        exercise: 'deadlift',
        weight: 215,
        reps: 5,
        date: '2023-08-28T14:00:00Z',
        week: 1,
        day: 2
    },
    {
        id: 5,
        userId: 1,
        exercise: 'benchpress',
        weight: 140,
        reps: 5,
        date: '2023-09-02T14:00:00Z',  // Converted to UTC as per the original script
        week: 1,
        day: 1
    },
    {
        id: 6,
        userId: 1,
        exercise: 'squat',
        weight: 185,
        reps: 5,
        date: '2023-09-02T14:00:00Z',
        week: 1,
        day: 1
    }
];

// Define workout schedules for Week 1 and Week 2 with formatted exercise names
const weekSchedule = [
    { week: 1, day: 1, exercises: ["benchpress", "squat"] },
    { week: 1, day: 2, exercises: ["overheadpress", "deadlift"] },
    { week: 1, day: 3, exercises: ["benchpress", "squat"] },
    { week: 2, day: 1, exercises: ["overheadpress", "squat"] },
    { week: 2, day: 2, exercises: ["benchpress", "deadlift"] },
    { week: 2, day: 3, exercises: ["overheadpress", "squat"] }
];

// Get the current date in the user's timezone
const today = moment.tz(user.timezone).startOf('day');

// Calculate the most recent Sunday and the Saturday two weeks later
const currentDayOfWeek = today.day(); // Sunday = 0, Monday = 1, ..., Saturday = 6
const mostRecentSunday = today.clone().subtract(currentDayOfWeek, 'days');
const twoWeeksSaturday = mostRecentSunday.clone().add(13, 'days');

// Function to get the most recent weight for each lift
function getMostRecentWeights(lifts) {
    const recentWeights = {};

    lifts.forEach(lift => {
        const exercise = lift.exercise;
        const liftDate = moment(lift.date);

        // If this exercise hasn't been seen before, or this lift is more recent, update it
        if (!recentWeights[exercise] || liftDate.isAfter(recentWeights[exercise].recent_date)) {
            recentWeights[exercise] = {
                weight: lift.weight,
                reps: lift.reps,
                recent_date: liftDate
            };
        }
    });

    return recentWeights;
}

// Function to calculate the next weight based on the most recent lift
function calculateNextWeight(exercise, mostRecentLift) {
    let adjustment = 0;

    if (mostRecentLift.reps >= 5) {
        // Increase weight
        if (exercise === 'benchpress' || exercise === 'overheadpress') {
            adjustment = 2.5;
        } else if (exercise === 'squat' || exercise === 'deadlift') {
            adjustment = 5;
        }
    } else {
        // Decrease weight by 10%
        adjustment = -0.1 * mostRecentLift.weight;
    }

    return Math.max(mostRecentLift.weight + adjustment, 0); // Ensure weight doesn't go negative
}

// Generate future workouts with adjusted weights
function generateFutureWorkouts(lifts, weekSchedule, user) {
    const recentWeights = getMostRecentWeights(lifts);

    const days = [];
    let lastLift = lifts[lifts.length - 1];
    let currentDate = mostRecentSunday.clone();  // Start from the most recent Sunday
    let currentWeek = lastLift.week;
    let currentDay = lastLift.day + 1;

    if (currentDay > 3) {
        currentDay = 1;
        currentWeek = currentWeek === 1 ? 2 : 1;
    }

    while (currentDate.isSameOrBefore(twoWeeksSaturday)) {
        const dayOfWeek = currentDate.day();

        if (user.workoutDays.includes(dayOfWeek)) {
            const dateStr = currentDate.format('YYYY-MM-DD');

            const workout = weekSchedule.find(ws => ws.week === currentWeek && ws.day === currentDay);

            if (workout) {
                workout.exercises.forEach(exercise => {
                    const mostRecentLift = recentWeights[exercise];
                    const nextWeight = calculateNextWeight(exercise, mostRecentLift);

                    let exerciseObject = {};
                    exerciseObject['date'] = dateStr;
                    exerciseObject['week'] = currentWeek;
                    exerciseObject['day'] = currentDay;
                    exerciseObject[exercise] = nextWeight;
                    days.push(exerciseObject);
                });
            }

            currentDay++;
            if (currentDay > 3) {
                currentDay = 1;
                currentWeek = currentWeek === 1 ? 2 : 1;
            }
        }

        currentDate.add(1, 'day');
    }

    return days;
}

// Generate the workouts
const futureWorkouts = generateFutureWorkouts(lifts, weekSchedule, user);

// Output the JSON
console.log(JSON.stringify(futureWorkouts, null, 2));