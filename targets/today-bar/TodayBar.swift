// Today's tasks on the Lock Screen and in the Dynamic Island, as one bar from
// the first task to the last, like a fasting timer.
//
// The app sends the layout (src/features/today-bar/build.ts) whenever the tasks
// change. Between updates the system moves the bar with the clock: the green
// fill grows on its own, and every open task turns red by itself the moment
// its time passes, because each one is a timer view the system keeps running.
// Nothing has to wake the app for either.

import ActivityKit
import SwiftUI
import WidgetKit

// Must match modules/today-bar/ios/TodayBarAttributes.swift field for field.
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

private let green = Color(red: 0.11, green: 0.78, blue: 0.47)
private let red = Color(red: 0.94, green: 0.27, blue: 0.27)
private let pending = Color(white: 0.30)
private let todayURL = URL(string: "onlyonething://today")

private func date(_ s: Double) -> Date { Date(timeIntervalSince1970: s) }

private func symbol(_ type: String) -> String {
  switch type {
  case "call": return "phone.fill"
  case "email": return "envelope.fill"
  case "whatsapp": return "message.fill"
  case "visit": return "mappin"
  case "meeting": return "person.2.fill"
  case "webinar": return "video.fill"
  case "course": return "book.fill"
  default: return "bell.fill"
  }
}

@main
struct TodayBarBundle: WidgetBundle {
  var body: some Widget {
    TodayBarActivity()
  }
}

struct TodayBarActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: TodayBarAttributes.self) { context in
      LockView(state: context.state)
        .activityBackgroundTint(Color.black.opacity(0.78))
        .activitySystemActionForegroundColor(.white)
        .widgetURL(todayURL)
    } dynamicIsland: { context in
      let state = context.state
      let done = state.items.filter { $0.done }.count
      return DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          Image(systemName: "checklist").foregroundColor(green).padding(.leading, 6)
        }
        DynamicIslandExpandedRegion(.trailing) {
          Text("\(done)/\(state.items.count)").font(.headline.monospacedDigit()).foregroundColor(.white).padding(.trailing, 6)
        }
        DynamicIslandExpandedRegion(.bottom) {
          VStack(alignment: .leading, spacing: 8) {
            NextLine(state: state)
            TimelineBar(state: state)
          }
          .padding(.horizontal, 6)
          .environment(\.layoutDirection, state.rtl ? .rightToLeft : .leftToRight)
        }
      } compactLeading: {
        Image(systemName: "checklist").foregroundColor(green)
      } compactTrailing: {
        Text("\(done)/\(state.items.count)").font(.caption.monospacedDigit()).foregroundColor(.white)
      } minimal: {
        Image(systemName: "checklist").foregroundColor(green)
      }
      .widgetURL(todayURL)
    }
  }
}

private struct LockView: View {
  let state: TodayBarAttributes.ContentState

  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      Text(state.heading)
        .font(.subheadline.weight(.semibold))
        .foregroundColor(.white.opacity(0.75))
      NextLine(state: state)
      TimelineBar(state: state)
      HStack {
        Text(state.startLabel)
        Spacer()
        Text(state.endLabel)
      }
      .font(.caption)
      .foregroundColor(.white.opacity(0.6))
      .environment(\.layoutDirection, .leftToRight)
    }
    .padding(16)
    .environment(\.layoutDirection, state.rtl ? .rightToLeft : .leftToRight)
  }
}

private struct NextLine: View {
  let state: TodayBarAttributes.ContentState

  var body: some View {
    HStack(spacing: 8) {
      Text(state.next)
        .font(.headline)
        .foregroundColor(.white)
        .lineLimit(1)
      Spacer(minLength: 4)
      if !state.nextTime.isEmpty {
        Text(state.nextTime)
          .font(.subheadline.weight(.semibold).monospacedDigit())
          .foregroundColor(.white.opacity(0.75))
      }
    }
  }
}

/// Time runs left to right in both languages, as on a clock.
private struct TimelineBar: View {
  let state: TodayBarAttributes.ContentState
  private let dot: CGFloat = 24

  var body: some View {
    GeometryReader { geo in
      let width = geo.size.width
      let span = max(state.end - state.start, 1)
      ZStack(alignment: .leading) {
        ProgressView(
          timerInterval: date(state.start)...date(max(state.end, state.start + 1)),
          countsDown: false,
          label: { EmptyView() },
          currentValueLabel: { EmptyView() }
        )
        .progressViewStyle(.linear)
        .tint(green)
        .scaleEffect(x: 1, y: 2, anchor: .center)
        .padding(.horizontal, dot / 2)
        .frame(width: width, height: dot)

        ForEach(state.items, id: \.id) { item in
          let fraction = min(max((item.at - state.start) / span, 0), 1)
          Marker(item: item, size: dot)
            .position(x: dot / 2 + (width - dot) * CGFloat(fraction), y: dot / 2)
        }
      }
    }
    .frame(height: dot)
    .environment(\.layoutDirection, .leftToRight)
  }
}

/// Grey while it is still to come, red once its time has passed, green when done.
private struct Marker: View {
  let item: TodayBarAttributes.Item
  let size: CGFloat

  var body: some View {
    ZStack {
      Circle().fill(item.done ? green : pending)
      if !item.done {
        // A one-second timer that starts at the due time: empty before it,
        // full after it. Stretched over the circle, it turns the dot red on
        // time with no update from the app.
        ZStack {
          ProgressView(
            timerInterval: date(item.at)...date(item.at + 1),
            countsDown: false,
            label: { EmptyView() },
            currentValueLabel: { EmptyView() }
          )
          .progressViewStyle(.linear)
          .tint(red)
          .frame(width: size + 6)
          .scaleEffect(x: 1, y: 12, anchor: .center)
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
      }
      Image(systemName: item.done ? "checkmark" : symbol(item.type))
        .font(.system(size: 11, weight: .bold))
        .foregroundColor(.white)
    }
    .frame(width: size, height: size)
    .overlay(Circle().stroke(Color.black.opacity(0.7), lineWidth: 2))
  }
}
