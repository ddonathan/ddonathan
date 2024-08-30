const sqlite3 = require('sqlite3').verbose();

// Connect to the SQLite database
const db = new sqlite3.Database('./database.sqlite');

// Function to update the database schema and clear all data
function updateSchema() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Drop existing tables if they exist
            db.run(`DROP TABLE IF EXISTS users`, (err) => {
                if (err) {
                    return reject(err);
                }
                console.log('Users table dropped.');
            });

            db.run(`DROP TABLE IF EXISTS progress`, (err) => {
                if (err) {
                    return reject(err);
                }
                console.log('Progress table dropped.');
            });

            db.run(`DROP TABLE IF EXISTS exercises`, (err) => {
                if (err) {
                    return reject(err);
                }
                console.log('Exercises table dropped.');
            });

            // Create the users table with the correct schema
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                age INTEGER,
                weight REAL,
                email TEXT UNIQUE,
                password TEXT,
                workoutDays TEXT
            )`, (err) => {
                if (err) {
                    return reject(err);
                }
                console.log('Users table created.');
            });

            // Create the progress table with the correct schema
            db.run(`CREATE TABLE IF NOT EXISTS progress (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId INTEGER,
                exercise TEXT,
                weight REAL,
                reps INTEGER,
                date TEXT,
                success INTEGER,
                FOREIGN KEY(userId) REFERENCES users(id)
            )`, (err) => {
                if (err) {
                    return reject(err);
                }
                console.log('Progress table created.');
            });

            // Create the exercises table with the correct schema
            db.run(`CREATE TABLE IF NOT EXISTS exercises (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId INTEGER,
                name TEXT,
                weightIncrease REAL,
                FOREIGN KEY(userId) REFERENCES users(id)
            )`, (err) => {
                if (err) {
                    return reject(err);
                }
                console.log('Exercises table created.');
                resolve();
            });
        });
    });
}

// Update the database schema
updateSchema()
    .then(() => {
        console.log('Database schema updated and all data cleared successfully.');
    })
    .catch((err) => {
        console.error('Error updating database schema:', err);
    })
    .finally(() => {
        db.close();
    });