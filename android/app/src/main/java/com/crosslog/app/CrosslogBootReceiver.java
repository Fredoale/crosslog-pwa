package com.crosslog.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.util.Log;

/**
 * CrosslogBootReceiver
 * Se activa cuando el teléfono termina de encender (BOOT_COMPLETED).
 * Si había un viaje activo guardado en SharedPreferences, relanza
 * el CrosslogGpsService para que continúe rastreando hasta llegar a base.
 */
public class CrosslogBootReceiver extends BroadcastReceiver {

    private static final String TAG = "CrosslogBoot";
    private static final String PREFS_NAME = "CrosslogGpsPrefs";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (!Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) return;

        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String unidad = prefs.getString("unidad", "");
        String viajeId = prefs.getString("viajeId", "");

        // Solo relanzar si había un viaje activo
        if (unidad.isEmpty() || viajeId.isEmpty()) {
            Log.d(TAG, "Sin viaje activo — no se relanza GPS");
            return;
        }

        Log.d(TAG, "🔄 Boot detectado con viaje activo para INT-" + unidad + " — relanzando GPS");

        Intent serviceIntent = new Intent(context, CrosslogGpsService.class);
        // intent=null en onStartCommand indica reinicio → recupera datos de SharedPreferences
        context.startForegroundService(serviceIntent);
    }
}
