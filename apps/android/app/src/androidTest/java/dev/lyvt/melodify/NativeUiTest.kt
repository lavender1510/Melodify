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
        val automation =
            androidx.test.platform.app.InstrumentationRegistry.getInstrumentation().uiAutomation
        // The API 35 emulator may show a Quickstep ANR while booting. Close only that
        // launcher dialog; an application ANR or any other overlay must fail the test.
        val root = automation.rootInActiveWindow
        if (
            root?.findAccessibilityNodeInfosByText("Quickstep isn't responding")?.isNotEmpty() ==
                true
        ) {
            val close = root.findAccessibilityNodeInfosByText("Close app").firstOrNull()
            check(
                close?.performAction(
                    android.view.accessibility.AccessibilityNodeInfo.ACTION_CLICK
                ) == true
            )
        }
        compose.waitUntil(10000) {
            automation.rootInActiveWindow?.packageName?.toString() == compose.activity.packageName
        }
        compose.waitForIdle()
        check(
            automation.rootInActiveWindow?.packageName?.toString() == compose.activity.packageName
        ) {
            "A system window obscures Melodify; this screenshot is not valid UI evidence"
        }
        val bitmap = requireNotNull(automation.takeScreenshot())
        java.io.File(compose.activity.filesDir, name).outputStream().use {
            bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG, 100, it)
        }
        bitmap.recycle()
    }
}
