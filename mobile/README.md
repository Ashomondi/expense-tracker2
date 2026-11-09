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

## Building & Installing the APK

### Prerequisites
- Flutter SDK (3.24+ recommended)
- Android SDK (API 34+)
- OpenJDK 17 or 21

### 1. Build Commands
Run from the `mobile/` directory:

```bash
# Run unit & widget tests
flutter test

# Build Release APK (Recommended for physical devices and sideloading)
flutter build apk --release

# (Optional) Build Per-ABI APKs for smaller file size
flutter build apk --split-per-abi
```

The compiled APK will be generated at:
- Universal Release APK: `mobile/build/app/outputs/flutter-apk/app-release.apk`
- Per-ABI APKs: `mobile/build/app/outputs/flutter-apk/app-arm64-v8a-release.apk`

---

## 📲 How to Install on Android Devices

> [!IMPORTANT]
> **Always install `app-release.apk` on physical Android devices!**
> Do not attempt to sideload `app-debug.apk` via Android's file manager: Android's package installer flags debug builds with `android:testOnly="true"` and blocks them with *"App not installed as package appears to be invalid"*.

### Step-by-Step Installation:
1. **Transfer the APK to your phone:**
   - Transfer `app-release.apk` via USB cable, Google Drive, WhatsApp, Telegram, or local HTTP server.
2. **Allow Unknown Sources:**
   - When tapping the APK, if prompted, enable **"Allow from this source"** for your file manager or browser (*Settings > Apps > Special app access > Install unknown apps*).
3. **Google Play Protect Prompt:**
   - Because Spendly companion requests sensitive SMS permissions (`READ_SMS`, `RECEIVE_SMS`) to read M-Pesa statements, Google Play Protect may display a warning: *"Blocked by Play Protect"*.
   - Tap **"More details"** and select **"Install anyway"**.
4. **Grant SMS Permission:**
   - On first launch, Spendly displays the Kenyan Data Protection compliant consent dialog. Tap **"Grant Access & Scan"** to allow Spendly to read only M-Pesa messages.

### Alternative: Install via ADB (Developer Mode)
If your phone is connected to your computer with USB Debugging enabled:
```bash
adb install -r build/app/outputs/flutter-apk/app-release.apk
```

---

## Server Connection & Syncing

Spendly Companion operates in two flexible modes:
1. **Offline / Standalone Mode**:
   - M-Pesa SMS messages are automatically scanned, parsed, and stored directly on your phone's storage using the high-performance local parser.
   - All transaction totals, counterparties, reference codes, and balances are visible on the dashboard without requiring an active internet connection or backend server.
2. **Connected & Synchronized Mode**:
   - To sync your transactions with the Spendly Web Dashboard, tap the **Settings icon (⚙️)** in the top right.
   - Tap **"PC Wi-Fi (192.168.89.246)"** or enter your computer's local IP address (e.g. `http://192.168.89.246:8080`).
   - Tap **"Test Connection"** to verify communication with the Spendly API.
   - Enter your Spendly email and password to log in.
   - Once logged in, tapping **"Scan & Sync M-Pesa SMS"** uploads your transactions to the Go backend (`POST /api/integrations/mpesa/import`) with SHA-256 deduplication and updates badges to *Synced*.

### Testing Without Active M-Pesa Messages
If you are testing on an Android emulator or a test device without M-Pesa SMS:
- Tap **"Load Sample M-Pesa SMS"** on the empty state screen or in the **Settings (⚙️)** menu to test parsing and syncing with realistic Safaricom transactions.
