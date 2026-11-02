import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/mpesa_transaction.dart';

class ApiService {
  static const String _defaultUrl = 'http://10.0.2.2:8080';
  String _baseUrl = _defaultUrl;
  String? _sessionCookie;

  ApiService() {
    _loadBaseUrl();
  }

  Future<void> _loadBaseUrl() async {
    final prefs = await SharedPreferences.getInstance();
    _baseUrl = prefs.getString('spendly_server_url') ?? _defaultUrl;
    _sessionCookie = prefs.getString('spendly_session_cookie');
  }

  Future<void> setBaseUrl(String url) async {
    _baseUrl = url.endsWith('/') ? url.substring(0, url.length - 1) : url;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('spendly_server_url', _baseUrl);
  }

  String get baseUrl => _baseUrl;
  bool get isAuthenticated => _sessionCookie != null;

  Map<String, String> _headers() {
    final headers = <String, String>{
      'Content-Type': 'application/json',
    };
    if (_sessionCookie != null) {
      headers['Cookie'] = _sessionCookie!;
    }
    return headers;
  }

  void _saveCookie(http.Response response) async {
    final rawCookie = response.headers['set-cookie'];
    if (rawCookie != null) {
      _sessionCookie = rawCookie.split(';').first;
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('spendly_session_cookie', _sessionCookie!);
    }
  }

  Future<bool> login(String email, String password) async {
    try {
      final res = await http.post(
        Uri.parse('$_baseUrl/api/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email, 'password': password}),
      );

      if (res.statusCode == 200) {
        _saveCookie(res);
        return true;
      }
      return false;
    } catch (e) {
      debugPrint('Login error: $e');
      return false;
    }
  }

  Future<Map<String, dynamic>> importSmsBatch(List<String> rawMessages) async {
    try {
      final transactions = rawMessages.map((msg) => {'raw_message': msg}).toList();
      final res = await http.post(
        Uri.parse('$_baseUrl/api/integrations/mpesa/import'),
        headers: _headers(),
        body: jsonEncode({'transactions': transactions}),
      );

      if (res.statusCode == 200) {
        return jsonDecode(res.body) as Map<String, dynamic>;
      } else {
        return {
          'error': 'Import failed: ${res.statusCode}',
          'imported': 0,
          'duplicates': 0,
          'skipped': 0,
          'failed': rawMessages.length,
        };
      }
    } catch (e) {
      return {
        'error': e.toString(),
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
      );

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
      );

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
      );
      return res.statusCode == 201;
    } catch (e) {
      debugPrint('Create expense error: $e');
      return false;
    }
  }
}
