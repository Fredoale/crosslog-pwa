# PUNTOS API - YPF en Ruta (Location World)

**Base URL:** `https://customer-api.location-world.com`
**Versión:** v1
**Rate Limit:** 2 requests/segundo
**Header requerido:** `api-version: 1.0`

---

## ENDPOINTS NECESARIOS PARA CROSSLOG

### 1. AUTENTICACIÓN (Obligatorio)

```
POST /v1/{domain}/{subdomain}/sessions
```
- **Uso:** Obtener token de sesión con email y password
- **Necesario:** Para todas las demás llamadas

---

### 2. UBICACIÓN EN TIEMPO REAL (Core)

```
GET /v1/{domain}/{subdomain}/users/{id}/devices/{deviceId}/last-location
```
- **Uso:** Posición actual de cada unidad
- **Datos esperados:** lat, lng, velocidad, rumbo, timestamp
- **Frecuencia:** Cada 30-60 segundos para el mapa en tiempo real

---

### 3. ODÓMETRO ACTUAL

```
GET /v1/{domain}/{subdomain}/users/{id}/devices/{deviceId}/current-odometer
```
- **Uso:** Kilometraje actual de la unidad
- **Integración:** Tren Rodante (alertas 40K/80K/160K)

---

### 4. HISTORIAL DE POSICIONES

```
GET /v1/{domain}/{subdomain}/users/{id}/devices/{deviceId}/history
```
- **Uso:** Recorrido del día/ruta seguida
- **Datos:** Lista paginada de posiciones de un día

---

### 5. VIAJES/TRIPS

```
GET /v1/{domain}/{subdomain}/users/{id}/devices/{deviceId}/trips
```
- **Uso:** Lista de viajes del día (inicio/fin, km, duración)

```
GET /v1/{domain}/{subdomain}/users/{id}/devices/{deviceId}/trips/{tripKey}
```
- **Uso:** Detalle de un viaje específico

```
POST /v1/{domain}/{subdomain}/users/{id}/devices/trips/operation-indicators
```
- **Uso:** Indicadores operativos (reportes personalizados)

---

### 6. ALERTAS GPS

```
GET /v1/{domain}/{subdomain}/users/{id}/devices/{deviceId}/alerts
```
- **Uso:** Alertas del dispositivo (exceso velocidad, geocercas, etc.)

```
GET /v1/{domain}/{subdomain}/users/{id}/devices/{deviceId}/alert-configs
```
- **Uso:** Configuración de alertas activas

---

### 7. LISTADO DE DISPOSITIVOS/VEHÍCULOS

```
GET /v1/{domain}/{subdomain}/users/{id}/devices
```
- **Uso:** Lista todos los dispositivos GPS del usuario

```
GET /v1/{domain}/{subdomain}/clients/{id}/automotors
```
- **Uso:** Lista todos los vehículos del cliente

```
GET /v1/{domain}/{subdomain}/clients/{id}/automotors/{automotorId}
```
- **Uso:** Detalle de un vehículo específico

---

### 8. ESTADO DE ESTACIONAMIENTO

```
GET /v1/{domain}/{subdomain}/clients/{id}/automotors/{automotorId}/parking-state-flag
```
- **Uso:** Saber si el vehículo está estacionado

```
GET /v1/{domain}/{subdomain}/clients/{id}/automotors/{automotorId}/safe-parking-state-flag
```
- **Uso:** Estado de estacionamiento seguro

---

### 9. DATOS CANBUS (Opcional - si el GPS lo soporta)

```
GET /v1/{domain}/{subdomain}/users/{id}/devices/{deviceId}/history/canbus
```
- **Uso:** Datos del vehículo (RPM, combustible, temperatura, etc.)

---

### 10. DRIVING SCORE (Opcional)

```
GET /v1/{domain}/{subdomain}/clients/{id}/automotors/{automotorId}/driving-score
```
- **Uso:** Puntuación de conducción del chofer

---

## DATOS QUE NECESITA CROSSLOG

| Funcionalidad | Endpoint | Prioridad |
|---------------|----------|-----------|
| Mapa tiempo real | last-location | ALTA |
| Km para mantenimiento | current-odometer | ALTA |
| Historial de rutas | history | MEDIA |
| Viajes completados | trips | MEDIA |
| Alertas GPS | alerts | MEDIA |
| Lista de unidades | devices/automotors | ALTA |
| Estado estacionado | parking-state-flag | BAJA |
| Datos CANBUS | history/canbus | BAJA |

---

## CREDENCIALES NECESARIAS

Solicitar a YPF en Ruta:
- [ ] `domain` - Dominio asignado
- [ ] `subdomain` - Subdominio asignado
- [ ] `userId` - ID de usuario API
- [ ] `clientId` - ID de cliente
- [ ] `email` - Email para autenticación
- [ ] `password` - Password para autenticación
- [ ] Lista de `deviceId` por cada unidad de Crosslog

---

## FLUJO DE INTEGRACIÓN

```
1. POST /sessions → Obtener token
2. GET /devices → Listar dispositivos y mapear con unidades Crosslog
3. Loop cada 30s:
   - GET /last-location (cada dispositivo) → Actualizar mapa
4. GET /current-odometer → Actualizar km en Firebase (para Tren Rodante)
5. GET /trips → Mostrar viajes del día
```

---

*Documento creado: 15 Feb 2026*
*Para: Integración Panel de Flota Crosslog con YPF en Ruta*
