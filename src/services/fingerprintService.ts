export interface FingerprintScanResult {
  template: string;
  status: 'success' | 'error';
  message?: string;
}

export async function captureFingerprint(): Promise<FingerprintScanResult> {
  return new Promise((resolve) => {
    try {
      const ws = new WebSocket('ws://127.0.0.1:52182');

      const timeout = setTimeout(() => {
        ws.close();
        resolve({
          status: 'error',
          template: '',
          message: `Timeout. readyState: ${ws.readyState}`,
        });
      }, 8000);

      ws.onopen = () => {
        console.log('✅ WebSocket conectado!');
        ws.send(JSON.stringify({
          Method: 'Subscribe',
          Type: 'fingerprint'
        }));
      };

      ws.onmessage = (event) => {
        console.log('📨 Mensaje recibido:', event.data);
        try {
          const data = JSON.parse(event.data);
          if (data.Event === 'SamplesAcquired' && data.Data) {
            clearTimeout(timeout);
            ws.close();
            resolve({ status: 'success', template: btoa(JSON.stringify(data.Data)) });
          }
        } catch (e) {}
      };

      ws.onerror = (e) => {
        console.log('❌ WebSocket error:', e);
        clearTimeout(timeout);
        resolve({
          status: 'error',
          template: '',
          message: 'Error de conexión. Ver consola para detalles.',
        });
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket cerrado. Code:', event.code, 'Reason:', event.reason);
        if (event.code !== 1000) {
          clearTimeout(timeout);
          resolve({
            status: 'error',
            template: '',
            message: `Cerrado: código ${event.code} - ${event.reason || 'sin razón'}`,
          });
        }
      };

    } catch (error: any) {
      resolve({ status: 'error', template: '', message: error?.message });
    }
  });
}

export async function identifyUserByFingerprint(
  liveTemplate: string,
  users: { id: string; fingerprintTemplate?: string }[]
): Promise<string | null> {
  const match = users.find(u => u.fingerprintTemplate === liveTemplate);
  return match ? match.id : null;
}