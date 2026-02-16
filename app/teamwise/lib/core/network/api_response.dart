enum Status { loading, completed, error }

class ApiResponse<T> {
  final Status status;
  final String message;
  final T? data;
  final int? statusCode;

  ApiResponse.completed(this.data, [this.message = ''])
    : status = Status.completed,
      statusCode = 200;

  ApiResponse.error(this.message, {this.statusCode})
    : status = Status.error,
      data = null;

  // Add this factory constructor
  factory ApiResponse.fromJson(
    Map<String, dynamic> json,
    T Function(Map<String, dynamic>) fromJsonT,
  ) {
    try {
      // Check for both 'success' and 'status' fields
      final isSuccess =
          json['success'] == true ||
          json['status'] == 'success' ||
          (json['statusCode'] ?? 200) < 400;

      if (isSuccess) {
        return ApiResponse.completed(
          fromJsonT(
            json['data'] ?? json,
          ), // Fallback to entire json if no 'data' field
          json['message'] ?? 'Success',
        );
      } else {
        return ApiResponse.error(
          json['message'] ?? 'Request failed',
          statusCode: json['statusCode'],
        );
      }
    } catch (e) {
      return ApiResponse.error('Failed to parse response: $e');
    }
  }

  bool get isSuccess => status == Status.completed;
}

class ForgotPasswordResponse {
  final String message;

  ForgotPasswordResponse({required this.message});

  factory ForgotPasswordResponse.fromJson(Map<String, dynamic> json) {
    return ForgotPasswordResponse(message: json['message'] ?? 'Success');
  }

  @override
  String toString() => message;
}
