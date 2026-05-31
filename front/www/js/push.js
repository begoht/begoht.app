export async function initPush() {
  if (!window.Capacitor || !window.Capacitor.isNativePlatform()) {
    console.log("🌐 Web: Push desactivado");
    return;
  }

  const { PushNotifications } = await import("@capacitor/push-notifications");

  const perm = await PushNotifications.requestPermissions();
  if (perm.receive !== "granted") {
    console.log("❌ Permiso de notificaciones denegado");
    return;
  }

  await PushNotifications.register();

  PushNotifications.addListener("registration", (token) => {
    console.log("📲 FCM Token:", token.value);
    localStorage.setItem("fcmToken", token.value);
  });

  PushNotifications.addListener("registrationError", (err) => {
    console.error("FCM error:", err);
  });

  PushNotifications.addListener("pushNotificationActionPerformed", (notification) => {
    const viajeId = notification.notification.data?.viajeId;
    if (viajeId) {
      window.location.href = `/motorista/index.html?viaje=${viajeId}`;
    }
  });
}
