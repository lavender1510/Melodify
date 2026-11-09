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
        compose.onNodeWithText("Songs").performScrollTo().performClick()
        compose.onNodeWithContentDescription("Suche öffnen").performClick()
        compose.onNodeWithText("Musik durchsuchen").assertExists()
        compose.onNodeWithContentDescription("Suche schließen").performClick()
        compose.onNodeWithText("Playlists").performScrollTo().performClick()
        compose.onNodeWithContentDescription("Playlist erstellen").performClick()
        val name = "UI-Test " + System.currentTimeMillis()
        compose.onNodeWithText("Playlistname").performTextInput(name)
        compose.onNodeWithText("Speichern").performClick()
        compose.waitUntil(10000) {
            compose.onAllNodesWithText(name).fetchSemanticsNodes().isNotEmpty()
        }
        compose.onNodeWithText(name).assertExists()
        compose.onNodeWithText("Zuletzt hinzugefügt").assertExists()
        compose.onNodeWithText("Meistgehört").assertExists()
        capture("android-playlists.png")
        compose.onNodeWithContentDescription("Weitere Bereiche").performClick()
        compose.onNodeWithText("Einstellungen").performClick()
        compose.onNodeWithText("122 Themes entdecken").performClick()
        compose.onAllNodesWithText("Nocturne").onLast().performClick()
        compose.onNodeWithText("Anwenden").performClick()
        compose.onNodeWithText("Dein Sound. Deine Regeln.").assertExists()
        capture("android-settings.png")
    }

    private fun capture(name: String) {
        compose.waitForIdle()
        captureAppScreenshot(compose.activity, name)
    }
}
