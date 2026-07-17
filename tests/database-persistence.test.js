const test = require('node:test');
const assert = require('node:assert/strict');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { app, db } = require('../server');

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

test('POST /api/materials writes a real row when the database is briefly locked', async () => {
  const uniqueName = `Lock Test ${Date.now()}`;
  const port = 0;
  const server = app.listen(port);
  await new Promise(resolve => server.once('listening', resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const lockDb = new sqlite3.Database(path.join(__dirname, '..', 'Database', 'Materialtracker.db'));
  await new Promise((resolve, reject) => {
    lockDb.serialize(() => {
      lockDb.run('BEGIN IMMEDIATE', err => {
        if (err) return reject(err);
        resolve();
      });
    });
  });

  const responsePromise = fetch(`${baseUrl}/api/materials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: uniqueName,
      type: 'PLA',
      manufacturer: 'Test',
      colour: 'Blue',
      currentStock: 3,
      minimumStock: 1,
      unit: 'kg',
      applicationType: 'Filament',
      notes: 'regression test'
    })
  });

  await wait(200);
  await new Promise((resolve, reject) => {
    lockDb.run('COMMIT', err => (err ? reject(err) : resolve()));
  });
  await lockDb.close();

  const response = await responsePromise;
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.success, true);

  const row = await new Promise((resolve, reject) => {
    db.get('SELECT MaterialName, MaterialID FROM Materials WHERE MaterialName = ?', [uniqueName], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });

  assert.ok(row, 'expected a material row to be created');
  assert.equal(row.MaterialName, uniqueName);

  await new Promise(resolve => server.close(resolve));
  await new Promise((resolve, reject) => {
    db.run('DELETE FROM Materials WHERE MaterialName = ?', [uniqueName], err => (err ? reject(err) : resolve()));
  });
});
