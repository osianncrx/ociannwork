// abstract class ApiManager {
// //   Future get(
// //     String url, {
// //     Map<String, dynamic>? queryParams,
// //     Map<String, dynamic>? headers,
// //   });
// //   Future getUri(Uri url, {Map<String, dynamic>? headers});
// //   Future post(String url, {Map<String, dynamic>? headers, body, encoding});
// //   Future delete(String url, {Map<String, dynamic>? queryParams});
// //
// //   Future put(String url, {Map<String, dynamic>? queryParams, body});
// //   Future patch(String url, {Map<String, dynamic>? queryParams, body});
// //   Future uploadFile(
// //     String url,
// //     String filePath, {
// //     Map<String, dynamic>? queryParams,
// //     Map<String, dynamic>? headers,
// //   });
// // }
import 'dart:convert';
import 'dart:developer';

abstract class ApiManager {
  Future get(
    String url, {
    Map<String, dynamic>? queryParams,
    Map<String, dynamic>? headers,
  }) async {
    logRequest("GET", url, queryParams: queryParams, headers: headers);
  }

  Future getUri(Uri uri, {Map<String, dynamic>? headers}) async {
    logRequest("GET URI", uri.toString(), headers: headers);
  }

  Future post(
    String url, {
    Map<String, dynamic>? headers,
    dynamic body,
    Encoding? encoding,
  }) async {
    logRequest("POST", url, headers: headers, body: body);
    // Your actual POST logic here
  }

  Future delete(String url, {Map<String, dynamic>? headers,
    dynamic body,
    Encoding? encoding}) async {
    logRequest("DELETE", url, headers: headers, body: body);
    // Your actual DELETE logic here
  }

  Future put(
    String url, {
    Map<String, dynamic>? queryParams,
    dynamic body,
        Map<String, dynamic>? headers,
  }) async {
    logRequest("PUT", url, queryParams: queryParams, headers: headers, body: body);
    // Your actual PUT logic here
  }

  Future patch(
    String url, {
    Map<String, dynamic>? queryParams,
    dynamic body,
  }) async {
    logRequest("PATCH", url, queryParams: queryParams, body: body);
    // Your actual PATCH logic here
  }

  Future uploadFile(
    String url,
    String filePath, {
    Map<String, dynamic>? queryParams,
    Map<String, dynamic>? headers,
  }) async {
    logRequest("UPLOAD FILE", url, queryParams: queryParams, headers: headers);
    log("📎 File path: $filePath");
    // Your actual file upload logic here
  }

  void logRequest(
    String method,
    String url, {
    Map<String, dynamic>? queryParams,
    Map<String, dynamic>? headers,
    dynamic body,
  }) {
    final uri = Uri.parse(url);
    final fullUrl = queryParams != null && queryParams.isNotEmpty
        ? uri.replace(queryParameters: queryParams).toString()
        : uri.toString();

    log("📤 [$method] $fullUrl");

    if (headers != null && headers.isNotEmpty) {
      log("🔐 Headers: $headers");
    }
    if (body != null) {
      log("📦 Body: $body");
    }
  }
}
