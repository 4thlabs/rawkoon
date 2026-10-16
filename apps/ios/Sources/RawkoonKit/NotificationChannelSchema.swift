/// One config field of a notification channel. `key` is the JSON key the server
/// dispatcher reads; `label` is the English form label, localized by the caller.
public struct NotificationChannelField: Equatable, Sendable {
    public let key: String
    public let label: String
    public let secret: Bool
    public let numeric: Bool

    init(_ key: String, _ label: String, secret: Bool = false, numeric: Bool = false) {
        self.key = key
        self.label = label
        self.secret = secret
        self.numeric = numeric
    }
}

/// The config keys each channel type writes. They must match the server's
/// `parse<Type>Config` readers exactly, or the channel saves but never delivers.
public enum NotificationChannelSchema {
    public static let typeIds = ["ntfy", "telegram", "discord", "gotify", "pushover", "slack", "webhook"]

    public static func fields(for type: String) -> [NotificationChannelField] {
        switch type {
        case "ntfy":
            [.init("url", "Server URL"), .init("topic", "Topic"),
             .init("token", "Access token", secret: true), .init("priority", "Priority", numeric: true)]
        case "telegram":
            [.init("bot_token", "Bot token", secret: true), .init("chat_id", "Chat ID")]
        case "discord", "slack":
            [.init("webhook_url", "Webhook URL")]
        case "gotify":
            [.init("url", "Server URL"), .init("token", "App token", secret: true),
             .init("priority", "Priority", numeric: true)]
        case "pushover":
            [.init("token", "API token", secret: true), .init("user", "User key", secret: true)]
        case "webhook":
            [.init("url", "URL"), .init("method", "Method (GET/POST)"), .init("body_template", "Body template")]
        default:
            []
        }
    }

    /// Keys an older client wrote for a type, mapped to the key the server reads.
    private static func legacyKeys(for type: String) -> [String: String] {
        switch type {
        case "ntfy": ["server_url": "url", "access_token": "token"]
        case "gotify": ["server_url": "url", "app_token": "token"]
        case "pushover": ["api_token": "token", "user_key": "user"]
        default: [:]
        }
    }

    /// Moves legacy keys onto the current ones so re-saving an old channel repairs it.
    public static func upgradingLegacyKeys(_ values: [String: String], type: String) -> [String: String] {
        var result = values
        for (old, new) in legacyKeys(for: type) {
            guard let value = result.removeValue(forKey: old), result[new] == nil else { continue }
            result[new] = value
        }
        return result
    }
}
