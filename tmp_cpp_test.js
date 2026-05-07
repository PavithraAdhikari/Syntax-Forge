const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

(async () => {
  const code = `#include <iostream>
int main(){int x; std::cin>>x; std::cout<<x; return 0;}`;
  const res = await fetch('http://localhost:5000/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language: 'cpp', code, input: '123' }),
  });
  const text = await res.text();
  console.log(text);
})();
