const db = require('./db/connection'); console.log(db.prepare('SELECT id, name, created_at FROM applications').all());  
