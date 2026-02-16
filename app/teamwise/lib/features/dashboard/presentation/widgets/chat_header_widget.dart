import 'dart:developer';

import 'package:liquid_glass_renderer/liquid_glass_renderer.dart';
import 'package:teamwise/common/widgets/glass_button.dart';
import 'package:teamwise/core/network/app_constants.dart';

import '../../../../config.dart';
import '../../../../core/network/endpoints.dart';

class ChatHeaderWidget extends StatelessWidget {
  final VoidCallback? onMenuTap;
  final VoidCallback? onSettingsTap;
  final String userName;
  final String? userAvatar;
  final String? profileColor; // ✅ Add profileColor parameter

  const ChatHeaderWidget({
    super.key,
    this.onMenuTap,
    this.onSettingsTap,
    this.userName = '',
    this.userAvatar,
    this.profileColor, // ✅ Add to constructor
  });

  // ✅ Helper method to convert hex color string to Color
  Color _getProfileColor(BuildContext context) {
    if (profileColor == null || profileColor!.isEmpty) {
      return appColor(context).primary; // Fallback to primary color
    }

    try {
      // Remove '#' if present and add '0xff' prefix for Flutter Color
      String colorString = profileColor!.replaceAll('#', '');

      // Handle 3-digit hex colors (e.g., #FFF -> #FFFFFF)
      if (colorString.length == 3) {
        colorString = colorString.split('').map((c) => c + c).join();
      }

      return Color(int.parse('0xff$colorString'));
    } catch (e) {
      // If parsing fails, return primary color
      return appColor(context).primary;
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = context.watch<AuthBloc>().state;
    bool isDNDActive = false;
    DateTime? DNDtime = DateTime.now();
    String? uiTime;

    if (authState is AuthSuccess && authState.mutedUntil != null) {
      isDNDActive = true;
      DNDtime = authState.mutedUntil;

      log("DND time from API: ${authState.mutedUntil}");

      uiTime = Validation().formatTimeFromApi(DNDtime.toString());
    }

    return Column(
      children: [
        Row(
          children: [
            SvgPicture.asset(
              svgAssets.sidebar,
              colorFilter: ColorFilter.mode(
                appColor(context).black,
                BlendMode.srcIn,
              ),
            ).inkWell(
              onTap: () {
                // ✅ Safely open drawer
                final scaffoldState = Scaffold.maybeOf(context);
                if (scaffoldState != null && scaffoldState.hasDrawer) {
                  scaffoldState.openDrawer();
                } else {
                  log("⚠️ No Drawer found in current Scaffold");
                }
              },
            ),
            HSpace(Sizes.s16),
            _buildUserInfo(context).inkWell(
              onTap: () =>
                  Navigator.pushNamed(context, routeName.editProfileScreen),
            ),
            const Spacer(),
            if (isDNDActive) ...[
              Row(
                    children: [
                      Icon(
                        Icons.notifications_off_outlined,
                        color: appColor(context).red,
                        size: 20,
                      ),
                    ],
                  )
                  .padding(all: Sizes.s9)
                  .decorated(
                    color: appColor(context).red.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(Sizes.s18),
                  ),
            ],
            HSpace(Sizes.s8),
            GlassButton(icon: svgAssets.setting, onTap: onSettingsTap!),
          ],
        ).paddingDirectional(
          horizontal: Sizes.s20,
          top: Sizes.s12,
          bottom: Sizes.s5,
        ),
        if (isDNDActive)
          Text(
            "Notification will be muted untill $uiTime",
            style: appCss.dmSansMedium12.textColor(appColor(context).red),
          ),
      ],
    );
  }

  Widget _buildUserInfo(BuildContext context) {
    String initials = "";
    if (userName.isNotEmpty) {
      initials += userName[0];
    }

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: Sizes.s42,
          height: Sizes.s42,
          decoration: BoxDecoration(
            border: Border.all(
              color: isDark(context)
                  ? appColor(context).gray.withValues(alpha: 0.2)
                  : appColor(context).darkText,
            ),

            color: _getProfileColor(context), // ✅ Use hex color from API
            borderRadius: BorderRadius.circular(Sizes.s10),
            image: (userAvatar != null && userAvatar!.isNotEmpty)
                ? DecorationImage(
                    image: NetworkImage("${AppConstants.appUrl}$userAvatar"),
                    fit: BoxFit.cover,
                  )
                : null,
          ),
          child: (userAvatar == null || userAvatar!.isEmpty)
              ? Text(
                  (userName?.isNotEmpty ?? false)
                      ? userName!.substring(0, 1)
                      : "?",
                  style: appCss.dmSansMedium18.textColor(Colors.black),
                ).center()
              : null,
        ),

        HSpace(Sizes.s8),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              userName,
              style: appCss.dmSansMedium15.textColor(appColor(context).black),
            ),
            Text(
              "Available",
              style: appCss.dmSansRegular14.textColor(
                appColor(context).gray.withValues(alpha: 0.61),
              ),
            ),
          ],
        ),
        // if (isDNDActive)
        // Text("Notification will be muted untill $DNDtime")
      ],
    );
  }
}
