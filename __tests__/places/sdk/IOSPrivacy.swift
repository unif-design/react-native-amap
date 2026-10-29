import Foundation
enum AMapPrivacyShowStatus { case didShow, notShow }
enum AMapPrivacyInfoStatus { case didContain, notContain }
enum AMapPrivacyAgreeStatus { case didAgree, notAgree }
class Vendor {
  static func updatePrivacyShow(_ show: AMapPrivacyShowStatus, privacyInfo: AMapPrivacyInfoStatus) {}
  static func updatePrivacyAgree(_ agree: AMapPrivacyAgreeStatus) {}
}
typealias MAMapView = Vendor
typealias AMapLocationManager = Vendor
class AMapSearchAPI {
  static var show = AMapPrivacyShowStatus.notShow; static var info = AMapPrivacyInfoStatus.notContain; static var agree = AMapPrivacyAgreeStatus.notAgree
  static func updatePrivacyShow(_ value: AMapPrivacyShowStatus, privacyInfo: AMapPrivacyInfoStatus) { show=value; info=privacyInfo }
  static func updatePrivacyAgree(_ value: AMapPrivacyAgreeStatus) { agree=value }
}
class AMapServices { static let instance=AMapServices(); static func shared() -> AMapServices { instance }; var apiKey: String?; var enableHTTPS=false }
enum GaodeMapPrivacyManager {
  static var hasShow=false, hasContainsPrivacy=false, hasAgree=false
  static var isReady: Bool { hasShow && hasContainsPrivacy && hasAgree }
// PRIVACY_METHOD
}
class Search {
// KEY_METHOD
  func initialize() throws { try ensureAPIKeyIsSet() }
}
var failures=0
func check(_ ok: Bool, _ message: String) { if !ok { failures += 1; print("FAIL: \(message)") } }
AMapServices.shared().apiKey="fixture-only"
let search=Search()
var blocked=false; do { try search.initialize() } catch { blocked=true }
check(blocked,"search blocked before actual consent")
GaodeMapPrivacyManager.hasShow=true; GaodeMapPrivacyManager.hasAgree=true
GaodeMapPrivacyManager.applyPrivacyState()
check(AMapSearchAPI.show == .didShow && AMapSearchAPI.info == .notContain && AMapSearchAPI.agree == .didAgree,"partial privacy actual values synchronized")
GaodeMapPrivacyManager.hasContainsPrivacy=true
GaodeMapPrivacyManager.applyPrivacyState()
do { try search.initialize() } catch { check(false,"configured key after consent") }
check(AMapServices.shared().apiKey=="fixture-only","shared configured key retained")
GaodeMapPrivacyManager.hasAgree=false; GaodeMapPrivacyManager.applyPrivacyState()
check(AMapSearchAPI.agree == .notAgree,"revocation synchronized")
blocked=false; do { try search.initialize() } catch { blocked=true }
check(blocked,"search after revocation blocked")
if failures>0 { exit(1) }
print("iOS actual privacy and key guard methods: PASS")
