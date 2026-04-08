# Error 404: Usuario no encontrado

## Problema

Cuando intentas escanear un código QR o acceder a un usuario específico, obtienes:
```
GET http://localhost:9002/api/users/1052961539 404 (Not Found)
```

## Causa

El sistema intentó encontrar un usuario con ID `1052961539` en la base de datos, pero no existe.

Esto puede ocurrir en varias situaciones:

1. **El usuario se eliminó** - Alguien borró el usuario pero sus códigos QR codificados siguen siendo válidos
2. **ID incorrecto en el QR** - El código QR fue generado con un ID mal escrito
3. **Usuario nunca fue creado** - Se intentó usar una ID antes de crear el usuario
4. **Base de datos vacía** - Los usuarios no se sincronizaron correctamente desde la BD
5. **Usuario en BD diferente** - Estás conectado a una BD diferente a la que creaste los usuarios

## Soluciones

### ✅ Para Usuarios Que Escanean QR

Si ves el error cuando intentas marcar asistencia:

1. **Verifica que el usuario existe** en Admin > Gestión de Usuarios
2. **Regenera el código QR** del usuario (debería actualizarse automáticamente)
3. **Intenta escanear de nuevo** con el nuevo QR

### ✅ Para Administradores

#### Opción 1: Crear el usuario faltante

```
Admin Panel → Gestión de Usuarios → Crear Usuario
Ingresa:
- ID: 1052961539 (el que viste en el error)
- Nombre completo: (nombre del usuario)
- Contraseña: (clave temporal)
- Rol: user/supervisor/admin
```

#### Opción 2: Verificar la base de datos

```bash
# Conecta a MySQL
mysql -h localhost -u root checkin_db

# Lista todos los usuarios
SELECT id, fullName, role FROM users;

# Si no existe, crea el usuario manualmente:
INSERT INTO users (id, fullName, role, password) 
VALUES ('1052961539', 'Nombre Completo', 'user', 'password123');
```

#### Opción 3: Sincronizar desde archivo

Si tienes una lista de usuarios en CSV o JSON:
1. Usuario > Importar Usuarios (si está disponible)
2. O crea usuarios uno a uno en la interfaz

### ✅ Para Desarrolladores

El error 404 ahora retorna un mensaje claro:

**Antes:**
```
GET /api/users/123 → 404 (sin información)
```

**Ahora:**
```json
GET /api/users/123
{
  "error": "Usuario no encontrado",
  "status": 404
}
```

El cliente maneja esto correctamente:
```typescript
const user = await getUserById('123');
if (!user) {
  // Usuario no existe - mostrar error amigable
  setErrorMessage('Usuario no encontrado');
}
```

## Estructura del Endpoint Creado

Se ha creado la ruta completa para manejar usuarios individuales:

```
/api/users/[id]
├── GET    - Obtener usuario por ID
├── PUT    - Actualizar usuario (role, fullName, etc.)
└── DELETE - Eliminar usuario
```

### GET /api/users/[id]

**Request:**
```bash
GET /api/users/1052961539
```

**Response (Si existe):**
```json
{
  "id": "1052961539",
  "fullName": "Juan Pérez",
  "role": "user",
  "photoUrl": null,
  "exitLockUntil": null,
  "fingerprintTemplate": null
}
```

**Response (Si No existe):**
```json
{
  "error": "Usuario no encontrado",
  "status": 404
}
```

### PUT /api/users/[id]

**Request:**
```bash
PUT /api/users/1052961539
Content-Type: application/json

{
  "role": "supervisor",
  "exitLockUntil": "2026-04-08T12:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Usuario actualizado"
}
```

**Campos permitidos:**
- `role` - 'user' | 'admin' | 'supervisor'
- `fullName` - Nombre del usuario
- `exitLockUntil` - Fecha ISO para bloquear salida
- `fingerprintTemplate` - Template de huella codificado en base64
- `photoUrl` - URL de foto de perfil

### DELETE /api/users/[id]

**Request:**
```bash
DELETE /api/users/1052961539
```

**Response:**
```json
{
  "success": true,
  "message": "Usuario eliminado"
}
```

**Restricciones:**
- ❌ No puedes eliminar el usuario 'admin'
- ❌ Si el usuario no existe, retorna 404

## Mensajes de Error Esperados

| Error | Causa | Solución |
|-------|-------|----------|
| `400 Bad Request` | Falta el ID del usuario | Verifica la URL |
| `404 Not Found` | El usuario no existe | Crea el usuario o verifica el ID |
| `403 Forbidden` | Intentas eliminar 'admin' | No puedes eli minar ese usuario |
| `500 Internal Server Error` | Error en servidor | Revisa logs del servidor |

## Checklist de Troubleshooting

- [ ] ¿Existe el usuario en la base de datos?
  ```bash
  SELECT * FROM users WHERE id = '1052961539';
  ```

- [ ] ¿El usuario fue creado con el rol correcto?
  ```bash
  SELECT id, fullName, role FROM users WHERE id = '1052961539';
  ```

- [ ] ¿La conexión a la BD es correcta?
  ```bash
  mysql -h localhost -u root checkin_db -e "SELECT COUNT(*) FROM users;"
  ```

- [ ] ¿Los datos están sincronizados?
  - Intenta actualizar un usuario existente en la UI
  - Verifica que los cambios aparecen en BD

- [ ] ¿El código QR contiene el ID correcto?
  - Decodifica el QR: usa una app de escaneo QR online
  - Verifica que el ID coincida con un usuario existente

## Prevención

1. **Nunca elimines usuarios con QRs activos** - Primero expira sus códigos
2. **Usa IDs consistentes** - Utiliza ID de documento nacional (cédula, pasaporte)
3. **Valida al crear** - Verifica que el ID es único antes de crear
4. **Audita cambios** - Haz backup de usuarios antes cambios masivos
5. **Sincroniza periódicamente** - Verifica que usuarios en UI = usuarios en BD

## Referencias

- [API REST de Usuarios](./API.md#usuarios)
- [Gestión de Usuarios](./USER_MANAGEMENT.md)
- [Base de Datos](./DATABASE.md)
