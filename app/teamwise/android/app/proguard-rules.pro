# Flutter
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }

# Socket.io
-keep class io.socket.** { *; }
-keepnames class * extends io.socket.client.Socket

# WebRTC
-keep class org.webrtc.** { *; }
-keep class com.cloudwebrtc.webrtc.** { *; }
-keep class io.flutter.embedding.** { *; }
-keep class io.flutter.plugin.** { *; }
-keep class com.google.gson.** { *; }

# Prevent stripping of native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Firebase
-keep class com.google.firebase.** { *; }

# OkHttp
-keep class okhttp3.** { *; }
-keep class okio.** { *; }

# ✅ AUTH CLASSES (CRITICAL!)
-keep class com.teamwise.app.features.auth.** { *; }
-keep class com.teamwise.app.features.auth.data.** { *; }
-keep class com.teamwise.app.features.auth.data.auth_services { *; }
-keep class com.teamwise.app.features.auth.data.models.** { *; }

# ✅ LOGIN RESPONSE MODEL
-keep class * extends com.teamwise.app.features.auth.data.models.login_model { *; }
-keep class com.teamwise.app.features.auth.data.models.login_model$** { *; }

# ✅ SHARED PREFERENCES
-keep class android.content.SharedPreferences { *; }
-keep class * implements android.content.SharedPreferences { *; }

# ✅ SERIALIZATION
-keep class * implements java.io.Serializable { *; }
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# ✅ ENUMS
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# ✅ DATA CLASSES
-keep class com.teamwise.app.**.data.models.** { *; }

# Warnings
-dontwarn io.socket.**
-dontwarn org.webrtc.**
-dontwarn com.google.firebase.**
-dontwarn okhttp3.**