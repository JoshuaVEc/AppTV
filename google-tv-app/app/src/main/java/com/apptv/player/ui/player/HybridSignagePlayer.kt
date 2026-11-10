package com.apptv.player.ui.player

import android.net.Uri
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import coil.compose.AsyncImage
import com.apptv.player.domain.model.MediaType
import com.apptv.player.domain.model.PlayableLocalItem
import kotlinx.coroutines.delay
import java.io.File

/**
 * Reproductor Híbrido para Google TV (Jetpack Compose + Media3 ExoPlayer + Coil).
 * Reproduce el 100% de los archivos desde el almacenamiento local del televisor (`File(localFilePath)`),
 * garantizando operación continua aunque la computadora y el Wi-Fi estén apagados.
 */
@Composable
fun HybridSignagePlayer(
    playableItems: List<PlayableLocalItem>,
    modifier: Modifier = Modifier
) {
    if (playableItems.isEmpty()) {
        Box(
            modifier = modifier
                .fillMaxSize()
                .background(Color.Black)
        )
        return
    }

    var currentIndex by remember(playableItems) { mutableIntStateOf(0) }
    val currentItem = playableItems[currentIndex % playableItems.size]

    val advanceToNext = {
        currentIndex = (currentIndex + 1) % playableItems.size
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color.Black)
    ) {
        when (currentItem.type) {
            MediaType.IMAGE -> {
                AsyncImage(
                    model = File(currentItem.localFilePath),
                    contentDescription = currentItem.name,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )

                // Temporizador exacto para diapositivas de imagen
                LaunchedEffect(currentIndex, currentItem.assetId) {
                    val durationMs = (currentItem.durationSeconds.coerceAtLeast(1)) * 1000L
                    delay(durationMs)
                    advanceToNext()
                }
            }

            MediaType.VIDEO -> {
                LocalVideoExoPlayer(
                    localFilePath = currentItem.localFilePath,
                    singleItemLoop = playableItems.size == 1,
                    onVideoEnded = advanceToNext
                )
            }
        }
    }
}

@Composable
private fun LocalVideoExoPlayer(
    localFilePath: String,
    singleItemLoop: Boolean,
    onVideoEnded: () -> Unit
) {
    val context = LocalContext.current

    val exoPlayer = remember {
        ExoPlayer.Builder(context).build().apply {
            playWhenReady = true
        }
    }

    LaunchedEffect(localFilePath, singleItemLoop) {
        val fileUri = Uri.fromFile(File(localFilePath))
        exoPlayer.repeatMode = if (singleItemLoop) {
            Player.REPEAT_MODE_ONE
        } else {
            Player.REPEAT_MODE_OFF
        }
        exoPlayer.setMediaItem(MediaItem.fromUri(fileUri))
        exoPlayer.prepare()
        exoPlayer.play()
    }

    DisposableEffect(exoPlayer) {
        val listener = object : Player.Listener {
            override fun onPlaybackStateChanged(playbackState: Int) {
                if (playbackState == Player.STATE_ENDED && !singleItemLoop) {
                    onVideoEnded()
                }
            }
        }
        exoPlayer.addListener(listener)
        onDispose {
            exoPlayer.removeListener(listener)
            exoPlayer.release()
        }
    }

    AndroidView(
        modifier = Modifier.fillMaxSize(),
        factory = { ctx ->
            PlayerView(ctx).apply {
                useController = false
                resizeMode = AspectRatioFrameLayout.RESIZE_MODE_ZOOM
                player = exoPlayer
                layoutParams = FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT
                )
            }
        }
    )
}
