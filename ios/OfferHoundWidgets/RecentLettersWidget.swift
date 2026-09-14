// RecentLettersWidget.swift
// Small / medium widget showing the most recent recruiting letters.
//
// Data source: shared App Group UserDefaults
//   suiteName : group.com.emergentmindlab.offerhoundv2.shared
//   key       : "recent_letters_json"
//   value     : JSON-encoded array of { school: String, date: String, snippet: String? }
//
// The host React Native app writes this key via src/lib/widgetSync.ts.

import WidgetKit
import SwiftUI

private let APP_GROUP = "group.com.emergentmindlab.offerhoundv2.shared"
private let STORAGE_KEY = "recent_letters_json"

// MARK: - Model

struct RecentLetter: Codable, Identifiable {
    var id: String { school + date }
    let school: String
    let date: String
    let snippet: String?
}

// MARK: - Timeline entry

struct RecentLettersEntry: TimelineEntry {
    let date: Date
    let letters: [RecentLetter]
}

// MARK: - Provider

struct RecentLettersProvider: TimelineProvider {
    func placeholder(in context: Context) -> RecentLettersEntry {
        RecentLettersEntry(date: Date(), letters: Self.placeholderLetters)
    }

    func getSnapshot(in context: Context, completion: @escaping (RecentLettersEntry) -> Void) {
        let entry = RecentLettersEntry(date: Date(), letters: Self.loadLetters())
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<RecentLettersEntry>) -> Void) {
        let now = Date()
        let entry = RecentLettersEntry(date: now, letters: Self.loadLetters())
        // Refresh every 30 minutes; the app also nudges WidgetCenter on writes.
        let next = Calendar.current.date(byAdding: .minute, value: 30, to: now) ?? now
        completion(Timeline(entries: [entry], policy: .after(next)))
    }

    static var placeholderLetters: [RecentLetter] {
        [
            RecentLetter(school: "Stanford", date: "Today", snippet: "Coach reached out about summer camp."),
            RecentLetter(school: "Duke", date: "Yesterday", snippet: "Interest letter — keep film rolling."),
            RecentLetter(school: "Notre Dame", date: "2d ago", snippet: "Questionnaire sent."),
        ]
    }

    static func loadLetters() -> [RecentLetter] {
        guard
            let defaults = UserDefaults(suiteName: APP_GROUP),
            let raw = defaults.string(forKey: STORAGE_KEY),
            let data = raw.data(using: .utf8)
        else {
            return placeholderLetters
        }
        let decoded = (try? JSONDecoder().decode([RecentLetter].self, from: data)) ?? []
        return decoded.isEmpty ? placeholderLetters : decoded
    }
}

// MARK: - View

struct RecentLettersWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: RecentLettersEntry

    var body: some View {
        let limit = family == .systemSmall ? 2 : 4
        VStack(alignment: .leading, spacing: 6) {
            Text("Recent Letters")
                .font(.caption.weight(.semibold))
                .foregroundColor(.secondary)
            ForEach(entry.letters.prefix(limit)) { letter in
                VStack(alignment: .leading, spacing: 1) {
                    Text(letter.school)
                        .font(.footnote.weight(.semibold))
                        .lineLimit(1)
                    Text(letter.date)
                        .font(.caption2)
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                }
            }
            Spacer(minLength: 0)
        }
        .padding(12)
        .containerBackground(.background, for: .widget)
    }
}

// MARK: - Widget

struct RecentLettersWidget: Widget {
    let kind: String = "RecentLettersWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: RecentLettersProvider()) { entry in
            RecentLettersWidgetView(entry: entry)
        }
        .configurationDisplayName("Recent Letters")
        .description("Latest recruiting letters from your inbox.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
