import Foundation
import CarPlay

class CarSceneDelegate: UIResponder, CPTemplateApplicationSceneDelegate {

    func templateApplicationScene(_ templateApplicationScene: CPTemplateApplicationScene,
                                  didConnect interfaceController: CPInterfaceController) {

        // Dispatch connect to RNCarPlay
        RNCarPlay.connect(with: interfaceController,
                          window: templateApplicationScene.carWindow)
    }

    func templateApplicationScene(_ templateApplicationScene: CPTemplateApplicationScene,
                                  didDisconnect interfaceController: CPInterfaceController) {

        // Dispatch disconnect to RNCarPlay
        RNCarPlay.disconnect()
    }
}
