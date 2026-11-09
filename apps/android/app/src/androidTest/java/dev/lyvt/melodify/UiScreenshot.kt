package dev.lyvt.melodify

import android.content.Context
import android.graphics.Bitmap
import android.view.accessibility.AccessibilityNodeInfo
import androidx.test.platform.app.InstrumentationRegistry

/** Capture actual visible windows, never just Compose semantics behind an overlay. */
fun captureAppScreenshot(context: Context, name: String) {
    val automation = InstrumentationRegistry.getInstrumentation().uiAutomation
    val root = automation.rootInActiveWindow
    // Only the known API 35 launcher ANR may be closed. App ANRs fail below.
    if (
        root?.findAccessibilityNodeInfosByText("Quickstep isn't responding")?.isNotEmpty() == true
    ) {
        check(
            root
                .findAccessibilityNodeInfosByText("Close app")
                .firstOrNull()
                ?.performAction(AccessibilityNodeInfo.ACTION_CLICK) == true
        )
    }
    val deadline = System.currentTimeMillis() + 10000
    while (
        automation.rootInActiveWindow?.packageName?.toString() != context.packageName &&
            System.currentTimeMillis() < deadline
    ) Thread.sleep(50)
    check(automation.rootInActiveWindow?.packageName?.toString() == context.packageName) {
        "A system window obscures Melodify; this screenshot is not valid UI evidence"
    }
    val bitmap = requireNotNull(automation.takeScreenshot())
    java.io.File(context.filesDir, name).outputStream().use {
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, it)
    }
    bitmap.recycle()
}
