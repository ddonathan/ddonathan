const sqlite3 = require('sqlite3').verbose();

// Connect to the SQLite database
const db = new sqlite3.Database('./database.sqlite');

// Function to list data from a table
function listTableData(tableName) {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM ${tableName}`, [], (err, rows) => {
            if (err) {
                return reject(err);
            }
            console.log(`\nData from ${tableName} table:`);
            console.table(rows);
            resolve();
        });
    });
}

// List data from all tables
async function listAllData() {
    try {
        await listTableData('users');
        await listTableData('progress');
        await listTableData('exercises');
    } catch (err) {
        console.error('Error listing table data:', err);
    } finally {
        db.close();
    }
}

// Run the function to list all data
listAllData();