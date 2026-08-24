//
//  AppClipEntryView.swift
//  OfferHoundClip
//
//  Lightweight SwiftUI landing surface. Reads the incoming URL from the
//  AppClipRouter (populated by NSUserActivityTypeBrowsingWeb) and shows the
//  matching sport-specific call-to-action.
//
//  When the user taps "Open in OfferHound", we offer to install the full app
//  via App Store overlay (handled automatically by the system from the App
//  Clip card). The "Get the App" sheet is provided by SKOverlay on iOS 14+.
//

import SwiftUI
import StoreKit

struct AppClipEntryView: View {
    @EnvironmentObject var router: AppClipRouter
    @State private var showOverlay = false

    private var sportTitle: String {
        guard let slug = router.sportSlug else { return "OfferHound" }
        return slug
            .replacingOccurrences(of: "-", with: " ")
            .capitalized
    }

    private var tagline: String {
        guard router.sportSlug != nil else {
            return "AI-powered recruiting for high school athletes."
        }
        return "The only AI-powered recruiting platform built for high school \(sportTitle)."
    }

    var body: some View {
        ZStack {
            Color(red: 16/255, green: 19/255, blue: 24/255).ignoresSafeArea()

            VStack(spacing: 24) {
                Spacer()

                Text("OfferHound")
                    .font(.system(size: 36, weight: .heavy, design: .rounded))
                    .foregroundColor(Color(red: 231/255, green: 175/255, blue: 8/255))

                Text(sportTitle)
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundColor(.white)

                Text(tagline)
                    .font(.system(size: 16))
                    .foregroundColor(.white.opacity(0.75))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)

                Spacer()

                Button(action: { showOverlay = true }) {
                    Text("Get the OfferHound App")
                        .font(.system(size: 17, weight: .bold))
                        .foregroundColor(.black)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(Color(red: 231/255, green: 175/255, blue: 8/255))
                        .cornerRadius(14)
                }
                .padding(.horizontal, 24)
                .appStoreOverlay(isPresented: $showOverlay) {
                    SKOverlay.AppClipConfiguration(position: .bottom)
                }

                if let url = router.incomingURL {
                    Text(url.absoluteString)
                        .font(.system(size: 11, design: .monospaced))
                        .foregroundColor(.white.opacity(0.4))
                        .padding(.bottom, 16)
                        .lineLimit(1)
                        .truncationMode(.middle)
                        .padding(.horizontal, 16)
                }
            }
        }
    }
}

#Preview {
    AppClipEntryView()
        .environmentObject(AppClipRouter())
}
