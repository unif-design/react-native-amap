import Foundation

typealias CLLocationAccuracy = Double
let kCLLocationAccuracyBestForNavigation = -2.0
let kCLLocationAccuracyBest = -1.0
let kCLLocationAccuracyNearestTenMeters = 10.0
let kCLLocationAccuracyHundredMeters = 100.0
let kCLLocationAccuracyKilometer = 1000.0
let kCLLocationAccuracyThreeKilometers = 3000.0
struct CLLocationCoordinate2D { var latitude: Double; var longitude: Double }
struct SourceInformation { var isSimulatedBySoftware = false; var isProducedByAccessory = false }
class CLLocation {
    var coordinate = CLLocationCoordinate2D(latitude: 0, longitude: 0)
    var horizontalAccuracy = -1.0; var verticalAccuracy = -1.0
    var altitude = 0.0; var course = -1.0; var speed = -1.0
    var timestamp = Date(timeIntervalSince1970: 100)
    var sourceInformation: SourceInformation? = nil
}
class AMapLocationReGeocode {
    var formattedAddress: String? = "fixture"
    var province: String?; var city: String?; var district: String?; var street: String?; var number: String?
    var country: String?; var citycode: String?; var adcode: String?
}
class CLHeading { var magneticHeading = 0.0; var trueHeading = 0.0; var headingAccuracy = 0.0; var x = 0.0; var y = 0.0; var z = 0.0; var timestamp = Date() }
protocol AMapLocationManagerDelegate: AnyObject {}
class WeakManager { weak var value: AMapLocationManager?; init(_ value: AMapLocationManager) { self.value = value } }
class AMapLocationManager {
    enum AccuracyMode { case reduceAccuracy }
    static var instances: [WeakManager] = []
    static var refuseStart = false
    static var completeSynchronously = false
    weak var delegate: AMapLocationManagerDelegate?
    var locationAccuracyMode: AccuracyMode = .reduceAccuracy
    var desiredAccuracy = 0.0; var distanceFilter = 0.0
    var locationTimeout = 0; var reGeocodeTimeout = 0
    var locatingWithReGeocode = true
    var pausesLocationUpdatesAutomatically = false; var allowsBackgroundLocationUpdates = false
    var detectRiskOfFakeLocation = false
    var requestedAddress: Bool?; var running = false; var stops = 0
    var callback: ((CLLocation?, AMapLocationReGeocode?, Error?) -> Void)?
    init() { precondition(Thread.isMainThread); Self.instances.append(WeakManager(self)) }
    func setValue(_ value: Any?, forKey: String) {}
    func requestLocation(withReGeocode: Bool, completionBlock: @escaping (CLLocation?, AMapLocationReGeocode?, Error?) -> Void) -> Bool {
        precondition(Thread.isMainThread)
        requestedAddress = withReGeocode; callback = completionBlock
        if Self.completeSynchronously { completionBlock(CLLocation(), nil, nil) }
        return !running && !Self.refuseStart
    }
    func startUpdatingLocation() { running = true }
    func stopUpdatingLocation() { precondition(Thread.isMainThread); stops += 1; running = false; callback?(nil, nil, NSError(domain: "reentrant stop", code: 1)); callback = nil }
    func startUpdatingHeading() {}
    func stopUpdatingHeading() {}
}
class GaodeMapPrivacyManager { static var isReady = true; static func applyPrivacyState() {} }
struct Logger { func warn(_ message: String) {} }; let log = Logger()
enum AMapCoordinateType { case GPS, mapBar, baidu, mapABC }
func AMapCoordinateConvert(_ c: CLLocationCoordinate2D, _ type: AMapCoordinateType) -> CLLocationCoordinate2D { c }
class Promise { func reject(_ code: String, _ message: String) {}; func resolve(_ value: Any) {} }
class Exception: Error { var code: String { "ERR" }; var reason: String { "" } }

var coordinateHasAmapCoverage = true
func AMapLocationDataAvailableForCoordinate(_ coordinate: CLLocationCoordinate2D) -> Bool { coordinateHasAmapCoverage }

// ACTUAL_CLASS
// BASELINE_ADAPTER

func require(_ value: @autoclosure () -> Bool, _ message: String) { precondition(value(), message) }
let owner = LocationManager()
let coveredLocation = CLLocation()
coveredLocation.coordinate = CLLocationCoordinate2D(latitude: 31.2, longitude: 121.3)
require(owner.formatLocation(coveredLocation, reGeocode: nil)["coordType"] as? String == "GCJ02", "AMap-covered iOS sample must identify its documented coordinate system")
coordinateHasAmapCoverage = false
require(owner.formatLocation(coveredLocation, reGeocode: nil)["coordType"] == nil, "do not infer the coordinate system outside verified native coverage")
coordinateHasAmapCoverage = true
owner.setLocatingWithReGeocode(false); owner.setLocationTimeout(17); owner.setReGeocodeTimeout(6)
owner.start()
let continuous = owner.locationManager!
continuous.detectRiskOfFakeLocation = true
var firstResult: CLLocation?; var secondResult: CLLocation?; var firstCalls = 0; var secondCalls = 0
owner.requestSingleLocation(includeAddress: true) { location, _, error in firstCalls += 1; require(error == nil, "first failed"); firstResult = location }
weak var first = AMapLocationManager.instances.last?.value
owner.requestSingleLocation(includeAddress: false) { location, _, error in secondCalls += 1; require(error == nil, "second failed"); secondResult = location }
weak var second = AMapLocationManager.instances.last?.value
require(first !== second && first !== continuous && second !== continuous, "single requests need independent retained managers")
require(first?.requestedAddress == true && second?.requestedAddress == false, "address belongs to request")
require(first?.locationTimeout == 17 && first?.reGeocodeTimeout == 6, "copy timeout configuration")
require(first?.detectRiskOfFakeLocation == true, "copy simulated-location detection configuration")
let firstCallback = first!.callback!; let secondCallback = second!.callback!
let a = CLLocation(); let b = CLLocation()
secondCallback(b, nil, nil); firstCallback(a, AMapLocationReGeocode(), nil)
firstCallback(nil, nil, NSError(domain: "late", code: 1)); secondCallback(a, nil, nil)
require(firstCalls == 1 && secondCalls == 1 && firstResult === a && secondResult === b, "terminal isolation")
require(first == nil && second == nil, "managers released at terminal")
require(continuous.running && continuous.stops == 0 && !continuous.locatingWithReGeocode, "continuous resource untouched")
var refusedCalls = 0
AMapLocationManager.refuseStart = true
owner.requestSingleLocation(includeAddress: false) { location, _, error in refusedCalls += 1; require(location == nil && error != nil, "false start must fail") }
require(refusedCalls == 1 && AMapLocationManager.instances.last?.value == nil, "false start settles/releases")
// A synchronous successful callback wins even if the API subsequently returns false.
AMapLocationManager.completeSynchronously = true
var syncCalls = 0
owner.requestSingleLocation(includeAddress: true) { location, _, error in syncCalls += 1; require(location != nil && error == nil, "first terminal wins") }
require(syncCalls == 1 && AMapLocationManager.instances.last?.value == nil, "sync callback releases once")
AMapLocationManager.completeSynchronously = false; AMapLocationManager.refuseStart = false
var errorCalls = 0
owner.requestSingleLocation(includeAddress: nil) { _, _, error in errorCalls += 1; require(error != nil, "native error preserved") }
weak var failed = AMapLocationManager.instances.last?.value
require(failed?.requestedAddress == false, "legacy copies shared address default")
failed?.callback?(nil, nil, NSError(domain: "fixture", code: 1))
require(failed == nil && errorCalls == 1, "error releases manager")
var events: [[String: Any]] = []
owner.setInterval(0); owner.onLocationUpdate = { events.append($0) }
let missing = CLLocation()
owner.amapLocationManager(continuous, didUpdate: missing, reGeocode: nil)
let zero = CLLocation(); zero.horizontalAccuracy = 0; zero.verticalAccuracy = 0; zero.course = 0; zero.speed = 0
owner.amapLocationManager(continuous, didUpdate: zero, reGeocode: nil)
require(events.count == 2, "continuous samples")
require(events[0]["altitude"] == nil && events[0]["accuracy"] == nil, "invalid accuracy means unavailable")
require(events[0]["heading"] == nil && events[0]["bearing"] == nil && events[0]["speed"] == nil, "negative course and speed remain unavailable")
require(events[1]["altitude"] as? Double == 0 && events[1]["accuracy"] as? Double == 0, "valid zero metadata preserved")
require(events[1]["heading"] as? Double == 0 && events[1]["bearing"] as? Double == 0 && events[1]["speed"] as? Double == 0, "valid zero course and speed preserved")
require(events[0]["isSimulatedBySoftware"] == nil, "missing source does not become false")
// Background request and completion both marshal through the main queue.
var backgroundDone = false
DispatchQueue.global().async {
    owner.requestSingleLocation(includeAddress: true) { location, _, _ in
        require(Thread.isMainThread && location != nil, "main-queue settlement")
        backgroundDone = true
    }
}
let timeout = Date(timeIntervalSinceNow: 3)
while AMapLocationManager.instances.last?.value == nil && Date() < timeout { RunLoop.main.run(until: Date(timeIntervalSinceNow: 0.01)) }
let callback = AMapLocationManager.instances.last!.value!.callback!
DispatchQueue.global().async { callback(CLLocation(), nil, nil) }
while !backgroundDone && Date() < timeout { RunLoop.main.run(until: Date(timeIntervalSinceNow: 0.01)) }
require(backgroundDone && AMapLocationManager.instances.last?.value == nil, "background completion releases resource")
GaodeMapPrivacyManager.isReady = false
var privacyCalls = 0
owner.requestSingleLocation(includeAddress: false) { _, _, error in privacyCalls += 1; require(error != nil, "privacy error") }
require(privacyCalls == 1, "privacy not bypassed by cached continuous manager")
let nativeError = NSError(domain: "AMapFixture", code: 42, userInfo: [NSLocalizedDescriptionKey: "fixture failure"])
let bridgeError = LocationRequestException(nativeError)
require(bridgeError.code == "LOCATION_ERROR" && bridgeError.reason.contains("AMapFixture:42") && bridgeError.reason.contains("fixture failure"), "native error details cross the Expo boundary")
print("iOS actual-class boundary: passed independent managers, lifetime, rejected start, sync/duplicate/reentrant/background callbacks, metadata availability")
