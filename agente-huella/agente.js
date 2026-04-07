const WebSocket = require('ws');
const ffi = require('ffi-napi');

const PORT = 52182;
const BIN = 'C:\\Program Files\\HID Global\\Authentication Device Client\\Bin\\';

// Cargar dependencias primero
try { ffi.Library(BIN + 'DPWbfDevice', {}); } catch(e) {}
try { ffi.Library(BIN + 'DPDevTS', {}); } catch(e) {}
try { ffi.Library(BIN + 'DPMux', {}); } catch(e) {}

let lib;
try {
  lib = ffi.Library(BIN + 'DPDeviceBioMini', {
    'UFS_Init': ['int', []],
    'UFS_Uninit': ['int', []],
    'UFS_GetScannerNumber': ['int', []],
  });
  console.log('✅ SDK cargado correctamente');
} catch(e) {
  console.log('❌ Error:', e.message);
  process.exit(1);
}

const wss = new WebSocket.Server({ port: PORT });
console.log(`🟢 Agente escuchando en ws://127.0.0.1:${PORT}`);

wss.on('connection', (ws) => {
  console.log('🔗 Cliente conectado');
  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg);
      if (data.Method === 'Subscribe' && data.Type === 'fingerprint') {
        console.log('👆 Iniciando captura...');
        ws.send(JSON.stringify({ Event: 'DeviceConnected' }));
        const ret = lib.UFS_Init();
        console.log('UFS_Init:', ret);
        const count = lib.UFS_GetScannerNumber();
        console.log('Lectores:', count);
        if (count === 0) {
          ws.send(JSON.stringify({ Event: 'Error', Message: 'No se encontró lector' }));
          return;
        }
        ws.send(JSON.stringify({ Event: 'SamplesAcquired', Data: { Samples: ['dGVzdA=='], SampleFormat: 'Raw' } }));
      }
    } catch(e) {
      console.error('Error:', e.message);
    }
  });
  ws.on('close', () => console.log('🔌 Desconectado'));
});