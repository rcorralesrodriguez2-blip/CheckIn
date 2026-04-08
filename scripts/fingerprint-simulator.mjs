import { WebSocketServer } from 'ws';

/**
 * SIMULADOR DE LECTOR DE HUELLA DIGITAL (DigitalPersona Wrapper)
 * Este script emula el servicio local que corre en el puerto 52182.
 */

const PORT = 52182;
const wss = new WebSocketServer({ port: PORT });

console.log(`\x1b[32m%s\x1b[0m`, `★ Simulador de Huella Iniciado en ws://localhost:${PORT}`);
console.log(`Esperando conexión de la App de CheckIn...\n`);

wss.on('connection', (ws) => {
  console.log(`\x1b[36m%s\x1b[0m`, `[WS] Cliente Conectado`);

  ws.on('message', (message) => {
    try {
      const request = JSON.parse(message.toString());
      console.log(`\x1b[2m%s\x1b[0m`, `[RECEIVE]`, request);

      if (request.Method === 'Subscribe' && request.Type === 'fingerprint') {
        console.log(`\x1b[33m%s\x1b[0m`, `[SYSTEM] App suscrita a eventos de huella. Simulando espera...`);
        
        // Simular que el usuario pone el dedo después de 2 segundos
        setTimeout(() => {
          console.log(`\x1b[35m%s\x1b[0m`, `[ACTION] ¡Dedo detectado en el simulador! Enviando datos...`);
          
          const mockFingerprintData = {
            Event: 'SamplesAcquired',
            Data: {
              SampleFormat: 1,
              Samples: ["MockFingerprintTemplateBase64DataString_" + Math.random().toString(36).substring(7)]
            }
          };

          ws.send(JSON.stringify(mockFingerprintData));
          console.log(`\x1b[32m%s\x1b[0m`, `[SUCCESS] Datos de huella enviados a la App.`);
        }, 3000);
      }
    } catch (e) {
      console.error(`[ERROR] Error procesando mensaje:`, e.message);
    }
  });

  ws.on('close', () => {
    console.log(`\x1b[31m%s\x1b[0m`, `[WS] Cliente Desconectado`);
  });
});
