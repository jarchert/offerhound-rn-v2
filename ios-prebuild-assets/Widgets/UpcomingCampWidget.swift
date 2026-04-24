// UpcomingCampWidget.swift
// Small / medium widget showing the next college camp / recruiting event.
//
// Data source: shared App Group UserDefaults
//   suiteName : group.com.emergentmindlab.offerhoundv2.shared
//   key       : "upcoming_camp_json"
//   value     : JSON-encoded array of { name, school, date (ISO8601), location }
//
// The host React Native app writes this key via src/lib/widgetSync.ts.

import WidgetKit
import SwiftUI

private let APP_GROUP = "group.com.emergentmindlab.offerhoundv2.shared"
private let STORAGE_KEY = "upcoming_camp_json"

// MARK: - Model

struct UpcomingCamp: Codable, Identifiable {
    var id: String { name + date }
    let name: String
    let school: String
    let date: String      // ISO8601 string
    let location: String?
}

// MARK: - Timeline entry

struct UpcomingCampEntry: TimelineEntry {
    let date: Date
    let camps: [UpcomingCamp]
}

// MARK: - Provider

struct UpcomingCampProvider: TimelineProvider {
    func placeholder(in context: Context) -> UpcomingCampEntry {
        UpcomingCampEntry(date: Date(), camps: Self.placeholderCamps)
    }

    func getSnapshot(in context: Context, completion: @escaping (UpcomingCampEntry) -> Void) {
        completion(UpcomingCampEntry(date: Date(), camps: Self.loadCamps()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<UpcomingCampEntry>) -> Void) {
        let now = Date()
        let entry = UpcomingCampEntry(date: now, camps: Self.loadCamps())
        let next = Calendar.current.date(byAdding: .hour, value: 1, to: now) ?? now
        completion(Timeline(entries: [entry], policy: .after(next)))
    }

    static var placeholderCamps: [UpcomingCamp] {
        [
            UpcomingCamp(
                name: "Elite QB Camp",
                school: "Stanford",
                date: ISO8601DateFormatter().string(from: Date().addingTimeInterval(86_400 * 3)),
                location: "Stanford, CA"
            ),
            UpcomingCamp(
                name: "Showcase Day",
                school: "Notre Dame",
                date: ISO8601DateFormatter().string(from: Date().addingTimeInterval(86_400 * 10)),
                location: "South Bend, IN"
            ),
        ]
    }

    static func loadCamps() -> [UpcomingCamp] {
        guard
            let defaults = UserDefaults(suiteName: APP_GROUP),
            let raw = defaults.string(forKey: STORAGE_KEY),
            let data = raw.data(using: .utf8)
        else {
            return placeholderCamps
        }
        let decoded = (try? JSONDecoder().decode([UpcomingCamp].self, from: data)) ?? []
        return decoded.isEmpty ? placeholderCamps : decoded
    }
}

// MARK: - View

struct UpcomingCampWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: UpcomingCampEntry

    private static let displayFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "MMM d"
        return f
    }()

    private func formatted(_ iso: String) -> String {
        let parser = ISO8601DateFormatter()
        if let d = parser.date(from: iso) {
            return Self.displayFormatter.string(from: d)
        }
        return iso
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Upcoming Camp")
                .font(.caption.weight(.semibold))
                .foregroundColor(.secondary)

            if let camp = entry.camps.first {
                Text(camp.name)
                    .font(.headline)
                    .lineLimit(1)
                Text(camp.school)
                    .font(.subheadline.weight(.medium))
                    .lineLimit(1)
                Text(formatted(camp.date))
                    .font(.caption)
                    .foregroundColor(.secondary)
                if family == .systemMedium, let loc = camp.location {
                    Text(loc)
                        .font(.caption2)
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                }

                if family == .systemMedium, entry.camps.count > 1 {
                    Divider().padding(.vertical, 2)
                    let next = entry.camps[1]
                    Text("Next: \(next.school) — \(formatted(next.date))")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                }
            } else {
                Text("No upcoming camps")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            Spacer(minLength: 0)
        }
        .padding(12)
        .containerBackground(.background, for: .widget)
    }
}

// MARK: - Widget

struct UpcomingCampWidget: Widget {
    let kind: String = "UpcomingCampWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: UpcomingCampProvider()) { entry in
            UpcomingCampWidgetView(entry: entry)
        }
        .configurationDisplayName("Upcoming Camp")
        .description("Next recruiting camp or event on your calendar.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
