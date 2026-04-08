# Configuración del Servicio de Huella Dactilar

## Problema Actual
El sistema está intentando conectarse a un servidor WebSocket en `ws://127.0.0.1:52182/` para leer datos del lector de huella dactilar U.are.U 4500.

Si ves el error:
```
WebSocket connection to 'ws://127.0.0.1:52182/' failed
```

Significa que el servicio WebSocket no está disponible.

## Solución

### Opción 1: Ejecutar el Agente de Huella (Recomendado)

El proyecto incluye un agente C# (`agente-huella/agente.js`) que gestiona la conexión con el lector.

**Pasos:**

1. **Asegúrate de que el lector U.are.U 4500 está conectado** a la computadora
2. **Instala las dependencias del agente:**
   ```bash
   cd agente-huella
   npm install
   ```

3. **Ejecuta el agente:**
   ```bash
   npm start
   # O si usas node directamente:
   node agente.js
   ```

   El agente debe imprimir algo como:
   ```
   ✅ Servidor WebSocket escuchando en ws://127.0.0.1:52182
   ```

4. **Verifica que el lector esté detectado:**
   - El agente debería reportar si encontró el dispositivo U.are.U

### Opción 2: Usar un Puerto Personalizado

Si necesitas cambiarle el puerto al servicio, puedes establecer la variable de entorno `NEXT_PUBLIC_FINGERPRINT_SERVICE_URL`:

```bash
# En el archivo .env.local
NEXT_PUBLIC_FINGERPRINT_SERVICE_URL=ws://127.0.0.1:3000
```

### Opción 3: Deshabilitar Temporalmente la Huella (Solo Desarrollo)

Si no tienes el lector disponible durante el desarrollo, puedes usar solo QR:

1. En el Scanner, selecciona la pestaña "Código QR" en lugar de "Huella"
2. Usa the generador de códigos QR para pruebas

## Flujo de Funcionamiento

```
┌─────────────────────────────────────┐
│   Aplicación Web (CheckIn)          │
│   - Scanner.tsx                     │
│   - fingerprintService.ts           │
└──────────────┬──────────────────────┘
               │ WebSocket
               │ ws://127.0.0.1:52182/
               ▼
┌──────────────────────────────────┐
│   Agente Node.js                 │
│   - agente-huella/agente.js      │
│   - Lee de stdin/stdout del .cs  │
└──────────────┬──────────────────┘
               │ interop
               ▼
┌──────────────────────────────────┐
│   Lector Fingerprint (.exe C#)   │
│   - Comunica con U.are.U 4500    │
│   - Captura datos biométricos    │
└──────────────────────────────────┘
```

## Troubleshooting

### El agente no inicia
- ✅ Verifica que Node.js esté instalado: `node --version`
- ✅ Verifica que el lector esté conectado y tenga drivers instalados
- ✅ Prueba ejecutar el .exe C# directamente

### "Tiempo de espera agotado"
- La captura tardó más de 8 segundos
- Intenta de nuevo
- Verifica que el lector esté funcionando

### "Huella no reconocida"
- La huella leída no coincide con ningún usuario registrado
- Primero registra la huella en la sección de Admin > Usuarios

### WebSocket se desconecta inmediatamente
- El agente puede no estar comunicándose correctamente con el .exe C#
- Revisa la consola del agente para mensajes de error

## Variables de Entorno

```env
# URL del servicio WebSocket de huella (desarrollo local)
NEXT_PUBLIC_FINGERPRINT_SERVICE_URL=ws://127.0.0.1:52182

# Para producción, usa una URL segura:
# NEXT_PUBLIC_FINGERPRINT_SERVICE_URL=wss://tudominio.com/fingerprint
```

## Estructura del Agente

```
agente-huella/
├── agente.js          # Servidor WebSocket que maneja los mensajes
├── capturador.cs      # Lógica C# para comunicarse con el lector
└── package.json       # Dependencias Node.js
```

## Protocolo WebSocket

El agente espera mensajes JSON:

```javascript
// Cliente envía:
{
  "Method": "Subscribe",
  "Type": "fingerprint"
}

// Servidor responde (cuando se captura):
{
  "Event": "SamplesAcquired",
  "Data": {
    // Datos biométricos del lector
  }
}
```

## Notas

- El timeout de captura es de 8 segundos (configurable)
- Cada captura abre una nueva conexión WebSocket
- Los datos se codifican en base64 para almacenamiento
- Las huellas se comparan directamente (no hay fuzzy matching)

## Soporte

Para más información sobre el lector U.are.U 4500, consulta la documentación oficial de Morpho/HID.
