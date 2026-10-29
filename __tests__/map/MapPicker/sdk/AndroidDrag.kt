package expo.modules.gaodemap.managers
import com.amap.api.maps.model.LatLng
fun main() {
 var center=LatLng(31.0,121.0); var starts=0; var ends=0
 val drag=UserDragTracker({center},{starts++},{ends++})
 fun moved(){center=LatLng(center.latitude+1,center.longitude)}
 fun scroll(){drag.onScroll(1f,1f)}
 fun end(){drag.onUp(1f,1f);drag.onMapStable()}
 drag.onMapStable(); check(ends==0)
 drag.beginTouch();scroll();scroll();moved();end();drag.onMapStable();check(starts==1&&ends==1)
 drag.beginTouch();scroll();end();check(ends==1) // no center displacement
 for(i in 1..3){drag.beginTouch();drag.cancel();scroll();moved();end()};check(starts==2&&ends==1) // pinch or cancel
 drag.beginTouch();scroll();moved();drag.cancel();end();check(ends==1) // program success/failure/no-op all invalidate at execution
 drag.beginTouch();scroll();moved();end();check(ends==2) // next real touch survives
 drag.beginTouch();scroll();drag.onMapStable();check(ends==2);moved();end();check(ends==3)
 drag.beginTouch();drag.onDoubleTap(0f,0f);scroll();moved();end();check(ends==3)
 drag.beginTouch();scroll();drag.dispose();moved();end();drag.beginTouch();scroll();end();check(ends==3)
 println("Android actual UserDragTracker: PASS")
}
