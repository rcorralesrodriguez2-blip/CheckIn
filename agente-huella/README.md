# Agente de Huella Dactilar

Este directorio contiene el servicio que comunica la aplicación web con el lector de huellas U.are.U 4500.

## Instalación

### Requisitos Previos

1. **Lector U.are.U 4500** conectado a la computadora
2. **Drivers instalados**: Descárgalos desde [HID Global](https://www.hidglobal.com/products/uareuthenticators/)
3. **Node.js 14+**: [Descargalos](https://nodejs.org/)
4. **Windows** (actualmente soporta solo Windows - requiere SDK de HID Global)

### Pasos de Instalación

1. **Navega al directorio del agente:**
   ```bash
   cd agente-huella
   ```

2. **Instala las dependencias:**
   ```bash
   npm install
   ```
   
   Esto instalará:
   - `ws`: Servidor WebSocket
   - `ffi-napi`: Interfaz para llamar funciones C++ nativas

3. **Verifica que el SDK de HID está instalado:**
   - Abre `C:\Program Files\HID Global\Authentication Device Client\Bin\`
   - Deberías ver archivos como `DPDeviceBioMini.dll`
   - Si no están, instala el cliente desde el CD del lector

4. **Ejecuta el agente:**
   ```bash
   npm start
   ```
   
   O directamente:
   ```bash
   node agente.js
   ```

### Salida Esperada

```
✅ SDK cargado correctamente
🟢 Agente escuchando en ws://127.0.0.1:52182
🔗 Cliente conectado
👆 Iniciando captura...
UFS_Init: 0
Lectores: 1
```

## Estructura del Código

### `agente.js`
Servidor WebSocket Node.js que:
- Escucha conexiones en `ws://127.0.0.1:52182`
- Carga el SDK de HID Global usando `ffi-napi`
- Inicializa el lector (`UFS_Init`)
- Detecta el número de lectores disponibles (`UFS_GetScannerNumber`)
- Envía datos de huella cuando se captura

### `capturador.cs` 
Aplicación C# (**descripción - verificar estructura actual**)
- Interactúa directamente con la API del lector
- Captura datos biométricos
- Se comunica con `agente.js` vía stdin/stdout

## Protocolo de Comunicación

### Cliente → Agente

```json
{
  "Method": "Subscribe",
  "Type": "fingerprint"
}
```

### Agente → Cliente

**Cuando se detecta el lector:**
```json
{
  "Event": "DeviceConnected"
}
```

**Cuando se captura exitosamente:**
```json
{
  "Event": "SamplesAcquired",
  "Data": {
    "Samples": ["dGVzdA=="],
    "SampleFormat": "Raw"
  }
}
```

**Cuando hay error:**
```json
{
  "Event": "Error",
  "Message": "No se encontró lector"
}
```

## Troubleshooting

### Error: "DPDeviceBioMini not found"
- El SDK de HID Global no está instalado
- Verifica `C:\Program Files\HID Global\Authentication Device Client\Bin\`
- Reinstala los drivers desde el CD del lector

### Error: "ENOENT: no such file or directory"
- Falta ejecutar `npm install`
- El Node no tiene permisos de administrador (intenta ejecutar como admin)

### Agente inicia pero dice "Lectores: 0"
- El lector no está conectado o no tiene drivers
- Verifica el Administrador de dispositivos Windows
- Reinicia el agente después de conectar el lector

### La puerta 52182 ya está en uso
- Otro proceso está usando ese puerto
- Cambia el `PORT` en `agente.js` y actualiza `NEXT_PUBLIC_FINGERPRINT_SERVICE_URL`
- O termina el proceso: `taskkill /IM node.exe /F`

## Desarrollo

Para modificar el agente:

1. Edita `agente.js` o `capturador.cs`
2. Detén el agente: `Ctrl+C`
3. Reinicia: `npm start`
4. Verifica los logs en la consola

### Agregar Funciones del Lector

El SDK de HID Global expone muchas más funciones:

```javascript
lib.UFS_GetDeviceUniqueID(['int', 'int', 'void*'], 'int');  // Obtener ID único
lib.UFS_GetImageQuality(['int', 'int'], 'int');              // Calidad de imagen
lib.UFS_GetTemplate(['void*', 'int', 'void*'], 'int');       // Obtener template
```

Consulta la documentación de HID Global para más detalles.

## Configuración para Producción

En producción, necesitarás:

1. **Certificados SSL/TLS** para WebSocket seguro (`wss://`)
2. **Proxy web** (nginx/Apache) para dirigir tráfico WebSocket
3. **Autenticación** entre cliente y agente
4. **Logging** centralizado

Ejemplo con SSL:
```javascript
const fs = require('fs');
const https = require('https');
const WebSocket = require('ws');

const server = https.createServer({
  cert: fs.readFileSync('cert.pem'),
  key: fs.readFileSync('key.pem')
});

const wss = new WebSocket.Server({ server });
server.listen(443);
```

## Licencia

El SDK de DPDeviceBioMini es propiedad de HID Global. Verifica los términos de licencia.

## Soporte

- Documentación HID Global:  https://www.hidglobal.com/products/uareuthenticators/
- Issues de ffi-napi: https://github.com/node-ffi-napi/node-ffi-napi
- Issues de ws: https://github.com/websockets/ws
