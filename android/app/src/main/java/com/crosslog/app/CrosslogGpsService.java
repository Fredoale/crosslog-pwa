package com.crosslog.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;

import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;
import com.google.firebase.firestore.FieldValue;
import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.firestore.SetOptions;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * CrosslogGpsService
 * Servicio foreground nativo de Android que:
 * - Captura ubicación GPS via FusedLocationProviderClient
 * - Calcula geofence (salida y llegada a base)
 * - Escribe directamente a Firebase Firestore SIN pasar por el WebView
 * - Envía eventos al plugin Capacitor solo para actualizar la UI
 */
public class CrosslogGpsService extends Service {

    public static final String TAG = "CrosslogGPS";
    public static final String CHANNEL_ID = "crosslog_gps_channel";
    public static final int NOTIFICATION_ID = 1001;
    public static final String ACTION_STOP = "com.crosslog.app.GPS_STOP";
    public static final String EVENT_SALIDA = "GPS_SALIDA";
    public static final String EVENT_BASE = "GPS_BASE";

    private static final double GEOFENCE_RADIUS = 100.0;      // metros — llegada a base
    private static final double DEPARTURE_THRESHOLD = 500.0;   // metros — salida de base

    // Bases Crosslog (lat, lng)
    private static final double[][] BASES = {
        {-34.36014566238795, -59.00991328060013},  // Base Los Cardales
        {-34.56297844053954, -58.52935080773911}   // Base Villa Maipú
    };
    private static final String[] BASE_NOMBRES = {"Base Los Cardales", "Base Villa Maipú"};

    private static final String PREFS_NAME = "CrosslogGpsPrefs";

    // Estado estático compartido con el plugin
    public static boolean isRunning = false;
    public static EventCallback eventCallback = null;

    public interface EventCallback {
        void onEvent(String event, Map<String, Object> data);
    }

    // Clientes y estado interno
    private FusedLocationProviderClient fusedLocationClient;
    private LocationCallback locationCallback;
    private FirebaseFirestore db;

    private String unidad = "";
    private String patente = "";
    private String chofer = "";
    private String checklistId = "";
    private String sector = "vrac";
    private String hdr = "";
    private boolean hasLeftBase = false;

    // ========================================================
    // CICLO DE VIDA DEL SERVICIO
    // ========================================================

    @Override
    public void onCreate() {
        super.onCreate();
        isRunning = true;
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this);
        db = FirebaseFirestore.getInstance();
        createNotificationChannel();
        Log.d(TAG, "Servicio creado");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // Detener si se recibe la acción STOP
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            stopSelf();
            return START_NOT_STICKY;
        }

        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);

        if (intent != null) {
            // Inicio normal — leer config del Intent y guardar en SharedPreferences
            unidad      = getExtra(intent, "unidad", "");
            patente     = getExtra(intent, "patente", "");
            chofer      = getExtra(intent, "chofer", "");
            checklistId = getExtra(intent, "checklistId", "");
            sector      = getExtra(intent, "sector", "vrac");
            hdr         = getExtra(intent, "hdr", "");
            hasLeftBase = false;

            prefs.edit()
                .putString("unidad",      unidad)
                .putString("patente",     patente)
                .putString("chofer",      chofer)
                .putString("checklistId", checklistId)
                .putString("sector",      sector)
                .putString("hdr",         hdr)
                .putBoolean("hasLeftBase", false)
                .apply();
            Log.d(TAG, "✅ Servicio iniciado para INT-" + unidad);
        } else {
            // Reinicio por START_STICKY — restaurar config desde SharedPreferences
            unidad      = prefs.getString("unidad",      "");
            patente     = prefs.getString("patente",     "");
            chofer      = prefs.getString("chofer",      "");
            checklistId = prefs.getString("checklistId", "");
            sector      = prefs.getString("sector",      "vrac");
            hdr         = prefs.getString("hdr",         "");
            hasLeftBase = prefs.getBoolean("hasLeftBase", false);
            Log.d(TAG, "🔄 Servicio reiniciado por sistema para INT-" + unidad + " | hasLeftBase=" + hasLeftBase);
        }

        // Iniciar foreground con notificación persistente
        String notifMsg = hasLeftBase
            ? "INT-" + unidad + " \u00B7 En ruta \uD83D\uDE9B"
            : "INT-" + unidad + " \u00B7 Esperando salida de base...";
        startForeground(NOTIFICATION_ID, buildNotification(notifMsg));
        startLocationUpdates();
        return START_STICKY; // Android reinicia el servicio si lo mata
    }

    private String getExtra(Intent intent, String key, String def) {
        String val = intent.getStringExtra(key);
        return (val != null) ? val : def;
    }

    // ========================================================
    // RASTREO DE UBICACIÓN
    // ========================================================

    private void startLocationUpdates() {
        LocationRequest request = new LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 15000L)
            .setWaitForAccurateLocation(false)
            .setMinUpdateIntervalMillis(10000L)
            .setMinUpdateDistanceMeters(30f)
            .build();

        locationCallback = new LocationCallback() {
            @Override
            public void onLocationResult(LocationResult result) {
                if (result.getLastLocation() != null) {
                    double lat = result.getLastLocation().getLatitude();
                    double lng = result.getLastLocation().getLongitude();
                    float speedMs = result.getLastLocation().getSpeed();
                    double speedKmh = Math.round(speedMs * 3.6 * 10.0) / 10.0;
                    Log.d(TAG, "📍 Posición recibida: " + lat + ", " + lng + " | " + speedKmh + " km/h");
                    processLocation(lat, lng, speedKmh);
                }
            }
        };

        try {
            fusedLocationClient.requestLocationUpdates(request, locationCallback, Looper.getMainLooper());
        } catch (SecurityException e) {
            Log.e(TAG, "Error de permisos: " + e.getMessage());
        }
    }

    // ========================================================
    // LÓGICA DE GEOFENCE
    // ========================================================

    private void processLocation(double lat, double lng, double speedKmh) {
        int nearestIdx = encontrarBaseCercana(lat, lng);
        double distancia = calcularDistancia(lat, lng, BASES[nearestIdx][0], BASES[nearestIdx][1]);
        String baseNombre = BASE_NOMBRES[nearestIdx];

        Log.d(TAG, "Distancia a " + baseNombre + ": " + (int) distancia + "m");

        // Detectar salida de base (primera vez que supera 500m)
        if (!hasLeftBase && distancia > DEPARTURE_THRESHOLD) {
            hasLeftBase = true;
            getSharedPreferences(PREFS_NAME, MODE_PRIVATE).edit().putBoolean("hasLeftBase", true).apply();
            updateNotification("INT-" + unidad + " · En ruta \uD83D\uDE9B");
            Log.d(TAG, "🚀 Salió de base (" + (int) distancia + "m)");
            if (eventCallback != null) {
                Map<String, Object> data = new HashMap<>();
                data.put("unidad", unidad);
                eventCallback.onEvent(EVENT_SALIDA, data);
            }
        }

        // Detectar llegada a base (solo si ya salió antes)
        if (hasLeftBase && distancia <= GEOFENCE_RADIUS) {
            Log.d(TAG, "🎯 Llegó a base: " + baseNombre);
            updateNotification("INT-" + unidad + " · Lleg\u00F3 a " + baseNombre + " \u2705");
            writeToFirebase(BASES[nearestIdx][0], BASES[nearestIdx][1], 0.0, false, true, baseNombre);
            if (eventCallback != null) {
                Map<String, Object> data = new HashMap<>();
                data.put("unidad", unidad);
                data.put("baseNombre", baseNombre);
                eventCallback.onEvent(EVENT_BASE, data);
            }
            stopSelf();
            return;
        }

        // Actualización normal en ruta
        writeToFirebase(lat, lng, speedKmh, true, false, "");
    }

    // ========================================================
    // ESCRITURA NATIVA A FIREBASE FIRESTORE
    // ========================================================

    private void writeToFirebase(double lat, double lng, double speedKmh, boolean activo, boolean enBase, String baseNombre) {
        String fecha = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(new Date());

        // ── Documento principal (última posición conocida) ──────────────────
        Map<String, Object> data = new HashMap<>();
        data.put("unidad", unidad);
        data.put("patente", patente);
        data.put("chofer", chofer);
        data.put("lat", lat);
        data.put("lng", lng);
        data.put("speed", speedKmh);
        data.put("activo", activo);
        data.put("enBase", enBase);
        data.put("timestamp", FieldValue.serverTimestamp());
        data.put("sector", sector);
        data.put("updatedAt", System.currentTimeMillis());

        if (!checklistId.isEmpty()) data.put("checklistId", checklistId);
        if (!hdr.isEmpty())         data.put("hdr", hdr);
        if (!baseNombre.isEmpty())  data.put("baseNombre", baseNombre);

        db.collection("ubicaciones").document("INT-" + unidad)
            .set(data, SetOptions.merge())
            .addOnSuccessListener(v -> Log.d(TAG, "✅ Firestore actualizado: INT-" + unidad))
            .addOnFailureListener(e -> Log.e(TAG, "❌ Firestore error: " + e.getMessage()));

        // ── Subcollection historial (registro por punto GPS) ────────────────
        Map<String, Object> histEntry = new HashMap<>();
        histEntry.put("lat", lat);
        histEntry.put("lng", lng);
        histEntry.put("speed", speedKmh);
        histEntry.put("activo", activo);
        histEntry.put("enBase", enBase);
        histEntry.put("fecha", fecha);
        histEntry.put("timestamp", FieldValue.serverTimestamp());

        db.collection("ubicaciones").document("INT-" + unidad)
            .collection("historial")
            .add(histEntry)
            .addOnFailureListener(e -> Log.e(TAG, "❌ Historial error: " + e.getMessage()));
    }

    // ========================================================
    // HELPERS GEOFENCE
    // ========================================================

    private int encontrarBaseCercana(double lat, double lng) {
        int nearest = 0;
        double minDist = Double.MAX_VALUE;
        for (int i = 0; i < BASES.length; i++) {
            double d = calcularDistancia(lat, lng, BASES[i][0], BASES[i][1]);
            if (d < minDist) { minDist = d; nearest = i; }
        }
        return nearest;
    }

    private double calcularDistancia(double lat1, double lng1, double lat2, double lng2) {
        double R = 6371000.0;
        double dLat = (lat2 - lat1) * Math.PI / 180;
        double dLng = (lng2 - lng1) * Math.PI / 180;
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
                 * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    // ========================================================
    // NOTIFICACIÓN PERSISTENTE
    // ========================================================

    private void createNotificationChannel() {
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID, "CROSSLOG GPS", NotificationManager.IMPORTANCE_LOW);
        channel.setDescription("Rastreo GPS activo en segundo plano");
        channel.setShowBadge(false);
        ((NotificationManager) getSystemService(NOTIFICATION_SERVICE)).createNotificationChannel(channel);
    }

    private void updateNotification(String message) {
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        nm.notify(NOTIFICATION_ID, buildNotification(message));
    }

    private Notification buildNotification(String message) {
        Intent launchIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 0, launchIntent, PendingIntent.FLAG_IMMUTABLE);

        return new Notification.Builder(this, CHANNEL_ID)
            .setContentTitle("CROSSLOG GPS")
            .setContentText(message)
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build();
    }

    // ========================================================
    // CLEANUP
    // ========================================================

    @Override
    public void onDestroy() {
        super.onDestroy();
        isRunning = false;
        if (locationCallback != null) {
            fusedLocationClient.removeLocationUpdates(locationCallback);
        }
        // Limpiar prefs para que no se reinicie con datos viejos si se instaló de nuevo
        getSharedPreferences(PREFS_NAME, MODE_PRIVATE).edit().clear().apply();
        Log.d(TAG, "Servicio detenido");
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }
}
