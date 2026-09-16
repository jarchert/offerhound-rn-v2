//
//  AppClipApp.swift
//  OfferHoundClip
//
//  App Clip entry point. Presents AppClipEntryView and forwards any
//  incoming NSUserActivity (from a QR code, App Clip Code, or Smart Banner)
//  to the view so it can route to the correct sport landing page.
//

import SwiftUI

@main
struct AppClipApp: App {
    @StateObject private var router = AppClipRouter()

    var body: some Scene {
        WindowGroup {
            AppClipEntryView()
                .environmentObject(router)
                .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { userActivity in
                    router.handle(userActivity: userActivity)
                }
        }
    }
}

final class AppClipRouter: ObservableObject {
    @Published var incomingURL: URL?
    @Published var sportSlug: String?

    /// All 13 supported sport landing paths. Must stay in sync with
    /// `src/lib/data/sports.ts` in the RN app and with the `appclips`
    /// block in apple-app-site-association.
    static let sportSlugs: Set<String> = [
        "football", "basketball", "track-field", "soccer", "baseball",
        "lacrosse", "golf", "volleyball", "swimming", "softball",
        "hockey", "cheerleading", "wrestling",
    ]

    func handle(userActivity: NSUserActivity) {
        guard let url = userActivity.webpageURL else { return }
        incomingURL = url
        // The invocation URL path will be one of /football, /basketball, ...
        let first = url.pathComponents.dropFirst().first ?? ""
        if Self.sportSlugs.contains(first) {
            sportSlug = first
        } else {
            sportSlug = nil
        }
    }
}
