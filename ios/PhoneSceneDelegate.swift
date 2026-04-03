import UIKit

class PhoneSceneDelegate: UIResponder, UIWindowSceneDelegate {

    var window: UIWindow?

    func scene(_ scene: UIScene,
               willConnectTo session: UISceneSession,
               options connectionOptions: UIScene.ConnectionOptions) {

        guard let windowScene = scene as? UIWindowScene else { return }

        guard let appDelegate = UIApplication.shared.delegate as? AppDelegate,
              let existingWindow = appDelegate.window,
              let rootVC = existingWindow.rootViewController else { return }

        let window = UIWindow(windowScene: windowScene)
        window.rootViewController = rootVC
        self.window = window

        window.makeKeyAndVisible()
    }
}
