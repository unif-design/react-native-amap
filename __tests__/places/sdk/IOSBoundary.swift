import Foundation
class AMapGeoPoint: NSObject { var latitude: Double = 0; var longitude: Double = 0 }
class Model: NSObject {
  var uid, name, address, typecode, type, tel, city, citycode, province, district, adcode, businessArea, parkingType, website, email, postcode, title, url, floorName, pid, openTime, alias, tag, opentimeWeek, opentimeToday, formattedAddress, street, number, direction, township, neighborhood, building, country, countryCode, towncode, firstId, firstName, secondId, secondName: String?
  var location: AMapGeoPoint?
  var distance: Int = 0; var floor: Int = 0; var area: Float = 0; var hasIndoorMap = false
  var images: [Model]?; var indoorData: Model?; var extensionInfo: Extension?; var businessData: Business?
  var regeocode, addressComponent, streetNumber: Model?
  var businessAreas, pois, aois, roads, roadinters: [Model]?
  var count = 0
}
class Extension { var rating: Float = 0; var cost: Float = 0; var openTime: String? }
class Business { var alias, tag, rating, cost, opentimeWeek, opentimeToday, tel, parkingType, businessArea: String? }
typealias AMapPOI = Model
typealias AMapImage = Model
typealias AMapBusinessArea = Model
typealias AMapAOI = Model
typealias AMapRoad = Model
typealias AMapRoadInter = Model
typealias AMapPOISearchResponse = Model
typealias AMapReGeocodeSearchResponse = Model
class AMapPOISearchBaseRequest { var page = 1; var offset = 20 }
class AMapPOIIDSearchRequest: AMapPOISearchBaseRequest {}
class Subject {
// ACTUAL_METHODS
  func run() {
    let empty = AMapPOI()
    let data = convertPOI(empty)
    check(data["location"] == nil, "nil POI location must not become zero")
    check(data["id"] == nil && data["name"] == nil && data["address"] == nil, "nil strings stay absent")
    check(data["distance"] as? Int == 0, "native primitive zero is real")
    empty.name = ""; empty.location = AMapGeoPoint()
    let zero = convertPOI(empty)
    check(zero["name"] as? String == "", "empty string retained")
    check((zero["location"] as? [String: Any])?["latitude"] as? Double == 0, "zero latitude retained")
    let page = AMapPOISearchResponse(); let request = AMapPOISearchBaseRequest(); request.page = 2
    let absent = convertPOISearchResponse(page, request: request) as! [String: Any]
    check(absent["pois"] == nil, "missing list is not empty list")
    page.pois = []
    check((convertPOISearchResponse(page, request: request) as! [String: Any])["pois"] as? [[String: Any]] != nil, "empty list preserved")
    check((convertPOISearchResponse(page, request: AMapPOIIDSearchRequest()) as! [String: Any]).isEmpty, "empty ID success remains empty success")
    let response = AMapReGeocodeSearchResponse(); response.regeocode = Model()
    check(convertReGeocodeResponse(response).isEmpty, "empty reverse result stays empty")
    let address = Model(); response.regeocode!.addressComponent = address
    let component = convertReGeocodeResponse(response)["addressComponent"] as! [String: Any]
    check(component["streetNumber"] == nil && component["businessAreas"] == nil && component["province"] == nil, "address missing fields retained")
    let row = Model(); row.name = "named"; address.businessAreas = [row]
    response.regeocode!.pois = [row]; response.regeocode!.aois = [row]; response.regeocode!.roads = [row]; response.regeocode!.roadinters = [row]
    let result = convertReGeocodeResponse(response)
    for key in ["pois", "aois", "roads", "roadCrosses"] {
      let rows = result[key] as! [[String: Any]]
      check(rows.count == 1 && rows[0]["location"] == nil, "missing location in \(key)")
    }
    row.location = AMapGeoPoint(); address.streetNumber = row
    let street = (convertReGeocodeResponse(response)["addressComponent"] as! [String: Any])["streetNumber"] as! [String: Any]
    check((street["location"] as? [String: Any])?["longitude"] as? Double == 0, "street location retained")
    check(street["distance"] as? Int == 0, "street primitive distance zero retained")
    // Added helper path consumes raw Foundation rows, so malformed records retain positions.
    let rawRows = records(NSArray(array: [row, NSNull(), row]), as: AMapPOI.self, convert: convertPOI)!
    check(rawRows.count == 3 && rawRows[1].isEmpty, "malformed row and duplicate records retained")
    let businessPoi = AMapPOI(); businessPoi.extensionInfo = Extension(); businessPoi.extensionInfo!.openTime = ""
    businessPoi.businessData = Business(); businessPoi.businessData!.rating = "4.5"; businessPoi.businessData!.cost = "9"; businessPoi.businessData!.opentimeWeek = "other"
    let business = convertPOI(businessPoi)["business"] as! [String: Any]
    check(business["rating"] as? String == "0.0" && business["cost"] as? String == "0.0", "primitive zero metadata is retained")
    check(business["opentime"] as? String == "", "provided empty metadata is retained")
    if failures == 0 { print("iOS actual serialization methods: PASS") }
  }
}
var failures = 0
func check(_ ok: Bool, _ message: String) { if !ok { failures += 1; print("FAIL: \(message)") } }
Subject().run()
if failures > 0 { exit(1) }
