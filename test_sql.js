const http = require('http');

function testSQL() {
  // Test 1: Valid SQL compilation
  const validSQL = `CREATE TABLE users (id INTEGER, name TEXT);
INSERT INTO users VALUES (1, 'John'), (2, 'Jane');
SELECT * FROM users;`;

  const compileData = JSON.stringify({ language: 'sql', code: validSQL });
  const compileOptions = {
    hostname: 'localhost',
    port: 5000,
    path: '/compile',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(compileData),
    },
  };

  const compileReq = http.request(compileOptions, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
      console.log('=== SQL COMPILE TEST ===');
      console.log('Status:', res.statusCode);
      console.log('Response:', body);
      console.log();

      // Test 2: SQL execution
      const runData = JSON.stringify({ language: 'sql', code: validSQL });
      const runOptions = {
        hostname: 'localhost',
        port: 5000,
        path: '/run',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(runData),
        },
      };

      const runReq = http.request(runOptions, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          console.log('=== SQL RUN TEST ===');
          console.log('Status:', res.statusCode);
          console.log('Response:', body);
        });
      });

      runReq.on('error', (e) => console.error('RUN ERROR:', e));
      runReq.write(runData);
      runReq.end();
    });
  });

  compileReq.on('error', (e) => console.error('COMPILE ERROR:', e));
  compileReq.write(compileData);
  compileReq.end();
}

testSQL();