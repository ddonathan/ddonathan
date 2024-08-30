const express = require('express');
const session = require('express-session');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const app = express();

// Initialize the database connection
const db = new sqlite3.Database(path.join(__dirname, 'database', 'database.db'), (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

// Create tables if they do not exist
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        age INTEGER NOT NULL,
        weight REAL NOT NULL,
        workoutDays TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        exercise TEXT NOT NULL,
        weight REAL NOT NULL,
        reps INTEGER NOT NULL,
        date TEXT NOT NULL,
        FOREIGN KEY(userId) REFERENCES users(id)
    )`);
});

// Session configuration
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// Middleware to parse JSON bodies
app.use(express.json());

// Middleware to check if the user is logged in
function checkAuth(req, res, next) {
    if (req.session && req.session.userId) {
        return next();
    } else {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
}

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// User login
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, user) => {
        if (err) {
            console.error('Error fetching user:', err);
            return res.json({ success: false });
        }

        if (!user || user.password !== password) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        // Set the session userId
        req.session.userId = user.id;
        res.json({ success: true });
    });
});

// User registration
app.post('/register', (req, res) => {
    const { email, password, workoutDays } = req.body;
    db.run(`INSERT INTO users (email, password, workoutDays) VALUES (?, ?, ?)`, [email, password, workoutDays], function(err) {
        if (err) {
            console.error('Error registering user:', err);
            return res.json({ success: false, message: 'Registration failed' });
        }
        res.json({ success: true, userId: this.lastID });
    });
});

// Check authentication status
app.get('/check-auth', (req, res) => {
    if (req.session && req.session.userId) {
        res.json({ authenticated: true });
    } else {
        res.json({ authenticated: false });
    }
});

// Update user profile
app.post('/edit-profile', checkAuth, (req, res) => {
    const { email, password, name, age, weight, workoutDays, timezone } = req.body;
    db.run(`UPDATE users SET email = ?, password = ?, name = ?, age = ?, weight = ?, workoutDays = ?, timezone = ? WHERE id = ?`, [email, password, name, age, weight, workoutDays, timezone, req.session.userId], function(err) {
        if (err) {
            console.error('Error updating user profile:', err);
            return res.json({ success: false, message: 'Profile update failed' });
        }
        res.json({ success: true });
    });
});

// Get user profile
app.get('/profile', checkAuth, (req, res) => {
    db.get(`SELECT email, name, age, weight, workoutDays, timezone FROM users WHERE id = ?`, [req.session.userId], (err, user) => {
        if (err) {
            console.error('Error fetching user profile:', err);
            return res.json({ success: false });
        }

        db.all(`SELECT * FROM progress WHERE userId = ?`, [req.session.userId], (err, progress) => {
            if (err) {
                console.error('Error fetching user progress:', err);
                return res.json({ success: false });
            }

            res.json({ success: true, user, progress });
        });
    });
});

// Add lift
app.post('/addLift', checkAuth, (req, res) => {
    const { exercise, weight, reps, date } = req.body;
    const utcDate = new Date(date).toISOString(); // Convert to UTC
    db.run(`INSERT INTO progress (userId, exercise, weight, reps, date) VALUES (?, ?, ?, ?, ?)`, [req.session.userId, exercise, weight, reps, utcDate], function(err) {
        if (err) {
            console.error('Error adding lift:', err);
            return res.json({ success: false, message: 'Failed to add lift' });
        }
        console.log('Lift added:', { id: this.lastID, userId: req.session.userId, exercise, weight, reps, date: utcDate });
        res.json({ success: true, liftId: this.lastID });
    });
});

// Get last performance details for each lift and forecast next lifts
app.get('/getLastPerformance', checkAuth, (req, res) => {
    const lifts = ['Squat', 'Bench Press', 'Deadlift', 'Overhead Press'];
    const results = [];
    let completedRequests = 0;

    // Fetch the user's selected workout days
    db.get(`SELECT workoutDays FROM users WHERE id = ?`, [req.session.userId], (err, user) => {
        if (err) {
            console.error('Error fetching user workout days:', err);
            return res.json({ success: false });
        }

        console.log('User Workout Days:', user.workoutDays);

        const workoutDays = user.workoutDays.split(',');

        // Generate the next two weeks of dates for the selected workout days
        const today = new Date();
        const dates = [];
        for (let i = 0; i < 14; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
            if (workoutDays.includes(dayOfWeek)) {
                dates.push(date.toISOString().split('T')[0]);
            }
        }

        console.log('Generated Dates:', dates);

        // Define the workout schedule
        const schedule = [
            ['Overhead Press', 'Squat'], // Day 1
            ['Bench Press', 'Deadlift'], // Day 2
            ['Overhead Press', 'Squat'], // Day 3
            ['Bench Press', 'Squat'], // Day 4
            ['Overhead Press', 'Deadlift'], // Day 5
            ['Bench Press', 'Squat'] // Day 6
        ];

        // Fetch the last performance for each lift and forecast the next lifts
        lifts.forEach((lift, index) => {
            db.get(`SELECT * FROM progress WHERE userId = ? AND exercise = ? ORDER BY date DESC LIMIT 1`, [req.session.userId, lift], (err, row) => {
                if (err) {
                    console.error('Error fetching last performance:', err);
                    return res.json({ success: false });
                }

                console.log(`Last Performance for ${lift}:`, row);

                const lastPerformance = row || { exercise: lift, weight: null, reps: null, date: null };
                const nextWeight = lastPerformance.weight !== null && lastPerformance.reps >= 5 ? lastPerformance.weight + (lift === 'Bench Press' || lift === 'Overhead Press' ? 2.5 : 5) : lastPerformance.weight !== null ? lastPerformance.weight - (lift === 'Bench Press' || lift === 'Overhead Press' ? 2.5 : 5) : null;

                dates.forEach((date, i) => {
                    const dayIndex = i % 6; // Cycle through the 6-day schedule
                    if (schedule[dayIndex].includes(lift)) {
                        const result = {
                            date,
                            squat: lift === 'Squat' ? nextWeight : undefined,
                            bench: lift === 'Bench Press' ? nextWeight : undefined,
                            deadlift: lift === 'Deadlift' ? nextWeight : undefined,
                            press: lift === 'Overhead Press' ? nextWeight : undefined
                        };
                        results.push(result);
                    }
                });

                completedRequests++;
                if (completedRequests === lifts.length) {
                    // Sort results by date
                    results.sort((a, b) => new Date(a.date) - new Date(b.date));
                    console.log('Forecast Results:', results);
                    res.json({ success: true, results });
                }
            });
        });
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});