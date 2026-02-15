
Basándome en sistemas como YPF Ruta y las necesidades de Crosslog, te recomiendo:
  ┌─────────────────────┬───────────┬──────────────────────────────────────────────────────┐
  │       Función       │ Prioridad │                     Descripción                      │
  ├─────────────────────┼───────────┼──────────────────────────────────────────────────────┤
  │ Filtro por sector   │ Alta      │ Filtrar vista por VRAC, Distribución, Vital Aire     │
  ├─────────────────────┼───────────┼──────────────────────────────────────────────────────┤
  │ Histórico de rutas  │ Media     │ Ver el recorrido que hizo una unidad en el día       │
  ├─────────────────────┼───────────┼──────────────────────────────────────────────────────┤
  │ Alertas de geofence │ Media     │ Notificación cuando una unidad entra/sale de zona    │
  ├─────────────────────┼───────────┼──────────────────────────────────────────────────────┤
  │ Velocidad actual    │ Baja      │ Mostrar km/h de cada unidad (requiere más datos GPS) │
  ├─────────────────────┼───────────┼──────────────────────────────────────────────────────┤
  │ Exportar a Excel    │ Baja      │ Descargar listado de ubicaciones/recorridos          │
  ├─────────────────────┼───────────┼──────────────────────────────────────────────────────┤
  │ Vista satélite      │ Baja      │ Opción de cambiar tipo de mapa                       │
  └─────────────────────┴───────────┴──────────────────────────────────────────────────────┘



LW Fleet & CarSync Customer → Microservice as a API Service
 v1 
OAS 3.0
/docs/v1/swagger.json
** HTTP Restful API ** (v1 - Current Version)

«Optional, to execute or request API services, The header must be added with the parameter api-version = 1.0»
«Rate Limit(URL: * - Limit: 2 - Period: 1s)»

Log Name: fleet-carsync-customer-api

 HTTP Codes Response...

 200 OK: Successful service execution.
 400 Bad Request: The server cannot or will not process the request due to an apparent client error (e.g., malformed request syntax, size too large, invalid request message framing, or deceptive request routing).
 401 Unauthorized: The system user doesn't have permission to execute the API service or the data does not belong to the user.
 403 Forbidden: The AUTH0 access token user doesn't have permission to execute the API service.
 404 Not Found: Can't map the client's URI to a resource or content may been deleted, or link is incorrect or defective; but may be available in the future.
 409 Conflict: Can't decript data to execute API service.
 500 Internal Server Error: Internal error not controlled by the API server.

Terms of service
Location World - Website
Send email to Location World
Use under LICX Location World
Servers

https://customer-api.location-world.com

Authorize
Sessions


POST
/v1/{domain}/{subdomain}/sessions
Gets a PLS session for a given credential (email and password)

POST
/v1/{domain}/{subdomain}/sessions/3party-jwt
Gets a PLS Session for a given external credentials (email and jwt access_token)


Users

GET
/v1/{domain}/{subdomain}/users/{id}
Gets an user by its unique ID

GET
/v1/{domain}/{subdomain}/users/{id}/primary-emergency-contact
Get user's primary emergency contact

GET
/v1/{domain}/{subdomain}/users/{id}/devices
Retrieves devices of the user

GET
/v1/{domain}/{subdomain}/users/{id}/devices/{deviceId}
Gets device by ID of the owner user

GET
/v1/{domain}/{subdomain}/users/{id}/devices/{deviceId}/current-odometer
Retrieves device's current odometer

GET
/v1/{domain}/{subdomain}/users/{id}/devices/{deviceId}/last-location
Retrieves device last location

GET
/v1/{domain}/{subdomain}/users/{id}/devices/{deviceId}/alert-configs
Gets alter configs by owner user unique ID

GET
/v1/{domain}/{subdomain}/users/{id}/devices/{deviceId}/last-humidity-sensors-info
Retrieve a list of device humidity sensors information

GET
/v1/{domain}/{subdomain}/users/{id}/devices/{deviceId}/history-humidity-sensors-info
Retrieves a device humidity sensors information one day paged list

GET
/v1/{domain}/{subdomain}/users/{id}/devices/{deviceId}/history
Retrieves a device paged one day history list

GET
/v1/{domain}/{subdomain}/users/{id}/devices/{deviceId}/history/canbus
Retrieves a device paged one day canbus history list

GET
/v1/{domain}/{subdomain}/users/{id}/devices/{deviceId}/alerts
Retrieves a device paged one day alert list

GET
/v1/{domain}/{subdomain}/users/{id}/devices/{deviceId}/trips
Retrieves a device paged one day trips list

GET
/v1/{domain}/{subdomain}/users/{id}/devices/{deviceId}/trips/{tripKey}
Retrieves an device trip detail by message key trip unique ID

POST
/v1/{domain}/{subdomain}/users/{id}/devices/trips/operation-indicators
Retrieves the detail of trips in a range of dates, allowing the client to generate customized reports.

GET
/v1/{domain}/{subdomain}/users/{id}/gps-units
Retrieves GPS units of the user

GET
/v1/{domain}/{subdomain}/users/{id}/gps-units/{gpsunitId}
Gets GPS unit by ID of the owner client

GET
/v1/{domain}/{subdomain}/users/{id}/gps-units/{gpsUnitId}/owner
Gets GPS unit's owner

GET
/v1/{domain}/{subdomain}/users/{id}/gps-units/owner-imeis
Gets GPS units IMEI by owner user unique ID

GET
/v1/{domain}/{subdomain}/users/{id}/devices/{deviceId}/event-route-plannings
List all the plannings of an Event Route of a user

POST
/v1/{domain}/{subdomain}/users/{id}/devices/{deviceId}/event-route-plannings
Insert a Event Route Planning.

DELETE
/v1/{domain}/{subdomain}/users/{id}/devices/{deviceId}/event-route-plannings/{eventRoutePlanningId}
Delete a Event Route Planning.

GET
/v1/{domain}/{subdomain}/users/{id}/devices/{deviceId}/event-route-plannings/{eventRoutePlanningId}
Planning of an Event Route of a user

Clients

GET
/v1/{domain}/{subdomain}/clients/{id}
Gets a client by unique ID

GET
/v1/{domain}/{subdomain}/clients/{id}/sensor-counters
Gets provisioned sensors counters

POST
/v1/{domain}/{subdomain}/clients/{id}/automotors
Search automotors of the client

GET
/v1/{domain}/{subdomain}/clients/{id}/automotors
Retrieves automotors of the client

GET
/v1/{domain}/{subdomain}/clients/{id}/automotors/{automotorId}
Retrieves an automotor by ID

GET
/v1/{domain}/{subdomain}/clients/{id}/automotors/{automotorId}/custom-mileage-notification-settings
Retrieves an custom mileage notification settingn's

GET
/v1/{domain}/{subdomain}/clients/{id}/automotors/{automotorId}/maintenance-schedule-settings
Retrieves automotor scheduled maintenance

GET
/v1/{domain}/{subdomain}/clients/{id}/automotors/{automotorId}/parking-state-flag
Retrieves an automotor parking state by ID

GET
/v1/{domain}/{subdomain}/clients/{id}/automotors/{automotorId}/driving-score
Retrieves an automotor driving score paged list by ID device

GET
/v1/{domain}/{subdomain}/clients/{id}/automotors/{automotorId}/safe-parking-state-flag
Retrieves an automotor safe parking state by ID

GET
/v1/{domain}/{subdomain}/clients/{id}/event-route-templates
List all the templates of an Event Route of a client

GET
/v1/{domain}/{subdomain}/clients/{id}/event-route-templates/{eventRouteTemplateId}
Template of an Event Route of a client
