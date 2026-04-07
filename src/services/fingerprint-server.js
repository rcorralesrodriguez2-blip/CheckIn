const http = require('http');
const { exec } = require('child_process');

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.url === '/capture' && req.method === 'GET') {
    // Usa DPWebFP.dll via el ejecutable del ADC
    exec('"C:\\Program Files\\HID Global\\Authentication Device Client\\Bin\\DpHostW.exe"', 
      (error, stdout, stderr) => {
        if (error) {
          res.end(JSON.stringify({ status: 'error', message: error.message }));
          return;
        }
        res.end(JSON.stringify({ status: 'success', data: stdout }));
    });
  } else {
    res.end(JSON.stringify({ status: 'error', message: 'Not found' }));
  }
});

server.listen(3001, () => console.log('Fingerprint server running on port 3001'));