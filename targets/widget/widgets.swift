import AppIntents
import SwiftUI
import WidgetKit

// 피그마 '위잿 기본' / '📱 Home Screen' / '감정 받음' 의 작은 위젯 (466px = 155.4pt 기준)
// 아직 앱 ↔ 위젯 데이터 공유(App Group)가 없어서, 위젯을 길게 눌러 '위젯 편집'에서 상태를 골라 보여줌
// TODO: 백엔드 연동 + 유료 개발자 계정(App Group) 생기면 실제 최근 구슬로 자동 표시

enum OrbState: String, AppEnum {
    case empty, mine, received

    static let typeDisplayRepresentation: TypeDisplayRepresentation = "위젯 상태"
    static let caseDisplayRepresentations: [OrbState: DisplayRepresentation] = [
        .empty: "감정 없음",
        .mine: "내 감정",
        .received: "받은 감정",
    ]
}

struct StateIntent: WidgetConfigurationIntent {
    static let title: LocalizedStringResource = "EmOri 위젯"
    static let description: IntentDescription? = IntentDescription("위젯에 보여줄 상태를 골라요.")

    @Parameter(title: "상태", default: .mine)
    var state: OrbState
}

struct Entry: TimelineEntry {
    let date: Date
    let state: OrbState
}

struct Provider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> Entry { Entry(date: .now, state: .mine) }

    func snapshot(for configuration: StateIntent, in context: Context) async -> Entry {
        Entry(date: .now, state: configuration.state)
    }

    func timeline(for configuration: StateIntent, in context: Context) async -> Timeline<Entry> {
        Timeline(entries: [Entry(date: .now, state: configuration.state)], policy: .never)
    }
}

// 피그마 색 (배경 / Nue/white/2 / ㅇ)
private let widgetBackground = Color(red: 0x15 / 255, green: 0x15 / 255, blue: 0x15 / 255)
private let titleColor = Color(red: 0xEE / 255, green: 0xEE / 255, blue: 0xEE / 255)
private let bodyColor = Color(red: 0x71 / 255, green: 0x75 / 255, blue: 0x7D / 255)
private let socketColor = Color(red: 0x0B / 255, green: 0x0B / 255, blue: 0x0B / 255)

private let figmaWidth: CGFloat = 155.41 // 466px / 3

// 탭하면 열리는 화면 (app.json scheme: ganzithon21 → expo-router 경로)
private func link(_ state: OrbState) -> URL? {
    URL(string: state == .received ? "ganzithon21://reaction" : "ganzithon21://send")
}

struct EmOriWidgetView: View {
    let state: OrbState

    private var title: String {
        switch state {
        case .empty: return "지금 무슨 감정이 드나요?"
        case .mine: return "내가 가장 최근에 느낀 감정"
        case .received: return "서현님이 감정을 보냈어요."
        }
    }

    private var message: String {
        switch state {
        case .empty: return "보낸/받은 감정이 없어요,\n친구에게 감정을 보내보세요."
        case .mine: return "내가 보낸 감정 구슬이에요.\n친구가 보낸 감정도 살펴볼까요?"
        case .received: return "앱에서 반응하거나, 빠른 행동을\n설정하고 위젯에서 반응해보세요"
        }
    }

    var body: some View {
        GeometryReader { geo in
            // 실제 위젯 크기(기기마다 155~170pt)에 맞춰 피그마 좌표를 비율로 키움
            let s = geo.size.width / figmaWidth
            ZStack(alignment: .topLeading) {
                socket(s)

                Text(title)
                    .font(.system(size: 10.97 * s, weight: .semibold))
                    .foregroundStyle(titleColor)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
                    .offset(x: 14 * s, y: 91.33 * s)

                Text(message)
                    .font(.system(size: 10 * s, weight: .semibold))
                    .foregroundStyle(bodyColor)
                    .lineSpacing(2.7 * s) // 줄 높이 14.6pt
                    .lineLimit(2)
                    .minimumScaleFactor(0.8)
                    .frame(width: (figmaWidth - 28) * s, alignment: .leading)
                    .offset(x: 14 * s, y: 110.33 * s)
            }
            .frame(width: geo.size.width, height: geo.size.height, alignment: .topLeading)
        }
        .containerBackground(widgetBackground, for: .widget)
        .widgetURL(link(state))
    }

    @ViewBuilder
    private func socket(_ s: CGFloat) -> some View {
        if state == .empty {
            // 빈 구슬 자리 (왼쪽 정렬, 200px)
            Circle()
                .fill(socketColor)
                .overlay(Circle().stroke(Color.white.opacity(0.04), lineWidth: 0.5))
                .frame(width: 66.67 * s, height: 66.67 * s)
                .offset(x: 14 * s, y: 15.67 * s)
        } else {
            // 구슬 (가운데, 자리 250×220px / 구슬 이미지 230px)
            ZStack {
                Ellipse().fill(Color(red: 0x0C / 255, green: 0x0C / 255, blue: 0x0C / 255))
                Image(state == .received ? "orbReceived" : "orbMine")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 76.67 * s, height: 76.67 * s)
                    .offset(y: -2 * s)
            }
            .frame(width: 83.33 * s, height: 73.33 * s)
            .clipShape(Ellipse())
            .shadow(color: .black.opacity(0.9), radius: 11 * s, x: 4 * s, y: 4 * s)
            .offset(x: 36 * s, y: 13.67 * s)
        }
    }
}

struct EmOriWidget: Widget {
    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: "EmOriWidget", intent: StateIntent.self, provider: Provider()) { entry in
            EmOriWidgetView(state: entry.state)
        }
        .configurationDisplayName("EmOri")
        .description("최근 감정구슬을 보여주고, 탭하면 앱으로 이동해요.")
        .supportedFamilies([.systemSmall])
        .contentMarginsDisabled() // 피그마 좌표 그대로 쓰려고 기본 여백 끔
    }
}

// MARK: - 큰 위젯 (4×4): 감정 휠
// 위젯 밖으로는 그릴 수 없어서 앱의 '감정 보내기' 휠을 위젯 칸 안에 넣음
// 구슬을 누르면 그 색을 골라둔 채로 앱의 보내기 화면이 열림 (ganzithon21://send?emotion=blue)

// 앱 휠과 같은 순서·각도 (src/components/EmotionWheel.tsx: 32.4° 간격, 분홍이 정확히 아래)
private let wheelOrbs = ["green", "blue", "purple", "pink", "red", "orange", "yellow"]
private let wheelStep: Double = 32.4
private let wheelStart: Double = 90 - 3 * 32.4

struct EmOriWheelView: View {
    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width
            let h = geo.size.height
            let m = min(w, h)
            let s = m / 364 // 393pt 아이폰 큰 위젯(364pt) 기준 글자 비율
            let center = CGPoint(x: w / 2, y: h * 0.47)
            let radius = m * 0.37 // 구슬이 놓이는 원 반지름
            let slot = m * 0.19 // 구슬 자리(검은 원) 지름
            let hub = m * 0.40 // 가운데 빈 구슬 지름

            ZStack(alignment: .topLeading) {
                // 위쪽 안내 문구
                VStack(spacing: 3 * s) {
                    Text("지금 무슨 감정이 드나요?")
                        .font(.system(size: 14 * s, weight: .semibold))
                        .foregroundStyle(titleColor)
                    Text("구슬을 눌러 바로 보내보세요.")
                        .font(.system(size: 11 * s, weight: .semibold))
                        .foregroundStyle(bodyColor)
                }
                .frame(width: w)
                .padding(.top, 16 * s)

                // 구슬이 도는 트랙 (아래쪽 호만)
                Circle()
                    .trim(from: 0, to: (6 * wheelStep + 24) / 360)
                    .stroke(Color(red: 0x0F / 255, green: 0x0F / 255, blue: 0x0F / 255),
                            style: StrokeStyle(lineWidth: slot * 1.22, lineCap: .round))
                    .rotationEffect(.degrees(wheelStart - 12))
                    .frame(width: radius * 2, height: radius * 2)
                    .position(center)

                // 가운데 빈 구슬 (+) → 그냥 보내기 화면
                Link(destination: URL(string: "ganzithon21://send")!) {
                    ZStack {
                        Circle().fill(Color(red: 0x26 / 255, green: 0x28 / 255, blue: 0x2C / 255))
                        Circle()
                            .fill(Color(red: 0x1B / 255, green: 0x1C / 255, blue: 0x1F / 255))
                            .padding(hub * 0.035)
                        Image(systemName: "plus")
                            .font(.system(size: hub * 0.3, weight: .light))
                            .foregroundStyle(Color(red: 0x6B / 255, green: 0x6F / 255, blue: 0x76 / 255))
                    }
                    .frame(width: hub, height: hub)
                }
                .position(center)

                // 감정 구슬 7개
                ForEach(Array(wheelOrbs.enumerated()), id: \.offset) { i, key in
                    let rad = (wheelStart + Double(i) * wheelStep) * .pi / 180
                    Link(destination: URL(string: "ganzithon21://send?emotion=\(key)")!) {
                        ZStack {
                            Circle().fill(socketColor)
                            Image("wheel_\(key)")
                                .resizable()
                                .scaledToFit()
                                .frame(width: slot * 0.965, height: slot * 0.965) // 보이는 구슬 = 자리의 82%
                        }
                        .frame(width: slot, height: slot)
                        .clipShape(Circle())
                    }
                    .position(x: center.x + radius * cos(rad), y: center.y + radius * sin(rad))
                }
            }
            .frame(width: w, height: h, alignment: .topLeading)
        }
        .containerBackground(widgetBackground, for: .widget)
        .widgetURL(URL(string: "ganzithon21://send"))
    }
}

struct WheelProvider: TimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry { SimpleEntry(date: .now) }
    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> Void) {
        completion(SimpleEntry(date: .now))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<SimpleEntry>) -> Void) {
        completion(Timeline(entries: [SimpleEntry(date: .now)], policy: .never))
    }
}

struct SimpleEntry: TimelineEntry {
    let date: Date
}

struct EmOriWheelWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "EmOriWheelWidget", provider: WheelProvider()) { _ in
            EmOriWheelView()
        }
        .configurationDisplayName("EmOri 감정 휠")
        .description("구슬을 눌러 바로 그 감정을 보내요.")
        .supportedFamilies([.systemLarge])
        .contentMarginsDisabled()
    }
}
