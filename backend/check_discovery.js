const db = require('./db/connection'); console.log(db.prepare('SELECT * FROM discovery_results WHERE application_id = ?').all('7e917db6-3053-4139-bab0-765d01b6ccd4'));  
