data class LatLng(val latitude: Double, val longitude: Double)
class CameraPosition(val target: LatLng, val zoom: Float, val tilt: Float, val bearing: Float) {
  class Builder(val old: CameraPosition = CameraPosition(LatLng(0.0,0.0),0f,0f,0f)) {
    var target=old.target; var zoom=old.zoom; var tilt=old.tilt; var bearing=old.bearing
    fun target(value: LatLng)=apply { target=value }; fun zoom(value: Float)=apply { zoom=value }; fun tilt(value: Float)=apply { tilt=value }; fun bearing(value: Float)=apply { bearing=value }
    fun build()=CameraPosition(target,zoom,tilt,bearing)
  }
}
class CameraUpdate(val position: CameraPosition?=null,val center: LatLng?=null,val zoom: Float?=null)
object CameraUpdateFactory {
 fun newCameraPosition(p:CameraPosition)=CameraUpdate(position=p)
 fun newLatLng(p:LatLng)=CameraUpdate(center=p)
 fun zoomTo(z:Float)=CameraUpdate(zoom=z)
}
class Point(val x:Int,val y:Int)
class Projection { fun fromScreenLocation(p:Point)=LatLng(p.x.toDouble(),p.y.toDouble()) }
class AMap {
 var cameraPosition=CameraPosition(LatLng(31.0,121.0),12f,20f,30f)
 var maxZoomLevel=20f; var minZoomLevel=3f; val projection=Projection(); var fail=false; var calls=0
 fun apply(u:CameraUpdate) { calls++; if(fail) throw IllegalStateException("native failure"); val p=cameraPosition; cameraPosition=u.position?:CameraPosition(u.center?:p.target,u.zoom?:p.zoom,p.tilt,p.bearing) }
 fun moveCamera(u:CameraUpdate)=apply(u)
 fun animateCamera(u:CameraUpdate)=apply(u)
 fun animateCamera(u:CameraUpdate,d:Long,c:Any?)=apply(u)
}
object Looper { fun getMainLooper()=Unit }
class Handler(looper:Unit) { fun post(block:()->Unit) { pending.add(block) }; companion object { val pending=mutableListOf<()->Unit>() } }
// ACTUAL_CAMERA
fun main() {
 var failures=0; fun verify(ok:Boolean,label:String) { if(!ok) { failures++; println("FAIL: $label") } }
 fun flush(){ val tasks=Handler.pending.toList(); Handler.pending.clear(); tasks.forEach { it() } }
 val map=AMap(); var programs=0; val camera=CameraManager(map){ programs++ }
 camera.setInitialCameraPosition(mapOf("zoom" to 14)); flush(); verify(map.cameraPosition.zoom==14f,"initial zoom without target")
 camera.moveCamera(mapOf("zoom" to 16),0); flush(); verify(map.cameraPosition.zoom==16f,"partial zoom without target")
 camera.moveCamera(mapOf("target" to mapOf("latitude" to 0.0,"longitude" to 0.0)),0); flush()
 verify(map.cameraPosition.zoom==16f && map.cameraPosition.tilt==20f && map.cameraPosition.bearing==30f,"target preserves omitted fields")
 camera.setInitialCameraPosition(mapOf("bearing" to 45)); flush(); verify(map.cameraPosition.bearing==45f && map.cameraPosition.zoom==16f,"initial omitted fields preserve")
 camera.setCenter(mapOf("latitude" to 1.0,"longitude" to 2.0),true); camera.setZoomLevel(17f,true); flush()
 verify(camera.getCameraPosition()["zoom"]==17f,"public zoom/read")
 map.fail=true
 var rejected=false; try { camera.moveCamera(mapOf("zoom" to 18),0) } catch(e:Exception) { rejected=true }
 verify(rejected,"execution failure reaches caller before return")
 Handler.pending.clear()
 verify(programs==7,"all executed camera operations notify provenance, including failures")
 map.fail=false
 val before=map.cameraPosition
 try { camera.moveCamera(mapOf("target" to mapOf("latitude" to Double.NaN,"longitude" to 0.0)),0); verify(false,"invalid target rejected") } catch(e:IllegalArgumentException) {}
 verify(map.cameraPosition===before,"invalid input preserves camera")
 camera.moveCamera(emptyMap(),0);verify(programs==9,"no-op also invalidates provenance")
 camera.setMaxZoomLevel(18f);camera.setMinZoomLevel(5f);verify(programs==11,"zoom limits invalidate provenance")
 if(failures>0) throw IllegalStateException("$failures failed")
 println("Android actual CameraManager: PASS")
}
