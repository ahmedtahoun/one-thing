Pod::Spec.new do |s|
  s.name           = 'OneThingTodayBar'
  s.version        = '1.0.0'
  s.summary        = 'Starts, updates and ends the Lock Screen bar for today.'
  s.description    = 'The app side of targets/today-bar: a Live Activity with the day’s tasks.'
  s.author         = 'The One Thing'
  s.homepage       = 'https://onlyonething.app'
  s.license        = { :type => 'Proprietary' }
  s.platforms      = { :ios => '16.4' }
  s.source         = { :git => '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks     = 'ActivityKit'
  s.source_files   = '**/*.swift'
end
