import Foundation
struct CLLocationCoordinate2D { var latitude: Double; var longitude: Double }
class MAMapStatus { var centerCoordinate=CLLocationCoordinate2D(latitude:0,longitude:0); var zoomLevel:CGFloat=0; var rotationDegree:CGFloat=0; var cameraDegree:CGFloat=0 }
class MAMapView {
 var centerCoordinate=CLLocationCoordinate2D(latitude:31,longitude:121); var zoomLevel:CGFloat=12; var rotationDegree:CGFloat=30; var cameraDegree:CGFloat=20
 var minZoomLevel:CGFloat=3; var maxZoomLevel:CGFloat=20
 func setMapStatus(_ s:MAMapStatus,animated:Bool,duration:TimeInterval) { centerCoordinate=s.centerCoordinate;zoomLevel=s.zoomLevel;rotationDegree=s.rotationDegree;cameraDegree=s.cameraDegree }
 func setCenter(_ c:CLLocationCoordinate2D,animated:Bool) { centerCoordinate=c }
 func setZoomLevel(_ z:CGFloat,animated:Bool) { zoomLevel=z }
 func convert(_ p:CGPoint,toCoordinateFrom view:MAMapView)->CLLocationCoordinate2D { centerCoordinate }
}
// ACTUAL_CAMERA
let map=MAMapView(); var programs=0; let camera=CameraManager(mapView:map,onProgrammaticChange:{programs += 1})
var failures=0
func verify(_ ok:Bool,_ label:String){ if !ok { failures += 1; print("FAIL: \(label)") } }
camera.setInitialCameraPosition(["zoom":14.0])
verify(map.centerCoordinate.latitude==31 && map.rotationDegree==30 && map.cameraDegree==20,"initial preserves omitted fields")
try camera.moveCamera(position:["bearing":45.0],duration:0)
verify(map.zoomLevel==14 && map.rotationDegree==45,"move partial camera")
try camera.setCenter(center:["latitude":0,"longitude":0],animated:true)
try camera.setZoomLevel(zoom:17,animated:true)
verify(try camera.getCameraPosition()["zoom"] as? Double == 17,"zoom/read")
verify(programs==4,"initial,move,center,zoom each notify provenance")
do { try camera.moveCamera(position:["zoom":Double.nan],duration:0); verify(false,"invalid camera rejected") } catch {}
verify(programs==5 && map.zoomLevel==17,"failed camera cancels old ownership without movement")
try camera.moveCamera(position:[:],duration:0)
verify(programs==6,"no-op still notifies provenance")
camera.setMaxZoomLevel(18);camera.setMinZoomLevel(5)
verify(programs==8,"zoom limits invalidate provenance")
var releasedMap:MAMapView?=MAMapView();let released=CameraManager(mapView:releasedMap!);releasedMap=nil
do { try released.setZoomLevel(zoom:12,animated:false);verify(false,"missing map rejected") } catch {}
do { _=try released.getCameraPosition();verify(false,"missing read rejected") } catch {}
if failures>0 { fatalError("\(failures) failed") }
print("iOS actual CameraManager: PASS")
