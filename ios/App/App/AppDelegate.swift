import UIKit
import Capacitor
import UserNotifications

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?
    private var didRequestPushPermission = false

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        #if DEBUG
        for name in ["AppPlugin", "KeyboardPlugin", "PreferencesPlugin", "PushNotificationsPlugin", "SplashScreenPlugin", "StatusBarPlugin"] {
            if NSClassFromString(name) != nil {
                print("⚡️ Plugin linked: \(name)")
            } else {
                print("⚡️ Plugin MISSING (run npm run build:mobile + Reset Package Caches): \(name)")
            }
        }
        #endif
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        requestPushPermissionIfNeeded(application)
    }

    func applicationWillTerminate(_ application: UIApplication) {
    }

    /// Native permission prompt — WKWebView defers JS dialogs until the next navigation.
    private func requestPushPermissionIfNeeded(_ application: UIApplication) {
        guard !didRequestPushPermission else { return }
        didRequestPushPermission = true

        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
            if let error = error {
                print("⚡️ [push] permission error: \(error.localizedDescription)")
                return
            }
            print("⚡️ [push] permission granted=\(granted)")
            // Do NOT call registerForRemoteNotifications here — the APNs token can
            // arrive before Capacitor JS listeners attach and would be lost.
            // JS calls PushNotifications.register() after listeners are ready.
        }
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
