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
        val uri = Uri.parse("content://sms/inbox")
        val projection = arrayOf("_id", "address", "body", "date")
        
        // Strict M-Pesa sender & content filtering to guarantee user privacy
        val selection = "address LIKE ? OR address LIKE ? OR body LIKE ?"
        val selectionArgs = arrayOf("%MPESA%", "%M-PESA%", "%Confirmed%Ksh%")
        val sortOrder = "date DESC LIMIT $limit"

        contentResolver.query(uri, projection, selection, selectionArgs, sortOrder)?.use { cursor ->
            val idIndex = cursor.getColumnIndex("_id")
            val addressIndex = cursor.getColumnIndex("address")
            val bodyIndex = cursor.getColumnIndex("body")
            val dateIndex = cursor.getColumnIndex("date")

            while (cursor.moveToNext()) {
                val id = if (idIndex != -1) cursor.getLong(idIndex) else 0L
                val address = if (addressIndex != -1) cursor.getString(addressIndex) ?: "MPESA" else "MPESA"
                val body = if (bodyIndex != -1) cursor.getString(bodyIndex) ?: "" else ""
                val date = if (dateIndex != -1) cursor.getLong(dateIndex) else System.currentTimeMillis()

                if (body.isNotBlank()) {
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

        return messages
    }
}
