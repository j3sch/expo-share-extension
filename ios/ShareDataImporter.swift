import AVFoundation
import Foundation
import UIKit
import UniformTypeIdentifiers

enum ShareDataImporter {
  static func load(
    from extensionContext: NSExtensionContext?,
    completion: @escaping ([String: Any]?) -> Void
  ) {
    guard let extensionItems = extensionContext?.inputItems as? [NSExtensionItem] else {
      completion(nil)
      return
    }

    var sharedItems: [String: Any] = [:]
    let group = DispatchGroup()
    let importQueue = DispatchQueue(label: "expo-share-extension.share-import")

    func append(_ url: URL, to key: String) {
      var values = sharedItems[key] as? [String] ?? []
      values.append(url.absoluteString)
      sharedItems[key] = values
    }

    func fileStore() -> SharedFileStore? {
      do {
        return try SharedFileStore()
      } catch {
        print("Failed to initialize shared file store: \(error.localizedDescription)")
        return nil
      }
    }

    for item in extensionItems {
      for provider in item.attachments ?? [] {
        if provider.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
          group.enter()
          provider.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { item, _ in
            importQueue.async {
              defer { group.leave() }
              guard let url = item as? URL else { return }

              guard url.isFileURL else {
                sharedItems["url"] = url.absoluteString
                return
              }

              guard let store = fileStore() else { return }
              let isImage = isImageURL(url)
              do {
                append(try store.persistCopy(from: url), to: isImage ? "images" : "files")
              } catch {
                print("Failed to persist shared file: \(error.localizedDescription)")
              }
            }
          }
        }

        if provider.hasItemConformingToTypeIdentifier(UTType.propertyList.identifier) {
          group.enter()
          provider.loadItem(forTypeIdentifier: UTType.propertyList.identifier, options: nil) { item, _ in
            importQueue.async {
              defer { group.leave() }
              if let itemDict = item as? NSDictionary,
                 let results = itemDict[NSExtensionJavaScriptPreprocessingResultsKey] as? NSDictionary {
                sharedItems["preprocessingResults"] = results
              }
            }
          }
        }

        if !provider.hasItemConformingToTypeIdentifier(UTType.url.identifier),
           provider.hasItemConformingToTypeIdentifier(UTType.text.identifier) {
          group.enter()
          provider.loadItem(forTypeIdentifier: UTType.text.identifier, options: nil) { item, _ in
            importQueue.async {
              defer { group.leave() }
              if let text = item as? String {
                sharedItems["text"] = text
              }
            }
          }
        } else if provider.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
          group.enter()
          provider.loadItem(forTypeIdentifier: UTType.image.identifier, options: nil) { item, _ in
            importQueue.async {
              defer { group.leave() }
              guard let store = fileStore() else { return }

              do {
                let imageURL: URL
                switch item {
                case let url as URL:
                  imageURL = try store.persistCopy(from: url)
                case let image as UIImage:
                  guard let data = image.jpegData(compressionQuality: 1) else { return }
                  imageURL = try store.persist(data: data, fileExtension: "jpg")
                case let data as Data:
                  imageURL = try store.persist(data: data, fileExtension: "jpg")
                default:
                  print("Shared image has an unsupported type: \(String(describing: item))")
                  return
                }
                append(imageURL, to: "images")
              } catch {
                print("Failed to persist shared image: \(error.localizedDescription)")
              }
            }
          }
        } else if provider.hasItemConformingToTypeIdentifier(UTType.movie.identifier) {
          group.enter()
          provider.loadItem(forTypeIdentifier: UTType.movie.identifier, options: nil) { item, _ in
            importQueue.async {
              guard let store = fileStore() else {
                group.leave()
                return
              }

              do {
                switch item {
                case let url as URL:
                  append(try store.persistCopy(from: url), to: "videos")
                  group.leave()
                case let data as Data:
                  append(try store.persist(data: data, fileExtension: "mov"), to: "videos")
                  group.leave()
                case let asset as AVAsset:
                  let destinationURL = store.makeDestinationURL(fileExtension: "mov")
                  guard let exportSession = AVAssetExportSession(
                    asset: asset,
                    presetName: AVAssetExportPresetPassthrough
                  ) else {
                    print("Failed to create video export session")
                    group.leave()
                    return
                  }

                  exportSession.outputURL = destinationURL
                  exportSession.outputFileType = .mov
                  exportSession.exportAsynchronously {
                    importQueue.async {
                      defer { group.leave() }
                      guard exportSession.status == .completed else {
                        print("Failed to export video: \(String(describing: exportSession.error))")
                        return
                      }
                      append(destinationURL, to: "videos")
                    }
                  }
                default:
                  print("Shared video has an unsupported type: \(String(describing: item))")
                  group.leave()
                }
              } catch {
                print("Failed to persist shared video: \(error.localizedDescription)")
                group.leave()
              }
            }
          }
        }
      }
    }

    group.notify(queue: .main) {
      completion(sharedItems.isEmpty ? nil : sharedItems)
    }
  }

  private static func isImageURL(_ url: URL) -> Bool {
    if UTType(filenameExtension: url.pathExtension)?.conforms(to: .image) == true {
      return true
    }
    if let typeIdentifier = try? url.resourceValues(forKeys: [.typeIdentifierKey]).typeIdentifier {
      return UTType(typeIdentifier)?.conforms(to: .image) == true
    }
    return false
  }
}
