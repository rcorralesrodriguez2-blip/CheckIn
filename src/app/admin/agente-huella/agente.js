const WebSocket = require('ws');

const PORT = 52182;
const DP_PORT = 52181;

const wss = new WebSocket.Server({ port: PORT });
console.log(`🟢 Agente huella escuchando en ws://127.0.0.1:${PORT}`);

wss.on('connection', (ws) => {
  console.log('🔗 Cliente conectado');

  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg);
      if (data.Method === 'Subscribe' && data.Type === 'fingerprint') {
        console.log('👆 Conectando con DpHostW...');
        
        // Conectar al DpHostW real
        const dpWs = new WebSocket(`ws://127.0.0.1:${DP_PORT}`);
        
        dpWs.onopen = () => {
          console.log('✅ Conectado a DpHostW');
          dpWs.send(JSON.stringify({
            Method: 'Subscribe',
            Type: 'fingerprint'
          }));
        };

        dpWs.onmessage = (event) => {
          console.log('📨 DpHostW respondió:', event.data);
          // Reenviar al navegador
          ws.send(event.data);
        };

        dpWs.onerror = (e) => {
          console.log('❌ Error DpHostW:', e.message);
          // Si falla, usar datos reales del lector via ffi
          ws.send(JSON.stringify({ Event: 'Error', Message: 'No se pudo conectar a DpHostW' }));
        };

        dpWs.onclose = (e) => {
          console.log('🔌 DpHostW cerrado:', e.code);
        };
      }
    } catch (e) {
      console.error('Error:', e);
    }
  });

  ws.on('close', () => console.log('🔌 Cliente desconectado'));
});