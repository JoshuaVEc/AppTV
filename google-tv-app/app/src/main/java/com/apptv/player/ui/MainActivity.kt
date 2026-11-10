package com.apptv.player.ui

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.os.Bundle
import android.view.KeyEvent
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.room.Room
import com.apptv.player.data.local.AppDatabase
import com.apptv.player.domain.ScheduleEvaluator
import com.apptv.player.domain.model.DeviceManifestPayload
import com.apptv.player.domain.model.PlayableLocalItem
import com.apptv.player.ui.player.HybridSignagePlayer
import kotlinx.coroutines.delay
import kotlinx.serialization.json.Json
import java.io.File
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

class MainActivity : ComponentActivity() {

    private val database: AppDatabase by lazy {
        Room.databaseBuilder(
            applicationContext,
            AppDatabase::class.java,
            "apptv_signage_offline.db"
        ).build()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Evitar que la Google TV apague la pantalla o lance su protector de pantalla
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        setContent {
            GoogleTvSignageScreen(database = database)
        }
    }
}

@Composable
private fun GoogleTvSignageScreen(database: AppDatabase) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val dao = remember { database.signageDao() }
    val json = remember { Json { ignoreUnknownKeys = true } }

    val localManifestEntity by dao.observeActiveManifest().collectAsState(initial = null)
    var cachedAssetsMap by remember { mutableStateOf<Map<String, String>>(emptyMap()) }
    var isNetworkOnline by remember { mutableStateOf(true) }
    var showStatusHud by remember { mutableStateOf(true) }

    // Reloj local de la Google TV (se actualiza cada segundo sin requerir internet)
    var currentDaySundayZero by remember { mutableStateOf(1) }
    var currentTimeHHmm by remember { mutableStateOf("08:00") }

    LaunchedEffect(Unit) {
        while (true) {
            val now = LocalDateTime.now()
            // Java DayOfWeek: 1=Lunes..7=Domingo -> Convertimos Domingo=0..Sábado=6
            currentDaySundayZero = now.dayOfWeek.value % 7
            currentTimeHHmm = now.format(DateTimeFormatter.ofPattern("HH:mm"))
            delay(1_000L)
        }
    }

    // Ocultar HUD automáticamente tras 8 segundos; vuelve a aparecer al pulsar OK en el control remoto
    LaunchedEffect(showStatusHud) {
        if (showStatusHud) {
            delay(8_000L)
            showStatusHud = false
        }
    }

    // Monitorear cambios de conectividad Wi-Fi / Ethernet en la Google TV
    DisposableEffect(context) {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val callback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                isNetworkOnline = true
            }

            override fun onLost(network: Network) {
                isNetworkOnline = false
            }
        }
        runCatching {
            val activeNet = cm.activeNetwork
            val caps = cm.getNetworkCapabilities(activeNet)
            isNetworkOnline = caps?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) == true
            cm.registerDefaultNetworkCallback(callback)
        }
        onDispose {
            runCatching { cm.unregisterNetworkCallback(callback) }
        }
    }

    // Cargar el mapa de rutas locales en disco cada vez que cambia el manifiesto activo
    LaunchedEffect(localManifestEntity?.version) {
        val allCached = dao.getAllCachedAssets()
        cachedAssetsMap = allCached.associate { it.assetId to it.localFilePath }
    }

    val parsedManifest: DeviceManifestPayload? = remember(localManifestEntity?.payloadJson) {
        localManifestEntity?.payloadJson?.let { raw ->
            runCatching { json.decodeFromString<DeviceManifestPayload>(raw) }.getOrNull()
        }
    }

    val scheduleEval = remember(parsedManifest, currentDaySundayZero, currentTimeHHmm) {
        parsedManifest?.let {
            ScheduleEvaluator.evaluate(it, currentDaySundayZero, currentTimeHHmm)
        }
    }

    val playableLocalItems: List<PlayableLocalItem> = remember(
        parsedManifest,
        scheduleEval,
        cachedAssetsMap
    ) {
        if (parsedManifest == null || scheduleEval == null) {
            emptyList()
        } else {
            val assetsById = parsedManifest.assets.associateBy { it.id }
            scheduleEval.items.mapNotNull { item ->
                val assetMeta = assetsById[item.assetId] ?: return@mapNotNull null
                val localPath = cachedAssetsMap[item.assetId] ?: return@mapNotNull null
                if (!File(localPath).exists()) return@mapNotNull null

                PlayableLocalItem(
                    assetId = assetMeta.id,
                    name = assetMeta.name,
                    type = assetMeta.type,
                    localFilePath = localPath,
                    durationSeconds = item.durationSec
                )
            }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
            .onKeyEvent { event ->
                if (
                    event.nativeKeyEvent.action == KeyEvent.ACTION_DOWN &&
                    (event.nativeKeyEvent.keyCode == KeyEvent.KEYCODE_DPAD_CENTER ||
                        event.nativeKeyEvent.keyCode == KeyEvent.KEYCODE_ENTER ||
                        event.nativeKeyEvent.keyCode == KeyEvent.KEYCODE_MENU)
                ) {
                    showStatusHud = !showStatusHud
                    true
                } else {
                    false
                }
            }
    ) {
        if (playableLocalItems.isNotEmpty()) {
            HybridSignagePlayer(
                playableItems = playableLocalItems,
                modifier = Modifier.fillMaxSize()
            )
        } else {
            // Pantalla de vinculación inicial cuando la TV aún no tiene manifiesto descargado
            PairingEmptyStateScreen(isOnline = isNetworkOnline)
        }

        // HUD discreto de diagnóstico (se activa con el botón central del control de Google TV)
        AnimatedVisibility(
            visible = showStatusHud,
            modifier = Modifier
                .align(Alignment.TopCenter)
                .fillMaxWidth()
                .padding(24.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0xD9090D16), RoundedCornerShape(14.dp))
                    .padding(horizontal = 20.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = if (isNetworkOnline) {
                        "● ONLINE (Sincronización en Nube Activa)"
                    } else {
                        "● OFFLINE (Modo Autónomo desde Memoria Interna)"
                    },
                    color = if (isNetworkOnline) Color(0xFF34D399) else Color(0xFFFBBF24),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold
                )

                Text(
                    text = "Manifiesto Local v${parsedManifest?.version ?: 0} • Reloj TV: $currentTimeHHmm",
                    color = Color.White,
                    fontSize = 14.sp,
                    fontFamily = FontFamily.Monospace
                )
            }
        }
    }
}

@Composable
private fun PairingEmptyStateScreen(isOnline: Boolean) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF020617))
            .padding(48.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "AppTV Signage • Google TV",
            color = Color.White,
            fontSize = 32.sp,
            fontWeight = FontWeight.Bold
        )
        Text(
            text = "Ingresa este código en el Dashboard de tu computador para vincular y descargar la programación:",
            color = Color(0xFF94A3B8),
            fontSize = 18.sp,
            modifier = Modifier.padding(top = 12.dp, bottom = 24.dp)
        )
        Box(
            modifier = Modifier
                .background(Color(0xFF1E1B4B), RoundedCornerShape(16.dp))
                .padding(horizontal = 36.dp, vertical = 18.dp)
        ) {
            Text(
                text = "TV-8492",
                color = Color(0xFF818CF8),
                fontSize = 42.sp,
                fontFamily = FontFamily.Monospace,
                fontWeight = FontWeight.ExtraBold
            )
        }
        Text(
            text = if (isOnline) "Conectado a internet • Esperando publicación..." else "Sin conexión Wi-Fi",
            color = if (isOnline) Color(0xFF34D399) else Color(0xFFFBBF24),
            fontSize = 14.sp,
            modifier = Modifier.padding(top = 24.dp)
        )
    }
}
