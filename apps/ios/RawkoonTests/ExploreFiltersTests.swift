@testable import Rawkoon
import Testing

@MainActor
struct ExploreFiltersTests {
    @Test func defaultFiltersAreDefaultForEitherKind() {
        #expect(ExploreFilters().isDefault)
        #expect(ExploreFilters(kind: .tv).isDefault)
    }

    @Test func anyNonDefaultFilterClearsIsDefault() {
        var sorted = ExploreFilters()
        sorted.sort = .popularityAsc
        #expect(!sorted.isDefault)

        var language = ExploreFilters()
        language.originalLanguageOnly = true
        #expect(!language.isDefault)
    }

    @Test func kindMapsToApiValue() {
        #expect(ExploreFilters.Kind.movie.apiValue == "movie")
        #expect(ExploreFilters.Kind.tv.apiValue == "tv")
    }
}
