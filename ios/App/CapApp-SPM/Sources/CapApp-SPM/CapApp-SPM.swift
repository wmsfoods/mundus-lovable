import PushNotificationsPlugin

public let isCapacitorApp = true

// Prevent dead-stripping of the push plugin in SPM static builds.
enum CapAppPluginRegistry {
    static let pushPlugin: AnyClass = PushNotificationsPlugin.self
}
