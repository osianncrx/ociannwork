import 'package:dio/dio.dart';

import '../../config.dart';
import '../env/flavor_config.dart' show FlavorConfig;
import 'api_manger.dart';
import 'app_exceptions.dart' show ServerException;

class DioProviderImpl implements ApiManager {
  static final String baseUrl = FlavorConfig.instance.values.baseUrl;

  static Dio dioClient = _addInterceptors(_createDio());

  static Dio _createDio() {
    BaseOptions opts = BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(milliseconds: 30000),
      receiveTimeout: const Duration(milliseconds: 30000),
      validateStatus: (status) => true, // Accept all status codes
    );
    return Dio(opts);
  }

  static Dio _addInterceptors(Dio dio) {
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (RequestOptions options, RequestInterceptorHandler handler) {
          return handler.next(options);
        },
        onResponse: (response, ResponseInterceptorHandler handler) {
          return handler.next(response);
        },
        onError: (DioException error, ErrorInterceptorHandler handler) async {
          // Convert all Dio errors to responses
          if (error.response != null) {
            return handler.resolve(error.response!);
          }
          return handler.next(error);
        },
      ),
    );
    return dio;
  }

  // Generic request handler
  Future<Response> _handleRequest(Future<Response> request) async {
    try {
      final response = await request;
      return response;
    } on DioException catch (e) {
      debugPrint('Dio error: ${e.message}');
      if (e.response != null) {
        return e.response!;
      }
      throw ServerException();
    }
  }

  @override
  Future<Response> get(
    String url, {
    Map<String, dynamic>? queryParams,
    Map<String, dynamic>? headers,
  }) async {
    return _handleRequest(
      dioClient.get(
        url,
        queryParameters: queryParams,
        options: Options(headers: headers),
      ),
    );
  }

  @override
  Future<Response> post(
    String url, {
    Map<String, dynamic>? headers,
    dynamic body,
    dynamic encoding,
  }) async {
    return _handleRequest(
      dioClient.post(
        url,
        data: body,
        options: Options(headers: headers),
      ),
    );
  }

  @override
  Future<Response> put(
    String url, {
    Map<String, dynamic>? queryParams,
    dynamic body,
    Map<String, dynamic>? headers,
  }) async {
    return _handleRequest(
      dioClient.put(
        url,
        data: body,
        queryParameters: queryParams,
        options: Options(headers: headers),
      ),
    );
  }

  @override
  Future<Response> patch(
    String url, {
    Map<String, dynamic>? queryParams,
    dynamic body,
    Map<String, dynamic>? headers,
  }) async {
    return _handleRequest(
      dioClient.patch(
        url,
        data: body,
        queryParameters: queryParams,
        options: Options(headers: headers),
      ),
    );
  }

  @override
  Future<Response> delete(
    String url, {
        Map<String, dynamic>? headers,
        dynamic body,
        dynamic encoding,
      }) async {
    return _handleRequest(
      dioClient.delete(
        url,
        data: body,
        options: Options(headers: headers),
      ),
    );
  }

  @override
  Future<Response> getUri(Uri url, {Map<String, dynamic>? headers}) async {
    return _handleRequest(
      dioClient.getUri(url, options: Options(headers: headers)),
    );
  }

  @override
  Future uploadFile(
    String url,
    String filePath, {
    Map<String, dynamic>? queryParams,
    Map<String, dynamic>? headers,
  }) async {
    return _handleRequest(
      dioClient.post(
        url,
        data: FormData.fromMap({
          'file': await MultipartFile.fromFile(filePath),
        }),
        queryParameters: queryParams,
        options: Options(headers: headers),
      ),
    );
  }

  @override
  void logRequest(
    String method,
    String url, {
    Map<String, dynamic>? queryParams,
    Map<String, dynamic>? headers,
    body,
  }) {
    // TODO: implement logRequest
  }
}
