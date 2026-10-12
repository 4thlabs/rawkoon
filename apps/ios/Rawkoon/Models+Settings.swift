import Foundation

// Quality profile and custom format DTOs.

// MARK: - Management (settings hub)

nonisolated struct AssignedCustomFormat: Decodable, Sendable {
    let customFormatId: Int?
    let name: String?
    let score: Int?
    let required: Bool?
    let forbidden: Bool?
}

nonisolated struct QualityProfile: Decodable, Identifiable, Sendable {
    let id: Int
    let name: String
    let minResolution: Int?
    let cutoffResolution: Int?
    let maxSizeGb: Double?
    let minSeeders: Int?
    let requireHdr: Bool?
    let preferHdr: Bool?
    let preferredSources: [String]?
    let preferredCodecs: [String]?
    let preferredLanguages: [String]?
    let preferredSearchLanguage: String?
    let prioritizedTrackers: [String]?
    let preferTrackerOverQuality: Bool?
    let customFormats: [AssignedCustomFormat]?
}

nonisolated struct QualityProfilesResponse: Decodable, Sendable {
    let profiles: [QualityProfile]
}

// MARK: Quality profile CRUD (spec §5 Phase 4)

nonisolated struct CustomFormatAssignmentBody: Encodable, Sendable {
    let customFormatId: Int
    let score: Int
    let required: Bool
    let forbidden: Bool
}

/// Create/update body for a quality profile. Custom `encode(to:)` sends explicit
/// null for the nullable fields (cutoff, search language, max size).
nonisolated struct SaveQualityProfileBody: Encodable, Sendable {
    var name: String
    var minResolution: Int
    var cutoffResolution: Int?
    var preferredSources: [String]
    var preferredCodecs: [String]
    var preferredLanguages: [String]
    var preferredSearchLanguage: String?
    var prioritizedTrackers: [String]
    var preferTrackerOverQuality: Bool
    var maxSizeGb: Double?
    var requireHdr: Bool
    var preferHdr: Bool
    var minSeeders: Int
    var customFormats: [CustomFormatAssignmentBody]

    enum CodingKeys: String, CodingKey {
        case name, minResolution, cutoffResolution, preferredSources, preferredCodecs
        case preferredLanguages, preferredSearchLanguage, prioritizedTrackers
        case preferTrackerOverQuality, maxSizeGb, requireHdr, preferHdr, minSeeders, customFormats
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(name, forKey: .name)
        try c.encode(minResolution, forKey: .minResolution)
        try c.encode(cutoffResolution, forKey: .cutoffResolution)
        try c.encode(preferredSources, forKey: .preferredSources)
        try c.encode(preferredCodecs, forKey: .preferredCodecs)
        try c.encode(preferredLanguages, forKey: .preferredLanguages)
        try c.encode(preferredSearchLanguage, forKey: .preferredSearchLanguage)
        try c.encode(prioritizedTrackers, forKey: .prioritizedTrackers)
        try c.encode(preferTrackerOverQuality, forKey: .preferTrackerOverQuality)
        try c.encode(maxSizeGb, forKey: .maxSizeGb)
        try c.encode(requireHdr, forKey: .requireHdr)
        try c.encode(preferHdr, forKey: .preferHdr)
        try c.encode(minSeeders, forKey: .minSeeders)
        try c.encode(customFormats, forKey: .customFormats)
    }
}

// MARK: Custom formats (read — spec §5 Phase 4)

/// A custom-format condition, decoded for editing. The heterogeneous `value`
/// (string / number / [number] / bool) is normalized to a string.
nonisolated struct FormatConditionDTO: Decodable, Sendable {
    let type: String
    let op: String
    let stringValue: String
    let negate: Bool

    enum CodingKeys: String, CodingKey {
        case type
        case op = "operator"
        case value
        case negate
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        type = try c.decode(String.self, forKey: .type)
        op = try c.decode(String.self, forKey: .op)
        negate = (try? c.decodeIfPresent(Bool.self, forKey: .negate)) ?? false
        if let s = try? c.decodeIfPresent(String.self, forKey: .value) {
            stringValue = s
        } else if let d = try? c.decodeIfPresent(Double.self, forKey: .value) {
            stringValue = FormatConditionDTO.number(d)
        } else if let arr = try? c.decodeIfPresent([Double].self, forKey: .value) {
            stringValue = arr.map(FormatConditionDTO.number).joined(separator: ",")
        } else if let b = try? c.decodeIfPresent(Bool.self, forKey: .value) {
            stringValue = b ? "true" : "false"
        } else {
            stringValue = ""
        }
    }

    static func number(_ value: Double) -> String {
        value == value.rounded() ? String(Int(value)) : String(value)
    }
}

nonisolated struct CustomFormatDTO: Decodable, Identifiable, Sendable {
    let id: Int
    let name: String
    let conditions: [FormatConditionDTO]?
}

nonisolated struct CustomFormatsResponse: Decodable, Sendable {
    let customFormats: [CustomFormatDTO]
}

/// One condition, encoded with its value shaped by type/operator (numeric types
/// send a number, `between` an array, `is_true` no value, else a string).
nonisolated struct ConditionEncodable: Encodable, Sendable {
    let type: String
    let op: String
    let stringValue: String
    let negate: Bool

    static let numericTypes: Set<String> = ["resolution", "seeders", "size_range"]

    enum CodingKeys: String, CodingKey {
        case type
        case op = "operator"
        case value
        case negate
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(type, forKey: .type)
        try c.encode(op, forKey: .op)
        try c.encode(negate, forKey: .negate)
        if op == "is_true" {
            return
        } else if op == "between" {
            let parts = stringValue.split(separator: ",").compactMap { Double($0.trimmingCharacters(in: .whitespaces)) }
            try c.encode(parts, forKey: .value)
        } else if Self.numericTypes.contains(type) {
            try c.encode(Double(stringValue) ?? 0, forKey: .value)
        } else {
            try c.encode(stringValue, forKey: .value)
        }
    }
}

nonisolated struct SaveCustomFormatBody: Encodable, Sendable {
    let name: String
    let conditions: [ConditionEncodable]
}
