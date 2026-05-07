(async () => {
  try {
    const res = await fetch('http://localhost:5000/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: 'python', code: 'print(\"HELLO\")', input: '' }),
    });
    const text = await res.text();
    console.log(text);
  } catch (err) {
    console.error(err);
  }
})();
