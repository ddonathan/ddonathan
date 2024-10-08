const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const moment = require('moment-timezone');

// Connect to the SQLite database
const db = new sqlite3.Database(path.join(__dirname, './', 'database.db'));

// Function to reinitialize the database
function reinitializeDb() {
    db.serialize(() => {
        // Drop existing tables if they exist
        db.run(`DROP TABLE IF EXISTS users`);
        db.run(`DROP TABLE IF EXISTS progress`);

        // Create the users table with the correct schema
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            name TEXT NOT NULL,
            age INTEGER NOT NULL,
            weight REAL NOT NULL,
            workoutDays TEXT NOT NULL,
            timezone TEXT NOT NULL
        )`);

        // Create the progress table with the correct schema
        db.run(`CREATE TABLE IF NOT EXISTS progress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER NOT NULL,
            exercise TEXT NOT NULL,
            weight REAL NOT NULL,
            reps INTEGER NOT NULL,
            date TEXT NOT NULL,
            FOREIGN KEY(userId) REFERENCES users(id)
        )`);

        // Insert sample user
        db.run(`INSERT INTO users (email, password, name, age, weight, workoutDays, timezone) VALUES (?, ?, ?, ?, ?, ?, ?)`, 
            ['dan@donathan.com', 'Dan', 'Dan', 44, 200, 'Monday,Wednesday,Friday', 'America/Los_Angeles'], function(err) {
            if (err) {
                console.error('Error inserting user:', err);
                return;
            }

            const userId = this.lastID;
            console.log('Inserted User ID:', userId);

            // Insert historical lifts for the user
            const lifts = [
                { date: '2023-08-26T07:00:00', exercise: 'Squat', weight: 185, reps: 5 },
                { date: '2023-08-26T07:00:00', exercise: 'Overhead Press', weight: 120, reps: 5 },
                { date: '2023-08-28T07:00:00', exercise: 'Bench Press', weight: 140, reps: 5 },
                { date: '2023-08-28T07:00:00', exercise: 'Deadlift', weight: 215, reps: 5 }
            ];

            let completedLifts = 0;

            lifts.forEach(lift => {
                // const utcDate = moment.tz(lift.date, 'America/Los_Angeles').utc().format('YYYY-MM-DDTHH:mm:ss[Z]');
                db.run(`INSERT INTO progress (userId, exercise, weight, reps, date) VALUES (?, ?, ?, ?, ?)`, 
                    [userId, lift.exercise, lift.weight, lift.reps, lift.date], function(err) {
                    if (err) {
                        console.error('Error inserting lift:', err);
                    } else {
                        console.log('Inserted Lift:', { id: this.lastID, userId, ...lift, date: lift.date });
                    }

                    completedLifts++;
                    if (completedLifts === lifts.length) {
                        console.log('Database reinitialized with sample data.');
                        // Close the database connection after all operations are done
                        db.close();
                    }
                });
            });
        });
    });
}

// Reinitialize the database
reinitializeDb();