# Rawkoon Android TV — Audiobook Player Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A native Android TV app that browses a Rawkoon server's audiobook library and plays audiobooks with chapter navigation, resume, remote-friendly controls, and server-synced listening position.

**Architecture:** Single-module Kotlin app. Compose for TV renders three screens (Login → Library → Player). Media3 `ExoPlayer` inside a `MediaLibraryService` handles playback + background audio + remote transport. A Ktor client talks to the Rawkoon REST API. The pure logic (global↔chapter position mapping, manifest→playlist, progress-sync throttle, URL resolution) lives in Android-free classes and is unit-tested on the JVM; UI/service wiring is verified manually on device.

**Tech Stack:** Kotlin 2.0.21, AGP 8.5.2, Gradle 8.9, Compose for TV (`androidx.tv:tv-material`), Media3 1.4.1, Ktor 2.3.12 (OkHttp engine), kotlinx.serialization 1.7.3, androidx.security:security-crypto 1.1.0-alpha06, JUnit 4.13.2.

**Spec:** `docs/superpowers/specs/2026-09-07-rawkoon-android-tv-audiobook-design.md`

## Global Constraints

- Package/namespace: `cloud.samlo.rawkoontv`.
- `minSdk = 25`, `targetSdk = 34`, `compileSdk = 34`. No NDK / native libs (single universal APK for both armeabi-v7a devices).
- Playback client ONLY — no downloads, requests, or movie/TV features (spec "Out of scope").
- All API DTOs use the server's **snake_case** JSON field names via `@SerialName`.
- Chapter media URLs are pre-signed (`?grant=…`) and honor HTTP Range — never attach an auth header to `/api/books/files/.../content` requests.
- Pure logic (position math, throttle, playlist build, URL resolution) must be Android-free and JVM-unit-tested. UI and the Media3 service are verified manually on device.
- Target devices for install/test: Fire `192.168.50.219:5555`, Sony `192.168.50.35:5555` (ADB over network, via the throwaway `android-tools` docker container).

---

## Task 1: Toolchain + buildable skeleton

Bring up the Android SDK and a minimal app that builds and installs on a TV. Everything here is prerequisite for every later task, so it is one task ending in an installed, launchable APK.

**Files:**
- Create: `settings.gradle.kts`, `build.gradle.kts`, `gradle.properties`, `gradle/wrapper/gradle-wrapper.properties`, `gradlew`, `gradlew.bat`, `gradle/libs.versions.toml`
- Create: `app/build.gradle.kts`
- Create: `app/src/main/AndroidManifest.xml`
- Create: `app/src/main/kotlin/cloud/samlo/rawkoontv/MainActivity.kt`
- Create: `app/src/main/res/values/strings.xml`, `app/src/main/res/values/themes.xml`
- Create: `local.properties.template`

**Interfaces:**
- Produces: a Gradle project that `./gradlew assembleDebug` builds into `app/build/outputs/apk/debug/app-debug.apk`; a launchable `MainActivity` (leanback launcher intent).

- [ ] **Step 1: Install the Android SDK (one-time, host)**

```bash
mkdir -p ~/Android/Sdk/cmdline-tools
cd /tmp
curl -fsSLo cmdtools.zip https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
unzip -q cmdtools.zip -d ~/Android/Sdk/cmdline-tools
mv ~/Android/Sdk/cmdline-tools/cmdline-tools ~/Android/Sdk/cmdline-tools/latest
export ANDROID_HOME=~/Android/Sdk
yes | ~/Android/Sdk/cmdline-tools/latest/bin/sdkmanager --licenses
~/Android/Sdk/cmdline-tools/latest/bin/sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"
```

Expected: `platforms/android-34`, `build-tools/34.0.0`, `platform-tools` exist under `~/Android/Sdk`.

- [ ] **Step 2: Write the Gradle build files**

`local.properties.template`:
```properties
sdk.dir=/home/samuelloranger/Android/Sdk
```
Copy to `local.properties` locally (git-ignored): `cp local.properties.template local.properties`.

`settings.gradle.kts`:
```kotlin
pluginManagement { repositories { google(); mavenCentral(); gradlePluginPortal() } }
dependencyResolutionManagement { repositories { google(); mavenCentral() } }
rootProject.name = "rawkoon-android-tv"
include(":app")
```

`gradle/libs.versions.toml`:
```toml
[versions]
agp = "8.5.2"
kotlin = "2.0.21"
media3 = "1.4.1"
ktor = "2.3.12"
serialization = "1.7.3"
tvMaterial = "1.0.0"
composeBom = "2024.09.03"
security = "1.1.0-alpha06"
lifecycle = "2.8.6"
coil = "2.7.0"
junit = "4.13.2"
coroutinesTest = "1.9.0"

[libraries]
tv-material = { module = "androidx.tv:tv-material", version.ref = "tvMaterial" }
compose-bom = { module = "androidx.compose:compose-bom", version.ref = "composeBom" }
compose-foundation = { module = "androidx.compose.foundation:foundation" }
compose-ui = { module = "androidx.compose.ui:ui" }
compose-ui-tooling-preview = { module = "androidx.compose.ui:ui-tooling-preview" }
activity-compose = { module = "androidx.activity:activity-compose", version = "1.9.2" }
lifecycle-runtime-compose = { module = "androidx.lifecycle:lifecycle-runtime-compose", version.ref = "lifecycle" }
lifecycle-viewmodel-compose = { module = "androidx.lifecycle:lifecycle-viewmodel-compose", version.ref = "lifecycle" }
media3-exoplayer = { module = "androidx.media3:media3-exoplayer", version.ref = "media3" }
media3-session = { module = "androidx.media3:media3-session", version.ref = "media3" }
media3-ui = { module = "androidx.media3:media3-ui", version.ref = "media3" }
ktor-client-okhttp = { module = "io.ktor:ktor-client-okhttp", version.ref = "ktor" }
ktor-client-content-negotiation = { module = "io.ktor:ktor-client-content-negotiation", version.ref = "ktor" }
ktor-serialization-json = { module = "io.ktor:ktor-serialization-kotlinx-json", version.ref = "ktor" }
kotlinx-serialization-json = { module = "org.jetbrains.kotlinx:kotlinx-serialization-json", version.ref = "serialization" }
security-crypto = { module = "androidx.security:security-crypto", version.ref = "security" }
coil-compose = { module = "io.coil-kt:coil-compose", version.ref = "coil" }
junit = { module = "junit:junit", version.ref = "junit" }
coroutines-test = { module = "org.jetbrains.kotlinx:kotlinx-coroutines-test", version.ref = "coroutinesTest" }

[plugins]
android-application = { id = "com.android.application", version.ref = "agp" }
kotlin-android = { id = "org.jetbrains.kotlin.android", version.ref = "kotlin" }
kotlin-compose = { id = "org.jetbrains.kotlin.plugin.compose", version.ref = "kotlin" }
kotlin-serialization = { id = "org.jetbrains.kotlin.plugin.serialization", version.ref = "kotlin" }
```

Root `build.gradle.kts`:
```kotlin
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.compose) apply false
    alias(libs.plugins.kotlin.serialization) apply false
}
```

`gradle.properties`:
```properties
org.gradle.jvmargs=-Xmx2048m
android.useAndroidX=true
kotlin.code.style=official
```

`gradle/wrapper/gradle-wrapper.properties`:
```properties
distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\://services.gradle.org/distributions/gradle-8.9-bin.zip
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
```

Generate the wrapper jar + scripts with a one-off system Gradle in a container (no system gradle on host):
```bash
docker run --rm -v ~/sites/rawkoon-android-tv:/w -w /w gradle:8.9-jdk21 gradle wrapper --gradle-version 8.9
```

- [ ] **Step 3: Write the app module**

`app/build.gradle.kts`:
```kotlin
plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
}

android {
    namespace = "cloud.samlo.rawkoontv"
    compileSdk = 34
    defaultConfig {
        applicationId = "cloud.samlo.rawkoontv"
        minSdk = 25
        targetSdk = 34
        versionCode = 1
        versionName = "0.1.0"
    }
    buildFeatures { compose = true }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    sourceSets["main"].java.srcDirs("src/main/kotlin")
    sourceSets["test"].java.srcDirs("src/test/kotlin")
    buildTypes { getByName("debug") { isDebuggable = true } }
}

dependencies {
    implementation(platform(libs.compose.bom))
    implementation(libs.compose.foundation)
    implementation(libs.compose.ui)
    implementation(libs.compose.ui.tooling.preview)
    implementation(libs.activity.compose)
    implementation(libs.lifecycle.runtime.compose)
    implementation(libs.lifecycle.viewmodel.compose)
    implementation(libs.tv.material)
    implementation(libs.media3.exoplayer)
    implementation(libs.media3.session)
    implementation(libs.media3.ui)
    implementation(libs.ktor.client.okhttp)
    implementation(libs.ktor.client.content.negotiation)
    implementation(libs.ktor.serialization.json)
    implementation(libs.kotlinx.serialization.json)
    implementation(libs.security.crypto)
    implementation(libs.coil.compose)
    testImplementation(libs.junit)
    testImplementation(libs.coroutines.test)
}
```

`app/src/main/AndroidManifest.xml`:
```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-feature android:name="android.software.leanback" android:required="true" />
    <uses-feature android:name="android.hardware.touchscreen" android:required="false" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />

    <application
        android:label="@string/app_name"
        android:banner="@drawable/app_banner"
        android:theme="@style/Theme.RawkoonTv"
        android:supportsRtl="true">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:screenOrientation="landscape">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LEANBACK_LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

`app/src/main/res/values/strings.xml`:
```xml
<resources><string name="app_name">Rawkoon Audiobooks</string></resources>
```

`app/src/main/res/values/themes.xml`:
```xml
<resources>
    <style name="Theme.RawkoonTv" parent="@android:style/Theme.DeviceDefault.NoActionBar" />
</resources>
```

Add a placeholder banner (required by leanback): create `app/src/main/res/drawable/app_banner.xml`:
```xml
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#0B1220" />
    <size android:width="320dp" android:height="180dp" />
</shape>
```

`app/src/main/kotlin/cloud/samlo/rawkoontv/MainActivity.kt`:
```kotlin
package cloud.samlo.rawkoontv

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.tv.material3.Text

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { App() }
    }
}

@Composable
fun App() {
    Box(Modifier.fillMaxSize()) { Text("Rawkoon Audiobooks") }
}
```

- [ ] **Step 4: Build the APK**

Run (in a container with the SDK mounted, or on host with `ANDROID_HOME` set):
```bash
ANDROID_HOME=~/Android/Sdk ./gradlew :app:assembleDebug
```
Expected: BUILD SUCCESSFUL, `app/build/outputs/apk/debug/app-debug.apk` exists.

- [ ] **Step 5: Install + launch on the Fire TV, verify**

```bash
KEYDIR=/tmp/claude-1000/.../android-key-fire   # reuse the session key dir
APK=~/sites/rawkoon-android-tv/app/build/outputs/apk/debug/app-debug.apk
docker run --rm --network host -v "$KEYDIR":/root/.android -v "$(dirname $APK)":/apk --entrypoint sh alpine \
  -c 'apk add --no-cache android-tools >/dev/null; adb connect 192.168.50.219:5555; adb -s 192.168.50.219:5555 install -r /apk/app-debug.apk; adb -s 192.168.50.219:5555 shell monkey -p cloud.samlo.rawkoontv 1'
```
Expected: install `Success`; the app opens showing "Rawkoon Audiobooks".

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "chore: buildable android tv skeleton"
```

---

## Task 2: API DTOs + JSON round-trip test

**Files:**
- Create: `app/src/main/kotlin/cloud/samlo/rawkoontv/data/Models.kt`
- Test: `app/src/test/kotlin/cloud/samlo/rawkoontv/data/ModelsTest.kt`

**Interfaces:**
- Produces: `@Serializable` data classes `SignInResponse(token: String)`, `MeResponse(id: String)`, `BookSummaryDto`, `ProgressDto(editionId: Int, positionSecs: Double, totalDurationSecs: Double, finished: Boolean)`, `ManifestDto(totalDurationSecs: Double, chapters: List<ChapterDto>)`, `ChapterDto(index: Int, title: String, startSecs: Double, endSecs: Double, fileId: Int, url: String)`. A shared `json: Json` configured with `ignoreUnknownKeys = true`.

- [ ] **Step 1: Write the failing test**

`ModelsTest.kt`:
```kotlin
package cloud.samlo.rawkoontv.data

import kotlinx.serialization.decodeFromString
import org.junit.Assert.assertEquals
import org.junit.Test

class ModelsTest {
    @Test fun parsesManifestWithSnakeCaseAndUnknownFields() {
        val raw = """
        {"total_duration_secs": 3600.0, "extra": "ignored",
         "chapters": [
           {"index":0,"title":"Ch 1","start_secs":0.0,"end_secs":1800.0,
            "file_id":11,"size_bytes":123,"sha256":"a","url":"/api/books/files/11/content?grant=x"}
         ]}
        """.trimIndent()
        val m = json.decodeFromString<ManifestDto>(raw)
        assertEquals(3600.0, m.totalDurationSecs, 0.0)
        assertEquals(1, m.chapters.size)
        assertEquals(11, m.chapters[0].fileId)
        assertEquals("/api/books/files/11/content?grant=x", m.chapters[0].url)
    }

    @Test fun parsesProgressList() {
        val raw = """[{"edition_id":7,"position_secs":42.5,"total_duration_secs":100.0,"finished":false}]"""
        val list = json.decodeFromString<List<ProgressDto>>(raw)
        assertEquals(7, list[0].editionId)
        assertEquals(42.5, list[0].positionSecs, 0.0)
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `ANDROID_HOME=~/Android/Sdk ./gradlew :app:testDebugUnitTest --tests "*ModelsTest*"`
Expected: FAIL — `Models.kt` / `json` unresolved.

- [ ] **Step 3: Write `Models.kt`**

```kotlin
package cloud.samlo.rawkoontv.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

val json = Json { ignoreUnknownKeys = true; isLenient = true }

@Serializable data class SignInResponse(val token: String)
@Serializable data class MeResponse(val id: String)

@Serializable data class BookSummaryDto(
    @SerialName("edition_id") val editionId: Int,
    val title: String,
    val author: String? = null,
    @SerialName("cover_url") val coverUrl: String? = null,
    @SerialName("duration_secs") val durationSecs: Double? = null,
    @SerialName("is_audiobook") val isAudiobook: Boolean = true,
)

@Serializable data class ProgressDto(
    @SerialName("edition_id") val editionId: Int,
    @SerialName("position_secs") val positionSecs: Double = 0.0,
    @SerialName("total_duration_secs") val totalDurationSecs: Double = 0.0,
    val finished: Boolean = false,
)

@Serializable data class ChapterDto(
    val index: Int,
    val title: String,
    @SerialName("start_secs") val startSecs: Double,
    @SerialName("end_secs") val endSecs: Double,
    @SerialName("file_id") val fileId: Int,
    val url: String,
)

@Serializable data class ManifestDto(
    @SerialName("total_duration_secs") val totalDurationSecs: Double,
    val chapters: List<ChapterDto>,
)
```

> **Executor note:** `BookSummaryDto` field names (`cover_url`, `duration_secs`, `is_audiobook`) are best-effort. During Task 4, curl `GET /api/books` against a real server (`docs/…-design.md` API section) and correct the `@SerialName`s to the actual payload before relying on them.

- [ ] **Step 4: Run test to verify it passes**

Run: `ANDROID_HOME=~/Android/Sdk ./gradlew :app:testDebugUnitTest --tests "*ModelsTest*"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: api dtos with json round-trip test"
```

---

## Task 3: Position mapping (global ↔ chapter) — pure logic, TDD

**Files:**
- Create: `app/src/main/kotlin/cloud/samlo/rawkoontv/player/PositionMap.kt`
- Test: `app/src/test/kotlin/cloud/samlo/rawkoontv/player/PositionMapTest.kt`

**Interfaces:**
- Consumes: `ChapterDto` (Task 2).
- Produces: `class PositionMap(chapters: List<ChapterDto>)` with `fun toGlobal(chapterIndex: Int, offsetInChapterSecs: Double): Double`, `fun toChapter(globalSecs: Double): ChapterPosition` (returns `data class ChapterPosition(val chapterIndex: Int, val offsetInChapterSecs: Double)`), and `val totalSecs: Double`. Global time is measured as cumulative chapter durations (`endSecs - startSecs`), NOT the server's absolute `start_secs`, so chapter files that each start at 0 map correctly.

- [ ] **Step 1: Write the failing test**

```kotlin
package cloud.samlo.rawkoontv.player

import cloud.samlo.rawkoontv.data.ChapterDto
import org.junit.Assert.assertEquals
import org.junit.Test

class PositionMapTest {
    private fun ch(i: Int, dur: Double) =
        ChapterDto(i, "Ch $i", 0.0, dur, fileId = i, url = "u$i")
    // three 100s chapters
    private val map = PositionMap(listOf(ch(0, 100.0), ch(1, 100.0), ch(2, 100.0)))

    @Test fun totalIsSumOfChapterDurations() {
        assertEquals(300.0, map.totalSecs, 0.0)
    }
    @Test fun globalWithinSecondChapter() {
        assertEquals(150.0, map.toGlobal(1, 50.0), 0.0)
    }
    @Test fun chapterFromGlobalMidSecond() {
        val p = map.toChapter(150.0)
        assertEquals(1, p.chapterIndex)
        assertEquals(50.0, p.offsetInChapterSecs, 0.0)
    }
    @Test fun globalAtExactBoundaryStartsNextChapter() {
        val p = map.toChapter(100.0)
        assertEquals(1, p.chapterIndex)
        assertEquals(0.0, p.offsetInChapterSecs, 0.0)
    }
    @Test fun clampsBelowZero() {
        val p = map.toChapter(-5.0)
        assertEquals(0, p.chapterIndex); assertEquals(0.0, p.offsetInChapterSecs, 0.0)
    }
    @Test fun clampsAboveTotalToLastChapterEnd() {
        val p = map.toChapter(999.0)
        assertEquals(2, p.chapterIndex); assertEquals(100.0, p.offsetInChapterSecs, 0.0)
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `ANDROID_HOME=~/Android/Sdk ./gradlew :app:testDebugUnitTest --tests "*PositionMapTest*"`
Expected: FAIL — `PositionMap` unresolved.

- [ ] **Step 3: Write `PositionMap.kt`**

```kotlin
package cloud.samlo.rawkoontv.player

import cloud.samlo.rawkoontv.data.ChapterDto

data class ChapterPosition(val chapterIndex: Int, val offsetInChapterSecs: Double)

class PositionMap(private val chapters: List<ChapterDto>) {
    private val durations = chapters.map { it.endSecs - it.startSecs }
    private val starts = durations.runningFold(0.0) { acc, d -> acc + d } // size n+1
    val totalSecs: Double = starts.last()

    fun toGlobal(chapterIndex: Int, offsetInChapterSecs: Double): Double =
        starts[chapterIndex] + offsetInChapterSecs

    fun toChapter(globalSecs: Double): ChapterPosition {
        if (chapters.isEmpty()) return ChapterPosition(0, 0.0)
        if (globalSecs <= 0.0) return ChapterPosition(0, 0.0)
        if (globalSecs >= totalSecs)
            return ChapterPosition(chapters.lastIndex, durations.last())
        var i = 0
        while (i < chapters.lastIndex && globalSecs >= starts[i + 1]) i++
        return ChapterPosition(i, globalSecs - starts[i])
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `ANDROID_HOME=~/Android/Sdk ./gradlew :app:testDebugUnitTest --tests "*PositionMapTest*"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: global<->chapter position mapping"
```

---

## Task 4: Progress-sync throttle decision — pure logic, TDD

**Files:**
- Create: `app/src/main/kotlin/cloud/samlo/rawkoontv/player/SyncGate.kt`
- Test: `app/src/test/kotlin/cloud/samlo/rawkoontv/player/SyncGateTest.kt`

**Interfaces:**
- Produces: `class SyncGate(intervalMs: Long = 15_000, minDeltaSecs: Double = 1.0)` with `fun shouldWrite(nowMs: Long, positionSecs: Double, force: Boolean = false): Boolean` and internal last-write tracking updated only when it returns true. `force = true` (pause/seek/chapter-change/stop) always writes if position moved at all; otherwise it writes when both the interval elapsed AND position moved ≥ `minDeltaSecs`.

- [ ] **Step 1: Write the failing test**

```kotlin
package cloud.samlo.rawkoontv.player

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SyncGateTest {
    @Test fun firstForcedWriteAllowed() {
        val g = SyncGate()
        assertTrue(g.shouldWrite(nowMs = 0, positionSecs = 10.0, force = true))
    }
    @Test fun periodicBlockedBeforeInterval() {
        val g = SyncGate(intervalMs = 15_000)
        assertTrue(g.shouldWrite(0, 0.0, force = true))
        assertFalse(g.shouldWrite(5_000, 5.0))
    }
    @Test fun periodicAllowedAfterIntervalAndMovement() {
        val g = SyncGate(intervalMs = 15_000)
        assertTrue(g.shouldWrite(0, 0.0, force = true))
        assertTrue(g.shouldWrite(16_000, 16.0))
    }
    @Test fun periodicBlockedIfNotMovedEnough() {
        val g = SyncGate(intervalMs = 15_000, minDeltaSecs = 1.0)
        assertTrue(g.shouldWrite(0, 100.0, force = true))
        assertFalse(g.shouldWrite(16_000, 100.4))
    }
    @Test fun forcedBlockedIfNotMovedAtAll() {
        val g = SyncGate()
        assertTrue(g.shouldWrite(0, 50.0, force = true))
        assertFalse(g.shouldWrite(1_000, 50.0, force = true))
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `ANDROID_HOME=~/Android/Sdk ./gradlew :app:testDebugUnitTest --tests "*SyncGateTest*"`
Expected: FAIL — `SyncGate` unresolved.

- [ ] **Step 3: Write `SyncGate.kt`**

```kotlin
package cloud.samlo.rawkoontv.player

import kotlin.math.abs

class SyncGate(
    private val intervalMs: Long = 15_000,
    private val minDeltaSecs: Double = 1.0,
) {
    private var lastMs: Long = Long.MIN_VALUE
    private var lastPos: Double = Double.NaN

    fun shouldWrite(nowMs: Long, positionSecs: Double, force: Boolean = false): Boolean {
        val movedAtAll = lastPos.isNaN() || abs(positionSecs - lastPos) > 0.0001
        val allow = if (force) {
            movedAtAll
        } else {
            val elapsed = lastMs == Long.MIN_VALUE || (nowMs - lastMs) >= intervalMs
            val movedEnough = lastPos.isNaN() || abs(positionSecs - lastPos) >= minDeltaSecs
            elapsed && movedEnough
        }
        if (allow) { lastMs = nowMs; lastPos = positionSecs }
        return allow
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `ANDROID_HOME=~/Android/Sdk ./gradlew :app:testDebugUnitTest --tests "*SyncGateTest*"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: progress-sync throttle gate"
```

---

## Task 5: URL resolution + manifest→playlist builder — pure logic, TDD

**Files:**
- Create: `app/src/main/kotlin/cloud/samlo/rawkoontv/data/Urls.kt`
- Create: `app/src/main/kotlin/cloud/samlo/rawkoontv/player/Playlist.kt`
- Test: `app/src/test/kotlin/cloud/samlo/rawkoontv/data/UrlsTest.kt`
- Test: `app/src/test/kotlin/cloud/samlo/rawkoontv/player/PlaylistTest.kt`

**Interfaces:**
- Produces: `fun resolveUrl(baseUrl: String, raw: String?): String?` — absolute `raw` returned as-is, relative joined to `baseUrl`, null/blank → null.
- Produces: `data class PlaylistItem(val mediaUri: String, val title: String, val chapterIndex: Int)` and `fun buildPlaylist(baseUrl: String, manifest: ManifestDto): List<PlaylistItem>` — chapters sorted by `index`, each `url` resolved against `baseUrl`.

- [ ] **Step 1: Write the failing tests**

`UrlsTest.kt`:
```kotlin
package cloud.samlo.rawkoontv.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class UrlsTest {
    @Test fun keepsAbsolute() {
        assertEquals("https://img/x.jpg", resolveUrl("https://s.tld", "https://img/x.jpg"))
    }
    @Test fun joinsRelative() {
        assertEquals("https://s.tld/api/books/files/1/content?grant=x",
            resolveUrl("https://s.tld", "/api/books/files/1/content?grant=x"))
    }
    @Test fun stripsDoubleSlash() {
        assertEquals("https://s.tld/a", resolveUrl("https://s.tld/", "/a"))
    }
    @Test fun nullOnBlank() { assertNull(resolveUrl("https://s.tld", "")) }
}
```

`PlaylistTest.kt`:
```kotlin
package cloud.samlo.rawkoontv.player

import cloud.samlo.rawkoontv.data.ChapterDto
import cloud.samlo.rawkoontv.data.ManifestDto
import org.junit.Assert.assertEquals
import org.junit.Test

class PlaylistTest {
    @Test fun ordersByIndexAndResolvesUrls() {
        val m = ManifestDto(200.0, listOf(
            ChapterDto(1, "B", 0.0, 100.0, 2, "/api/books/files/2/content?grant=y"),
            ChapterDto(0, "A", 0.0, 100.0, 1, "/api/books/files/1/content?grant=x"),
        ))
        val items = buildPlaylist("https://s.tld", m)
        assertEquals(listOf(0, 1), items.map { it.chapterIndex })
        assertEquals("A", items[0].title)
        assertEquals("https://s.tld/api/books/files/1/content?grant=x", items[0].mediaUri)
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `ANDROID_HOME=~/Android/Sdk ./gradlew :app:testDebugUnitTest --tests "*UrlsTest*" --tests "*PlaylistTest*"`
Expected: FAIL — unresolved references.

- [ ] **Step 3: Write `Urls.kt` and `Playlist.kt`**

`Urls.kt`:
```kotlin
package cloud.samlo.rawkoontv.data

fun resolveUrl(baseUrl: String, raw: String?): String? {
    if (raw.isNullOrBlank()) return null
    if (raw.startsWith("http://") || raw.startsWith("https://")) return raw
    return baseUrl.trimEnd('/') + "/" + raw.trimStart('/')
}
```

`Playlist.kt`:
```kotlin
package cloud.samlo.rawkoontv.player

import cloud.samlo.rawkoontv.data.ManifestDto
import cloud.samlo.rawkoontv.data.resolveUrl

data class PlaylistItem(val mediaUri: String, val title: String, val chapterIndex: Int)

fun buildPlaylist(baseUrl: String, manifest: ManifestDto): List<PlaylistItem> =
    manifest.chapters.sortedBy { it.index }.map { c ->
        PlaylistItem(
            mediaUri = resolveUrl(baseUrl, c.url) ?: c.url,
            title = c.title,
            chapterIndex = c.index,
        )
    }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `ANDROID_HOME=~/Android/Sdk ./gradlew :app:testDebugUnitTest --tests "*UrlsTest*" --tests "*PlaylistTest*"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: url resolution + manifest->playlist builder"
```

---

## Task 6: Session storage (encrypted) + Ktor API client

Wires the pure pieces to the network and to encrypted storage. No unit test (needs Android `Context` + a live server); verified in Task 9 end-to-end. This is one task because the client and its credential store are useless apart.

**Files:**
- Create: `app/src/main/kotlin/cloud/samlo/rawkoontv/data/Session.kt`
- Create: `app/src/main/kotlin/cloud/samlo/rawkoontv/data/RawkoonApi.kt`

**Interfaces:**
- Consumes: DTOs (Task 2).
- Produces: `class Session(context: Context)` with `var baseUrl: String?`, `var token: String?`, `fun clear()` (backed by EncryptedSharedPreferences).
- Produces: `class RawkoonApi(baseUrl: String, token: String?)` with suspend funcs `signIn(email, password): String` (returns token), `me(): Boolean`, `books(): List<BookSummaryDto>`, `progress(): List<ProgressDto>`, `manifest(editionId: Int): ManifestDto`, `putProgress(editionId: Int, positionSecs: Double, totalSecs: Double)`. All requests except media content send the session token; the exact header (`Authorization: Bearer` vs cookie) is set here after confirming against `apps/api/src/auth.ts`.

- [ ] **Step 1: Confirm the auth header**

Read `~/sites/rawkoon/apps/api/src/auth.ts` and the sign-in route to determine how the session token is transmitted (bearer header vs cookie) and the exact sign-in response shape. Adjust `SignInResponse` (Task 2) and the client header below to match. Record the finding in a one-line comment atop `RawkoonApi.kt`.

- [ ] **Step 2: Write `Session.kt`**

```kotlin
package cloud.samlo.rawkoontv.data

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

class Session(context: Context) {
    private val prefs = EncryptedSharedPreferences.create(
        context,
        "rawkoon_session",
        MasterKey.Builder(context).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build(),
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )
    var baseUrl: String?
        get() = prefs.getString("base_url", null)
        set(v) { prefs.edit().putString("base_url", v).apply() }
    var token: String?
        get() = prefs.getString("token", null)
        set(v) { prefs.edit().putString("token", v).apply() }
    fun clear() { prefs.edit().clear().apply() }
}
```

- [ ] **Step 3: Write `RawkoonApi.kt`**

```kotlin
// AUTH: <fill from Task 6 Step 1 — bearer or cookie, exact sign-in response>
package cloud.samlo.rawkoontv.data

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.engine.okhttp.OkHttp
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.json as ktorJson

class RawkoonApi(private val baseUrl: String, private val token: String?) {
    private val client = HttpClient(OkHttp) {
        install(ContentNegotiation) { ktorJson(json) }
    }
    private fun HttpRequestBuilder.auth() {
        token?.let { header(HttpHeaders.Authorization, "Bearer $it") }
    }
    private fun url(path: String) = baseUrl.trimEnd('/') + path

    suspend fun signIn(email: String, password: String): String =
        client.post(url("/api/auth/sign-in/email")) {
            contentType(ContentType.Application.Json)
            setBody(mapOf("email" to email, "password" to password))
        }.body<SignInResponse>().token

    suspend fun me(): Boolean =
        client.get(url("/api/auth/me")) { auth() }.status.isSuccess()

    suspend fun books(): List<BookSummaryDto> =
        client.get(url("/api/books")) { auth() }.body()

    suspend fun progress(): List<ProgressDto> =
        client.get(url("/api/books/progress")) { auth() }.body()

    suspend fun manifest(editionId: Int): ManifestDto =
        client.get(url("/api/books/editions/$editionId/manifest")) { auth() }.body()

    suspend fun putProgress(editionId: Int, positionSecs: Double, totalSecs: Double) {
        client.put(url("/api/books/editions/$editionId/progress")) {
            auth(); contentType(ContentType.Application.Json)
            setBody(mapOf("position_secs" to positionSecs, "total_duration_secs" to totalSecs))
        }
    }
}
```

> **Executor note:** if `books()` shape differs from `BookSummaryDto`, curl the endpoint and fix `Models.kt` now (the response may wrap items under a key, or use different field names). Keep `ignoreUnknownKeys` on so unrelated fields don't break parsing.

- [ ] **Step 4: Build to verify it compiles**

Run: `ANDROID_HOME=~/Android/Sdk ./gradlew :app:assembleDebug`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: encrypted session store + rawkoon api client"
```

---

## Task 7: Library repository (books + progress merge)

**Files:**
- Create: `app/src/main/kotlin/cloud/samlo/rawkoontv/data/LibraryRepository.kt`
- Test: `app/src/test/kotlin/cloud/samlo/rawkoontv/data/LibraryRepositoryTest.kt`

**Interfaces:**
- Consumes: `BookSummaryDto`, `ProgressDto` (Task 2).
- Produces: `data class Audiobook(val editionId: Int, val title: String, val author: String?, val coverUrl: String?, val positionSecs: Double, val totalDurationSecs: Double, val finished: Boolean)` and `fun mergeLibrary(books: List<BookSummaryDto>, progress: List<ProgressDto>, baseUrl: String): List<Audiobook>` — audiobooks only, order preserved from `books`, progress merged by `editionId` (0 when absent), cover URL resolved.

- [ ] **Step 1: Write the failing test**

```kotlin
package cloud.samlo.rawkoontv.data

import org.junit.Assert.assertEquals
import org.junit.Test

class LibraryRepositoryTest {
    @Test fun mergesProgressAndPreservesOrderAudiobooksOnly() {
        val books = listOf(
            BookSummaryDto(1, "Alpha", "A", "/covers/1.jpg", 100.0, isAudiobook = true),
            BookSummaryDto(2, "Beta (ebook)", "B", null, null, isAudiobook = false),
            BookSummaryDto(3, "Gamma", "C", "https://x/3.jpg", 200.0, isAudiobook = true),
        )
        val progress = listOf(ProgressDto(3, 50.0, 200.0, false))
        val out = mergeLibrary(books, progress, "https://s.tld")
        assertEquals(listOf(1, 3), out.map { it.editionId })          // ebook dropped, order kept
        assertEquals(0.0, out[0].positionSecs, 0.0)                    // no progress -> 0
        assertEquals(50.0, out[1].positionSecs, 0.0)                   // merged
        assertEquals("https://s.tld/covers/1.jpg", out[0].coverUrl)    // relative resolved
        assertEquals("https://x/3.jpg", out[1].coverUrl)               // absolute kept
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `ANDROID_HOME=~/Android/Sdk ./gradlew :app:testDebugUnitTest --tests "*LibraryRepositoryTest*"`
Expected: FAIL — unresolved references.

- [ ] **Step 3: Write `LibraryRepository.kt`**

```kotlin
package cloud.samlo.rawkoontv.data

data class Audiobook(
    val editionId: Int,
    val title: String,
    val author: String?,
    val coverUrl: String?,
    val positionSecs: Double,
    val totalDurationSecs: Double,
    val finished: Boolean,
)

fun mergeLibrary(
    books: List<BookSummaryDto>,
    progress: List<ProgressDto>,
    baseUrl: String,
): List<Audiobook> {
    val byEdition = progress.associateBy { it.editionId }
    return books.filter { it.isAudiobook }.map { b ->
        val p = byEdition[b.editionId]
        Audiobook(
            editionId = b.editionId,
            title = b.title,
            author = b.author,
            coverUrl = resolveUrl(baseUrl, b.coverUrl),
            positionSecs = p?.positionSecs ?: 0.0,
            totalDurationSecs = p?.totalDurationSecs ?: (b.durationSecs ?: 0.0),
            finished = p?.finished ?: false,
        )
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `ANDROID_HOME=~/Android/Sdk ./gradlew :app:testDebugUnitTest --tests "*LibraryRepositoryTest*"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: library repository merges books + progress"
```

---

## Task 8: Playback service (Media3) + controller

Wires ExoPlayer to the playlist, position map, sync gate, and API. Verified manually on device (audio + background + remote). One task: the service and controller are meaningless apart.

**Files:**
- Create: `app/src/main/kotlin/cloud/samlo/rawkoontv/player/PlaybackService.kt`
- Create: `app/src/main/kotlin/cloud/samlo/rawkoontv/player/PlaybackController.kt`
- Modify: `app/src/main/AndroidManifest.xml` (register the service)

**Interfaces:**
- Consumes: `buildPlaylist` (Task 5), `PositionMap` (Task 3), `SyncGate` (Task 4), `RawkoonApi` (Task 6).
- Produces: `class PlaybackController(context, api)` with `suspend fun open(editionId: Int, resumeGlobalSecs: Double)`, `fun playPause()`, `fun skip(deltaSecs: Double)`, `fun nextChapter()`, `fun prevChapter()`, `fun seekGlobal(secs: Double)`, a `StateFlow<PlayerUiState>` exposing current chapter title, global position, total, isPlaying, and chapter list. On every position tick + on pause/seek/chapter-change, it consults `SyncGate` and calls `api.putProgress`. Uses `PositionMap` to translate global↔ExoPlayer window/offset.

- [ ] **Step 1: Register the service in the manifest**

Add inside `<application>`:
```xml
<service
    android:name=".player.PlaybackService"
    android:exported="true"
    android:foregroundServiceType="mediaPlayback">
    <intent-filter>
        <action android:name="androidx.media3.session.MediaSessionService" />
    </intent-filter>
</service>
```

- [ ] **Step 2: Write `PlaybackService.kt`**

```kotlin
package cloud.samlo.rawkoontv.player

import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService

class PlaybackService : MediaSessionService() {
    private var session: MediaSession? = null
    override fun onCreate() {
        super.onCreate()
        val player = ExoPlayer.Builder(this).build()
        session = MediaSession.Builder(this, player).build()
    }
    override fun onGetSession(info: MediaSession.ControllerInfo) = session
    override fun onDestroy() {
        session?.run { player.release(); release() }
        session = null
        super.onDestroy()
    }
}
```

- [ ] **Step 3: Write `PlaybackController.kt`**

```kotlin
package cloud.samlo.rawkoontv.player

import android.content.ComponentName
import android.content.Context
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.session.MediaController
import androidx.media3.session.SessionToken
import cloud.samlo.rawkoontv.data.ManifestDto
import cloud.samlo.rawkoontv.data.RawkoonApi
import com.google.common.util.concurrent.MoreExecutors
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

data class PlayerUiState(
    val chapterTitle: String = "",
    val globalSecs: Double = 0.0,
    val totalSecs: Double = 0.0,
    val isPlaying: Boolean = false,
    val chapters: List<String> = emptyList(),
)

class PlaybackController(
    private val context: Context,
    private val api: RawkoonApi,
    private val scope: CoroutineScope,
) {
    private var controller: MediaController? = null
    private var map: PositionMap? = null
    private var editionId: Int = -1
    private var totalSecs: Double = 0.0
    private val gate = SyncGate()
    private val _state = MutableStateFlow(PlayerUiState())
    val state: StateFlow<PlayerUiState> = _state

    suspend fun open(editionId: Int, resumeGlobalSecs: Double, baseUrl: String) {
        this.editionId = editionId
        val manifest: ManifestDto = api.manifest(editionId)
        map = PositionMap(manifest.chapters)
        totalSecs = map!!.totalSecs
        val items = buildPlaylist(baseUrl, manifest).map { MediaItem.fromUri(it.mediaUri) }
        val token = SessionToken(context, ComponentName(context, PlaybackService::class.java))
        val future = MediaController.Builder(context, token).buildAsync()
        future.addListener({
            val c = future.get(); controller = c
            c.setMediaItems(items)
            val pos = map!!.toChapter(resumeGlobalSecs)
            c.prepare(); c.seekTo(pos.chapterIndex, (pos.offsetInChapterSecs * 1000).toLong())
            c.play()
            attachListener(c)
            startTicker()
        }, MoreExecutors.directExecutor())
    }

    private fun attachListener(c: MediaController) {
        c.addListener(object : Player.Listener {
            override fun onIsPlayingChanged(isPlaying: Boolean) {
                _state.value = _state.value.copy(isPlaying = isPlaying)
                if (!isPlaying) writeProgress(force = true)
            }
            override fun onMediaItemTransition(item: MediaItem?, reason: Int) =
                writeProgress(force = true)
        })
    }

    private fun currentGlobal(): Double {
        val c = controller ?: return 0.0
        val m = map ?: return 0.0
        return m.toGlobal(c.currentMediaItemIndex, c.currentPosition / 1000.0)
    }

    private fun writeProgress(force: Boolean) {
        val g = currentGlobal()
        if (gate.shouldWrite(System.currentTimeMillis(), g, force)) {
            scope.launch(Dispatchers.IO) {
                runCatching { api.putProgress(editionId, g, totalSecs) }
            }
        }
    }

    private fun startTicker() {
        scope.launch {
            while (controller != null) {
                val c = controller ?: break
                val g = currentGlobal()
                _state.value = _state.value.copy(
                    globalSecs = g, totalSecs = totalSecs,
                    chapterTitle = _state.value.chapters.getOrNull(c.currentMediaItemIndex) ?: "",
                )
                writeProgress(force = false)
                delay(1000)
            }
        }
    }

    fun playPause() { controller?.let { if (it.isPlaying) it.pause() else it.play() } }
    fun skip(deltaSecs: Double) = seekGlobal(currentGlobal() + deltaSecs)
    fun nextChapter() { controller?.seekToNextMediaItem(); writeProgress(true) }
    fun prevChapter() { controller?.seekToPreviousMediaItem(); writeProgress(true) }
    fun seekGlobal(secs: Double) {
        val m = map ?: return; val c = controller ?: return
        val p = m.toChapter(secs)
        c.seekTo(p.chapterIndex, (p.offsetInChapterSecs * 1000).toLong())
        writeProgress(true)
    }
    fun release() { controller?.release(); controller = null }
}
```

> **Executor note:** `com.google.common.util.concurrent.MoreExecutors` comes transitively with media3-session (Guava). If unresolved, add `implementation("com.google.guava:guava:33.3.1-android")`. Set `_state.chapters` from the manifest titles when building the playlist (pass them into `open`), so the ticker can show the current chapter title.

- [ ] **Step 4: Build to verify it compiles**

Run: `ANDROID_HOME=~/Android/Sdk ./gradlew :app:assembleDebug`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: media3 playback service + controller with progress sync"
```

---

## Task 9: Login screen + app navigation + end-to-end auth

**Files:**
- Create: `app/src/main/kotlin/cloud/samlo/rawkoontv/ui/login/LoginScreen.kt`
- Create: `app/src/main/kotlin/cloud/samlo/rawkoontv/ui/AppState.kt`
- Modify: `app/src/main/kotlin/cloud/samlo/rawkoontv/MainActivity.kt`

**Interfaces:**
- Consumes: `Session`, `RawkoonApi` (Task 6).
- Produces: `sealed interface Screen { object Login; object Library; data class Player(editionId, resumeSecs) }`; a top-level `App()` that starts at Library if a stored token validates (`api.me()`), else Login. `LoginScreen(onSignedIn)` collects server URL + email + password, calls `signIn`, stores token+baseUrl, advances.

- [ ] **Step 1: Write `AppState.kt` (navigation holder)**

```kotlin
package cloud.samlo.rawkoontv.ui

sealed interface Screen {
    data object Login : Screen
    data object Library : Screen
    data class Player(val editionId: Int, val resumeSecs: Double) : Screen
}
```

- [ ] **Step 2: Write `LoginScreen.kt`**

```kotlin
package cloud.samlo.rawkoontv.ui.login

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.tv.material3.Button
import androidx.tv.material3.Text
import cloud.samlo.rawkoontv.data.RawkoonApi
import cloud.samlo.rawkoontv.data.Session
import kotlinx.coroutines.launch

@Composable
fun LoginScreen(session: Session, onSignedIn: () -> Unit) {
    var url by remember { mutableStateOf(session.baseUrl ?: "https://") }
    var email by remember { mutableStateOf("") }
    var pass by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    Column(Modifier.fillMaxSize().padding(48.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text("Rawkoon Audiobooks")
        BasicTextField(value = url, onValueChange = { url = it })
        BasicTextField(value = email, onValueChange = { email = it })
        BasicTextField(value = pass, onValueChange = { pass = it })
        error?.let { Text(it) }
        Button(onClick = {
            scope.launch {
                runCatching {
                    val token = RawkoonApi(url, null).signIn(email.trim(), pass)
                    session.baseUrl = url.trim(); session.token = token
                    onSignedIn()
                }.onFailure { error = "Sign-in failed: ${it.message}" }
            }
        }) { Text("Sign in") }
    }
}
```

> **Executor note:** `BasicTextField` on TV needs focus to bring up the on-screen keyboard; wrap each in a focusable container and give the URL field initial focus. Style is intentionally bare for v1 — polish in a later pass.

- [ ] **Step 3: Rewrite `MainActivity.kt` with navigation**

```kotlin
package cloud.samlo.rawkoontv

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.*
import cloud.samlo.rawkoontv.data.RawkoonApi
import cloud.samlo.rawkoontv.data.Session
import cloud.samlo.rawkoontv.ui.Screen
import cloud.samlo.rawkoontv.ui.library.LibraryScreen   // Task 10
import cloud.samlo.rawkoontv.ui.login.LoginScreen
import cloud.samlo.rawkoontv.ui.player.PlayerScreen      // Task 11

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
            onOpen = { id, resume -> screen = Screen.Player(id, resume) })
        is Screen.Player -> PlayerScreen(session, s.editionId, s.resumeSecs,
            onBack = { screen = Screen.Library })
    }
}
```

> Task 9 build will fail until Tasks 10–11 exist. Implement 10 and 11 before building the whole app; unit tests are unaffected. If executing strictly task-by-task, stub `LibraryScreen`/`PlayerScreen` as empty composables to compile Task 9, then replace them.

- [ ] **Step 4: Verify (after Tasks 10–11) on device**

Install, launch, enter a real server URL + credentials, confirm it advances to the Library and that relaunching skips Login (stored token validates).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: login screen + app navigation"
```

---

## Task 10: Library screen

**Files:**
- Create: `app/src/main/kotlin/cloud/samlo/rawkoontv/ui/library/LibraryScreen.kt`
- Create: `app/src/main/kotlin/cloud/samlo/rawkoontv/ui/library/LibraryViewModel.kt`

**Interfaces:**
- Consumes: `Session`, `RawkoonApi`, `mergeLibrary`, `Audiobook` (Tasks 6–7).
- Produces: `LibraryScreen(session, onOpen: (editionId: Int, resumeSecs: Double) -> Unit)` — a Compose-TV grid of `Audiobook`s; selecting one calls `onOpen(editionId, positionSecs)`.

- [ ] **Step 1: Write `LibraryViewModel.kt`**

```kotlin
package cloud.samlo.rawkoontv.ui.library

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import cloud.samlo.rawkoontv.data.Audiobook
import cloud.samlo.rawkoontv.data.RawkoonApi
import cloud.samlo.rawkoontv.data.mergeLibrary
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch

class LibraryViewModel(private val baseUrl: String, private val token: String?) : ViewModel() {
    val books = MutableStateFlow<List<Audiobook>>(emptyList())
    val error = MutableStateFlow<String?>(null)
    fun load() {
        viewModelScope.launch {
            runCatching {
                val api = RawkoonApi(baseUrl, token)
                mergeLibrary(api.books(), api.progress(), baseUrl)
            }.onSuccess { books.value = it }.onFailure { error.value = it.message }
        }
    }
}
```

- [ ] **Step 2: Write `LibraryScreen.kt`**

```kotlin
package cloud.samlo.rawkoontv.ui.library

import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.tv.foundation.lazy.grid.TvLazyVerticalGrid
import androidx.tv.foundation.lazy.grid.TvGridCells
import androidx.tv.foundation.lazy.grid.items
import androidx.tv.material3.Card
import androidx.tv.material3.Text
import cloud.samlo.rawkoontv.data.Session
import coil.compose.AsyncImage

@Composable
fun LibraryScreen(session: Session, onOpen: (Int, Double) -> Unit) {
    val vm = remember { LibraryViewModel(session.baseUrl ?: "", session.token) }
    val books by vm.books.collectAsState()
    LaunchedEffect(Unit) { vm.load() }
    TvLazyVerticalGrid(columns = TvGridCells.Fixed(4), modifier = Modifier.fillMaxSize().padding(32.dp)) {
        items(books) { b ->
            Card(onClick = { onOpen(b.editionId, if (b.finished) 0.0 else b.positionSecs) }) {
                Column(Modifier.padding(8.dp)) {
                    AsyncImage(model = b.coverUrl, contentDescription = b.title, modifier = Modifier.height(220.dp))
                    Text(b.title)
                    b.author?.let { Text(it) }
                }
            }
        }
    }
}
```

> **Executor note:** if `androidx.tv.foundation.lazy.grid.*` is unavailable in `tv-material:1.0.0` (tv-foundation was folded in), use `androidx.compose.foundation.lazy.grid.LazyVerticalGrid` with `Modifier.focusable()` on cards instead. Add a visible progress bar per card from `positionSecs/totalDurationSecs`.

- [ ] **Step 3: Build + verify on device**

Install, sign in, confirm the audiobook grid loads with covers and that clicking an item navigates to the (Task 11) player. Verify covers resolve (relative paths joined to server).

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: library grid screen"
```

---

## Task 11: Player screen + end-to-end playback

**Files:**
- Create: `app/src/main/kotlin/cloud/samlo/rawkoontv/ui/player/PlayerScreen.kt`

**Interfaces:**
- Consumes: `PlaybackController` (Task 8), `Session`.
- Produces: `PlayerScreen(session, editionId, resumeSecs, onBack)` — binds a `PlaybackController`, opens the book at `resumeSecs`, renders `PlayerUiState` (chapter title, position/total, chapter list) and transport controls wired to the controller. Releases the controller on leave.

- [ ] **Step 1: Write `PlayerScreen.kt`**

```kotlin
package cloud.samlo.rawkoontv.ui.player

import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.tv.material3.Button
import androidx.tv.material3.Text
import cloud.samlo.rawkoontv.data.RawkoonApi
import cloud.samlo.rawkoontv.data.Session
import cloud.samlo.rawkoontv.player.PlaybackController
import kotlinx.coroutines.launch

@Composable
fun PlayerScreen(session: Session, editionId: Int, resumeSecs: Double, onBack: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val controller = remember {
        PlaybackController(context, RawkoonApi(session.baseUrl ?: "", session.token), scope)
    }
    val state by controller.state.collectAsState()
    LaunchedEffect(editionId) {
        scope.launch { controller.open(editionId, resumeSecs, session.baseUrl ?: "") }
    }
    DisposableEffect(Unit) { onDispose { controller.release() } }

    Column(Modifier.fillMaxSize().padding(48.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text(state.chapterTitle)
        Text("${state.globalSecs.toInt()}s / ${state.totalSecs.toInt()}s")
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Button(onClick = { controller.prevChapter() }) { Text("|<") }
            Button(onClick = { controller.skip(-30.0) }) { Text("-30s") }
            Button(onClick = { controller.playPause() }) { Text(if (state.isPlaying) "Pause" else "Play") }
            Button(onClick = { controller.skip(30.0) }) { Text("+30s") }
            Button(onClick = { controller.nextChapter() }) { Text(">|") }
        }
        Button(onClick = onBack) { Text("Back") }
    }
}
```

> **Executor note:** give the Play/Pause button initial focus so the remote's OK toggles playback immediately. Add a chapter list (from `state.chapters`) that seeks to a chapter on click in a follow-up if time allows — v1 minimum is the transport row above.

- [ ] **Step 2: Full end-to-end test on device (Fire + Sony)**

Install the APK on both TVs. For each: sign in → open a book with existing progress → confirm it resumes near the saved position → play (audio comes out) → +30s / -30s / chapter skip work → press the TV remote's play/pause (media session) → audio toggles → leave the screen, audio stops and a final progress PUT lands (verify via a second client or the server showing an updated position) → reopen the book and confirm it resumed.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: player screen + end-to-end audiobook playback"
```

---

## Self-Review (completed)

- **Spec coverage:** Login/settings → Task 9; Library browse+merge → Tasks 7,10; Player + chapters + resume + transport → Tasks 8,11; progress sync (throttle, forced writes, resume) → Tasks 4,8; manifest→playlist + Range streaming → Task 5; position math → Task 3; auth token transport confirmation → Task 6 Step 1; build/SDK/deploy → Task 1; JVM unit tests for the four pure units → Tasks 3,4,5,7; DTOs → Task 2. All spec sections map to a task.
- **Deferred items** (offline, speed, sleep timer, QR pairing) intentionally absent — matches spec "Out of scope".
- **Type consistency:** `Audiobook`, `ProgressDto`, `ChapterDto`, `ManifestDto`, `PositionMap`/`ChapterPosition`, `SyncGate.shouldWrite`, `buildPlaylist`/`PlaylistItem`, `PlaybackController` method names are used consistently across tasks.
- **Known soft spots flagged inline** (executor notes): exact `BookSummaryDto` field names + auth header must be confirmed against the live API in Task 6 Step 1 / Task 2; `androidx.tv.foundation` grid may need the plain Compose grid fallback. These are confirmations against a real server, not placeholders in the plan's logic.
