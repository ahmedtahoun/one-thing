import ActivityKit
import ExpoModulesCore

/// One bar at a time: started when today has a timed task, updated as tasks
/// change, ended when there is nothing left to show.
public class TodayBarModule: Module {
  public func definition() -> ModuleDefinition {
    Name("TodayBar")

    Function("isEnabled") { () -> Bool in
      if #available(iOS 16.2, *) { return ActivityAuthorizationInfo().areActivitiesEnabled }
      return false
    }

    /// The bar's state as JSON (src/features/today-bar/build.ts), or null to end it.
    AsyncFunction("sync") { (json: String?) in
      if #available(iOS 16.2, *) { await TodayBarSync.sync(json) }
    }
  }
}

@available(iOS 16.2, *)
enum TodayBarSync {
  private static let startedKey = "one-thing.today-bar.started"
  /// iOS ends a Live Activity after eight hours; a fresh one is started a little before.
  private static let renewAfter: TimeInterval = 7 * 3600

  static func sync(_ json: String?) async {
    let running = Activity<TodayBarAttributes>.activities
    guard
      let json,
      let data = json.data(using: .utf8),
      let state = try? JSONDecoder().decode(TodayBarAttributes.ContentState.self, from: data)
    else {
      for activity in running { await activity.end(nil, dismissalPolicy: .immediate) }
      return
    }

    let content = ActivityContent(state: state, staleDate: Date(timeIntervalSince1970: state.end))
    let started = UserDefaults.standard.double(forKey: startedKey)
    let fresh = Date().timeIntervalSince1970 - started < renewAfter
    if fresh, let current = running.first, current.activityState == .active || current.activityState == .stale {
      for extra in running.dropFirst() { await extra.end(nil, dismissalPolicy: .immediate) }
      await current.update(content)
      return
    }

    for activity in running { await activity.end(nil, dismissalPolicy: .immediate) }
    guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }
    do {
      _ = try Activity.request(attributes: TodayBarAttributes(), content: content, pushType: nil)
      UserDefaults.standard.set(Date().timeIntervalSince1970, forKey: startedKey)
    } catch {
      // Not allowed right now (the app is in the background, or the person
      // turned Live Activities off); the next sync tries again.
    }
  }
}
