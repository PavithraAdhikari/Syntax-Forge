const http = require('http');

const data = JSON.stringify({
  language: 'cpp',
  code: '#include <iostream>\nint main(){int x; std::cin>>x; std::cout<<x; return 0;}',
  input: '123',
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/run',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
  },
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => (body += chunk));
  res.on('end', () => {
    console.log(body);
  });
});

req.on('error', (err) => {
  console.error(err);
});

req.write(data);
req.end();
