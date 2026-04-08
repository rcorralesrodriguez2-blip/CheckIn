# 🖐️ Guía de Configuración: Lector de Huella DigitalPersona 4500

Tienes el hardware correcto (**U.are.U 4500**). Para que funcione en esta aplicación web, Windows necesita un "puente" de comunicación. Sigue estas instrucciones:

---

## 1. Instalación del Driver (Software Real)

El navegador no puede hablar directamente con el USB. Necesitas instalar el **DigitalPersona Web Components**.

1. **Descarga**: Busca e instala el "DigitalPersona Biometric SDK for Web" o "One Touch for Windows SDK". 
   - *Nota*: Si es para un proyecto académico, busca el instalador `DigitalPersona_Web_Components.msi`.
2. **Servicio Local**: Una vez instalado, asegúrate de que el servicio esté corriendo. Abre una terminal y escribe:
   ```cmd
   netstat -ano | findstr :52182
   ```
   Si aparece una línea con `LISTENING`, ¡el hardware está listo!

---

## 2. Modo Simulación (Para pruebas sin drivers)

Si no puedes instalar los drivers en este momento pero quieres ver cómo funciona la lógica de registro y entrada en la App:

1. Abre una nueva terminal en la carpeta del proyecto.
2. Ejecuta el simulador (necesita el paquete `ws`):
   ```bash
   node scripts/fingerprint-simulator.mjs
   ```
3. Ahora, cuando vayas a **"Vincular Huella"** en la App, el sistema detectará al simulador como si fuera un lector real.

---

## 3. Resolución de Problemas (Troubleshooting)

### Error: "WebSocket connection failed"
- **Causa**: El servicio de DigitalPersona no está iniciado o el simulador no está corriendo.
- **Solución**: Inicia el archivo `.mjs` proporcionado o reinstala el SDK.

### El lector prende la luz roja pero no captura
- **Causa**: Conflicto de drivers.
- **Solución**: Desconecta y reconecta el USB. Asegúrate de no tener otro software de huellas abierto (como el de inicio de sesión de Windows).

---

### ¿Por qué usamos el puerto 52182?
Es el puerto estándar que usa DigitalPersona por defecto para su API de WebSockets. Nuestra aplicación está configurada para escuchar exactamente en esa dirección local.
