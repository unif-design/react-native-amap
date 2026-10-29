class Context {
  val applicationContext: Context get() = this
  val packageName = "test"; val packageManager = PackageManager()
}
class PackageManager {
  companion object { const val GET_META_DATA = 128 }
  var key: String? = null; var reads = 0
  fun getApplicationInfo(name: String, flags: Int): AppInfo { reads++; return AppInfo(key) }
}
class AppInfo(key: String?) { val metaData = Metadata(key) }
class Metadata(val key: String?) { fun getString(name: String) = key }
class CodedException(code: String, message: String, cause: Throwable?): Exception(message)
object Log { fun w(tag: String, message: String) {} }
object MapsInitializer { fun updatePrivacyShow(c:Context,s:Boolean,i:Boolean) {}; fun updatePrivacyAgree(c:Context,a:Boolean) {}; fun setApiKey(k:String) {} }
object AMapLocationClient { fun updatePrivacyShow(c:Context,s:Boolean,i:Boolean) {}; fun updatePrivacyAgree(c:Context,a:Boolean) {}; fun setApiKey(k:String) {} }
object ServiceSettings {
  var appliedKey: String? = null; var shown = false; var contains = false; var agreed = false
  fun getInstance() = this; fun setApiKey(k:String) { appliedKey = k }
  fun updatePrivacyShow(c:Context,s:Boolean,i:Boolean) { shown=s; contains=i }
  fun updatePrivacyAgree(c:Context,a:Boolean) { agreed=a }
}
object SDKInitializer {
  var privacyShown=false; var privacyContains=false; var privacyAgreed=false
  private var configuredAPIKey: String? = null
  fun resolveContext(c:Context)=c
  fun restorePersistedState(c:Context) {}
  fun isPrivacyReady()=privacyShown && privacyContains && privacyAgreed
// INITIALIZER_METHODS
}
class Search(val context: Context) {
// SEARCH_METHOD
  fun initialize() = ensureAPIKeyIsSet()
}
fun main() {
  var failures=0
  fun check(ok:Boolean,message:String) { if(!ok) { failures++; println("FAIL: "+message) } }
  val context=Context(); val search=Search(context)
  SDKInitializer.applyPrivacyState(context)
  check(!ServiceSettings.agreed,"no default consent")
  context.packageManager.key="manifest-fixture"
  var blocked=false; try { search.initialize() } catch(e:Exception) { blocked=true }
  check(blocked && ServiceSettings.appliedKey==null,"search is blocked before consent/key mutation")
  SDKInitializer.privacyShown=true; SDKInitializer.privacyContains=false; SDKInitializer.privacyAgreed=true
  SDKInitializer.applyPrivacyState(context)
  check(ServiceSettings.shown && !ServiceSettings.contains && ServiceSettings.agreed,"actual partial privacy values synchronized")
  SDKInitializer.privacyContains=true
  SDKInitializer.applyPrivacyState(context)
  check(ServiceSettings.contains,"privacy ready propagated")
  search.initialize(); check(ServiceSettings.appliedKey=="manifest-fixture","plugin path remains")
  SDKInitializer.initSDK(context,"explicit-fixture")
  context.packageManager.key=null
  val reads=context.packageManager.reads
  try { search.initialize() } catch(e:Exception) { println("Observed: "+e.message) }
  check(ServiceSettings.appliedKey=="explicit-fixture" && context.packageManager.reads==reads,"explicit init key used without manifest")
  context.packageManager.key="other-manifest"
  search.initialize()
  check(ServiceSettings.appliedKey=="explicit-fixture","explicit key wins")
  SDKInitializer.privacyAgreed=false; SDKInitializer.applyPrivacyState(context)
  check(!ServiceSettings.agreed,"revocation synchronized")
  blocked=false; try { search.initialize() } catch(e:Exception) { blocked=true }
  check(blocked,"query after revocation rejected")
  if(failures>0) throw IllegalStateException("$failures failures")
  println("Android actual initializer/key guard methods: PASS")
}
