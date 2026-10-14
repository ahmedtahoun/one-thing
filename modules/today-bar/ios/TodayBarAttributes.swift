import ActivityKit

// Must match targets/today-bar/TodayBar.swift field for field: ActivityKit
// pairs the app and the widget by this type's name and shape.
struct TodayBarAttributes: ActivityAttributes {
  public struct Item: Codable, Hashable {
    var id: String
    var type: String
    var title: String
    var at: Double
    var done: Bool
  }

  public struct ContentState: Codable, Hashable {
    var start: Double
    var end: Double
    var items: [Item]
    var heading: String
    var next: String
    var nextTime: String
    var startLabel: String
    var endLabel: String
    var rtl: Bool
  }
}
