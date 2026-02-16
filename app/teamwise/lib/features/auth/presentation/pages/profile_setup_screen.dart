import 'dart:developer';
import 'package:teamwise/common/widgets/country_picker_custom/country_code_custom.dart';
import 'package:image_picker/image_picker.dart';
import 'package:permission_handler/permission_handler.dart';
import '../../../../config.dart';
import '../../../../core/network/app_constants.dart';

class ProfileSetupScreen extends StatefulWidget {
  const ProfileSetupScreen({super.key});

  @override
  State<ProfileSetupScreen> createState() => _ProfileSetupScreenState();
}

class _ProfileSetupScreenState extends State<ProfileSetupScreen> {
  final firstNameController = TextEditingController();
  final lastNameController = TextEditingController();
  final phoneController = TextEditingController();
  final roleController = TextEditingController();
  final firstNameFocus = FocusNode();
  final lastNameFocus = FocusNode();
  final phoneFocus = FocusNode();
  final roleFocus = FocusNode();
  bool? isJoined;
  String joinedTeamName = '';


  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final args = ModalRoute.of(context)?.settings.arguments as Map?;
      setState(() {
        isJoined = args?['isJoined'] ?? false;
        joinedTeamName = args?['joinedTeamName'] ?? '';
      });
    });
  }

  @override
  void dispose() {
    firstNameController.dispose();
    lastNameController.dispose();
    phoneController.dispose();
    roleController.dispose();
    firstNameFocus.dispose();
    lastNameFocus.dispose();
    phoneFocus.dispose();
    roleFocus.dispose();
    super.dispose();
  }

  String? selectedAvatarPath;

  // Add image picker functionality
  Future<void> _pickImage() async {
    try {
      // Show options dialog for camera or gallery
      final source = await showDialog<ImageSource>(
        context: context,
        builder: (BuildContext context) {
          return AlertDialog(
            title: Text('Select Image Source'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                ListTile(
                  leading: Icon(
                    Icons.photo_library,
                    color: appColor(context).darkText,
                  ),
                  title: Text(
                    'Gallery',
                    style: appCss.dmSansMedium12.textColor(
                      appColor(context).darkText,
                    ),
                  ),
                  onTap: () => Navigator.of(context).pop(ImageSource.gallery),
                ),
                ListTile(
                  leading: Icon(
                    Icons.camera_alt,
                    color: appColor(context).darkText,
                  ),
                  title: Text(
                    'Camera',
                    style: appCss.dmSansMedium12.textColor(
                      appColor(context).darkText,
                    ),
                  ),
                  onTap: () => Navigator.of(context).pop(ImageSource.camera),
                ),
              ],
            ),
          );
        },
      );

      if (source == null) return;

      final ImagePicker picker = ImagePicker();

      // Add permission check and better error handling
      XFile? image;

      try {
        image = await picker.pickImage(
          source: source,
          maxWidth: 300,
          maxHeight: 300,
          imageQuality: 80,
        );
      } on PlatformException catch (e) {
        log('PlatformException picking image: ${e.code} - ${e.message}');

        if (e.code == 'photo_access_denied' ||
            e.code == 'camera_access_denied') {
          _showPermissionDialog();
          return;
        }

        AppToast.showError(
          'Failed to access ${source == ImageSource.camera ? 'camera' : 'gallery'}',
        );
        return;
      }

      if (image != null) {
        // Verify file exists before setting
        final file = File(image.path);
        if (await file.exists()) {
          setState(() {
            selectedAvatarPath = image?.path;
          });
          log('Image selected successfully: ${image.path}');
        } else {
          AppToast.showError('Selected image file not found');
        }
      }
    } catch (e) {
      log('General error picking image: $e');
      AppToast.showError('Failed to pick image. Please try again.');
    }
  }

  // Show permission dialog
  void _showPermissionDialog() {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: Text('Permission Required'),
          content: Text(
            'This app needs access to your camera and photo library to update your profile picture. Please grant permission in settings.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: Text('Cancel'),
            ),
            TextButton(
              onPressed: () {
                Navigator.of(context).pop();
                // Open app settings
                openAppSettings();
              },
              child: Text('Open Settings'),
            ),
          ],
        );
      },
    );
  }

  Widget _buildAvatarSection() {
    // fallback initials
    String initials = '';
    if (firstNameController.text.isNotEmpty) {
      initials += firstNameController.text[0];
    }

    return Center(
      child: GestureDetector(
        onTap: _pickImage,
        child: Stack(
          alignment: Alignment.center,
          clipBehavior: Clip.none,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(20),
              child: selectedAvatarPath != null
                  ? (selectedAvatarPath!.startsWith("http") ||
                            selectedAvatarPath!.startsWith("/uploads"))
                        ? Image.network(
                            "${AppConstants.appUrl}${selectedAvatarPath!}",
                            width: 100,
                            height: 100,
                            fit: BoxFit.cover,
                          )
                        : Image.file(
                            File(selectedAvatarPath!),
                            width: 100,
                            height: 100,
                            fit: BoxFit.cover,
                          )
                  : initials == ''
                  ? Image.asset(
                      imageAssets.personPlaceHolder,
                      width: 88,
                      height: 88,
                      fit: BoxFit.cover,
                    )
                  : Container(
                      width: 100,
                      height: 100,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(20),
                        color: appColor(context).primary.withValues(alpha: 0.2),
                      ),
                      child: Text(
                        initials.toUpperCase(),
                        style: appCss.dmSansSemiBold30.textColor(
                          appColor(context).darkText,
                        ),
                      ).center(),
                    ),
            ),
            Positioned(
              bottom: -4,
              right: -8,
              child: Container(
                height: 28,
                width: 28,
                decoration: BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: appColor(context).textFiledBorder,
                    width: 1.5,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.1),
                      blurRadius: 4,
                    ),
                  ],
                ),
                child: Icon(
                  Icons.camera_alt,
                  size: 16,
                  color: appColor(context).lightText,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return WillPopScope(
      onWillPop: () async {
        // Go back to login screen
        Navigator.pushNamedAndRemoveUntil(
          context,
          routeName.login,
              (route) => false,
        );
        return false; // prevent default back action
      },
      child: BlocListener<AuthBloc, AuthState>(
        listener: (context, state) {
          if (state is AuthFailure) {
            AppToast.showError(state.error);
          }
        },
        child: Scaffold(
          resizeToAvoidBottomInset: true,
          body: Container(
            width: double.infinity,
            height: double.infinity,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  appColor(context).commonBgColor,
                  appColor(context).white,
                ],
              ),
            ),
            child: SafeArea(
              child: SingleChildScrollView(
                padding: EdgeInsets.only(
                  top: Sizes.s24,
                  bottom: /* MediaQuery.of(context).viewInsets.bottom + */
                      Sizes.s24,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Stack(
                      alignment: Alignment.topCenter,
                      children: [
                        Container(
                          width: Sizes.s200,
                          height: Sizes.s300,
                          decoration: BoxDecoration(
                            image: DecorationImage(
                              image: AssetImage(imageAssets.setupProfileBg),
                              alignment: Alignment.topCenter,
                            ),
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.only(top: 165),
                          child: CommonCardContainer(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  appFonts.setUpYourProfile,
                                  style: appCss.dmSansExtraBold18.textColor(
                                    appColor(context).darkText,
                                  ),
                                ),
                                Text(
                                  appFonts.finishYourProfile,
                                  style: appCss.dmSansRegular14
                                      .textColor(appColor(context).lightText)
                                      .textHeight(1.9),
                                ).paddingDirectional(
                                  top: Sizes.s3,
                                  bottom: Sizes.s10,
                                ),
                                Center(
                                  child: Stack(
                                    alignment: Alignment.center,
                                    clipBehavior: Clip.none,
                                    children: [
                                      _buildAvatarSection(),

                                      /*    ClipRRect(
                                        borderRadius: BorderRadius.circular(20),
                                        child: Image.asset(
                                          imageAssets.profile,
                                          width: 88,
                                          height: 88,
                                          fit: BoxFit.cover,
                                        ),
                                      ),*/
                                    ],
                                  ),
                                ),
                                VSpace(Sizes.s25),
                                Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        appFonts.firstName,
                                        style: appCss.dmSansSemiBold16.textColor(
                                          appColor(context).darkText,
                                        ),
                                      ),
                                    ),
                                    HSpace(Sizes.s20),
                                    Expanded(
                                      child: Text(
                                        appFonts.lastName,
                                        style: appCss.dmSansSemiBold16.textColor(
                                          appColor(context).darkText,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                Row(
                                  children: [
                                    Expanded(
                                      child:
                                          TextFieldCommon(
                                            validator: (name) => Validation()
                                                .nameValidation(context, name),
                                            controller: firstNameController,
                                            focusNode: firstNameFocus,
                                            hintText: language(
                                              context,
                                              appFonts.firstName,
                                            ),
                                            keyboardType: TextInputType.name,
                                          ).paddingDirectional(
                                            top: Sizes.s8,
                                            bottom: Sizes.s7,
                                          ),
                                    ),
                                    HSpace(Sizes.s20),
                                    Expanded(
                                      child:
                                          TextFieldCommon(
                                            // validator: (name) => Validation()
                                            //     .nameValidation(context, name),
                                            controller: lastNameController,
                                            hintText: language(
                                              context,
                                              appFonts.lastName,
                                            ),
                                            keyboardType: TextInputType.name,
                                            focusNode: lastNameFocus,
                                          ).paddingDirectional(
                                            top: Sizes.s8,
                                            bottom: Sizes.s7,
                                          ),
                                    ),
                                  ],
                                ),
                                // Email Field
                                Text(
                                  appFonts.email,
                                  style: appCss.dmSansSemiBold16.textColor(
                                    appColor(context).darkText,
                                  ),
                                ).paddingDirectional(
                                  top: Sizes.s10,
                                  bottom: Sizes.s8,
                                ),
                                TextFieldCommon(
                                  readOnly: true,
                                  isEnable: false,
                                  controller: TextEditingController(
                                    text:
                                        context
                                            .read<AuthBloc>()
                                            .profileData
                                            ?.email ??
                                        '',
                                  ),
                                  hintText: language(context, appFonts.email),
                                  keyboardType: TextInputType.emailAddress,
                                ).paddingDirectional(
                                  top: Sizes.s8,
                                  bottom: Sizes.s7,
                                ),
                                // Phone Field
                                Text(
                                  appFonts.phone,
                                  style: appCss.dmSansSemiBold16.textColor(
                                    appColor(context).darkText,
                                  ),
                                ).paddingDirectional(
                                  top: Sizes.s10,
                                  bottom: Sizes.s8,
                                ),
                                phoneTextBox(
                                  context,
                                  phoneController,
                                  phoneFocus,
                                  onChanged: (CountryCodeCustom? code) => context
                                      .read<AuthBloc>()
                                      .add(DialCodeChanged(code!.dialCode!)),
                                ),
                                VSpace(Sizes.s33),
                                // Next Button
                                BlocBuilder<AuthBloc, AuthState>(
                                  buildWhen: (prev, curr) =>
                                      (prev is AuthLoading) !=
                                      (curr is AuthLoading),
                                  builder: (context, state) {
                                    final isLoading = state is AuthLoading;
                                    return ButtonCommon(
                                      title: language(context, appFonts.next),
                                      isLoading: isLoading,
                                      onTap: isLoading
                                          ? null
                                          : () {
                                              final firstName =
                                                  firstNameController.text.trim();
                                              final lastName = lastNameController
                                                  .text
                                                  .trim();
                                              final phone = phoneController.text
                                                  .trim();
                                              if (firstName.isNotEmpty &&

                                                  phone.isNotEmpty) {
                                                context.read<AuthBloc>().add(
                                                  StoreProfileData(
                                                    firstName: firstName,
                                                    lastName: lastName,
                                                    phone: phone,
                                                    email:
                                                        context
                                                            .read<AuthBloc>()
                                                            .profileData
                                                            ?.email ??
                                                        '',
                                                  ),
                                                );

                                                Navigator.pushNamed(
                                                  context,
                                                  routeName.createPasswordScreen,
                                                  arguments: {
                                                    'isJoined': isJoined,
                                                    'joinedTeamName':
                                                        joinedTeamName,
                                                  },
                                                );
                                              } else {
                                                AppToast.showError(
                                                  appFonts.pleaseFillAllFields,
                                                );
                                              }
                                            },
                                    );
                                  },
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
