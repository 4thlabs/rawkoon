import Foundation
@testable import Rawkoon
import Testing

struct APIClientSplitRegressionTests {
    private let base = URL(string: "https://example.test") ?? URL(fileURLWithPath: "/")

    @Test func queryItemsAreSortedAndEmptyValuesDropped() {
        let client = APIClient(baseURL: base, token: nil)
        let path = client.pathWithQuery("/api/x", ["b": "2", "a": "1", "c": nil, "d": ""])
        #expect(path == "/api/x?a=1&b=2")
        #expect(client.pathWithQuery("/api/x", ["c": nil]) == "/api/x")
    }

    @Test func authenticatedRequestsCarryBearerAndNeedAToken() async throws {
        let client = APIClient(baseURL: base, token: "abc")
        let request = try await client.makeRequest(path: "/api/y", method: "GET", requiresAuth: true)
        #expect(request.url?.absoluteString == "https://example.test/api/y")
        #expect(request.value(forHTTPHeaderField: "Authorization") == "Bearer abc")

        let anonymous = APIClient(baseURL: base, token: nil)
        let open = try await anonymous.makeRequest(path: "/api/y", method: "GET")
        #expect(open.value(forHTTPHeaderField: "Authorization") == nil)
        await #expect(throws: APIError.self) {
            try await anonymous.makeRequest(path: "/api/y", method: "GET", requiresAuth: true)
        }
    }

    @Test func statusCheckPassesSuccessAndThrowsFailures() async throws {
        let client = APIClient(baseURL: base, token: "abc")
        let ok = try #require(HTTPURLResponse(url: base, statusCode: 204, httpVersion: nil, headerFields: nil))
        try await client.checkStatus(Data(), ok)
        let forbidden = try #require(HTTPURLResponse(url: base, statusCode: 403, httpVersion: nil, headerFields: nil))
        await #expect(throws: APIError.self) {
            try await client.checkStatus(Data(), forbidden)
        }
    }

    @Test func longWaitTimeoutIsNotRetried() {
        let timedOut = URLError(.timedOut)
        #expect(!APIClient.shouldRetry(after: timedOut, method: "GET", longWait: true))
        #expect(APIClient.shouldRetry(after: timedOut, method: "GET", longWait: false))
    }

    @Test func droppedConnectionsAreRetriedOnEitherLane() {
        for code in [URLError.Code.networkConnectionLost, .cannotConnectToHost] {
            #expect(APIClient.shouldRetry(after: URLError(code), method: "GET", longWait: true))
            #expect(APIClient.shouldRetry(after: URLError(code), method: "GET", longWait: false))
        }
    }

    @Test func onlyGetsAreRetried() {
        #expect(!APIClient.shouldRetry(after: URLError(.networkConnectionLost), method: "POST", longWait: false))
        #expect(!APIClient.shouldRetry(after: URLError(.badServerResponse), method: "GET", longWait: false))
    }
}
