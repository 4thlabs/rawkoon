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
