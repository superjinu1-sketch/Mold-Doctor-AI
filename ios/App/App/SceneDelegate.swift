import UIKit
import Capacitor

// iOS 27 SDK부터 UIScene 수명주기를 채택하지 않은 앱은 실행 즉시 종료된다
// (App Review 1.5.2 리젝: _UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption).
// 화면은 Info.plist의 UISceneStoryboardFile(Main)이 띄우고, 여기서는 Scene으로 들어오는
// URL·유니버설 링크를 기존 AppDelegate와 같은 경로(ApplicationDelegateProxy)로 넘긴다.
// 로그인 딥링크(App 플러그인 appUrlOpen)가 이 경로에 의존한다.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {

    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        // 앱이 꺼진 상태에서 링크로 실행된 경우
        if let url = connectionOptions.urlContexts.first?.url {
            _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, open: url, options: [:])
        }
        if let userActivity = connectionOptions.userActivities.first {
            _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
        }
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        for context in URLContexts {
            _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, open: context.url, options: [:])
        }
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
    }
}
