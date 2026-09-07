// AUTH: better-auth with bearer() plugin. POST /api/auth/sign-in/email {email,password}
// returns the session token in the `set-auth-token` response header (JSON body `{token}` fallback);
// all authenticated requests send `Authorization: Bearer <token>`. Signed media URLs get NO auth header.
package cloud.samlo.rawkoontv.data

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.engine.okhttp.OkHttp
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.*
import io.ktor.client.statement.HttpResponse
import io.ktor.client.statement.bodyAsText
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.json as ktorJson
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

class AuthException(message: String) : Exception(message)

/** UTC ISO-8601 timestamp; works on all API levels (java.time is API 26+). */
private fun isoNow(): String =
    java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US)
        .apply { timeZone = java.util.TimeZone.getTimeZone("UTC") }
        .format(java.util.Date(System.currentTimeMillis()))

class RawkoonApi(private val baseUrl: String, private val token: String?) {
    private val client = sharedClient
    private fun HttpRequestBuilder.auth() {
        token?.let { header(HttpHeaders.Authorization, "Bearer $it") }
    }
    private fun url(path: String) = baseUrl.trimEnd('/') + path

    suspend fun signIn(email: String, password: String): String {
        val response: HttpResponse = client.post(url("/api/auth/sign-in/email")) {
            contentType(ContentType.Application.Json)
            setBody(mapOf("email" to email, "password" to password))
        }
        if (response.status == HttpStatusCode.Unauthorized) {
            throw AuthException("Courriel ou mot de passe invalide.")
        }
        if (!response.status.isSuccess()) {
            throw AuthException("Serveur : erreur ${response.status.value}.")
        }
        // better-auth's bearer() plugin returns the session token in this header.
        val headerToken = response.headers["set-auth-token"]
        if (!headerToken.isNullOrEmpty()) return headerToken
        // Fallback: token is also present in the JSON body.
        return response.body<SignInResponse>().token
    }

    suspend fun me(): Boolean =
        client.get(url("/api/auth/me")) { auth() }.status.isSuccess()

    suspend fun books(page: Int, limit: Int, sortBy: String, sortDir: String): BooksResponse =
        client.get(url("/api/books")) {
            auth()
            parameter("kind", "audiobook")
            parameter("page", page)
            parameter("limit", limit)
            parameter("sort_by", sortBy)
            parameter("sort_dir", sortDir)
        }.body()

    suspend fun progress(): List<ProgressDto> =
        client.get(url("/api/books/progress")) { auth() }.body<ProgressResponse>().progress

    suspend fun manifest(editionId: Int): ManifestDto =
        client.get(url("/api/books/editions/$editionId/manifest")) { auth() }.body()

    suspend fun putProgress(editionId: Int, positionSecs: Double, totalSecs: Double, finished: Boolean) {
        val resp = client.put(url("/api/books/editions/$editionId/progress")) {
            auth(); contentType(ContentType.Application.Json)
            setBody(
                buildJsonObject {
                    put("position_secs", positionSecs)
                    put("total_duration_secs", totalSecs)
                    put("finished", finished)
                    put("updated_at", isoNow()) // required by the server schema
                },
            )
        }
        if (!resp.status.isSuccess()) {
            android.util.Log.e("RawkoonApi", "PUT progress ed=$editionId -> ${resp.status.value} ${resp.bodyAsText().take(160)}")
        }
    }

    private companion object {
        // One HTTP engine for the whole app: baseUrl/token are per-request, not
        // per-client, so a shared client avoids leaking an OkHttp pool per screen.
        val sharedClient = HttpClient(OkHttp) {
            install(ContentNegotiation) { ktorJson(json) }
        }
    }
}
