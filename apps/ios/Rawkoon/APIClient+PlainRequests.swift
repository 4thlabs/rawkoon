import Foundation

// Plain-casing request helpers for wires that must not convert between snake_case and camelCase.

extension APIClient {
    // MARK: Plain-casing helpers (no snake↔camel conversion — Download-Client Hook wire)

    private static let plainDecoder = JSONDecoder()
    private static let plainEncoder = JSONEncoder()

    func getPlain<T: Decodable>(_ path: String) async throws -> T {
        let request = try makeRequest(path: path, method: "GET", requiresAuth: true)
        let (data, response) = try await perform(request)
        try checkStatus(data, response)
        return try decodeJSON(data, decoder: Self.plainDecoder)
    }

    func putPlain<T: Decodable>(_ path: String, body: some Encodable) async throws -> T {
        var request = try makeRequest(path: path, method: "PUT", requiresAuth: true)
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try Self.plainEncoder.encode(body)
        let (data, response) = try await perform(request)
        try checkStatus(data, response)
        return try decodeJSON(data, decoder: Self.plainDecoder)
    }

    func postPlainExpectOK(_ path: String, body: some Encodable) async throws {
        var request = try makeRequest(path: path, method: "POST", requiresAuth: true)
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try Self.plainEncoder.encode(body)
        let (data, response) = try await perform(request)
        try checkStatus(data, response)
    }

    /// POST whose body keeps its own key names (the re-encode settings are camelCase on the wire)
    /// while the response still decodes snake_case.
    func postPlainBody<T: Decodable>(_ path: String, body: some Encodable, slow: Bool = false) async throws -> T {
        var request = try makeRequest(path: path, method: "POST", requiresAuth: true)
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try Self.plainEncoder.encode(body)
        let (data, response) = try await slow ? performSlow(request) : perform(request)
        try checkStatus(data, response)
        return try decodeJSON(data)
    }
}
