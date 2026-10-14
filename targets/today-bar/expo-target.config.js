/**
 * The Lock Screen and Dynamic Island bar for today's tasks: a Live Activity
 * the app starts and updates through modules/today-bar. See TodayBar.swift.
 */
/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: 'widget',
  name: 'TodayBar',
  displayName: 'Today',
  bundleIdentifier: '.todaybar',
  deploymentTarget: '16.4',
  frameworks: ['SwiftUI', 'WidgetKit', 'ActivityKit'],
};
