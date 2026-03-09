package com.crosslog.app;

import android.content.Intent;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Map;

/**
 * CrosslogGpsPlugin
 * Plugin Capacitor que expone el CrosslogGpsService al WebView JS.
 * El servicio escribe Firebase de forma nativa (sin pasar por JS),
 * y notifica eventos GPS_SALIDA / GPS_BASE al componente React.
 */
@CapacitorPlugin(name = "CrosslogGps")
public class CrosslogGpsPlugin extends Plugin {

    private static final String TAG = "CrosslogGpsPlugin";

    @PluginMethod
    public void startTracking(PluginCall call) {
        String unidad      = call.getString("unidad", "");
        String patente     = call.getString("patente", "");
        String chofer      = call.getString("chofer", "");
        String checklistId = call.getString("checklistId", "");
        String sector      = call.getString("sector", "vrac");
        String hdr         = call.getString("hdr", "");
        double odometroInicial = call.getDouble("odometroInicial", 0.0);

        // Registrar callback antes de iniciar el servicio
        CrosslogGpsService.eventCallback = new CrosslogGpsService.EventCallback() {
            @Override
            public void onEvent(String event, Map<String, Object> data) {
                JSObject jsData = new JSObject();
                for (Map.Entry<String, Object> entry : data.entrySet()) {
                    Object val = entry.getValue();
                    if (val instanceof String)  jsData.put(entry.getKey(), (String) val);
                    else if (val instanceof Boolean) jsData.put(entry.getKey(), (Boolean) val);
                    else if (val instanceof Double)  jsData.put(entry.getKey(), (Double) val);
                    else if (val instanceof Long)    jsData.put(entry.getKey(), (Long) val);
                    else if (val != null)            jsData.put(entry.getKey(), val.toString());
                }
                notifyListeners(event, jsData);
                Log.d(TAG, "📡 Evento enviado a JS: " + event);
            }
        };

        // Iniciar foreground service
        Intent intent = new Intent(getContext(), CrosslogGpsService.class);
        intent.putExtra("unidad",          unidad);
        intent.putExtra("patente",         patente);
        intent.putExtra("chofer",          chofer);
        intent.putExtra("checklistId",     checklistId);
        intent.putExtra("sector",          sector);
        intent.putExtra("hdr",             hdr);
        intent.putExtra("odometroInicial", odometroInicial);
        getContext().startForegroundService(intent);

        JSObject result = new JSObject();
        result.put("success", true);
        result.put("message", "Servicio GPS iniciado para INT-" + unidad);
        call.resolve(result);

        Log.d(TAG, "✅ startTracking → INT-" + unidad + " | sector=" + sector);
    }

    @PluginMethod
    public void stopTracking(PluginCall call) {
        // Enviar acción STOP al servicio
        Intent stopIntent = new Intent(getContext(), CrosslogGpsService.class);
        stopIntent.setAction(CrosslogGpsService.ACTION_STOP);
        getContext().startService(stopIntent);

        CrosslogGpsService.eventCallback = null;

        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);

        Log.d(TAG, "⏹️ stopTracking llamado");
    }

    @PluginMethod
    public void isTracking(PluginCall call) {
        JSObject result = new JSObject();
        result.put("isTracking", CrosslogGpsService.isRunning);
        call.resolve(result);
    }

    @Override
    protected void handleOnDestroy() {
        // Limpiar eventCallback cuando la Activity se destruye
        // Evita que el HandlerThread del servicio falle al intentar notificar a un bridge destruido
        CrosslogGpsService.eventCallback = null;
        Log.d("CrosslogGpsPlugin", "Plugin destruido — eventCallback limpiado");
    }
}
