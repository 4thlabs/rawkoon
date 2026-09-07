package cloud.samlo.rawkoontv.ui.theme

import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import cloud.samlo.rawkoontv.R

/** Rawkoon brand tokens (from the monorepo DESIGN.md + logo gradient). */
object Brand {
    val SurfaceBase = Color(0xFF1C1715)   // warm brown-black ground
    val SurfaceWell = Color(0xFF141010)   // deepest, for the vignette
    val SurfaceRaised = Color(0xFF241E1B)
    val SurfaceInset = Color(0xFF171311)
    val Border = Color(0xFF3A2F27)

    val Apricot = Color(0xFFE8A06A)
    val ApricotSoft = Color(0xFFF0BF93)
    val ApricotLight = Color(0xFFF6C88E)
    val Terracotta = Color(0xFFCF6A4E)
    val BurntOrange = Color(0xFFC45A2F)
    val OnAccent = Color(0xFF2A1A10)      // dark text on the warm accent

    val TextStrong = Color(0xFFF4ECE4)
    val Text = Color(0xFFE3D8CF)
    val TextMuted = Color(0xFFAA9A8C)

    /** The logo/accent gradient: apricot-light → apricot → burnt orange. */
    val warmGradient = Brush.linearGradient(
        0.0f to ApricotLight, 0.5f to Apricot, 1.0f to BurntOrange,
    )
}

val ZillaSlab = FontFamily(
    Font(R.font.zilla_slab_semibold, FontWeight.SemiBold),
)
