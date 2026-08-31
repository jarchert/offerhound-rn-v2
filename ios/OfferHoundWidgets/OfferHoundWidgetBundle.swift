// OfferHoundWidgetBundle.swift
// Bundles the OfferHound iOS widgets together so the WidgetKit extension can
// expose multiple widgets from a single binary.

import WidgetKit
import SwiftUI

@main
struct OfferHoundWidgetBundle: WidgetBundle {
    var body: some Widget {
        RecentLettersWidget()
        UpcomingCampWidget()
    }
}
