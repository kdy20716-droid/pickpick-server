import http from 'http';

async function testVote() {
  const req = http.request({
    hostname: 'localhost',
    port: 4000,
    path: '/api/votes/1',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, (res) => {
    let data = '';
    res.on('data', d => data += d);
    res.on('end', () => console.log(res.statusCode, data));
  });
  
  req.write(JSON.stringify({ user_id: 1, selected_side: 'A' }));
  req.end();
}

testVote();