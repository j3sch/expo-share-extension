import AVFoundation
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import UIKit
import UniformTypeIdentifiers

#if canImport(FirebaseCore)
import FirebaseCore
#endif

#if canImport(Expo)
internal import Expo
typealias ShareExtensionReactNativeDelegateSuperclass = ExpoReactNativeFactoryDelegate
typealias ShareExtensionReactNativeFactory = ExpoReactNativeFactory
#else
typealias ShareExtensionReactNativeDelegateSuperclass = RCTDefaultReactNativeFactoryDelegate
typealias ShareExtensionReactNativeFactory = RCTReactNativeFactory
#endif

class ReactNativeDelegate: ShareExtensionReactNativeDelegateSuperclass {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    bridge.bundleURL ?? bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    let settings = RCTBundleURLProvider.sharedSettings()
    settings.enableDev = true
    settings.enableMinification = false
    guard let bundleURL = settings.jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry") else {
      fatalError("Could not create bundle URL")
    }
    guard var components = URLComponents(url: bundleURL, resolvingAgainstBaseURL: false) else {
      return bundleURL
    }
    components.queryItems = (components.queryItems ?? []) + [
      URLQueryItem(name: "shareExtension", value: "true"),
    ]
    return components.url ?? bundleURL
#else
    guard let bundleURL = Bundle.main.url(forResource: "main", withExtension: "jsbundle") else {
      fatalError("Could not load bundle URL")
    }
    return bundleURL
#endif
  }
}

class ShareExtensionViewController: UIViewController {
  private let loadingIndicator = UIActivityIndicatorView(style: .large)
  private var reactNativeFactory: ShareExtensionReactNativeFactory?
  private var reactNativeFactoryDelegate: ShareExtensionReactNativeDelegateSuperclass?
  private var reactNativeRootView: UIView?
  private var notificationObserverTokens: [NSObjectProtocol] = []
  private var isCleanedUp = false

  deinit {
    cleanupAfterClose()
  }

  override func viewDidLoad() {
    super.viewDidLoad()
    isCleanedUp = false
    view.contentScaleFactor = UIScreen.main.scale
    setupLoadingIndicator()

#if canImport(FirebaseCore)
    if Bundle.main.object(forInfoDictionaryKey: "WithFirebase") as? Bool ?? false {
      FirebaseApp.configure()
    }
#endif

    loadReactNativeContent()
    setupNotificationCenterObserver()
  }

  override func viewWillDisappear(_ animated: Bool) {
    super.viewWillDisappear(animated)
    if isBeingDismissed {
      cleanupAfterClose()
    }
  }

  override func viewDidDisappear(_ animated: Bool) {
    super.viewDidDisappear(animated)
    cleanupAfterClose()
  }

  func close() {
    extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
    cleanupAfterClose()
  }

  private func loadReactNativeContent() {
    getShareData { [weak self] sharedData in
      guard let self, !isCleanedUp else { return }

      let delegate = ReactNativeDelegate()
      delegate.dependencyProvider = RCTAppDependencyProvider()
      let factory = ShareExtensionReactNativeFactory(delegate: delegate)
      reactNativeFactoryDelegate = delegate
      reactNativeFactory = factory

      var initialProps = sharedData ?? [:]
      initialProps["initialViewWidth"] = view.bounds.width
      initialProps["initialViewHeight"] = view.bounds.height
      initialProps["pixelRatio"] = UIScreen.main.scale
      initialProps["fontScale"] = UIFont.preferredFont(forTextStyle: .body).pointSize / 17.0

      let rootView = factory.rootViewFactory.view(
        withModuleName: "shareExtension",
        initialProperties: initialProps
      )
      let background = Bundle.main.object(forInfoDictionaryKey: "ShareExtensionBackgroundColor") as? [String: CGFloat]
      let height = Bundle.main.object(forInfoDictionaryKey: "ShareExtensionHeight") as? CGFloat
      configure(rootView: rootView, background: background, height: height)
      view.addSubview(rootView)
      reactNativeRootView = rootView
      loadingIndicator.stopAnimating()
      loadingIndicator.removeFromSuperview()
    }
  }

  private func configure(rootView: UIView, background: [String: CGFloat]?, height: CGFloat?) {
    rootView.backgroundColor = backgroundColor(from: background)
    if let height {
      rootView.autoresizingMask = [.flexibleWidth, .flexibleTopMargin]
      rootView.frame = CGRect(
        x: 0,
        y: UIScreen.main.bounds.height - height,
        width: UIScreen.main.bounds.width,
        height: height
      )
    } else {
      rootView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
      rootView.frame = UIScreen.main.bounds
    }
  }

  private func backgroundColor(from values: [String: CGFloat]?) -> UIColor {
    guard let values else { return .systemBackground }
    return UIColor(
      red: (values["red"] ?? 255) / 255,
      green: (values["green"] ?? 255) / 255,
      blue: (values["blue"] ?? 255) / 255,
      alpha: values["alpha"] ?? 1
    )
  }

  private func setupLoadingIndicator() {
    view.addSubview(loadingIndicator)
    loadingIndicator.translatesAutoresizingMaskIntoConstraints = false
    NSLayoutConstraint.activate([
      loadingIndicator.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      loadingIndicator.centerYAnchor.constraint(equalTo: view.centerYAnchor),
    ])
    loadingIndicator.startAnimating()
  }

  private func setupNotificationCenterObserver() {
    notificationObserverTokens.append(NotificationCenter.default.addObserver(
      forName: NSNotification.Name("close"), object: nil, queue: nil
    ) { [weak self] _ in
      DispatchQueue.main.async { self?.close() }
    })
    notificationObserverTokens.append(NotificationCenter.default.addObserver(
      forName: NSNotification.Name("openHostApp"), object: nil, queue: nil
    ) { [weak self] notification in
      DispatchQueue.main.async {
        self?.openHostApp(path: notification.userInfo?["path"] as? String)
      }
    })
  }

  private func openHostApp(path: String?) {
    guard let scheme = Bundle.main.object(forInfoDictionaryKey: "HostAppScheme") as? String else { return }
    var components = URLComponents()
    components.scheme = scheme
    components.host = ""
    if let path, !path.isEmpty {
      let parts = path.split(separator: "?", maxSplits: 1, omittingEmptySubsequences: false)
      components.path = parts[0].hasPrefix("/") ? String(parts[0]) : "/\(parts[0])"
      if parts.count == 2 {
        components.queryItems = parts[1].split(separator: "&").map { parameter in
          let pair = parameter.split(separator: "=", maxSplits: 1)
          return URLQueryItem(name: String(pair[0]), value: pair.count == 2 ? String(pair[1]) : nil)
        }
      }
    }
    if let url = components.url {
      openURL(url)
      close()
    }
  }

  @objc @discardableResult private func openURL(_ url: URL) -> Bool {
    var responder: UIResponder? = self
    while let current = responder {
      if let application = current as? UIApplication {
        application.open(url, options: [:], completionHandler: nil)
        return true
      }
      responder = current.next
    }
    return false
  }

  private func cleanupAfterClose() {
    guard !isCleanedUp else { return }
    isCleanedUp = true
    notificationObserverTokens.forEach(NotificationCenter.default.removeObserver)
    notificationObserverTokens.removeAll()
    reactNativeRootView?.removeFromSuperview()
    reactNativeRootView = nil
    loadingIndicator.stopAnimating()
    loadingIndicator.removeFromSuperview()
    reactNativeFactory = nil
    reactNativeFactoryDelegate = nil
  }

  private func getShareData(completion: @escaping ([String: Any]?) -> Void) {
    ShareDataImporter.load(from: extensionContext, completion: completion)
  }
}
