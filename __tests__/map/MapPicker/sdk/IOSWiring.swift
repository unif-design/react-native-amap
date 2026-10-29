import Foundation
class UITouch: Hashable {
 var tapCount=1
 static func ==(a:UITouch,b:UITouch)->Bool { a === b }
 func hash(into hasher:inout Hasher){hasher.combine(ObjectIdentifier(self))}
}
class UIEvent {}
class UIGestureRecognizer {
 enum State {case possible,failed}
 var state=State.possible
 func touchesBegan(_ touches:Set<UITouch>,with event:UIEvent){}
 func touchesMoved(_ touches:Set<UITouch>,with event:UIEvent){}
 func touchesEnded(_ touches:Set<UITouch>,with event:UIEvent){}
 func touchesCancelled(_ touches:Set<UITouch>,with event:UIEvent){}
 func reset(){}
 func canPrevent(_ other:UIGestureRecognizer)->Bool{true}
 func canBePrevented(by other:UIGestureRecognizer)->Bool{true}
}
// ACTUAL_TRACKER
// ACTUAL_OBSERVER
class MAMapView {var centerCoordinate=(latitude:31.0,longitude:121.0)}
class EventDispatcher { var values=[[String:Double]]();func callAsFunction(_ value:[String:Double]){values.append(value)} }
class Delegate {
 let userDrag=UserDragTracker();let onUserDragStart=EventDispatcher();let onUserDragEnd=EventDispatcher()
 // ACTUAL_DELEGATES
}
let view=Delegate(),map=MAMapView(),observer=DragTouchObserver(),event=UIEvent()
observer.onBegin={view.userDrag.beginTouch()};observer.onCancel={view.userDrag.cancel()}
let first=UITouch(),second=UITouch()
func will(){view.mapView(map,mapWillMoveByUser:true)}
func did(){view.mapView(map,mapDidMoveByUser:true)}
observer.touchesBegan([first],with:event);will();will();map.centerCoordinate.latitude=32
observer.touchesEnded([first],with:event);did();did()
assert(view.onUserDragStart.values.count==1 && view.onUserDragEnd.values.count==1)
observer.touchesBegan([first],with:event);will();observer.touchesCancelled([first],with:event);map.centerCoordinate.latitude=33;did()
assert(view.onUserDragEnd.values.count==1)
for _ in 1...3 {
 observer.touchesBegan([first],with:event);observer.touchesBegan([second],with:event)
 view.mapView(map,mapWillZoomByUser:true);will();map.centerCoordinate.latitude += 1
 observer.touchesEnded([first,second],with:event);view.mapView(map,mapDidZoomByUser:true);did()
}
assert(view.onUserDragStart.values.count==2 && view.onUserDragEnd.values.count==1)
observer.touchesBegan([first],with:event);will();map.centerCoordinate.latitude += 1;observer.touchesEnded([first],with:event);did()
assert(view.onUserDragEnd.values.count==2)
observer.touchesBegan([first],with:event);view.mapView(map,mapWillMoveByUser:false);will();did();observer.touchesEnded([first],with:event)
assert(view.onUserDragEnd.values.count==2)
first.tapCount=2;observer.touchesBegan([first],with:event);will();did();observer.touchesEnded([first],with:event)
assert(view.onUserDragStart.values.count==3)
assert(!observer.canPrevent(UIGestureRecognizer()) && !observer.canBePrevented(by:UIGestureRecognizer()))
// A real new drag supersedes the old program zoom, even before its completion.
do {
 let view=Delegate(),map=MAMapView(),observer=DragTouchObserver(),touch=UITouch()
 observer.onBegin={view.userDrag.beginTouch()};observer.onCancel={view.userDrag.cancel()}
 view.mapView(map,mapWillZoomByUser:false)
 observer.touchesBegan([touch],with:event)
 view.mapView(map,mapWillMoveByUser:true)
 view.mapView(map,mapWillMoveByUser:true)
 map.centerCoordinate.latitude += 1
 view.mapView(map,mapDidZoomByUser:false)
 observer.touchesEnded([touch],with:event)
 view.mapView(map,mapDidMoveByUser:true)
 view.mapView(map,mapDidMoveByUser:true)
 print("program_zoom_then_new_drag: starts=\(view.onUserDragStart.values.count) ends=\(view.onUserDragEnd.values.count)")
 assert(view.onUserDragStart.values.count==1 && view.onUserDragEnd.values.count==1)
}
// An old program completion cannot release a new real pinch's suppression.
do {
 let view=Delegate(),map=MAMapView(),observer=DragTouchObserver()
 observer.onBegin={view.userDrag.beginTouch()};observer.onCancel={view.userDrag.cancel()}
 view.mapView(map,mapWillZoomByUser:false)
 for _ in 1...3 {
  let first=UITouch(),second=UITouch()
  observer.touchesBegan([first],with:event)
  observer.touchesBegan([second],with:event)
  view.mapView(map,mapWillZoomByUser:true)
  view.mapView(map,mapDidZoomByUser:false)
  view.mapView(map,mapWillMoveByUser:true)
  map.centerCoordinate.latitude += 1
  view.mapView(map,mapDidMoveByUser:true)
  observer.touchesEnded([first,second],with:event)
  view.mapView(map,mapDidZoomByUser:true)
 }
 assert(view.onUserDragStart.values.isEmpty && view.onUserDragEnd.values.isEmpty)
 let next=UITouch();observer.touchesBegan([next],with:event)
 view.mapView(map,mapWillMoveByUser:true);map.centerCoordinate.latitude += 1
 observer.touchesEnded([next],with:event);view.mapView(map,mapDidMoveByUser:true)
 assert(view.onUserDragStart.values.count==1 && view.onUserDragEnd.values.count==1)
}
print("iOS actual touch observer + View delegates: PASS")
