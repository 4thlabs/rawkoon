@preconcurrency import ReadiumNavigator
@preconcurrency import ReadiumShared
import SwiftUI
import UIKit

// MARK: - SwiftUI wrapper (Readium Navigator / SwiftUI guide)

/// SwiftUI wrapper for the host view controller.
struct ReaderViewControllerWrapper: UIViewControllerRepresentable {
    let viewController: ReaderViewController

    func makeUIViewController(context _: Context) -> ReaderViewController {
        viewController
    }

    func updateUIViewController(_: ReaderViewController, context _: Context) {}
}

/// Host view controller for a Readium Navigator.
final class ReaderViewController: UIViewController, EPUBNavigatorDelegate {
    let navigator: EPUBNavigatorViewController
    var onLocationChange: ((Locator) -> Void)?

    init(navigator: EPUBNavigatorViewController) {
        self.navigator = navigator
        super.init(nibName: nil, bundle: nil)
        navigator.delegate = self
    }

    @available(*, unavailable)
    required init?(coder _: NSCoder) {
        fatalError("init?(coder: NSCoder) not implemented")
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        addChild(navigator)
        navigator.view.frame = view.bounds
        navigator.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        view.addSubview(navigator.view)
        navigator.didMove(toParent: self)
    }

    func navigator(_: Navigator, locationDidChange locator: Locator) {
        onLocationChange?(locator)
    }

    func navigator(_: Navigator, presentError _: NavigatorError) {}
}
