import 'dart:developer';

import 'package:dio/dio.dart';
import 'package:get_it/get_it.dart';
import 'package:teamwise/features/chat/data/datasources/chat_Api.dart';

import '../config.dart';
import '../core/network/api_manger.dart';
import '../core/network/dio_provider_impl.dart';
import '../features/auth/data/repositories/auth_repository_impl.dart';
import '../features/auth/domain/usecases/check_email_usecase.dart';
import '../features/auth/data/datasources/auth_api.dart';
import '../features/chat/presentation/bloc/chat_bloc.dart';
import '../features/chat/socket_service.dart';
import '../features/dashboard/data/datasources/dashboard_api.dart';

final serviceLocator = GetIt.instance;

Future<void> init() async {
  // 1. Dio - Network layer
  serviceLocator.registerLazySingleton<Dio>(
    () => Dio(
      BaseOptions(
        connectTimeout: const Duration(seconds: 30),
        receiveTimeout: const Duration(seconds: 30),
      ),
    ),
  );

  // 2. API Manager
  serviceLocator.registerLazySingleton<ApiManager>(() => DioProviderImpl());

  // 3. Socket Service - Register as singleton (shared across app)
  serviceLocator.registerLazySingleton<SocketService>(() => SocketService());

  // 4. Data Sources
  serviceLocator.registerLazySingleton<AuthApi>(
    () => AuthApi(serviceLocator<ApiManager>()),
  );

  // 5. Repositories (Register before Use Cases and Blocs)
  serviceLocator.registerLazySingleton<AuthRepository>(
    () => AuthRepositoryImpl(serviceLocator<AuthApi>()),
  );
  serviceLocator.registerLazySingleton<DashRepository>(
    () => DashRepositoryImpl(serviceLocator<DashboardApi>()),
  );

  // 6. Use Cases (Register before Blocs)
  serviceLocator.registerLazySingleton<CheckEmailUseCase>(
    () => CheckEmailUseCase(serviceLocator<AuthRepository>()),
  );
  serviceLocator.registerLazySingleton<GetChatsUseCase>(
    () => GetChatsUseCase(serviceLocator<DashRepository>()),
  );
  serviceLocator.registerLazySingleton<SearchChatsUseCase>(
    () => SearchChatsUseCase(serviceLocator<DashRepository>()),
  );

  // 7. Blocs (Register AuthBloc first since others depend on it)
  serviceLocator.registerLazySingleton<AuthBloc>(
    () => AuthBloc(
      serviceLocator<AuthRepository>(),
      checkEmailUseCase: serviceLocator<CheckEmailUseCase>(),
    ),
  );
  serviceLocator.registerFactory<DropdownBloc>(
    () => DropdownBloc(serviceLocator<ApiManager>()),
  );

  serviceLocator.registerFactory<DashboardBloc>(
    () => DashboardBloc(
      getChatsUseCase: serviceLocator<GetChatsUseCase>(),
      searchChatsUseCase: serviceLocator<SearchChatsUseCase>(),
      dashboardApi: serviceLocator<DashboardApi>(),
    ),
  );

  // 8. Data Sources that depend on Blocs (Register after Blocs)
  serviceLocator.registerLazySingleton<DashboardApi>(
    () =>
        DashboardApi(serviceLocator<ApiManager>(), serviceLocator<AuthBloc>()),
  );

  serviceLocator.registerLazySingleton<ChatApi>(
    () => ChatApi(serviceLocator<AuthBloc>(), serviceLocator<ApiManager>()),
  );

  // 9. ChatBloc Factory (Create per chat screen, not singleton)
  serviceLocator.registerFactoryParam<ChatBloc, String?, String?>((
    param1,
    param2,
  ) {
    log(
      'ServiceLocator creating ChatBloc with param1: $param1, param2: $param2',
    );
    return ChatBloc(
      recipientId: param1!, // This should be recipientId
      channelId: param2, // This should be channelId
      messageService: serviceLocator<ChatApi>(),
      socketService: serviceLocator<SocketService>(),
    );
  });
}
