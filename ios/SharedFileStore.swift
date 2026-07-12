import Foundation

enum SharedFileStoreError: LocalizedError {
  case missingAppGroup
  case unavailableContainer(String)
  case invalidManagedFileURL(URL)

  var errorDescription: String? {
    switch self {
    case .missingAppGroup:
      return "Could not find AppGroup in Info.plist."
    case .unavailableContainer(let appGroup):
      return "Could not access the App Group container for \(appGroup)."
    case .invalidManagedFileURL(let url):
      return "Refusing to delete a file outside the shared-data directory: \(url.absoluteString)"
    }
  }
}

struct SharedFileStore {
  private static let directoryName = "sharedData"

  private let fileManager: FileManager
  private let directoryURL: URL

  init() throws {
    guard let appGroup = Bundle.main.object(forInfoDictionaryKey: "AppGroup") as? String,
          !appGroup.isEmpty else {
      throw SharedFileStoreError.missingAppGroup
    }
    try self.init(appGroupIdentifier: appGroup)
  }

  init(appGroupIdentifier: String, fileManager: FileManager = .default) throws {
    guard let containerURL = fileManager.containerURL(
      forSecurityApplicationGroupIdentifier: appGroupIdentifier
    ) else {
      throw SharedFileStoreError.unavailableContainer(appGroupIdentifier)
    }

    self.fileManager = fileManager
    self.directoryURL = containerURL.appendingPathComponent(
      Self.directoryName,
      isDirectory: true
    )
    try fileManager.createDirectory(
      at: directoryURL,
      withIntermediateDirectories: true,
      attributes: nil
    )
  }

  func persistCopy(from sourceURL: URL, preferredExtension: String? = nil) throws -> URL {
    let destinationURL = makeDestinationURL(fileExtension: preferredExtension ?? sourceURL.pathExtension)
    let stagingURL = directoryURL.appendingPathComponent(".\(UUID().uuidString).partial")

    defer {
      if fileManager.fileExists(atPath: stagingURL.path) {
        try? fileManager.removeItem(at: stagingURL)
      }
    }

    try fileManager.copyItem(at: sourceURL, to: stagingURL)
    try fileManager.moveItem(at: stagingURL, to: destinationURL)
    return destinationURL
  }

  func persist(data: Data, fileExtension: String) throws -> URL {
    let destinationURL = makeDestinationURL(fileExtension: fileExtension)
    try data.write(to: destinationURL, options: .atomic)
    return destinationURL
  }

  func makeDestinationURL(fileExtension: String) -> URL {
    let extensionComponent = normalizedFileExtension(fileExtension)
    let filename = extensionComponent.isEmpty
      ? UUID().uuidString
      : "\(UUID().uuidString).\(extensionComponent)"
    return directoryURL.appendingPathComponent(filename, isDirectory: false)
  }

  func removeFiles(olderThan date: Date) throws {
    let keys: Set<URLResourceKey> = [.creationDateKey, .contentModificationDateKey]
    let files = try fileManager.contentsOfDirectory(
      at: directoryURL,
      includingPropertiesForKeys: Array(keys),
      options: []
    )

    for fileURL in files {
      let values = try fileURL.resourceValues(forKeys: keys)
      let fileDate = values.contentModificationDate ?? values.creationDate
      if let fileDate, fileDate < date {
        try fileManager.removeItem(at: fileURL)
      }
    }
  }

  func removeManagedFiles(at urls: [URL]) throws {
    for url in urls {
      let managedURL = url.standardizedFileURL.resolvingSymlinksInPath()
      guard managedURL.deletingLastPathComponent() == directoryURL.standardizedFileURL else {
        throw SharedFileStoreError.invalidManagedFileURL(url)
      }

      if fileManager.fileExists(atPath: managedURL.path) {
        try fileManager.removeItem(at: managedURL)
      }
    }
  }

  private func normalizedFileExtension(_ fileExtension: String) -> String {
    let allowed = CharacterSet.alphanumerics
    return fileExtension
      .trimmingCharacters(in: CharacterSet(charactersIn: "."))
      .unicodeScalars
      .filter { allowed.contains($0) }
      .map(String.init)
      .joined()
      .lowercased()
  }
}
