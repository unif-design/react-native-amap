import Foundation
// ACTUAL_TRACKER
let drag=UserDragTracker()
func start(_ byUser:Bool=true)->Bool { drag.willMove(byUser:byUser,latitude:31,longitude:121) }
func end(_ byUser:Bool=true,_ lat:Double=32)->Bool { drag.didMove(byUser:byUser,latitude:lat,longitude:121) }
assert(!end());drag.beginTouch();assert(start());assert(!start());assert(end());assert(!end())
drag.beginTouch();assert(start());assert(!end(true,31))
for _ in 1...3 { drag.beginTouch();drag.willZoom(byUser:true);assert(!start());drag.didZoom(byUser:true);assert(!start());assert(!end()) }
drag.beginTouch();assert(start());drag.cancel();assert(!end());assert(!start())
drag.beginTouch();assert(start());assert(end())
drag.beginTouch();assert(!start(false));assert(!end(false))
drag.beginTouch();assert(start());drag.setActive(false);assert(!end());drag.beginTouch();assert(!start());drag.setActive(true);drag.beginTouch();assert(start());assert(end())
drag.beginTouch();assert(start());assert(!end(false));assert(end()) // late program animation completion cannot clear a newer real drag
// Program zoom must not retain ownership across a new real touch.
drag.willZoom(byUser:false)
drag.beginTouch();assert(start());assert(!start())
drag.didZoom(byUser:false);assert(end());assert(!end())
// The new touch supersedes any old user-zoom state too.
drag.beginTouch();drag.willZoom(byUser:true);drag.beginTouch();assert(start())
drag.didZoom(byUser:true);assert(end())
// Late program completion cannot release the current real zoom's suppression.
for _ in 1...3 {
 drag.willZoom(byUser:false);drag.beginTouch();drag.willZoom(byUser:true)
 drag.didZoom(byUser:false);assert(!start());assert(!end())
 drag.didZoom(byUser:true);assert(!start());assert(!end())
}
drag.beginTouch();assert(start());assert(end())
print("iOS actual UserDragTracker: PASS")
