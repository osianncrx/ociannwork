import 'dart:developer';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:teamwise/config.dart';

class SettingsBottomshit extends StatefulWidget {
  const SettingsBottomshit({super.key});

  @override
  State<SettingsBottomshit> createState() => _SettingsBottomshitState();
}

class _SettingsBottomshitState extends State<SettingsBottomshit> {
  bool isDarkMode = false;
  bool isDNDEnabled = false;

  @override
  void initState() {
    super.initState();
    final themeBloc = context.read<ThemeServiceBloc>();
    final authState = context.read<AuthBloc>().state;

    // Load current theme
    isDarkMode = themeBloc.state.isDarkMode;

    // Load current DND from AuthBloc
    if (authState is AuthSuccess) {
      isDNDEnabled = authState.mutedUntil != null;
    }
  }

  /// Save DND state to SharedPreferences
  Future<void> _saveDNDState(bool value, String duration) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('isDNDEnabled', value);
    await prefs.setString('dndDuration', duration);
    log('💾 DND saved to storage: value=$value, duration=$duration');
  }

  /// Clear DND state from SharedPreferences
  Future<void> _clearDNDState() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('isDNDEnabled');
    await prefs.remove('dndDuration');
    log('🗑️ DND cleared from storage');
  }

  void _showDNDBottomSheet(BuildContext context, String currentDND) {
    showModalBottomSheet(
      context: context,
      backgroundColor: appColor(context).white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      isScrollControlled: true,
      builder: (context) => DNDBottomSheet(initialDuration: currentDND),
    ).then((value) {
      // Duration is handled by API response in bloc
      // If bottom sheet closed without choosing, toggle switch back off
      if (value == null) {
        setState(() => isDNDEnabled = false);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<AuthBloc, AuthState>(
      listener: (context, state) {
        if (state is AuthSuccess) {
          AppToast.showMessage(state.message);
        } else if (state is AuthFailure) {
          AppToast.showError(state.error);
        }
      },
      child: Padding(
        padding: EdgeInsets.all(Sizes.s10),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: Sizes.s60,
                height: Sizes.s5,
                margin: EdgeInsets.only(bottom: Sizes.s10),
                decoration: BoxDecoration(
                  color: appColor(context).gray.withValues(alpha: 0.4),
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(Icons.dark_mode_outlined),
                    HSpace(Sizes.s10),
                    Text(
                      appFonts.appTheme,
                      style: appCss.dmSansSemiBold16.textColor(
                        appColor(context).black,
                      ),
                    ),
                  ],
                ),
                Switch(
                  value: isDarkMode,
                  inactiveThumbColor: appColor(context).white,
                  inactiveTrackColor: appColor(
                    context,
                  ).gray.withValues(alpha: 0.2),
                  activeThumbColor: appColor(context).primary,
                  onChanged: (value) {
                    setState(() => isDarkMode = value);
                    context.read<ThemeServiceBloc>().add(ToggleThemeEvent());
                    Navigator.pop(context);
                  },
                ),
              ],
            ),
            VSpace(Sizes.s10),

            // DND Switch
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(Icons.notifications_off_outlined),
                    HSpace(Sizes.s10),
                    Text(
                      appFonts.pauseNotification,
                      style: appCss.dmSansSemiBold16.textColor(
                        appColor(context).black,
                      ),
                    ),
                  ],
                ),
                Switch(
                  value: isDNDEnabled,
                  inactiveThumbColor: appColor(context).white,
                  inactiveTrackColor: appColor(
                    context,
                  ).gray.withValues(alpha: 0.2),
                  activeThumbColor: appColor(context).primary,
                  onChanged: (value) {
                    setState(() => isDNDEnabled = value);

                    final authState = context.read<AuthBloc>().state;
                    String currentDND = '1h';
                    if (authState is AuthSuccess &&
                        authState.dndDuration != null) {
                      currentDND = authState.dndDuration!;
                    }

                    if (value) {
                      // 🔕 Turning ON → show bottom sheet for duration
                      _showDNDBottomSheet(context, currentDND);
                    } else {
                      // 🔕 Turning OFF → call API directly
                      context.read<AuthBloc>().add(
                        DNDPressed(duration: '0', value: false),
                      );
                      _clearDNDState();
                      Navigator.pop(context);
                    }
                  },
                ),
              ],
            ),
            VSpace(Sizes.s20),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(Icons.lock_outlined),
                    HSpace(Sizes.s10),
                    Text(
                      appFonts.changePassword,
                      style: appCss.dmSansSemiBold16.textColor(
                        appColor(context).black,
                      ),
                    ),
                  ],
                ),
              ],
            ).inkWell(
              onTap: () {
                Navigator.pop(context);
                Navigator.pushNamed(context, routeName.changePasswordScreen);
              },
            ),
            VSpace(Sizes.s20),
            // Edit Profile
            Row(
              mainAxisSize: MainAxisSize.max,
              children: [
                Row(
                  children: [
                    Icon(Icons.person_outline),
                    HSpace(Sizes.s10),
                    Text(
                      appFonts.editProfile,
                      style: appCss.dmSansSemiBold16.textColor(
                        appColor(context).black,
                      ),
                    ),
                  ],
                ),
                Container(),
              ],
            ).inkWell(
              onTap: () {
                Navigator.pop(context);
                Navigator.pushNamed(context, routeName.editProfileScreen);
              },
            ),
            VSpace(Sizes.s20),

            // Logout
            Row(
                  mainAxisSize: MainAxisSize.max,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.logout_outlined),
                        HSpace(Sizes.s10),
                        Text(
                          appFonts.logout,
                          style: appCss.dmSansSemiBold16.textColor(
                            appColor(context).black,
                          ),
                        ),
                      ],
                    ),
                  ],
                )
                .inkWell(
                  onTap: () async {
                    final confirmed = await showDialog<bool>(
                      context: context,
                      builder: (_) => AlertDialog(
                        title: Text(appFonts.logout),
                        content: Text(appFonts.logoutMsg),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.pop(context, false),
                            child: Text(appFonts.cancel),
                          ),
                          ElevatedButton(
                            onPressed: () => Navigator.pop(context, true),
                            child: Text(appFonts.logout),
                          ),
                        ],
                      ),
                    );

                    if (confirmed == true) {
                      _clearDNDState();
                      context.read<AuthBloc>().add(LogoutPressed());
                      Navigator.of(context).pushNamedAndRemoveUntil(
                        routeName.login,
                        (route) => false,
                      );
                    }
                  },
                )
                .padding(bottom: Sizes.s20),
          ],
        ),
      ),
    );
  }
}

// ==================== DND BottomSheet ====================

class DNDBottomSheet extends StatefulWidget {
  final String initialDuration;

  const DNDBottomSheet({super.key, required this.initialDuration});

  @override
  State<DNDBottomSheet> createState() => _DNDBottomSheetState();
}

class _DNDBottomSheetState extends State<DNDBottomSheet> {
  late String selectedDuration;

  final List<Map<String, String>> dndOptions = [
    {'label': '1 hour', 'value': '1h'},
    {'label': '8 hours', 'value': '8h'},
    {'label': '1 week', 'value': '7d'},
    {'label': 'Forever', 'value': 'forever'},
  ];

  @override
  void initState() {
    super.initState();

    // If initialDuration is empty or invalid → default to first option
    final validValues = dndOptions.map((e) => e['value']).toList();
    if (widget.initialDuration.isNotEmpty &&
        validValues.contains(widget.initialDuration)) {
      selectedDuration = widget.initialDuration;
    } else {
      selectedDuration = dndOptions.first['value']!; // ✅ Default: 1h
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: MediaQuery.of(context).viewInsets, // handles keyboard
      child: Container(
        padding: EdgeInsets.all(20),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          border: Border(
            top: BorderSide(
              color: appColor(context).primary, // soft divider
              width: 1.2,
            ),
          ),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  appFonts.pauseNotification,
                  style: appCss.dmSansSemiBold18.textColor(
                    appColor(context).darkText,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close, size: 20),
                  onPressed: () => Navigator.pop(context),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                ),
              ],
            ),
            const SizedBox(height: 4),

            // Subtitle
            Text(
              appFonts.pauseNotificationDes,
              style: appCss.dmSansRegular14.textColor(
                appColor(context).lightText,
              ),
            ),
            const SizedBox(height: 20),

            // Radio Options
            ...dndOptions.map(
              (option) => InkWell(
                onTap: () =>
                    setState(() => selectedDuration = option['value']!),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Row(
                    children: [
                      Radio<String>(
                        value: option['value']!,
                        groupValue: selectedDuration,
                        fillColor: MaterialStateProperty.resolveWith<Color>((
                          states,
                        ) {
                          if (states.contains(MaterialState.selected)) {
                            return appColor(
                              context,
                            ).primary; // 🔥 Selected → Primary
                          }
                          return appColor(
                            context,
                          ).lightText; // Unselected → Gray
                        }),
                        onChanged: (value) =>
                            setState(() => selectedDuration = value!),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        option['label']!,
                        style: appCss.dmSansRegular14.textColor(
                          appColor(context).darkText,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

            const SizedBox(height: 24),

            // Buttons
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(context),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      side: BorderSide(color: appColor(context).lightText),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    child: Text(
                      appFonts.cancel,
                      style: appCss.dmSansSemiBold14.textColor(
                        appColor(context).darkText,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.pop(
                        context,
                        selectedDuration,
                      ); // return duration to parent
                      Navigator.pop(context);
                      context.read<AuthBloc>().add(
                        DNDPressed(duration: selectedDuration, value: true),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: appColor(context).primary,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    child: Text(
                      appFonts.apply,
                      style: appCss.dmSansSemiBold14.textColor(Colors.white),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
