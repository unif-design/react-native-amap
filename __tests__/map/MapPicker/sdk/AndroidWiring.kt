import com.amap.api.maps.model.AMapGestureListener
// ACTUAL_CAMERA_AND_BOUNDARY
// ACTUAL_TRACKER
class MotionEvent(val actionMasked:Int,val pointerCount:Int=1){companion object {const val ACTION_DOWN=0;const val ACTION_UP=1;const val ACTION_POINTER_DOWN=5;const val ACTION_CANCEL=3}}
open class ExpoView {var process:()->Unit={};open fun dispatchTouchEvent(event:MotionEvent):Boolean { process();return true }}
class EventDispatcher {val values=mutableListOf<Map<String,Double>>();operator fun invoke(value:Map<String,Double>){values.add(value)}}
class ExpoGaodeMapView:ExpoView(){
 private lateinit var aMap:AMap
 private lateinit var cameraManager:CameraManager
 val onUserDragStart=EventDispatcher();val onUserDragEnd=EventDispatcher()
 // ACTUAL_TRACKER_PROPERTY
 init {aMap=AMap();cameraManager=CameraManager(aMap,::cancelUserDrag);aMap.setAMapGestureListener(userDrag)}
 // ACTUAL_VIEW_METHODS
 fun moved(){aMap.cameraPosition=CameraPosition(LatLng(aMap.cameraPosition.target.latitude+1,121.0),12f,20f,30f)}
 fun scroll(){aMap.gesture?.onScroll(1f,1f)}
 fun end(){aMap.gesture?.onUp(1f,1f);aMap.gesture?.onMapStable()}
 fun fail(value:Boolean){aMap.fail=value}
}
fun main(){
 val view=ExpoGaodeMapView()
 fun touch(){view.dispatchTouchEvent(MotionEvent(MotionEvent.ACTION_DOWN))}
 touch();view.scroll();view.moved();view.end();check(view.onUserDragEnd.values.size==1)
 touch();view.scroll();view.dispatchTouchEvent(MotionEvent(MotionEvent.ACTION_POINTER_DOWN,2));view.moved();view.end();check(view.onUserDragEnd.values.size==1)
 touch();view.scroll();view.dispatchTouchEvent(MotionEvent(MotionEvent.ACTION_CANCEL));view.moved();view.end();check(view.onUserDragEnd.values.size==1)
 touch();view.scroll();view.moveCamera(mapOf("zoom" to 14),0);view.end();check(view.onUserDragEnd.values.size==1)
 touch();view.scroll();view.fail(true);try{view.moveCamera(mapOf("zoom" to 14),0);error("should throw")}catch(e:IllegalStateException){};view.fail(false);view.moved();view.end();check(view.onUserDragEnd.values.size==1)
 touch();view.scroll();view.moved();view.end();check(view.onUserDragEnd.values.size==2)
 touch();view.scroll();view.moveCamera(emptyMap(),0);view.moved();view.end();check(view.onUserDragEnd.values.size==2)
 touch();view.scroll();view.releaseUserDrag();view.moved();view.end();touch();view.scroll();view.end();check(view.onUserDragEnd.values.size==2)
 println("Android actual View touch + camera + release wiring: PASS")
}
