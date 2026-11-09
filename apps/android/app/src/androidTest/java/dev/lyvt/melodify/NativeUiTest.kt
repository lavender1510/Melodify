package dev.lyvt.melodify

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.*
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class NativeUiTest {
    @get:Rule val compose = createAndroidComposeRule<MainActivity>()

    @Test
    fun navigationPlaylistAndThemeSelectionAreNativeAndPersistent() {
        compose.waitForIdle()
        capture("android-home.png")
        compose.onNodeWithText("Songs").performClick()
        compose.onNodeWithText("Musik durchsuchen").assertExists()
        compose.onNodeWithText("Playlists").performClick()
        compose.onNodeWithText("Playlist erstellen").performClick()
        val name = "UI-Test " + System.currentTimeMillis()
        compose.onNodeWithText("Playlistname").performTextInput(name)
        compose.onNodeWithText("Speichern").performClick()
        compose.waitUntil(10000) {
            compose.onAllNodesWithText(name).fetchSemanticsNodes().isNotEmpty()
        }
        compose.onNodeWithText(name).assertExists()
        compose.onNodeWithContentDescription("Weitere Bereiche").performClick()
        compose.onNodeWithText("Einstellungen").performClick()
        compose.onNodeWithText("122 Themes entdecken").performClick()
        compose.onAllNodesWithText("Nocturne").onLast().performClick()
        compose.onNodeWithText("Anwenden").performClick()
        compose.onNodeWithText("Dein Sound. Deine Regeln.").assertExists()
        capture("android-settings.png")
    }

    private fun capture(name: String) {
        val bitmap =
            androidx.test.platform.app.InstrumentationRegistry.getInstrumentation()
                .uiAutomation
                .takeScreenshot() ?: return
        java.io.File(compose.activity.filesDir, name).outputStream().use {
            bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG, 100, it)
        }
        bitmap.recycle()
    }
}
