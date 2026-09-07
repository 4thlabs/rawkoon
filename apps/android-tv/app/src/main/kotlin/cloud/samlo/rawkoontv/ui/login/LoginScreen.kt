package cloud.samlo.rawkoontv.ui.login

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text as M3Text
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.Button
import androidx.tv.material3.ButtonDefaults
import androidx.tv.material3.Text
import cloud.samlo.rawkoontv.data.RawkoonApi
import cloud.samlo.rawkoontv.data.Session
import cloud.samlo.rawkoontv.ui.theme.Brand
import cloud.samlo.rawkoontv.ui.theme.RawkoonLogo
import cloud.samlo.rawkoontv.ui.theme.ZillaSlab
import kotlinx.coroutines.launch

@Composable
fun LoginScreen(session: Session, onSignedIn: () -> Unit) {
    var url by remember { mutableStateOf(session.baseUrl ?: "https://") }
    var email by remember { mutableStateOf("") }
    var pass by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val firstField = remember { FocusRequester() }

    // Warm radial glow anchored behind the mark on the left third.
    val glow = Brush.radialGradient(
        0.0f to Brand.Apricot.copy(alpha = 0.16f),
        0.55f to Brand.BurntOrange.copy(alpha = 0.05f),
        1.0f to Brand.SurfaceWell.copy(alpha = 0f),
        center = Offset(520f, 430f), radius = 760f,
    )

    MaterialTheme(colorScheme = darkColorScheme(surface = Brand.SurfaceBase)) {
        Box(Modifier.fillMaxSize().background(Brand.SurfaceBase).background(glow)) {
            Row(Modifier.fillMaxSize().padding(horizontal = 80.dp, vertical = 64.dp)) {
                // Left — the brand
                Column(
                    Modifier.weight(1f).fillMaxHeight(),
                    verticalArrangement = Arrangement.Center,
                ) {
                    RawkoonLogo(size = 96.dp)
                    Spacer(Modifier.height(20.dp))
                    Text(
                        "Rawkoon",
                        fontFamily = ZillaSlab,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 52.sp,
                        color = Brand.TextStrong,
                    )
                    Spacer(Modifier.height(8.dp))
                    Text(
                        "Reprends ton écoute.",
                        fontFamily = ZillaSlab,
                        fontSize = 20.sp,
                        color = Brand.Apricot,
                    )
                }

                Spacer(Modifier.width(72.dp))

                // Right — the form
                Column(
                    Modifier.weight(1f).fillMaxHeight(),
                    verticalArrangement = Arrangement.Center,
                ) {
                    val fieldMod = Modifier.fillMaxWidth()
                    OutlinedTextField(
                        value = url, onValueChange = { url = it },
                        label = { M3Text("Serveur") }, placeholder = { M3Text("https://…") },
                        singleLine = true, colors = fieldColors(),
                        modifier = fieldMod.focusRequester(firstField),
                    )
                    Spacer(Modifier.height(16.dp))
                    OutlinedTextField(
                        value = email, onValueChange = { email = it },
                        label = { M3Text("Courriel") }, singleLine = true, colors = fieldColors(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                        modifier = fieldMod,
                    )
                    Spacer(Modifier.height(16.dp))
                    OutlinedTextField(
                        value = pass, onValueChange = { pass = it },
                        label = { M3Text("Mot de passe") }, singleLine = true, colors = fieldColors(),
                        visualTransformation = PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                        modifier = fieldMod,
                    )
                    error?.let {
                        Spacer(Modifier.height(14.dp))
                        M3Text(it, color = Brand.Terracotta)
                    }
                    Spacer(Modifier.height(28.dp))
                    Button(
                        onClick = {
                            if (busy) return@Button
                            busy = true; error = null
                            scope.launch {
                                runCatching {
                                    val token = RawkoonApi(url.trim(), null).signIn(email.trim(), pass)
                                    session.baseUrl = url.trim(); session.token = token
                                    onSignedIn()
                                }.onFailure { error = it.message ?: "Connexion échouée. Vérifie le serveur." }
                                busy = false
                            }
                        },
                        colors = ButtonDefaults.colors(
                            containerColor = Brand.Apricot, contentColor = Brand.OnAccent,
                        ),
                    ) { Text(if (busy) "Connexion…" else "Se connecter") }
                }
            }
        }
    }

    LaunchedEffect(Unit) { firstField.requestFocus() }
}

@Composable
private fun fieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = Brand.Apricot,
    unfocusedBorderColor = Brand.Border,
    focusedLabelColor = Brand.Apricot,
    unfocusedLabelColor = Brand.TextMuted,
    focusedTextColor = Brand.TextStrong,
    unfocusedTextColor = Brand.Text,
    cursorColor = Brand.Apricot,
    focusedContainerColor = Brand.SurfaceInset,
    unfocusedContainerColor = Brand.SurfaceInset,
)
