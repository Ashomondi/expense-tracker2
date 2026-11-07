import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/mpesa_transaction.dart';

class ApiService {
  // Use local host Wi-Fi IP by default for physical device convenience
  static const String _defaultUrl = 'http://192.168.89.246:8080';
  String _baseUrl = _defaultUrl;
  String? _token;
  String? _sessionCookie;
  String? _userEmail;
  String? _userName;

  ApiService() {
    _loadStoredConfig();
  }

  Future<void> _loadStoredConfig() async {
    final prefs = await SharedPreferences.getInstance();
    _baseUrl = prefs.getString('spendly_server_url') ?? _defaultUrl;
    _token = prefs.getString('spendly_auth_token');
    _sessionCookie = prefs.getString('spendly_session_cookie');
    _userEmail = prefs.getString('spendly_user_email');
    _userName = prefs.getString('spendly_user_name');
  }

  Future<void> setBaseUrl(String url) async {
    _baseUrl = url.trim().endsWith('/') ? url.trim().substring(0, url.trim().length - 1) : url.trim();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('spendly_server_url', _baseUrl);
  }

  String get baseUrl => _baseUrl;
  String? get token => _token;
  String? get userEmail => _userEmail;
  String? get userName => _userName;
  bool get isAuthenticated => (_token != null && _token!.isNotEmpty) || (_sessionCookie != null && _sessionCookie!.isNotEmpty);

  Map<String, String> _headers() {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (_token != null && _token!.isNotEmpty) {
      headers['Authorization'] = 'Bearer $_token';
    }
    if (_sessionCookie != null && _sessionCookie!.isNotEmpty) {
      headers['Cookie'] = _sessionCookie!;
    }
    return headers;
  }

  void _saveAuth(http.Response response, {String? fallbackToken, String? email, String? name}) async {
    final prefs = await SharedPreferences.getInstance();

    final rawCookie = response.headers['set-cookie'];
    if (rawCookie != null) {
      _sessionCookie = rawCookie.split(';').first;
      await prefs.setString('spendly_session_cookie', _sessionCookie!);
    }

    try {
      final data = jsonDecode(response.body);
      if (data['token'] != null) {
        _token = data['token'].toString();
        await prefs.setString('spendly_auth_token', _token!);
      } else if (fallbackToken != null) {
        _token = fallbackToken;
        await prefs.setString('spendly_auth_token', _token!);
      }

      if (data['user'] != null) {
        final u = data['user'];
        _userEmail = u['email']?.toString();
        _userName = u['full_name']?.toString();
        if (_userEmail != null) await prefs.setString('spendly_user_email', _userEmail!);
        if (_userName != null) await prefs.setString('spendly_user_name', _userName!);
      }
    } catch (_) {}

    if (email != null && _userEmail == null) {
      _userEmail = email;
      await prefs.setString('spendly_user_email', email);
    }
    if (name != null && _userName == null) {
      _userName = name;
      await prefs.setString('spendly_user_name', name);
    }
  }

  Future<void> logout() async {
    _token = null;
    _sessionCookie = null;
    _userEmail = null;
    _userName = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('spendly_auth_token');
    await prefs.remove('spendly_session_cookie');
    await prefs.remove('spendly_user_email');
    await prefs.remove('spendly_user_name');
  }

  /// Test connectivity to the Spendly server endpoint
  Future<Map<String, dynamic>> testConnection() async {
    try {
      final res = await http.get(
        Uri.parse('$_baseUrl/health'),
      ).timeout(const Duration(seconds: 4));

      if (res.statusCode == 200) {
        return {
          'success': true,
          'message': 'Connected to Spendly Server (200 OK)',
        };
      } else {
        return {
          'success': false,
          'message': 'Server returned HTTP ${res.statusCode}',
        };
      }
    } on SocketException catch (e) {
      return {
        'success': false,
        'message': 'Connection refused: $e. Ensure phone and computer are on the same Wi-Fi and port 8080 is accessible.',
      };
    } on TimeoutException {
      return {
        'success': false,
        'message': 'Connection timed out. Check that $_baseUrl is reachable.',
      };
    } catch (e) {
      return {
        'success': false,
        'message': 'Error: $e',
      };
    }
  }

  /// Log in with Spendly email and password
  Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final res = await http.post(
        Uri.parse('$_baseUrl/api/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email.trim(), 'password': password}),
      ).timeout(const Duration(seconds: 6));

      if (res.statusCode == 200) {
        _saveAuth(res, email: email);
        return {
          'success': true,
          'message': 'Logged in successfully',
        };
      } else {
        String msg = 'Invalid credentials';
        try {
          final data = jsonDecode(res.body);
          if (data['error'] != null) msg = data['error'].toString();
        } catch (_) {}
        return {
          'success': false,
          'message': msg,
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Network error during login: $e',
      };
    }
  }

  /// Import batch of M-Pesa SMS with transparent error reporting
  Future<Map<String, dynamic>> importSmsBatch(List<String> rawMessages) async {
    if (rawMessages.isEmpty) {
      return {'success': true, 'imported': 0, 'duplicates': 0, 'skipped': 0, 'failed': 0};
    }

    try {
      final transactions = rawMessages.map((msg) => {'raw_message': msg}).toList();
      final res = await http.post(
        Uri.parse('$_baseUrl/api/integrations/mpesa/import'),
        headers: _headers(),
        body: jsonEncode({'transactions': transactions}),
      ).timeout(const Duration(seconds: 10));

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body) as Map<String, dynamic>;
        data['success'] = true;
        return data;
      } else if (res.statusCode == 401) {
        return {
          'success': false,
          'error': 'Unauthorized (401): Please log in with your Spendly account in Settings (⚙️) to sync with server.',
          'imported': 0,
          'duplicates': 0,
          'skipped': 0,
          'failed': rawMessages.length,
        };
      } else {
        return {
          'success': false,
          'error': 'Server error ${res.statusCode}: ${res.body}',
          'imported': 0,
          'duplicates': 0,
          'skipped': 0,
          'failed': rawMessages.length,
        };
      }
    } on SocketException catch (_) {
      return {
        'success': false,
        'error': 'Cannot connect to Spendly server at $_baseUrl. Check your Wi-Fi and server IP in Settings (⚙️).',
        'imported': 0,
        'duplicates': 0,
        'skipped': 0,
        'failed': rawMessages.length,
      };
    } on TimeoutException {
      return {
        'success': false,
        'error': 'Sync timed out connecting to $_baseUrl.',
        'imported': 0,
        'duplicates': 0,
        'skipped': 0,
        'failed': rawMessages.length,
      };
    } catch (e) {
      return {
        'success': false,
        'error': 'Sync error: $e',
        'imported': 0,
        'duplicates': 0,
        'skipped': 0,
        'failed': rawMessages.length,
      };
    }
  }

  Future<List<MpesaTransaction>> getImports({int limit = 50}) async {
    try {
      final res = await http.get(
        Uri.parse('$_baseUrl/api/integrations/mpesa/imports?limit=$limit'),
        headers: _headers(),
      ).timeout(const Duration(seconds: 5));

      if (res.statusCode == 200) {
        final List<dynamic> data = jsonDecode(res.body);
        return data.map((json) => MpesaTransaction.fromJson(json)).toList();
      }
    } catch (e) {
      debugPrint('Failed to get imports: $e');
    }
    return [];
  }

  Future<Map<String, int>> getStats() async {
    try {
      final res = await http.get(
        Uri.parse('$_baseUrl/api/integrations/mpesa/status'),
        headers: _headers(),
      ).timeout(const Duration(seconds: 5));

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['stats'] != null) {
          final stats = data['stats'] as Map<String, dynamic>;
          return {
            'imported': stats['imported'] ?? 0,
            'skipped': stats['skipped'] ?? 0,
            'duplicates': stats['duplicates'] ?? 0,
            'failed': stats['failed'] ?? 0,
          };
        }
      }
    } catch (e) {
      debugPrint('Failed to get stats: $e');
    }
    return {'imported': 0, 'skipped': 0, 'duplicates': 0, 'failed': 0};
  }

  Future<bool> createExpense(int importId) async {
    try {
      final res = await http.post(
        Uri.parse('$_baseUrl/api/integrations/mpesa/expense'),
        headers: _headers(),
        body: jsonEncode({'import_id': importId}),
      ).timeout(const Duration(seconds: 5));
      return res.statusCode == 201;
    } catch (e) {
      debugPrint('Create expense error: $e');
      return false;
    }
  }

  // --- Local Transaction Persistence ---
  Future<void> saveLocalTransactions(List<MpesaTransaction> txs) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final list = txs.map((t) => t.toJson()).toList();
      await prefs.setString('spendly_local_transactions', jsonEncode(list));
    } catch (e) {
      debugPrint('Error saving local transactions: $e');
    }
  }

  Future<List<MpesaTransaction>> loadLocalTransactions() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final jsonStr = prefs.getString('spendly_local_transactions');
      if (jsonStr != null && jsonStr.isNotEmpty) {
        final List<dynamic> list = jsonDecode(jsonStr);
        return list.map((json) => MpesaTransaction.fromJson(json)).toList();
      }
    } catch (e) {
      debugPrint('Error loading local transactions: $e');
    }
    return [];
  }
}
