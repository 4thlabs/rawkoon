package cloud.samlo.rawkoontv

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.*
import cloud.samlo.rawkoontv.data.RawkoonApi
import cloud.samlo.rawkoontv.data.Session
import cloud.samlo.rawkoontv.ui.Screen
import cloud.samlo.rawkoontv.ui.library.LibraryScreen
import cloud.samlo.rawkoontv.ui.login.LoginScreen
import cloud.samlo.rawkoontv.ui.player.PlayerScreen

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { App(Session(applicationContext)) }
    }
}

@Composable
fun App(session: Session) {
    var screen by remember { mutableStateOf<Screen?>(null) }
    LaunchedEffect(Unit) {
        val ok = session.token != null && runCatching {
            RawkoonApi(session.baseUrl ?: "", session.token).me()
        }.getOrDefault(false)
        screen = if (ok) Screen.Library else Screen.Login
    }
    when (val s = screen) {
        null -> {}
        Screen.Login -> LoginScreen(session) { screen = Screen.Library }
        Screen.Library -> LibraryScreen(session,
            onOpen = { id, resume, title, cover -> screen = Screen.Player(id, resume, title, cover) },
            onLogout = { screen = Screen.Login })
        is Screen.Player -> PlayerScreen(session, s.editionId, s.resumeSecs, s.title, s.coverUrl,
            onBack = { screen = Screen.Library })
    }
}
