export interface FingerprintScanResult {
  template: string;
  status: 'success' | 'error' | 'unavailable';
  message?: string;
}

const FINGERPRINT_SERVICE_URL = process.env.NEXT_PUBLIC_FINGERPRINT_SERVICE_URL || 'ws://127.0.0.1:52182';
const FINGERPRINT_TIMEOUT = 8000; // 8 segundos

export async function captureFingerprint(): Promise<FingerprintScanResult> {
  // Verificar si el navegador soporta WebSocket
  if (typeof window === 'undefined' || !window.WebSocket) {
    return {
      status: 'unavailable',
      template: '',
      message: 'WebSocket no soportado en este navegador',
    };
  }

  return new Promise((resolve) => {
    let ws: WebSocket | null = null;
    let timeout: NodeJS.Timeout | null = null;
    let isResolved = false;

    const cleanup = () => {
      if (timeout) clearTimeout(timeout);
      if (ws) {
        try {
          ws.close();
        } catch (e) {
          // Ignorar errores al cerrar
        }
      }
    };

    const resolveOnce = (result: FingerprintScanResult) => {
      if (!isResolved) {
        isResolved = true;
        cleanup();
        resolve(result);
      }
    };

    try {
      ws = new WebSocket(FINGERPRINT_SERVICE_URL);

      timeout = setTimeout(() => {
        console.warn('⏱️ Timeout esperando huella dactilar');
        resolveOnce({
          status: 'error',
          template: '',
          message: 'Tiempo de espera agotado. Asegúrese de que el lector esté conectado.',
        });
      }, FINGERPRINT_TIMEOUT);

      ws.onopen = () => {
        console.log('✅ WebSocket conectado al servicio de huella');
        try {
          ws!.send(JSON.stringify({
            Method: 'Subscribe',
            Type: 'fingerprint'
          }));
        } catch (e) {
          console.error('Error enviando mensaje:', e);
          resolveOnce({
            status: 'error',
            template: '',
            message: 'Error comunicándose con el lector',
          });
        }
      };

      ws.onmessage = (event) => {
        console.log('📨 Mensaje recibido del lector:', event.data);
        try {
          const data = JSON.parse(event.data);
          if (data.Event === 'SamplesAcquired' && data.Data) {
            console.log('✅ Huella capturada exitosamente');
            resolveOnce({ 
              status: 'success', 
              template: btoa(JSON.stringify(data.Data)),
              message: 'Huella registrada'
            });
          }
        } catch (e) {
          console.warn('Error procesando mensaje:', e);
        }
      };

      ws.onerror = (event) => {
        console.error('❌ Error WebSocket:', event);
        resolveOnce({
          status: 'unavailable',
          template: '',
          message: 'Lector no detectado. Asegúrese de que el "DigitalPersona Web Service" esté activo o ejecute "npm run fingerprint-sim" para pruebas.',
        });
      };

      ws.onclose = (event) => {
        console.log('🔌 Conexión WebSocket cerrada. Código:', event.code, 'Razón:', event.reason);
        if (!isResolved && event.code !== 1000) {
          resolveOnce({
            status: 'error',
            template: '',
            message: `Conexión cerrada inesperadamente: código ${event.code}`,
          });
        }
      };

    } catch (error: any) {
      console.error('Error en captureFingerprint:', error);
      resolveOnce({ 
        status: 'error', 
        template: '', 
        message: error?.message || 'Error desconocido al capturar huella'
      });
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