async function test() {
  const url = 'http://localhost:5001/api/purchases/report?startDate=2026-04-01&endDate=2026-05-30';
  console.log('Testing URL:', url);
  try {
    const response = await fetch(url);
    console.log('Response Status:', response.status);
    const data = await response.json();
    console.log('Data Length:', data.length);
    if (data.length > 0) {
      console.log('First Record Date:', data[0].date);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
