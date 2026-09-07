package cloud.samlo.rawkoontv.ui.theme

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * The Rawkoon mark, drawn to match apps/web/public/icon.svg (512 viewBox):
 * a gradient film-reel ring with four punched holes and a solid play triangle.
 */
@Composable
fun RawkoonLogo(size: Dp = 120.dp, modifier: Modifier = Modifier) {
    Canvas(modifier = modifier.size(size)) {
        val s = this.size.minDimension
        fun p(v: Float) = v / 512f * s // scale from the 512 viewBox
        val gradient: Brush = Brush.linearGradient(
            0.0f to Brand.ApricotLight, 0.5f to Brand.Apricot, 1.0f to Brand.BurntOrange,
            start = Offset(p(60f), p(40f)), end = Offset(p(450f), p(490f)),
        )
        val center = Offset(p(256f), p(256f))

        drawCircle(
            brush = gradient, radius = p(150f), center = center,
            style = Stroke(width = p(44f)),
        )
        listOf(
            Offset(p(256f), p(106f)), Offset(p(406f), p(256f)),
            Offset(p(256f), p(406f)), Offset(p(106f), p(256f)),
        ).forEach { drawCircle(color = Brand.SurfaceBase, radius = p(13f), center = it) }

        val play = Path().apply {
            moveTo(p(214f), p(188f)); lineTo(p(342f), p(256f)); lineTo(p(214f), p(324f)); close()
        }
        drawPath(play, brush = gradient)
    }
}
