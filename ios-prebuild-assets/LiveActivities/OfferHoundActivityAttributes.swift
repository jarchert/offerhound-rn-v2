//
//  OfferHoundActivityAttributes.swift
//  OfferHound Live Activities
//
//  Defines the ActivityAttributes contract shared between the app and the
//  Widget Extension that renders Live Activities (Dynamic Island + Lock Screen).
//
//  Usage:
//    - Add this file to BOTH the main app target AND the Widget Extension target.
//    - The ContentState is what `Activity.update(using:)` mutates over time.
//    - The outer `OfferHoundActivityAttributes` struct is the static context
//      (e.g. the camp/offer identity) that doesn't change for the life of the
//      activity.
//

import Foundation
import ActivityKit

@available(iOS 16.1, *)
public struct OfferHoundActivityAttributes: ActivityAttributes {

    /// Mutable state pushed via `Activity.update(using:)` or APNS.
    public struct ContentState: Codable, Hashable {
        /// Short headline, e.g. "Starts in 2h 14m" or "New offer: Stanford".
        public var status: String

        /// Secondary line, e.g. "Elite QB Camp – Palo Alto" or coach name.
        public var subtitle: String

        /// Optional camp name, surfaced when the activity represents a camp
        /// countdown. nil for non-camp activities (e.g. generic offer pings).
        public var campName: String?

        public init(status: String, subtitle: String, campName: String? = nil) {
            self.status = status
            self.subtitle = subtitle
            self.campName = campName
        }
    }

    /// Stable identity for this activity instance.
    /// e.g. a camp UUID, an offer UUID, or "session:<id>".
    public var activityId: String

    /// Logical kind so the view can branch layout: "camp" | "offer" | "generic".
    public var kind: String

    public init(activityId: String, kind: String) {
        self.activityId = activityId
        self.kind = kind
    }
}
