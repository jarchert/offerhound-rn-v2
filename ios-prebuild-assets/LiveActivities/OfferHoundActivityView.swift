//
//  OfferHoundActivityView.swift
//  OfferHound Live Activities
//
//  SwiftUI views for the Lock Screen banner and Dynamic Island presentations.
//  This file MUST live in the Widget Extension target (not the main app target),
//  because ActivityConfiguration / DynamicIsland only compile in a Widget bundle.
//
//  To wire this up after `expo prebuild`:
//    1. In Xcode: File > New > Target > Widget Extension
//       (name e.g. "OfferHoundLiveActivityExtension", "Include Live Activity" ON)
//    2. Replace the generated ActivityConfiguration with the one below.
//    3. Add OfferHoundActivityAttributes.swift to the extension target as well.
//

import ActivityKit
import SwiftUI
import WidgetKit

@available(iOS 16.1, *)
struct OfferHoundLiveActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: OfferHoundActivityAttributes.self) { context in
            // MARK: Lock Screen / Banner presentation
            LockScreenView(context: context)
                .activityBackgroundTint(Color.black.opacity(0.85))
                .activitySystemActionForegroundColor(Color(red: 0.906, green: 0.686, blue: 0.031)) // #e7af08

        } dynamicIsland: { context in
            // MARK: Dynamic Island (expanded, compact, minimal)
            DynamicIsland {
                // Expanded
                DynamicIslandExpandedRegion(.leading) {
                    Image(systemName: "flag.checkered")
                        .foregroundColor(Color(red: 0.906, green: 0.686, blue: 0.031))
                        .font(.title3)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(context.attributes.kind.uppercased())
                        .font(.caption2).bold()
                        .foregroundColor(.secondary)
                }
                DynamicIslandExpandedRegion(.center) {
                    VStack(spacing: 2) {
                        if let camp = context.state.campName, !camp.isEmpty {
                            Text(camp)
                                .font(.caption).bold()
                                .lineLimit(1)
                        }
                        Text(context.state.status)
                            .font(.headline)
                            .lineLimit(1)
                    }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text(context.state.subtitle)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                }
            } compactLeading: {
                Image(systemName: "flag.checkered")
                    .foregroundColor(Color(red: 0.906, green: 0.686, blue: 0.031))
            } compactTrailing: {
                Text(context.state.status)
                    .font(.caption2).bold()
                    .lineLimit(1)
                    .frame(maxWidth: 90)
            } minimal: {
                Image(systemName: "flag.checkered")
                    .foregroundColor(Color(red: 0.906, green: 0.686, blue: 0.031))
            }
            .widgetURL(URL(string: "offerhoundv2://activity/\(context.attributes.activityId)"))
            .keylineTint(Color(red: 0.906, green: 0.686, blue: 0.031))
        }
    }
}

// MARK: - Lock Screen

@available(iOS 16.1, *)
private struct LockScreenView: View {
    let context: ActivityViewContext<OfferHoundActivityAttributes>

    var body: some View {
        HStack(alignment: .center, spacing: 12) {
            ZStack {
                Circle()
                    .fill(Color(red: 0.906, green: 0.686, blue: 0.031).opacity(0.2))
                    .frame(width: 40, height: 40)
                Image(systemName: iconName(for: context.attributes.kind))
                    .foregroundColor(Color(red: 0.906, green: 0.686, blue: 0.031))
                    .font(.title3)
            }

            VStack(alignment: .leading, spacing: 2) {
                if let camp = context.state.campName, !camp.isEmpty {
                    Text(camp)
                        .font(.caption).bold()
                        .foregroundColor(.white.opacity(0.75))
                        .lineLimit(1)
                }
                Text(context.state.status)
                    .font(.headline)
                    .foregroundColor(.white)
                    .lineLimit(1)
                Text(context.state.subtitle)
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.7))
                    .lineLimit(2)
            }

            Spacer(minLength: 0)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
    }

    private func iconName(for kind: String) -> String {
        switch kind {
        case "camp":    return "calendar.badge.clock"
        case "offer":   return "envelope.badge.fill"
        default:        return "flag.checkered"
        }
    }
}
