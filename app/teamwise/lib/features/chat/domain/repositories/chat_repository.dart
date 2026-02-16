abstract class DashRepository {
  Future<List<dynamic>> fetchChatsFromApi();
  Future<List<dynamic>> searchChatsFromApi(String query); // <-- add this
}
