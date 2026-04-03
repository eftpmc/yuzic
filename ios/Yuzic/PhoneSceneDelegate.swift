import UIKit

class PhoneSceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
          let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }

    // Attach the window that AppDelegate already created (and started React Native in)
    // to this scene so it renders correctly on iOS 13+ scene lifecycle.
    appDelegate.window?.windowScene = windowScene
    self.window = appDelegate.window
  }
}
