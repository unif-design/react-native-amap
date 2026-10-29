import com.amap.api.services.core.*
import com.amap.api.services.poisearch.*
import com.amap.api.services.geocoder.*
class Subject {
// ACTUAL_METHODS
  fun run() {
    check(convertPoiResult(null).isEmpty(), "missing response has no invented list or counts")
    val query=PoiSearchV2.Query("", ""); query.pageNum=2; query.pageSize=25
    val missing=PoiResultV2.createPagedResult(query,null,17,null)
    val result=convertPoiResult(missing)
    check(result["pois"]==null,"missing list stays absent")
    check(result["pageNum"]==2,"result page stays one-based")
    check(result["total"]==17 && result["pageCount"]==null,"total comes from response; pageCount not invented")
    val pois=java.util.ArrayList<PoiItemV2?>(); pois.add(PoiItemV2("same", null, "name", null)); pois.add(null); pois.add(PoiItemV2("same",LatLonPoint(0.0,0.0),"", ""))
    val rows=convertPoiResult(PoiResultV2.createPagedResult(query,null,3,pois))["pois"] as List<Map<String,Any?>>
    check(rows.size==3 && rows[1].isEmpty(),"null row retains position")
    check(rows[0]["name"]=="name" && rows[0]["tel"]==null,"name retained, unavailable V2 tel not fabricated")
    check((rows[2]["location"] as Map<String,Any?>)["latitude"]==0.0,"real zero retained")
    val address=RegeocodeAddress(); val reverse=RegeocodeResult(RegeocodeQuery(LatLonPoint(0.0,0.0),0f,GeocodeSearch.AMAP),address)
    address.pois=null; address.aois=null; address.roads=null; address.crossroads=null; address.businessAreas=null
    val data=convertRegeocodeResult(reverse); val component=data["addressComponent"] as Map<String,Any?>
    check(component["streetNumber"]==null && component["businessAreas"]==null,"absent address nested data retained")
    for(key in listOf("pois","aois","roads","roadCrosses")) check(data[key]==null,"missing $key retained")
    val street=StreetNumber(); street.latLonPoint=LatLonPoint(0.0,0.0); address.streetNumber=street
    val streetData=(convertRegeocodeResult(reverse)["addressComponent"] as Map<String,Any?>)["streetNumber"] as Map<String,Any?>
    check((streetData["location"] as Map<String,Any?>)["longitude"]==0.0,"street actual coordinate retained")
    check(streetData["distance"]==0f,"street actual primitive zero retained")
  }
}
var failures=0
fun check(ok:Boolean,message:String) { if(!ok) { failures++; println("FAIL: "+message) } }
fun main() { Subject().run(); if(failures>0) throw IllegalStateException("$failures failures"); println("Android actual serialization methods with vendor models: PASS") }
