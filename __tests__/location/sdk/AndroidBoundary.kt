import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.ConcurrentHashMap

class Promise {
    val resolved = mutableListOf<Any?>()
    val rejected = mutableListOf<String>()
    fun resolve(value: Any?) { resolved.add(value) }
    fun reject(code: String, message: String, cause: Throwable?) { rejected.add(code) }
}
class AMapLocationClientOption {
    var isOnceLocation = false
    var isNeedAddress = true
    var locationMode = 1
    var httpTimeOut = 30000L
    var geoLanguage = "ZH"
    fun setMockEnable(value: Boolean) {}
}
class AMapLocationClient(context: Any) {
    companion object {
        val clients = mutableListOf<AMapLocationClient>()
        var failAt: String? = null
        var syncLocation: AMapLocation? = null
    }
    init { if (failAt == "create") error("create"); clients.add(this) }
    var option: AMapLocationClientOption? = null
    var listener: ((AMapLocation?) -> Unit)? = null
    var starts = 0; var stops = 0; var destroys = 0
    fun setLocationOption(value: AMapLocationClientOption) { if (failAt == "configure") error("configure"); option = value }
    fun setLocationListener(value: (AMapLocation?) -> Unit) { if (failAt == "listen") error("listen"); listener = value }
    fun startLocation() { starts++; if (failAt == "start") error("start"); syncLocation?.let { listener?.invoke(it) } }
    fun stopLocation() { stops++; if (failAt == "stop") error("stop"); listener?.invoke(null) }
    fun onDestroy() { destroys++; if (failAt == "destroy") error("destroy") }
}
class AMapLocation {
    var latitude = 0.0; var longitude = 0.0
    var altitude = 0.0; var accuracy = 0f; var bearing = 0f; var speed = 0f; var time = 10L
    var hasMetadata = false
    var errorCode = 0; var errorInfo = "fixture failure"
    val address = "fixture"; val country = ""; val province = ""; val city = ""; val district = ""
    val cityCode = ""; val adCode = ""; val street = ""; val streetNum = ""; val poiName = ""; val aoiName = ""
    val locationDetail = ""; val coordType = "GCJ02"; val buildingId = ""
    val isFromMockProvider = false
    fun hasAltitude() = hasMetadata
    fun hasAccuracy() = hasMetadata
    fun hasBearing() = hasMetadata
    fun hasSpeed() = hasMetadata
}
class LocationManager {
    val appContext = Any()
    val locationOption = AMapLocationClientOption().apply { isNeedAddress = false }
    val locationClient = AMapLocationClient(appContext).apply { setLocationOption(locationOption); startLocation() }
    val mockEnable = false
    private val singleLocationClients = ConcurrentHashMap.newKeySet<AMapLocationClient>()
    // ACTUAL_METHODS
    // BASELINE_ADAPTER
}
fun assertClean(client: AMapLocationClient) { check(client.stops == 1 && client.destroys == 1) { "single resource cleanup must happen once" } }
fun main() {
    val owner = LocationManager()
    val continuous = owner.locationClient
    val addressed = Promise(); val plain = Promise()
    owner.getCurrentLocation(true, addressed)
    val first = AMapLocationClient.clients.last()
    owner.getCurrentLocation(false, plain)
    val second = AMapLocationClient.clients.last()
    check(first !== second && second !== continuous)
    check(first.option?.isNeedAddress == true && second.option?.isNeedAddress == false) { "per-call address must not use shared setting" }
    second.listener!!(AMapLocation())
    first.listener!!(AMapLocation().apply { hasMetadata = true })
    first.listener!!(null)
    check(addressed.resolved.size == 1 && addressed.rejected.isEmpty())
    check(plain.resolved.size == 1 && plain.rejected.isEmpty())
    val missing = plain.resolved.single() as Map<*, *>
    check(listOf("altitude", "accuracy", "heading", "speed").none { missing.containsKey(it) })
    val zero = addressed.resolved.single() as Map<*, *>
    check(zero["altitude"] == 0.0 && zero["accuracy"] == 0f && zero["heading"] == 0f && zero["speed"] == 0f)
    check(zero["latitude"] == 0.0 && zero["longitude"] == 0.0)
    assertClean(first); assertClean(second)
    check(continuous.stops == 0 && continuous.destroys == 0 && continuous.option?.isNeedAddress == false)
    val failed = Promise(); owner.getCurrentLocation(null, failed)
    val third = AMapLocationClient.clients.last(); check(third.option?.isNeedAddress == false)
    third.listener!!(AMapLocation().apply { errorCode = 1 }); third.listener!!(AMapLocation())
    check(failed.rejected.size == 1 && failed.resolved.isEmpty()); assertClean(third)
    for (stage in listOf("create", "configure", "listen", "start")) {
        AMapLocationClient.failAt = stage
        val result = Promise(); val count = AMapLocationClient.clients.size
        owner.getCurrentLocation(true, result)
        check(result.rejected.size == 1 && result.resolved.isEmpty()) { "must settle $stage error" }
        if (AMapLocationClient.clients.size > count) assertClean(AMapLocationClient.clients.last())
    }
    for (stage in listOf("stop", "destroy", null)) {
        AMapLocationClient.failAt = stage
        AMapLocationClient.syncLocation = AMapLocation()
        val result = Promise(); owner.getCurrentLocation(false, result)
        check(result.resolved.size == 1 && result.rejected.isEmpty())
        assertClean(AMapLocationClient.clients.last())
    }
    AMapLocationClient.failAt = null; AMapLocationClient.syncLocation = null
    val raced = Promise(); owner.getCurrentLocation(false, raced)
    val raceClient = AMapLocationClient.clients.last()
    val workers = (1..8).map { Thread { raceClient.listener!!(AMapLocation()) }.also { it.start() } }
    workers.forEach { it.join() }
    check(raced.resolved.size == 1 && raced.rejected.isEmpty()); assertClean(raceClient)
    check(continuous.stops == 0 && continuous.destroys == 0)
    println("Android actual-method boundary: passed concurrency, terminal races, creation/config/listener/start/cleanup exceptions, metadata availability and zero values")
}
