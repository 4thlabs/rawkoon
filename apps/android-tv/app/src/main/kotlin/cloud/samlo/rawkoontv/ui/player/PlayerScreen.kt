package cloud.samlo.rawkoontv.ui.player

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.SkipNext
import androidx.compose.material.icons.filled.SkipPrevious
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.Button
import androidx.tv.material3.ButtonDefaults
import androidx.tv.material3.Icon
import androidx.tv.material3.Text
import cloud.samlo.rawkoontv.data.RawkoonApi
import cloud.samlo.rawkoontv.data.Session
import cloud.samlo.rawkoontv.player.PlaybackController
import cloud.samlo.rawkoontv.ui.theme.Brand
import cloud.samlo.rawkoontv.ui.theme.ZillaSlab
import coil.compose.AsyncImage
import kotlinx.coroutines.launch

private fun fmt(secs: Double): String {
    val t = secs.toInt().coerceAtLeast(0)
    val h = t / 3600; val m = (t % 3600) / 60; val s = t % 60
    return if (h > 0) "%d:%02d:%02d".format(h, m, s) else "%d:%02d".format(m, s)
}

@Composable
fun PlayerScreen(
    session: Session,
    editionId: Int,
    resumeSecs: Double,
    title: String,
    coverUrl: String?,
    onBack: () -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val controller = remember {
        PlaybackController(context, RawkoonApi(session.baseUrl ?: "", session.token), scope)
    }
    val state by controller.state.collectAsState()
    val playFocus = remember { FocusRequester() }
    var showChapters by androidx.compose.runtime.remember { androidx.compose.runtime.mutableStateOf(false) }

    LaunchedEffect(editionId) {
        cloud.samlo.rawkoontv.player.NowPlaying.current.value =
            cloud.samlo.rawkoontv.player.NowPlayingInfo(editionId, title, coverUrl)
        scope.launch { controller.open(editionId, resumeSecs, session.baseUrl ?: "") }
    }
    androidx.compose.runtime.DisposableEffect(Unit) { onDispose { controller.release() } }
    BackHandler { onBack() }

    val bg = Brush.verticalGradient(0f to Brand.SurfaceWell, 1f to Brand.SurfaceBase)
    val frac = if (state.totalSecs > 0) (state.globalSecs / state.totalSecs).toFloat().coerceIn(0f, 1f) else 0f

    Box(Modifier.fillMaxSize().background(bg), contentAlignment = Alignment.Center) {
        Column(
            Modifier.fillMaxWidth(0.5f),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            AsyncImage(
                model = coverUrl, contentDescription = title,
                modifier = Modifier.size(196.dp).clip(RoundedCornerShape(12.dp)),
            )
            Spacer(Modifier.height(18.dp))
            Text(
                title, fontFamily = ZillaSlab, fontWeight = FontWeight.SemiBold, fontSize = 24.sp,
                color = Brand.TextStrong, textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(4.dp))
            Text(
                state.chapterTitle.ifBlank { " " },
                fontSize = 14.sp, color = Brand.ApricotSoft, textAlign = TextAlign.Center,
            )

            Spacer(Modifier.height(22.dp))
            // Scrubber (display-only on TV)
            Box(Modifier.fillMaxWidth().height(4.dp).clip(RoundedCornerShape(2.dp)).background(Brand.SurfaceInset)) {
                Box(Modifier.fillMaxWidth(frac).height(4.dp).clip(RoundedCornerShape(2.dp)).background(Brand.Apricot))
            }
            Spacer(Modifier.height(6.dp))
            Row(Modifier.fillMaxWidth()) {
                Text(fmt(state.globalSecs), fontSize = 12.sp, color = Brand.TextMuted)
                Spacer(Modifier.weight(1f))
                Text("−" + fmt(state.totalSecs - state.globalSecs), fontSize = 12.sp, color = Brand.TextMuted)
            }

            Spacer(Modifier.height(22.dp))
            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                CircleButton(onClick = { controller.prevChapter() }) {
                    Icon(Icons.Filled.SkipPrevious, "Chapitre précédent")
                }
                LabelButton("−30", onClick = { controller.skip(-30.0) })
                Button(
                    onClick = { controller.playPause() },
                    modifier = Modifier.size(62.dp).focusRequester(playFocus),
                    contentPadding = PaddingValues(0.dp),
                    colors = ButtonDefaults.colors(
                        containerColor = Brand.Apricot, contentColor = Brand.OnAccent,
                        focusedContainerColor = Brand.ApricotLight, focusedContentColor = Brand.OnAccent,
                    ),
                ) {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Icon(
                            if (state.isPlaying) Icons.Filled.Pause else Icons.Filled.PlayArrow,
                            if (state.isPlaying) "Pause" else "Lecture",
                            modifier = Modifier.size(30.dp),
                        )
                    }
                }
                LabelButton("+30", onClick = { controller.skip(30.0) })
                CircleButton(onClick = { controller.nextChapter() }) {
                    Icon(Icons.Filled.SkipNext, "Chapitre suivant")
                }
            }

            Spacer(Modifier.height(20.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                LabelButton("Chapitres", onClick = { showChapters = true })
                LabelButton("Vitesse ${fmtSpeed(state.speed)}×", onClick = { controller.cycleSpeed() })
                LabelButton(
                    state.sleepRemainingSecs?.let { "Veille ${it / 60}:${"%02d".format(it % 60)}" } ?: "Veille",
                    onClick = { controller.cycleSleep() },
                )
            }
        }
    }

    if (showChapters) {
        ChapterOverlay(
            chapters = state.chapters,
            current = state.currentChapterIndex,
            onPick = { controller.jumpToChapter(it); showChapters = false },
            onDismiss = { showChapters = false },
        )
    }

    LaunchedEffect(Unit) { runCatching { playFocus.requestFocus() } }
}

@Composable
private fun CircleButton(onClick: () -> Unit, content: @Composable () -> Unit) {
    Button(
        onClick = onClick,
        modifier = Modifier.size(46.dp),
        contentPadding = PaddingValues(0.dp),
        colors = ButtonDefaults.colors(
            containerColor = Brand.SurfaceRaised, contentColor = Brand.TextStrong,
            focusedContainerColor = Brand.Apricot, focusedContentColor = Brand.OnAccent,
        ),
    ) { Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { content() } }
}

@Composable
private fun LabelButton(label: String, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        colors = ButtonDefaults.colors(
            containerColor = Brand.SurfaceRaised, contentColor = Brand.Text,
            focusedContainerColor = Brand.Apricot, focusedContentColor = Brand.OnAccent,
        ),
    ) { Text(label, fontSize = 15.sp) }
}

private fun fmtSpeed(s: Float): String =
    "%.2f".format(java.util.Locale.US, s).trimEnd('0').trimEnd('.')

@Composable
private fun ChapterOverlay(
    chapters: List<String>,
    current: Int,
    onPick: (Int) -> Unit,
    onDismiss: () -> Unit,
) {
    BackHandler { onDismiss() }
    val listFocus = remember { FocusRequester() }
    val listState = androidx.compose.foundation.lazy.rememberLazyListState()
    Box(
        Modifier.fillMaxSize().background(Brand.SurfaceWell.copy(alpha = 0.95f)),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            Modifier.fillMaxWidth(0.5f).padding(vertical = 40.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(
                "Chapitres",
                fontFamily = cloud.samlo.rawkoontv.ui.theme.ZillaSlab,
                fontWeight = FontWeight.SemiBold, fontSize = 24.sp, color = Brand.TextStrong,
            )
            Spacer(Modifier.height(16.dp))
            LazyColumn(
                state = listState,
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                itemsIndexed(chapters) { i, title ->
                    val isCurrent = i == current
                    Button(
                        onClick = { onPick(i) },
                        modifier = Modifier.fillMaxWidth()
                            .then(if (isCurrent) Modifier.focusRequester(listFocus) else Modifier),
                        colors = ButtonDefaults.colors(
                            containerColor = if (isCurrent) Brand.Apricot.copy(alpha = 0.22f) else Brand.SurfaceRaised,
                            contentColor = if (isCurrent) Brand.Apricot else Brand.Text,
                            focusedContainerColor = Brand.Apricot, focusedContentColor = Brand.OnAccent,
                        ),
                    ) {
                        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                            if (isCurrent) {
                                Icon(Icons.Filled.PlayArrow, null, modifier = Modifier.size(16.dp))
                                Spacer(Modifier.size(8.dp))
                            }
                            Text(title, fontSize = 15.sp, textAlign = TextAlign.Start, modifier = Modifier.weight(1f))
                        }
                    }
                }
            }
        }
    }
    LaunchedEffect(Unit) {
        // Scroll to the current chapter first (so its item is composed), then focus it.
        runCatching { listState.scrollToItem(current.coerceAtLeast(0)) }
        runCatching { listFocus.requestFocus() }
    }
}
