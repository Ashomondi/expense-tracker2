package com.spendly.app.mobile

import android.Manifest
import android.content.pm.PackageManager
import android.net.Uri
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val CHANNEL = "com.spendly.app/sms_reader"
    private val SMS_PERMISSION_REQ_CODE = 1001
    private var pendingPermissionResult: MethodChannel.Result? = null

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "checkSmsPermission" -> {
                    val granted = ContextCompat.checkSelfPermission(
                        this,
                        Manifest.permission.READ_SMS
                    ) == PackageManager.PERMISSION_GRANTED
                    result.success(granted)
                }

                "requestSmsPermission" -> {
                    if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_SMS) == PackageManager.PERMISSION_GRANTED) {
                        result.success(true)
                    } else {
                        pendingPermissionResult = result
                        ActivityCompat.requestPermissions(
                            this,
                            arrayOf(Manifest.permission.READ_SMS),
                            SMS_PERMISSION_REQ_CODE
                        )
                    }
                }

                "readMpesaSms" -> {
                    val limit = call.argument<Int>("limit") ?: 100
                    try {
                        val messages = queryMpesaMessages(limit)
                        result.success(messages)
                    } catch (e: Exception) {
                        result.error("QUERY_ERROR", e.localizedMessage, null)
                    }
                }

                else -> result.notImplemented()
            }
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == SMS_PERMISSION_REQ_CODE) {
            val granted = grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED
            pendingPermissionResult?.success(granted)
            pendingPermissionResult = null
        }
    }

    private fun queryMpesaMessages(limit: Int): List<Map<String, Any>> {
        val messages = mutableListOf<Map<String, Any>>()
        val projection = arrayOf("_id", "address", "body", "date")
        
        // Multi-keyword selection to catch M-Pesa messages across carriers & phone models
        val selection = "address LIKE ? OR address LIKE ? OR address LIKE ? OR address LIKE ? OR body LIKE ? OR body LIKE ? OR body LIKE ?"
        val selectionArgs = arrayOf(
            "%MPESA%",
            "%M-PESA%",
            "%SAFARICOM%",
            "%Safaricom%",
            "%Confirmed%Ksh%",
            "%sent to%",
            "%paid to%"
        )
        // Standard sort order without SQL LIMIT keyword (which crashes on Android 10+ ContentResolver)
        val sortOrder = "date DESC"

        val urisToTry = listOf(
            Uri.parse("content://sms/inbox"),
            Uri.parse("content://sms")
        )

        for (uri in urisToTry) {
            try {
                contentResolver.query(uri, projection, selection, selectionArgs, sortOrder)?.use { cursor ->
                    val idIndex = cursor.getColumnIndex("_id")
                    val addressIndex = cursor.getColumnIndex("address")
                    val bodyIndex = cursor.getColumnIndex("body")
                    val dateIndex = cursor.getColumnIndex("date")

                    while (cursor.moveToNext() && messages.size < limit) {
                        val id = if (idIndex != -1) cursor.getLong(idIndex) else 0L
                        val address = if (addressIndex != -1) cursor.getString(addressIndex) ?: "MPESA" else "MPESA"
                        val body = if (bodyIndex != -1) cursor.getString(bodyIndex) ?: "" else ""
                        val date = if (dateIndex != -1) cursor.getLong(dateIndex) else System.currentTimeMillis()

                        if (body.isNotBlank() && isLikelyMpesa(address, body)) {
                            // Deduplicate within the batch by id or body hash
                            if (messages.none { it["id"] == id }) {
                                messages.add(
                                    mapOf(
                                        "id" to id,
                                        "address" to address,
                                        "body" to body,
                                        "date" to date
                                    )
                                )
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                android.util.Log.e("SpendlySMS", "Error reading SMS from $uri: ${e.message}", e)
            }

            if (messages.isNotEmpty()) {
                break
            }
        }

        android.util.Log.i("SpendlySMS", "Scanned and found ${messages.size} M-Pesa SMS")
        return messages
    }

    private fun isLikelyMpesa(address: String, body: String): Boolean {
        val addrUpper = address.uppercase()
        val bodyUpper = body.uppercase()

        if (addrUpper.contains("MPESA") || addrUpper.contains("M-PESA") || addrUpper.contains("SAFARICOM")) {
            return true
        }

        return bodyUpper.contains("CONFIRMED") && 
            (bodyUpper.contains("KSH") || bodyUpper.contains("SENT TO") || bodyUpper.contains("PAID TO") || bodyUpper.contains("RECEIVED"))
    }
}
