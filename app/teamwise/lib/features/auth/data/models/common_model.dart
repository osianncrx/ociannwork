import '../../../../config.dart';

// class TokenService {
//   static String? _token;
//   static String? get token => _token;
//
//   static Future<void> initialize(AuthBloc authBloc) async {
//     // Listen to auth state changes
//     authBloc.stream.listen((state) {
//       if (state is AuthSuccess) {
//         _token = state.token;
//       } else if (state is AuthInitial || state is AuthFailure) {
//         _token = null;
//       }
//     });
//
//     // Initialize with current state
//     if (authBloc.state is AuthSuccess) {
//       _token = (authBloc.state as AuthSuccess).token;
//     }
//   }
// }
//
// class TeamService {
//   static final TeamService _instance = TeamService._internal();
//
//   factory TeamService() => _instance;
//
//   TeamService._internal();
//
//   int? _teamId;
//
//   void setTeamId(int id) {
//     _teamId = id;
//   }
//
//   int? get teamId => _teamId;
//
//   void clearTeamId() {
//     _teamId = null;
//   }
// }
