const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

(async () => {
  console.log("Testing COMPILE endpoint with FAULTY code...\n");

  // Test 1: Faulty C++ code (syntax error)
  console.log("Test 1: Compiling C++ with syntax error");
  const faultyCode = `#include <iostream>
int main(){int x,; std::moot<<x; return 0;}`; // Multiple errors: extra comma, typo "moot"

  const res1 = await fetch('http://localhost:5000/compile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language: 'cpp', code: faultyCode }),
  });
  const data1 = await res1.json();
  console.log("Status:", res1.status);
  console.log("Response:", data1);
  console.log();

  // Test 2: Valid C++ code
  console.log("Test 2: Compiling valid C++ code");
  const validCode = `#include <iostream>
int main(){int x; std::cin>>x; std::cout<<x; return 0;}`;

  const res2 = await fetch('http://localhost:5000/compile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language: 'cpp', code: validCode }),
  });
  const data2 = await res2.json();
  console.log("Status:", res2.status);
  console.log("Response:", data2);
  console.log();

  // Test 3: Faulty Python code
  console.log("Test 3: Compiling Python with syntax error");
  const faultyPy = `def hello(
print('hello')`; // Missing closing parenthesis

  const res3 = await fetch('http://localhost:5000/compile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language: 'python', code: faultyPy }),
  });
  const data3 = await res3.json();
  console.log("Status:", res3.status);
  console.log("Response:", data3);
})();
