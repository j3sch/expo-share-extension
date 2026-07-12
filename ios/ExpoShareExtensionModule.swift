import ExpoModulesCore

public class ExpoShareExtensionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoShareExtension")

    Function("close") { () in
      NotificationCenter.default.post(name: NSNotification.Name("close"), object: nil)
    }

    Function("openHostApp") { (path: String) in
      let userInfo: [String: String] = ["path": path]
      NotificationCenter.default.post(name: NSNotification.Name("openHostApp"), object: nil, userInfo: userInfo)
    }

    AsyncFunction("clearAppGroupContainer") { (date: String, promise: Promise) in
      DispatchQueue.global(qos: .background).async {
        do {
          let comparisonDate = try Self.parseISO8601Date(date)
          try SharedFileStore().removeFiles(olderThan: comparisonDate)
          DispatchQueue.main.async {
            promise.resolve()
          }
        } catch {
          DispatchQueue.main.async {
            promise.reject("ERR_REMOVE_CONTENTS", error.localizedDescription)
          }
        }
      }
    }

    AsyncFunction("deleteSharedFiles") { (fileURLs: [String], promise: Promise) in
      DispatchQueue.global(qos: .background).async {
        do {
          let urls = try fileURLs.map { rawURL -> URL in
            guard let url = URL(string: rawURL), url.isFileURL else {
              throw SharedFileStoreError.invalidManagedFileURL(URL(fileURLWithPath: rawURL))
            }
            return url
          }
          try SharedFileStore().removeManagedFiles(at: urls)
          DispatchQueue.main.async {
            promise.resolve()
          }
        } catch {
          DispatchQueue.main.async {
            promise.reject("ERR_REMOVE_FILES", error.localizedDescription)
          }
        }
      }
    }
  }

  private static func parseISO8601Date(_ value: String) throws -> Date {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions.insert(.withFractionalSeconds)
    guard let date = formatter.date(from: value) else {
      throw NSError(
        domain: "ExpoShareExtension",
        code: 1,
        userInfo: [NSLocalizedDescriptionKey: "The provided date is not a valid ISO 8601 value."]
      )
    }
    return date
  }
}
