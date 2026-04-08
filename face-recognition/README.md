# Reconocimiento Facial - Configuración y Uso

## Estado Actual del Sistema

### ✅ Funcionalidad Implementada
- **Modo Mock**: El sistema funciona completamente con datos simulados para demostración
- **API REST**: Endpoints funcionales para registro y reconocimiento
- **Base de datos**: Integración completa con MySQL
- **Frontend**: Componentes de UI integrados en la aplicación principal
- **Logging**: Sistema de logging completo con rotación de archivos

### ⚠️ Modo de Producción
Para habilitar el reconocimiento facial real, instale las dependencias de ML:

```bash
# Instalar dlib (puede ser complejo en Windows)
pip install dlib

# Instalar face-recognition
pip install face-recognition

# Cambiar a modo real en face_service.py:
# self._mock_mode = False
```

### 🚀 Inicio Rápido
```bash
cd face-recognition
./start.sh
# O manualmente:
python app.py
```

### 🧪 Pruebas
```bash
python test_service.py
```

## Arquitectura
- **Frontend**: Next.js con TypeScript
- **Backend Facial**: Servicio Python con FastAPI
- **Librería ML**: `face-recognition` (basado en dlib)
- **Base de datos**: MySQL con almacenamiento de descriptores faciales

## Requisitos del Sistema
- Python 3.8+
- MySQL
- Webcam compatible
- Librerías del sistema: cmake, build-essential (Linux)

## Instalación

### Opción 1: Instalación Local

#### 1. Instalar dependencias del servicio facial
```bash
cd face-recognition
pip install -r requirements.txt
```

#### 2. Configurar variables de entorno
Crear archivo `.env` en la raíz del proyecto:
```env
# Base de datos
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=checkin_db

# Servicio facial (opcional, usa localhost:8000 por defecto)
FACE_SERVICE_HOST=localhost
FACE_SERVICE_PORT=8000
```

#### 3. Actualizar base de datos
Ejecutar el script SQL para agregar la columna faceDescriptor:
```bash
mysql -u root -p checkin_db < database/add_face_descriptor.sql
```

O ejecutar manualmente:
```sql
ALTER TABLE users ADD COLUMN faceDescriptor JSON NULL AFTER fingerprintTemplate;
```

### Opción 2: Despliegue con Docker

#### 1. Construir y ejecutar con Docker Compose
```bash
cd face-recognition
docker-compose up --build
```

#### 2. O construir manualmente
```bash
# Construir imagen
docker build -t face-recognition-service .

# Ejecutar contenedor
docker run -p 8000:8000 \
  -e DB_HOST=your_db_host \
  -e DB_USER=your_db_user \
  -e DB_PASSWORD=your_db_password \
  -e DB_NAME=checkin_db \
  face-recognition-service
```

#### 3. Verificar funcionamiento
```bash
curl http://localhost:8000/health
```

### Opción 3: Script de Inicio Automático
```bash
cd face-recognition
chmod +x start.sh
./start.sh
```

El script automáticamente:
- Crea entorno virtual si no existe
- Instala dependencias
- Crea archivo `.env` si no existe
- Inicia el servicio

## Uso del Sistema

### Iniciar el Servicio

#### Opción 1: Script Automático (Recomendado)
```bash
cd face-recognition
./start.sh
```

#### Opción 2: Manual
```bash
cd face-recognition
python app.py
```

#### Opción 3: Docker
```bash
cd face-recognition
docker-compose up
```

El servicio estará disponible en `http://localhost:8000`

### Verificar Funcionamiento
```bash
curl http://localhost:8000/health
```

Deberías recibir:
```json
{
  "status": "healthy",
  "service": "face-recognition",
  "version": "1.0.0"
}
```

### Ejecutar Pruebas
```bash
cd face-recognition
python test_service.py
```

Esto ejecutará pruebas automáticas para verificar que el servicio esté funcionando correctamente.

### 3. Registrar un rostro (desde admin)
1. Ir al panel de administración
2. En la tabla de usuarios, hacer clic en el menú de acciones (tres puntos)
3. Seleccionar "Registrar Rostro"
4. Capturar imagen del rostro
5. Confirmar registro

### 4. Usar reconocimiento facial
1. En el escáner, seleccionar la pestaña "Rostro"
2. Hacer clic en "Reconocer Rostro"
3. Mirar directamente a la cámara
4. El sistema identificará al usuario automáticamente

## API Endpoints

### POST `/register`
Registra un rostro para un usuario.

**Request:**
```json
{
  "user_id": "123456",
  "image_data": "data:image/jpeg;base64,/9j/4AAQ..."
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Face registered successfully"
}
```

### POST `/recognize`
Reconoce un rostro en una imagen.

**Request:**
```json
{
  "image_data": "data:image/jpeg;base64,/9j/4AAQ..."
}
```

**Response:**
```json
{
  "user_id": "123456",
  "confidence": 0.89,
  "status": "success"
}
```

### GET `/health`
Verifica el estado del servicio.

## Configuración Avanzada

### Ajustar umbral de similitud
En `face-recognition/config.py`:
```python
FACE_RECOGNITION_THRESHOLD = 0.6  # Valores más bajos = más estricto
```

### Limitar rostros por imagen
```python
MAX_FACES_PER_IMAGE = 1  # Solo procesar un rostro por imagen
```

## Solución de Problemas

### Error: "No face detected in image"
- Asegurarse de que el rostro esté bien iluminado
- Verificar que la cara esté mirando directamente a la cámara
- Intentar con diferentes ángulos de iluminación

### Error: "Multiple faces detected"
- Solo una persona debe estar frente a la cámara
- El sistema está configurado para procesar solo un rostro

### Error: "Face registered successfully" pero no reconoce
- Verificar que el usuario esté registrado en la base de datos
- Comprobar que el faceDescriptor se guardó correctamente
- Intentar registrar el rostro nuevamente

### Rendimiento lento
- La primera ejecución puede ser lenta (carga modelos)
- Considerar usar GPU si está disponible
- Reducir la resolución de imágenes si es necesario

## Despliegue en Producción

### Usando Docker Compose
```bash
# Para producción, usar docker-compose.prod.yml
docker-compose -f docker-compose.yml up -d
```

### Variables de Entorno para Producción
```env
DB_HOST=your_production_db_host
DB_USER=your_production_user
DB_PASSWORD=your_secure_password
DB_NAME=checkin_db

FACE_SERVICE_HOST=0.0.0.0
FACE_SERVICE_PORT=8000

LOG_LEVEL=WARNING
```

### Configuración de Nginx (Proxy Reverso)
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /face-api/ {
        proxy_pass http://localhost:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Monitoreo
- Health check endpoint: `GET /health`
- Logs disponibles en: `logs/face_recognition.log`
- Métricas de rendimiento disponibles en logs

#### Configuración de Logging
El servicio incluye logging configurado automáticamente:
- **Archivo**: `logs/face_recognition.log`
- **Rotación**: 10MB con 5 archivos de respaldo
- **Niveles**: DEBUG (archivo), INFO (consola)
- **Variables**: `LOG_LEVEL` y `LOG_FILE` en `.env`

### Escalado
Para múltiples instancias:
```bash
docker-compose up --scale face-recognition=3
```

## Seguridad
- Los descriptores faciales se almacenan como JSON en la base de datos
- No se almacenan imágenes reales, solo vectores matemáticos
- La comparación se hace localmente en el servidor Python
- Recomendado usar HTTPS en producción
- Implementar rate limiting en el proxy reverso
- Usar secrets management para credenciales de base de datos

## Limitaciones
- Requiere buena iluminación
- Funciona mejor con rostros frontales
- Puede tener dificultades con lentes, sombreros, o cambios de expresión
- No funciona con máscaras faciales

## Próximas Mejoras
- Soporte para múltiples rostros por usuario
- Detección de emociones
- Verificación de vivacidad (anti-spoofing)
- Optimización para dispositivos móviles