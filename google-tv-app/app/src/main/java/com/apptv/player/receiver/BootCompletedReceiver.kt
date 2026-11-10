package com.apptv.player.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.apptv.player.ui.MainActivity

/**
 * Inicia automáticamente la aplicación en la Google TV cuando el televisor se enciende
 * o vuelve la luz tras un apagón, incluso si el router Wi-Fi está apagado.
 */
class BootCompletedReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (
            intent.action == Intent.ACTION_BOOT_COMPLETED ||
            intent.action == "android.intent.action.QUICKBOOT_POWERON"
        ) {
            val launchIntent = Intent(context, MainActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            }
            context.startActivity(launchIntent)
        }
    }
}
