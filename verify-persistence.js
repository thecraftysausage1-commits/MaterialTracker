const http = require('http');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const name = `Verification ${Date.now()}`;
const payload = JSON.stringify({
  name,
  type: 'PLA',
  manufacturer: 'Test',
  colour: 'Blue',
  currentStock: 3,
  minimumStock: 1,
  unit: 'kg',
  applicationType: 'Filament',
  notes: 'verification script'
});

const req = http.request({
  hostname: '127.0.0.1',
  port: 3000,
  path: '/api/materials',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('HTTP response:', body);
    const db = new sqlite3.Database(path.join(__dirname, 'Database', 'Materialtracker.db'));
    db.get('SELECT MaterialID, MaterialName FROM Materials WHERE MaterialName = ?', [name], (err, row) => {
      if (err) {
        console.error(err);
        db.close();
        process.exit(1);
      }
      console.log('DB row:', JSON.stringify(row));
      db.close();
    });
  });
});

req.on('error', (err) => {
  console.error(err);
  process.exit(1);
});

req.write(payload);
req.end();
