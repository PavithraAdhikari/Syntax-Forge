const http = require('http');
const data = JSON.stringify({language:'cpp', code:'#include <iostream>\nint main(){int x,; std::cout<<x; return 0;}' });
const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/compile',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
  },
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    console.log('status', res.statusCode);
    console.log('body', body);
  });
});

req.on('error', (e) => console.error('REQUEST ERROR', e));
req.write(data);
req.end();
