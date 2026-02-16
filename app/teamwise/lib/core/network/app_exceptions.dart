// Updated exception classes with more flexibility
class AppException implements Exception {
  final String message;
  final int? statusCode;

  AppException({required this.message, this.statusCode});

  @override
  String toString() => message;
}

class NetworkException extends AppException {
  NetworkException({String? message})
    : super(message: message ?? 'Network connectivity problem');
}

class ServerException extends AppException {
  ServerException({String? message, super.statusCode})
    : super(message: message ?? 'Server error occurred');
}

class CacheException extends AppException {
  CacheException({String? message})
    : super(message: message ?? 'Cache operation failed');
}
