# GPS TRACKING - GUÍA DE INSTALACIÓN Y COMERCIALIZACIÓN

## OBJETIVO
Instalar dispositivos GPS propios en vehículos y conectarlos con el sistema Crosslog PWA para ofrecer tracking como servicio.

---

## 1. DISPOSITIVOS GPS RECOMENDADOS

### Opción A: GPS Económicos (China)
| Modelo | Precio | Protocolo | Características |
|--------|--------|-----------|-----------------|
| GT06N | $15-25 USD | GT06 | Básico, corte motor |
| TK103B | $20-30 USD | TK103 | Con micrófono |
| ST901 | $25-35 USD | Suntech | OBD, datos motor |
| Coban GPS103 | $30-40 USD | Coban | Relay corte combustible |

### Opción B: GPS Profesionales
| Modelo | Precio | Protocolo | Características |
|--------|--------|-----------|-----------------|
| Queclink GV300 | $60-80 USD | Queclink | Robusto, industrial |
| Teltonika FMB120 | $70-90 USD | Teltonika | CANBUS, sensores |
| CalAmp LMU-2630 | $100+ USD | CalAmp | Flota profesional |

### Recomendación Inicial
**GT06N o Coban GPS103** - Económicos, protocolos bien documentados, fácil integración.

---

## 2. ARQUITECTURA DEL SISTEMA

```
[GPS en Vehículo]
       ↓ (GPRS/4G)
[Servidor Traccar] ← Tu servidor propio
       ↓ (API REST)
[Crosslog PWA] ← Tu aplicación
       ↓
[Firebase] ← Base de datos
```

---

## 3. SERVIDOR DE TRACKING (TRACCAR)

### ¿Qué es Traccar?
Software open source gratuito que recibe datos de +200 tipos de GPS.

### Instalación en VPS (DigitalOcean/Vultr/Linode)

```bash
# 1. Servidor Ubuntu 22.04 (mínimo 1GB RAM, $5-6/mes)

# 2. Instalar Java
sudo apt update
sudo apt install openjdk-11-jre-headless -y

# 3. Descargar Traccar
wget https://github.com/traccar/traccar/releases/download/v5.12/traccar-linux-64-5.12.zip
unzip traccar-linux-64-5.12.zip
sudo ./traccar.run

# 4. Iniciar servicio
sudo systemctl start traccar
sudo systemctl enable traccar

# 5. Acceder
http://TU_IP:8082
Usuario: admin
Password: admin (cambiar inmediatamente)
```

### Puertos a Abrir (Firewall)
| Puerto | Protocolo GPS |
|--------|---------------|
| 5001 | GT06 |
| 5002 | TK103 |
| 5013 | Coban |
| 5027 | Teltonika |
| 8082 | Web Admin |

---

## 4. CONFIGURACIÓN DEL GPS

### Ejemplo: GT06N

**SMS de configuración inicial:**
```
# Configurar servidor (IP de tu VPS)
SERVER,1,TU_IP,5001,0#

# Configurar APN (según operador)
APN,internet.personal.com,,#   # Personal Argentina
APN,datos.personal.com,,#      # Personal Argentina
APN,wap.gprs.unifon.com.ar,,#  # Movistar
APN,internet.ctimovil.com.ar,,# # Claro

# Intervalo de reporte (segundos)
TIMER,10#     # Cada 10 segundos en movimiento
SLEEP,120#    # Cada 2 minutos detenido

# Activar GPS
GPS,A#
```

### Ejemplo: Coban GPS103

```
# Configurar servidor
adminip123456 TU_IP 5013

# Configurar APN
apn123456 internet.personal.com

# Intervalo de reporte
fix030s030n123456   # 30 seg movimiento, 30 seg detenido
```

---

## 5. INTEGRACIÓN CON CROSSLOG

### API de Traccar
```javascript
// Endpoint base
const TRACCAR_API = 'http://TU_IP:8082/api';

// Autenticación (Basic Auth)
const headers = {
  'Authorization': 'Basic ' + btoa('usuario:password'),
  'Content-Type': 'application/json'
};

// Obtener dispositivos
GET /api/devices

// Obtener posiciones en tiempo real
GET /api/positions

// Obtener posición de un dispositivo
GET /api/positions?deviceId=123

// WebSocket para tiempo real
ws://TU_IP:8082/api/socket
```

### Hook para Crosslog (useGPSTracking.ts)
```typescript
// Ya existe en: src/hooks/useGPSTracking.ts
// Modificar para usar Traccar en lugar de YPF

const fetchPositions = async () => {
  const response = await fetch(`${TRACCAR_API}/positions`, { headers });
  const positions = await response.json();

  // Mapear con unidades de Crosslog
  const unidadesConGPS = positions.map(pos => ({
    unidadNumero: mapearIMEI(pos.deviceId),
    lat: pos.latitude,
    lng: pos.longitude,
    velocidad: pos.speed,
    rumbo: pos.course,
    timestamp: pos.fixTime,
    odometro: pos.attributes?.totalDistance
  }));

  return unidadesConGPS;
};
```

---

## 6. INSTALACIÓN FÍSICA DEL GPS

### Herramientas Necesarias
- Multímetro
- Crimpeadora
- Termocontraíble
- Cinta aisladora
- Bridas plásticas

### Conexiones Básicas (GT06N)
| Cable GPS | Conectar a |
|-----------|------------|
| Rojo (+) | 12V constante (batería) |
| Negro (-) | Masa/chasis |
| Naranja | Relay corte combustible (opcional) |
| Blanco | Ignición ACC (para detectar encendido) |

### Ubicación Recomendada
1. **Detrás del tablero** - Oculto, cerca de cables
2. **Bajo el asiento** - Fácil acceso, discreto
3. **En caja de fusibles** - Alimentación directa

### Tips de Instalación
- Antena GPS con vista al cielo (no bajo metal)
- Antena GSM lejos de interferencias
- Cables bien aislados y fijados
- Fusible de protección (2A)

---

## 7. MODELO DE NEGOCIO

### Costos por Unidad
| Concepto | Costo |
|----------|-------|
| GPS GT06N | $25 USD |
| SIM card + datos | $5/mes |
| Servidor (prorrateado 50 unidades) | $0.10/mes |
| Instalación (1 hora) | $20-30 USD |
| **Total inicial** | **$50-60 USD** |
| **Costo mensual** | **$5-6 USD** |

### Precio Sugerido al Cliente
| Servicio | Precio |
|----------|--------|
| Instalación + GPS | $100-150 USD |
| Mensualidad tracking | $15-20 USD/unidad |
| **Margen mensual** | **$10-15 USD/unidad** |

### Con 50 unidades
- Ingreso mensual: $750-1000 USD
- Costo mensual: $250-300 USD
- **Ganancia: $500-700 USD/mes**

---

## 8. CHECKLIST DE IMPLEMENTACIÓN

### Infraestructura
- [ ] Contratar VPS (DigitalOcean $6/mes)
- [ ] Instalar Traccar
- [ ] Configurar firewall y puertos
- [ ] Dominio/SSL (opcional)

### GPS
- [ ] Comprar lote de GPS (AliExpress/MercadoLibre)
- [ ] Comprar SIM cards con datos
- [ ] Probar configuración en mesa

### Software
- [ ] Modificar useGPSTracking.ts para Traccar
- [ ] Crear mapeo IMEI → Unidad Crosslog
- [ ] Integrar en Panel de Flota

### Comercial
- [ ] Definir precios
- [ ] Contrato de servicio
- [ ] SLA (nivel de servicio)

---

## 9. PROVEEDORES SUGERIDOS

### GPS (Argentina)
- MercadoLibre: "GPS tracker GT06"
- AliExpress: Coban/Sinotrack (envío 30-45 días)

### SIM Cards
- Personal IoT: Plan M2M $500/mes
- Movistar: Plan datos $400/mes
- Claro: Plan IoT empresas

### VPS
- DigitalOcean: $6/mes (1GB RAM)
- Vultr: $5/mes (1GB RAM)
- Linode: $5/mes (1GB RAM)

---

*Documento creado: 15 Feb 2026*
*Para: Comercialización GPS Tracking con Crosslog*
