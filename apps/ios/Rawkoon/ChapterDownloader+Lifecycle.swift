import Foundation
import Network
import RawkoonKit
import UIKit

extension ChapterDownloader {
    func observeEnvironment() {
        pathMonitor.pathUpdateHandler = { [weak self] path in
            let wifi = path.usesInterfaceType(.wifi) && !path.isExpensive && !path.isConstrained
            self?.stateQueue.async { self?.send(.unmeteredWifi(wifi)) }
        }
        pathMonitor.start(queue: stateQueue)
        let center = NotificationCenter.default
        lifecycleObservers = [
            center.addObserver(forName: UIApplication.didEnterBackgroundNotification, object: nil, queue: nil) { [weak self] _ in
                self?.beginBackgroundGrace()
            },
            center.addObserver(forName: UIApplication.willEnterForegroundNotification, object: nil, queue: nil) { [weak self] _ in
                self?.stateQueue.async {
                    self?.endBackgroundGrace()
                    self?.send(.appForeground(true))
                }
            },
        ]
    }

    /// A brief app switch should not demote six fast transfers to the throttled
    /// background session: keep them running until iOS says time is up.
    func beginBackgroundGrace() {
        let id = UIApplication.shared.beginBackgroundTask(withName: "chapter-downloads") { [weak self] in
            self?.stateQueue.async {
                self?.journal.log("grace expired")
                self?.send(.appForeground(false))
                self?.endBackgroundGrace()
            }
        }
        stateQueue.async {
            self.journal.log("entered background, grace task started")
            self.endBackgroundGrace()
            self.graceTaskId = id
            if self.engine.plan.isComplete {
                self.endBackgroundGrace()
            }
        }
    }

    func endBackgroundGrace() {
        guard graceTaskId != .invalid else { return }
        UIApplication.shared.endBackgroundTask(graceTaskId)
        graceTaskId = .invalid
    }
}
