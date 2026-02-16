import '../../domain/repositories/chat_repository.dart';
import '../datasources/dashboard_api.dart';
import '../models/message_model.dart';

class DashRepositoryImpl implements DashRepository {
  final DashboardApi dashboardApi;

  DashRepositoryImpl(this.dashboardApi);

  @override
  Future<List<MessageModel>> fetchChatsFromApi() => dashboardApi.fetchChats();

  @override
  Future<List<MessageModel>> searchChatsFromApi(String query) =>
      dashboardApi.searchChats(query);
}
