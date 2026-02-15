
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

  ![alt text](image-20.png)


  Cliente de LW Fleet & CarSync → Microservicio como servicio API

 versión 1 
OEA 3.0
/docs/v1/swagger.json
** HTTP Restful API ** (v1 - Versión actual)

«Opcional, para ejecutar o solicitar servicios de API, el encabezado debe agregarse con el parámetro api-version = 1.0 »
«Límite de velocidad (URL: * - Límite: 2 - Periodo: 1 s)»

Nombre del registro: fleet-carsync-customer-api Códigos HTTP Respuesta... 200 OK : Ejecución exitosa del servicio. 400 Solicitud incorrecta : El servidor no puede o no procesará la solicitud debido a un error aparente del cliente (por ejemplo, sintaxis de solicitud mal formada, tamaño demasiado grande, enmarcado de mensaje de solicitud no válido o enrutamiento de solicitud engañoso). 401 No autorizado : El usuario del sistema no tiene permiso para ejecutar el servicio de API o los datos no pertenecen al usuario. 403 Prohibido : El usuario del token de acceso AUTH0 no tiene permiso para ejecutar el servicio de API. 404 No encontrado : No se puede asignar la URI del cliente a un recurso o el contenido puede haber sido eliminado, o el enlace es incorrecto o defectuoso; pero puede estar disponible en el futuro. 409 Conflicto : No se pueden descifrar los datos para ejecutar el servicio API. 500 Error interno del servidor : Error interno no controlado por el servidor API.

 

 
 
 
 
 
 
 

Condiciones de servicio
Ubicación Mundial - Sitio web
Enviar correo electrónico a Location World
Uso bajo LICX Ubicación Mundial
Servidores

https://customer-api.location-world.com

Autorizar
Sesiones


CORREO
/v1 /{dominio} /{subdominio} /sesiones
Obtiene una sesión PLS para una credencial determinada (correo electrónico y contraseña)



CORREO
/v1 /{dominio} /{subdominio} /sesiones /3party-jwt
Obtiene una sesión PLS para unas credenciales externas determinadas (correo electrónico y token de acceso jwt)


Usuarios


CONSEGUIR
/v1 /{dominio} /{subdominio} /usuarios /{id}
Obtiene un usuario por su ID único



CONSEGUIR
/v1 /{dominio} /{subdominio} /usuarios /{id} /contacto-de-emergencia-principal
Obtener el contacto de emergencia principal del usuario



CONSEGUIR
/v1 /{dominio} /{subdominio} /usuarios /{id} /dispositivos
Recupera los dispositivos del usuario



CONSEGUIR
/v1 /{dominio} /{subdominio} /usuarios /{id} /dispositivos /{deviceId}
Obtiene el dispositivo por ID del usuario propietario



CONSEGUIR
/v1 /{dominio} /{subdominio} /usuarios /{id} /dispositivos /{IdDeDispositivo} /odómetro-actual
Recupera el odómetro actual del dispositivo



CONSEGUIR
/v1 /{dominio} /{subdominio} /usuarios /{id} /dispositivos /{IdDeDispositivo} /últimaUbicación
Recupera la última ubicación del dispositivo



CONSEGUIR
/v1 /{dominio} /{subdominio} /usuarios /{id} /dispositivos /{IdDeDispositivo} /alert-configs
Obtiene configuraciones modificadas por ID único de usuario propietario



CONSEGUIR
/v1 /{dominio} /{subdominio} /usuarios /{id} /dispositivos /{IdDeDispositivo} /información-de-los-últimos-sensores-de-humedad
Recuperar una lista de información de los sensores de humedad del dispositivo



CONSEGUIR
/v1 /{dominio} /{subdominio} /usuarios /{id} /dispositivos /{IdDeDispositivo} /historial-información-sensores-de-humedad
Recupera una lista paginada de un día con información de sensores de humedad del dispositivo



CONSEGUIR
/v1 /{dominio} /{subdominio} /usuarios /{id} /dispositivos /{deviceId} /historial
Recupera una lista del historial de un día paginado del dispositivo



CONSEGUIR
/v1 /{dominio} /{subdominio} /usuarios /{id} /dispositivos /{deviceId} /historial /canbus
Recupera la lista del historial de bus CAN de un día de un dispositivo paginado



CONSEGUIR
/v1 /{dominio} /{subdominio} /usuarios /{id} /dispositivos /{deviceId} /alertas
Recupera una lista de alertas del día de un dispositivo paginado



CONSEGUIR
/v1 /{dominio} /{subdominio} /usuarios /{id} /dispositivos /{deviceId} /viajes
Recupera una lista de viajes de un día paginados por el dispositivo



CONSEGUIR
/v1 /{dominio} /{subdominio} /usuarios /{id} /dispositivos /{deviceId} /viajes /{clave de viaje}
Recupera el detalle del viaje de un dispositivo mediante la clave de mensaje y el ID único del viaje.



CORREO
/v1 /{dominio} /{subdominio} /usuarios /{id} /dispositivos /viajes /indicadores-de-operación
Recupera el detalle de los viajes en un rango de fechas, permitiendo al cliente generar informes personalizados.



CONSEGUIR
/v1 /{dominio} /{subdominio} /usuarios /{id} /unidades-gps
Recupera las unidades GPS del usuario



CONSEGUIR
/v1 /{dominio} /{subdominio} /usuarios /{id} /unidades-gps /{gpsunitId}
Obtiene la unidad GPS por ID del cliente propietario



CONSEGUIR
/v1 /{dominio} /{subdominio} /usuarios /{id} /unidades-gps /{gpsUnitId} /propietario
Obtiene el propietario de la unidad GPS



CONSEGUIR
/v1 /{dominio} /{subdominio} /usuarios /{id} /unidades-gps /imeis-del-propietario
Obtiene el IMEI de las unidades GPS por ID único de usuario del propietario



CONSEGUIR
/v1 /{dominio} /{subdominio} /usuarios /{id} /dispositivos /{IdDeDispositivo} /planificaciónDeRutasDeEventos
Listar todas las planificaciones de una Ruta de Eventos de un usuario



CORREO
/v1 /{dominio} /{subdominio} /usuarios /{id} /dispositivos /{IdDeDispositivo} /planificaciónDeRutasDeEventos
Insertar una planificación de ruta de eventos.



BORRAR
/v1 /{dominio} /{subdominio} /usuarios /{id} /dispositivos /{IdDeDispositivo} /planificacionesDeRutaDeEventos /{IdDePlanificaciónDeRutaDeEventos}
Eliminar una planificación de ruta de eventos.



CONSEGUIR
/v1 /{dominio} /{subdominio} /usuarios /{id} /dispositivos /{IdDeDispositivo} /planificacionesDeRutaDeEventos /{IdDePlanificaciónDeRutaDeEventos}
Planificación de una Ruta de Eventos de un usuario


Clientela


CONSEGUIR
/v1 /{dominio} /{subdominio} /clientes /{id}
Obtiene un cliente por ID único



CONSEGUIR
/v1 /{dominio} /{subdominio} /clientes /{id} /contadores-de-sensores
Obtiene contadores de sensores aprovisionados



CORREO
/v1 /{dominio} /{subdominio} /clientes /{id} /automotores
Búsqueda de automotores del cliente



CONSEGUIR
/v1 /{dominio} /{subdominio} /clientes /{id} /automotores
Recupera los automotores del cliente



CONSEGUIR
/v1 /{dominio} /{subdominio} /clientes /{id} /automotores /{automotorId}
Recupera un automotor por ID



CONSEGUIR
/v1 /{dominio} /{subdominio} /clientes /{id} /automotors /{automotorId} /configuración-personalizada-de-notificaciones-de-kilometraje
Recupera una configuración de notificación de kilometraje personalizada



CONSEGUIR
/v1 /{dominio} /{subdominio} /clientes /{id} /automotors /{automotorId} /configuración-del-programa-de-mantenimiento
Recupera el mantenimiento programado del automotor



CONSEGUIR
/v1 /{dominio} /{subdominio} /clientes /{id} /automotors /{automotorId} /bandera-de-estado-de-estacionamiento
Recupera el estado de estacionamiento de un automóvil por ID



CONSEGUIR
/v1 /{dominio} /{subdominio} /clientes /{id} /automotors /{automotorId} /puntaje-de-conducción
Recupera una lista paginada de puntuaciones de conducción de automóviles por dispositivo de identificación



CONSEGUIR
/v1 /{dominio} /{subdominio} /clientes /{id} /automotors /{automotorId} /indicador-de-estado-de-estacionamiento-seguro
Recupera el estado de estacionamiento seguro de un automóvil por ID



CONSEGUIR
/v1 /{dominio} /{subdominio} /clientes /{id} /plantillas-de-ruta-de-eventos
Listar todas las plantillas de una Ruta de Eventos de un cliente



CONSEGUIR
/v1 /{dominio} /{subdominio} /clientes /{id} /plantillas-de-ruta-de-eventos /{eventRouteTemplateId}
Plantilla de una Ruta de Eventos de un cliente
