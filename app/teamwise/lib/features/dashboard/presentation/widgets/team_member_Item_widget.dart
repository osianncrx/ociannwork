import 'dart:developer';
import 'package:flutter/material.dart';
import 'package:teamwise/core/network/extensions.dart';
import '../../../../config.dart';
import '../../../../core/network/app_constants.dart';
import '../../../auth/data/auth_services.dart';

class TeamMemberItemWidget extends StatelessWidget {
  final MessageModel member;
  final bool isOnline;
  final VoidCallback onTap;

  const TeamMemberItemWidget({
    super.key,
    required this.member,
    required this.isOnline,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final Color profileColor =
        _parseColor(member.profileColor) ?? appColor(context).primary;

    bool isMe = member.id.toString() == AuthService().userId;

    log(
      "✅ isMe: $isMe | memberId: ${member.id} | recipientId: ${member.recipientId}",
    );
    // if (member.id.toString() == member.recipientId) {
    //   // ✅ Hide current user from team list
    //   return const SizedBox.shrink();
    // }

    return InkWell(
      onTap: onTap,
      child: Container(
        padding: EdgeInsets.symmetric(
          horizontal: Sizes.s16,
          vertical: Sizes.s12,
        ),
        decoration: BoxDecoration(
          border: Border(
            bottom: BorderSide(
              color: appColor(context).gray.withValues(alpha: 0.1),
              width: 0.5,
            ),
          ),
        ),
        child: Row(
          children: [
            // Avatar with online indicator
            Stack(
              children: [
                Container(
                  height: 48,
                  width: 48,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(Sizes.s10),
                    border: Border.all(
                      color: isDark(context)
                          ? appColor(context).gray.withValues(alpha: 0.2)
                          : appColor(context).darkText,
                    ),
                    color: profileColor, // ✅ Dynamic color from API
                    image:
                        member.avatarUrl != null && member.avatarUrl!.isNotEmpty
                        ? DecorationImage(
                            fit: BoxFit.fill,
                            image: NetworkImage(
                              "${AppConstants.appUrl}${member.avatarUrl}",
                            ),
                            onError: (exception, stackTrace) {
                              log('Error loading avatar: $exception');
                            },
                          )
                        : null,
                  ),
                  child: member.avatarUrl == null || member.avatarUrl!.isEmpty
                      ? Center(
                          child: Text(
                            _getInitials(member.name),
                            style: appCss.dmSansMedium18.textColor(
                              Colors.black,
                            ),
                          ),
                        )
                      : null,
                ),
                if (isOnline && !isMe)
                  Positioned(
                    right: 0,
                    bottom: 0,
                    child: Container(
                      width: 14,
                      height: 14,
                      decoration: BoxDecoration(
                        color: Colors.green,
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: appColor(context).white,
                          width: 2,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(width: 12),

            // Member info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    member.name.toTitleCase(),
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: appColor(context).black,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      if (member.email != null && member.email!.isNotEmpty) ...[
                        Icon(
                          Icons.email_outlined,
                          size: 12,
                          color: appColor(context).gray,
                        ),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            member.email!,
                            style: TextStyle(
                              fontSize: 13,
                              color: appColor(context).gray,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _getInitials(String name) {
    final trimmed = name.trim();
    if (trimmed.isEmpty) return 'U';
    return trimmed[0].toUpperCase();
  }

  /// 🔹 Convert hex string (like "#FF5733" or "FF5733") to Color
  Color? _parseColor(String? colorString) {
    if (colorString == null || colorString.isEmpty) return null;

    try {
      String hex = colorString.replaceAll('#', '');
      if (hex.length == 6) hex = 'FF$hex'; // Add alpha if missing
      return Color(int.parse('0x$hex'));
    } catch (e) {
      log('Invalid profileColor format: $colorString');
      return null;
    }
  }
}
