import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'screens/dashboard_screen.dart';
import 'services/api_service.dart';
import 'services/sms_service.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: Color(0xFF0E1310),
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );

  final apiService = ApiService();
  final smsService = SmsService();

  runApp(SpendlyCompanionApp(
    apiService: apiService,
    smsService: smsService,
  ));
}

class SpendlyCompanionApp extends StatelessWidget {
  final ApiService apiService;
  final SmsService smsService;

  const SpendlyCompanionApp({
    super.key,
    required this.apiService,
    required this.smsService,
  });

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Spendly Companion',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0E1310),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF10B981),
          secondary: Color(0xFF10B981),
          surface: Color(0xFF1A1F1C),
        ),
        fontFamily: 'Inter',
      ),
      home: DashboardScreen(
        apiService: apiService,
        smsService: smsService,
      ),
    );
  }
}
