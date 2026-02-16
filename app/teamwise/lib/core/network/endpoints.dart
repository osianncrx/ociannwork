import 'package:teamwise/core/network/app_constants.dart' show AppConstants;

class ApiEndpoints {
  // Authentication
  static String checkEmail = '${AppConstants.baseUrl}/auth/check-email';
  static String verifyOtp = '${AppConstants.baseUrl}/auth/verify-otp';
  static String login = '${AppConstants.baseUrl}/auth/login';
  static String createProfile = '${AppConstants.baseUrl}/team/create';
  static String resendOtp = '${AppConstants.baseUrl}/auth/resend-otp';
  static String findTeam = '${AppConstants.baseUrl}/team/find';
  static String joinTeam = '${AppConstants.baseUrl}/team/join';
  static String createChannel = '${AppConstants.baseUrl}/channel/create';
  static String forgotPassword = '${AppConstants.baseUrl}/auth/forgot-password';
  static String resetPassword = '${AppConstants.baseUrl}/auth/reset-password';
  static String setUpProfile = '${AppConstants.baseUrl}/team/setup/profile';
  static String inviteTeamMembers =
      '${AppConstants.baseUrl}/team/invite/member';
  static String chat = '${AppConstants.baseUrl}/team/invite/member';
  static const String getChats =
      '${AppConstants.baseUrl}/message/conversations';
  static const String searchChats = '${AppConstants.baseUrl}/team/members';
  static const String pinChat =
      '${AppConstants.baseUrl}/message/conversation/pin';

  static const String pinMessageChat = '${AppConstants.baseUrl}/message/pin';
  static const String unPinMessageChat =
      '${AppConstants.baseUrl}/message/unpin';
  static const String favorite = '${AppConstants.baseUrl}/message/favorite';
  static const String unFavorite = '${AppConstants.baseUrl}/message/unfavorite';

  static const String reaction = '${AppConstants.baseUrl}/message/reaction';
  static const String updateProfile =
      '${AppConstants.baseUrl}/account/updateProfile';
  static const String getUserDetails =
      '${AppConstants.baseUrl}/account/getUserDetails';
  static const String reminder = '${AppConstants.baseUrl}/reminder';
  static const String channelInfo = '${AppConstants.baseUrl}/channel/info';
  static const String message = '${AppConstants.baseUrl}/message';
  static const String reminderCancel =
      '${AppConstants.baseUrl}/reminder/cancel';
  static const String files = "${AppConstants.baseUrl}/message/files";
  static const String channelLeave = "${AppConstants.baseUrl}/channel/leave";
  static const String updateDND =
      '${AppConstants.baseUrl}/team/update/do-not-disturb';
  static const String updateCustomField =
      '${AppConstants.baseUrl}/custom-field/user/value';
  static const String customField = '${AppConstants.baseUrl}/custom-field/all';
  static const String updateMessage = '${AppConstants.baseUrl}/message/update';
  static const String teamSetting = '${AppConstants.baseUrl}/team-setting';
  static const String muteNotification = '${AppConstants.baseUrl}/message/mute';
  static const String unmuteNotification =
      '${AppConstants.baseUrl}/message/unmute';
  static const String addMembers =
      '${AppConstants.baseUrl}/channel/members/add';
  static const String removeMembers =
      '${AppConstants.baseUrl}/channel/members/remove';
  static const String memberRole =
      '${AppConstants.baseUrl}/channel/members/update/role';
  static const String setting = '${AppConstants.baseUrl}/setting/public';
  static const String savePlayerId =
      '${AppConstants.baseUrl}/account/savePlayerId';
  static const String currentSubscription =
      '${AppConstants.baseUrl}/subscription/current';
  static const String e2eStatus = '${AppConstants.baseUrl}/e2e/status';
  static const String deleteChannel = '${AppConstants.baseUrl}/channel/delete';
  static String changePassword =
      '${AppConstants.baseUrl}/account/updatePassword';
}
