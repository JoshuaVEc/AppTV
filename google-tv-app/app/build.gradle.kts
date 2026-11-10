plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.serialization")
    id("com.google.devtools.ksp")
}

android {
    namespace = "com.apptv.player"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.apptv.player"
        minSdk = 26 // Android 8.0+ (Todas las Google TV modernas corren Android 10-14)
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.14"
    }
}

dependencies {
    // Jetpack Compose for TV
    val composeBom = platform("androidx.compose:compose-bom:2024.09.00")
    implementation(composeBom)
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.activity:activity-compose:1.9.2")
    implementation("androidx.tv:tv-foundation:1.0.0-alpha11")
    implementation("androidx.tv:tv-material:1.0.0")

    // AndroidX Media3 (ExoPlayer) para reproducción fluida de videos MP4/WebM desde almacenamiento local
    val media3Version = "1.4.1"
    implementation("androidx.media3:media3-exoplayer:$media3Version")
    implementation("androidx.media3:media3-ui:$media3Version")

    // Coil para renderizado eficiente de imágenes en caché local
    implementation("io.coil-kt:coil-compose:2.7.0")

    // Room Database (Persistencia local Offline-First del Manifiesto y estado de archivos)
    val roomVersion = "2.6.1"
    implementation("androidx.room:room-runtime:$roomVersion")
    implementation("androidx.room:room-ktx:$roomVersion")
    ksp("androidx.room:room-compiler:$roomVersion")

    // WorkManager para sincronización resiliente en segundo plano
    implementation("androidx.work:work-runtime-ktx:2.9.1")

    // Serialización JSON y Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.3")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")

    // OkHttp para descarga atómica de archivos multimedia y consulta REST/Realtime a Supabase
    implementation("com.squareup.okhttp3:okhttp:4.12.0")

    // Pruebas unitarias
    testImplementation("junit:junit:4.13.2")
}
