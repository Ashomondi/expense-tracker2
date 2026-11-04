# Spendly Mobile Companion App (M-Pesa SMS Ingestion)

A Flutter companion app for Spendly that automates personal expense tracking via M-Pesa SMS ingestion on Android devices.

---

## Key Features

1. **Option 1: Native Android SMS Scanner**
   - Automatically reads incoming and historical M-Pesa messages directly from the user's SMS inbox (`content://sms/inbox`).
   - Uses strict sender filtering (`address LIKE '%MPESA%'`) to guarantee user privacy. Personal text messages are never accessed or uploaded.
   - Transparent consent dialog compliant with Kenya's Data Protection Act (2019).

2. **Smart Batch Sync Engine**
   - Transmits batches of raw M-Pesa SMS to the Spendly Go backend (`POST /api/integrations/mpesa/import`).
   - Automatic SHA-256 fingerprint deduplication prevents duplicate expenses.
   - Categorizes PayBills, Till payments, transfers, and airtime purchases.

3. **Live Sync Dashboard**
   - Displays real-time metrics: Imported, Duplicates Avoided, Skipped, and Failed.
   - Transaction feed with one-tap "+ Track as Expense" logging.

---

## Building the APK

### Prerequisites
- Flutter SDK (3.24+ recommended)
- Android SDK 34+
- Java 17 or 21 OpenJDK

### Run Debug / Test
```bash
flutter test
flutter run
```

### Build APK
```bash
# Debug APK
flutter build apk --debug

# Release APK
flutter build apk --release
```

The compiled APK will be located at:
`build/app/outputs/flutter-apk/app-debug.apk` (or `app-release.apk`)

---

## Server Connection
By default, the companion app connects to `http://10.0.2.2:8080` (for Android emulators).
To connect to a physical device on your local Wi-Fi, tap the **Settings icon (⚙️)** in the top right of the dashboard and enter your host machine's IP (e.g. `http://192.168.1.100:8080`).
