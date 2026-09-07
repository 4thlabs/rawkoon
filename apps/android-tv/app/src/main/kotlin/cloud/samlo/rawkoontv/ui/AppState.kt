package cloud.samlo.rawkoontv.ui

sealed interface Screen {
    data object Login : Screen
    data object Library : Screen
    data class Player(
        val editionId: Int,
        val resumeSecs: Double,
        val title: String,
        val coverUrl: String?,
    ) : Screen
}
