async function checkAuth() {
    try {
        const response = await fetch('/check-auth');
        if (!response.ok) {
            document.getElementById('main-content').style.display = 'none';
            document.getElementById('login-form').style.display = 'block';
        } else {
            document.getElementById('main-content').style.display = 'block';
            document.getElementById('login-form').style.display = 'none';
        }
    } catch (error) {
        console.error('Error checking authentication:', error);
        document.getElementById('main-content').style.display = 'none';
        document.getElementById('login-form').style.display = 'block';
    }
}

function formatDateToLocal(dateString, timezone) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { timeZone: timezone });
}

function formatDate(dateString) {
    const date = new Date(dateString + 'T00:00:00Z'); // Force UTC to avoid time zone issues
    return date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function getCurrentDate() {
    const today = new Date();
    const year = today.getUTCFullYear();
    const month = String(today.getUTCMonth() + 1).padStart(2, '0');
    const day = String(today.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

async function getLastPerformance() {
    try {
        const response = await fetch('/getLastPerformance');
        if (!response.ok) {
            if (response.status === 401) {
                document.getElementById('main-content').style.display = 'none';
                document.getElementById('login-form').style.display = 'block';
                return;
            }
            throw new Error('Failed to fetch last performance');
        }
        const data = await response.json();
        console.log('Last Performance Data:', data); // Log the data to verify

        if (data.success) {
            const forecastTable = document.getElementById('forecastTable');
            forecastTable.innerHTML = '<tr><th>Date</th><th>Squat</th><th>Bench</th><th>Deadlift</th><th>Press</th></tr>'; // Clear the table before inserting rows

            const groupedResults = {};

            // Group results by date
            data.results.forEach(entry => {
                if (!groupedResults[entry.date]) {
                    groupedResults[entry.date] = {};
                }
                groupedResults[entry.date] = { ...groupedResults[entry.date], ...entry };
            });

            // Sort dates
            const sortedDates = Object.keys(groupedResults).sort((a, b) => new Date(a) - new Date(b));

            // Populate the table
            sortedDates.forEach(date => {
                const row = forecastTable.insertRow();
                const dateCell = row.insertCell(0);
                const squatCell = row.insertCell(1);
                const benchCell = row.insertCell(2);
                const deadliftCell = row.insertCell(3);
                const pressCell = row.insertCell(4);
                dateCell.innerText = formatDate(date);
                squatCell.innerText = groupedResults[date].squat !== undefined ? groupedResults[date].squat : '';
                benchCell.innerText = groupedResults[date].bench !== undefined ? groupedResults[date].bench : '';
                deadliftCell.innerText = groupedResults[date].deadlift !== undefined ? groupedResults[date].deadlift : '';
                pressCell.innerText = groupedResults[date].press !== undefined ? groupedResults[date].press : '';
            });
        } else {
            console.error('Failed to fetch last performance data:', data);
        }
    } catch (error) {
        console.error('Error fetching last performance:', error);
    }
}

async function getProgress() {
    try {
        const response = await fetch('/profile');
        if (!response.ok) {
            if (response.status === 401) {
                document.getElementById('main-content').style.display = 'none';
                document.getElementById('login-form').style.display = 'block';
            }
            throw new Error('Failed to fetch user profile');
        }
        const data = await response.json();
        console.log('User Profile Data:', data); // Log the data to verify

        if (data.success) {
            const progressTable = document.getElementById('progress');
            data.progress.forEach(entry => {
                const row = progressTable.insertRow();
                const exerciseCell = row.insertCell(0);
                const weightCell = row.insertCell(1);
                const repsCell = row.insertCell(2);
                const dateCell = row.insertCell(3);
                const successCell = row.insertCell(4);
                exerciseCell.innerText = entry.exercise;
                weightCell.innerText = entry.weight;
                repsCell.innerText = entry.reps;
                dateCell.innerText = formatDateToLocal(entry.date, data.user.timezone);
                successCell.innerText = entry.success ? 'Yes' : 'No';
            });
        } else {
            console.error('Failed to fetch user profile data:', data.message);
        }
    } catch (error) {
        console.error('Error fetching user profile:', error);
    }
}

async function addLift(event) {
    event.preventDefault();
    const exercise = document.getElementById('lift').value;
    const weight = document.getElementById('weight').value;
    const reps = document.getElementById('reps').value;
    const date = document.getElementById('date').value;
    try {
        const response = await fetch('/addLift', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ exercise, weight, reps, date })
        });
        const data = await response.json();
        if (data.success) {
            alert('Lift added successfully');
            getProgress();
        } else {
            alert('Failed to add lift: ' + data.message);
        }
    } catch (error) {
        console.error('Error adding lift:', error);
    }
}

async function login(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        if (response.ok) {
            window.location.href = '/';
        } else {
            alert('Failed to log in');
        }
    } catch (error) {
        console.error('Error logging in:', error);
    }
}

function editProfile() {
    window.location.href = '/editProfile.html';
}

window.onload = async () => {
    await checkAuth();
    getProgress(); // Get the user progress
    getLastPerformance(); // Get the forecasted lifts and populate the table
    document.getElementById('date').value = getCurrentDate();
};

async function getForecast() {
    try {
        const response = await fetch('/getLastPerformance');
        if (!response.ok) {
            throw new Error('Failed to fetch forecast data');
        }
        const data = await response.json();
        console.log('Forecast Results:', data.results); // Log the data to verify

        if (data.success) {
            const forecastTable = document.getElementById('forecastTable');
            const groupedResults = {};

            // Group results by date
            data.results.forEach(entry => {
                if (!groupedResults[entry.date]) {
                    groupedResults[entry.date] = { squat: '', bench: '', deadlift: '', press: '' };
                }
                if (entry.squat !== undefined) groupedResults[entry.date].squat = entry.squat;
                if (entry.bench !== undefined) groupedResults[entry.date].bench = entry.bench;
                if (entry.deadlift !== undefined) groupedResults[entry.date].deadlift = entry.deadlift;
                if (entry.press !== undefined) groupedResults[entry.date].press = entry.press;
            });

            // Display grouped results
            Object.keys(groupedResults).forEach(date => {
                const row = forecastTable.insertRow();
                const dateCell = row.insertCell(0);
                const squatCell = row.insertCell(1);
                const benchCell = row.insertCell(2);
                const deadliftCell = row.insertCell(3);
                const pressCell = row.insertCell(4);
                dateCell.innerText = date;
                squatCell.innerText = groupedResults[date].squat;
                benchCell.innerText = groupedResults[date].bench;
                deadliftCell.innerText = groupedResults[date].deadlift;
                pressCell.innerText = groupedResults[date].press;
            });
        } else {
            console.error('Failed to fetch forecast data:', data.message);
        }
    } catch (error) {
        console.error('Error fetching forecast data:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    getProgress();
    getLastPerformance(); // Fetch forecast and progress in one go
});
