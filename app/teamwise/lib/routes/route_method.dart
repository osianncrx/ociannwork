import 'package:teamwise/features/chat/presentation/pages/chat_screen.dart';
import 'package:teamwise/features/dashboard/presentation/pages/create_channel_screen.dart';
import 'package:teamwise/features/dashboard/presentation/pages/create_reminder_screen.dart';
import 'package:teamwise/features/dashboard/presentation/pages/pin_message_screen.dart';
import 'package:teamwise/features/dashboard/presentation/pages/global_search_screen.dart';
import 'package:teamwise/features/dashboard/presentation/pages/reminders_screen.dart';
import 'package:teamwise/features/dashboard/presentation/widgets/change_password_screen.dart';

import '../common/invalid_data_screen.dart';
import '../config.dart';
import '../features/chat/presentation/pages/contact_profile.dart';
import '../features/dashboard/presentation/pages/favorite_screen.dart';
import '../features/dashboard/presentation/pages/files_screen.dart';
import '../features/dashboard/presentation/widgets/edit_profile_screen.dart';

class AppRoute {
  Map<String, Widget Function(BuildContext)> route = {
    routeName.login: (p0) => const LoginScreen(),
    routeName.passwordScreen: (p0) => const PasswordScreen(),
    routeName.forgotPassScreen: (p0) => const ForgotPassScreen(),
    routeName.otpScreen: (p0) => const OtpScreen(),
    routeName.editProfileScreen: (p0) => const EditProfileScreen(),
    routeName.changePasswordScreen: (p0) => const ChangePasswordScreen(),
    routeName.reviewTerms: (p0) => const ReviewTerms(),
    routeName.createTeamScreen: (p0) => const CreateTeamScreen(),
    routeName.discoverTerms: (p0) => const DiscoverTerms(),
    routeName.profileSetupScreen: (p0) => const ProfileSetupScreen(),
    routeName.createPasswordScreen: (p0) => const CreatePasswordScreen(),
    routeName.welcomeTeamwiseScreen: (p0) => const WelcomeTeamwiseScreen(),
    routeName.chatChannelScreen: (p0) => const ChatChannelScreen(),
    routeName.customFieldsScreen: (p0) => const CustomFieldsScreen(),
    routeName.createChannelForm: (p0) => const CreateChannelForm(),
    routeName.inviteTeamScreen: (p0) => const InviteTeamScreen(),
    routeName.dashboard: (p0) => const Dashboard(),
    routeName.channelsScreen: (p0) => const CreateChannelScreen(),
    routeName.remindersScreen: (p0) => ReminderScreen(),
    routeName.createReminderScreen: (p0) => CreateReminderScreen(),
    routeName.contactProfile: (p0) => ContactProfile(),
    routeName.favoriteScreen: (p0) => FavoriteScreen(),
    routeName.pinMessageScreen: (p0) => PinMessageScreen(),
    routeName.filesScreen: (p0) => FilesScreen(),
    routeName.globalSearchScreen: (p0) => GlobalSearchScreen(),
    routeName.invalidDataScreen: (p0) => InvalidDataScreen(),
    // routeName.chatScreen: (p0) => const ChatScreen(),
  };
}
