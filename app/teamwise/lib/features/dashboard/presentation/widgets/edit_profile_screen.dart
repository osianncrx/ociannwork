import 'dart:developer';
import 'package:teamwise/common/widgets/country_picker_custom/country_code_custom.dart';
import 'package:image_picker/image_picker.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:teamwise/core/network/app_constants.dart';
import 'package:teamwise/features/dashboard/data/datasources/dashboard_api.dart';
import '../../../../config.dart';
import '../../../../core/network/api_manger.dart';
import '../../../auth/data/datasources/auth_api.dart';
import '../../../auth/data/models/custom_fields.dart';

class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({super.key});

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  late TextEditingController firstNameController;
  late TextEditingController lastNameController;
  late TextEditingController phoneController;
  late TextEditingController emailController;
  final firstNameFocus = FocusNode();
  final lastNameFocus = FocusNode();
  final phoneFocus = FocusNode();

  String? selectedAvatarPath;
  String? selectedCountryCode;
  bool _isPersonalExpanded = false;
  bool _isContactExpanded = false;
  bool _isMoreInfoExpanded = false;
  String? selectedCountry;
  List<CustomFieldModel> fields = [];
  final Map<String, String?> selectedValues = {};
  bool isLoading = true;
  bool isSaving = false;
  Color? profileColor; // ✅ Added

  Map<String, String> parseCustomField(String? raw) {
    if (raw == null || raw.isEmpty) return {};
    final cleaned = raw.replaceAll("{", "").replaceAll("}", "").trim();
    final pairs = cleaned.split(",").map((e) => e.trim());
    final map = <String, String>{};

    for (var pair in pairs) {
      final parts = pair.split(":");
      if (parts.length == 2) {
        final key = parts[0].trim();
        final value = parts[1].trim();
        map[key] = value;
      }
    }
    return map;
  }

  Future<void> _fetchFields() async {
    try {
      fields = await AuthApi(serviceLocator<ApiManager>()).getAllFields();
      log("message dropdown ${fields.first.value}");
      // Load user details after fields are fetched to ensure proper mapping
      await _loadUserDetails();
    } catch (e) {
      AppToast.showError("Failed to load fields");
    } finally {
      setState(() => isLoading = false);
    }
  }

  @override
  void initState() {
    super.initState();
    final authState = context.read<AuthBloc>().state;

    firstNameController = TextEditingController();
    lastNameController = TextEditingController();
    phoneController = TextEditingController();
    emailController = TextEditingController(); // Always initialized

    if (authState is AuthSuccess) {
      if (authState.userName != null) {
        final nameParts = authState.userName!.split(' ');
        firstNameController.text = nameParts.isNotEmpty ? nameParts.first : '';
        lastNameController.text = nameParts.length > 1
            ? nameParts.sublist(1).join(' ')
            : '';
      }
      if (authState.userEmail != null) {
        emailController.text = authState.userEmail!;
      }
    }

    // Fetch fields first, then load user details
    _fetchFields();
  }

  @override
  void dispose() {
    firstNameController.dispose();
    lastNameController.dispose();
    phoneController.dispose();
    firstNameFocus.dispose();
    lastNameFocus.dispose();
    phoneFocus.dispose();
    super.dispose();
  }

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

  // Update the avatar section in your build method:
  Widget _buildAvatarSection() {
    // fallback initials
    String initials = "";
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
                  : Container(
                      width: 100,
                      height: 100,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(20),
                        color:
                            profileColor ??
                            appColor(context).primary.withValues(alpha: 0.2),
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
              child: GestureDetector(
                onTap: selectedAvatarPath != null ? _removeImage : _pickImage,
                child: Container(
                  height: selectedAvatarPath != null ? 24 : 28,
                  width: selectedAvatarPath != null ? 24 : 28,
                  decoration: BoxDecoration(
                    color: selectedAvatarPath != null
                        ? Colors.red
                        : Colors.white,
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
                    selectedAvatarPath != null
                        ? Icons.remove
                        : Icons.camera_alt,
                    size: 16,
                    color: selectedAvatarPath != null
                        ? Colors.white
                        : appColor(context).lightText,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Remove selected image
  void _removeImage() {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Remove Avatar'),
          content: const Text('Are you sure you want to remove this avatar?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () {
                setState(() {
                  selectedAvatarPath = null;
                });
                Navigator.pop(context);
                log('🗑️ Avatar removed');
                ScaffoldMessenger.of(
                  context,
                ).showSnackBar(const SnackBar(content: Text('Avatar removed')));
              },
              child: const Text('Remove', style: TextStyle(color: Colors.red)),
            ),
          ],
        );
      },
    );
  }

  Future<void> _loadUserDetails() async {
    try {
      final details = await DashboardApi(
        serviceLocator<ApiManager>(),
        serviceLocator<AuthBloc>(),
      ).getUserDetails(); // API call
      if (details.user.profileColor != null &&
          details.user.profileColor!.isNotEmpty) {
        setState(() {
          profileColor = Color(
            int.parse(details.user.profileColor!.replaceFirst('#', '0xff')),
          );
        });
      }
      if (details.user.name != null) {
        final nameParts = details.user.name!.split(" ");
        firstNameController.text = nameParts.isNotEmpty ? nameParts.first : '';
        lastNameController.text = nameParts.length > 1
            ? nameParts.sublist(1).join(" ")
            : '';
      }
      log("custom_field::$fields");
      emailController.text = details.user.email;
      log("details.user.phone::${details.user.profileColor}");
      phoneController.text = details.user.phone ?? '';
      selectedCountryCode = details.user.countryCode;
      selectedCountry = details.user.country;
      if (details.user.avatar != null) {
        setState(() {
          selectedAvatarPath = details.user.avatar; // Network avatar
        });
      }
      SharedPreferences preferences = await SharedPreferences.getInstance();

      final customFiled = preferences.getString("customFiled");
      final customFieldString = customFiled;
      final customFieldMap = parseCustomField(customFieldString);

      if (customFieldMap.isNotEmpty) {
        setState(() {
          for (var entry in customFieldMap.entries) {
            final key = entry.key;
            final value = entry.value;

            final matchingField = fields.firstWhere(
              (field) => field.fieldName?.toLowerCase() == key.toLowerCase(),
              orElse: () => CustomFieldModel(),
            );

            if (matchingField.fieldName != null && value.isNotEmpty) {
              selectedValues[matchingField.fieldName!] = value;
              log("Auto-filled ${matchingField.fieldName} = $value");
            }
          }
        });
      }
      // ✅ Add this block to prefill custom fields
      final customFields = details.member?.customField;

      if (customFields != null &&
          customFields.isNotEmpty &&
          fields.isNotEmpty) {
        setState(() {
          customFields.forEach((apiKey, value) {
            // Find matching field from fields list (case-insensitive)
            final matchingField = fields.firstWhere(
              (field) => field.fieldName?.toLowerCase() == apiKey.toLowerCase(),
              orElse: () => CustomFieldModel(),
            );

            if (matchingField.fieldName != null && value != null) {
              // Ensure the value matches one of the options if it's a dropdown
              final options = matchingField.value
                  ?.split(',')
                  .map((e) => e.trim())
                  .where((e) => e.isNotEmpty)
                  .toList();

              String valueToSet = value.toString();

              if (options != null && options.isNotEmpty) {
                // Try to find a case-insensitive match in options
                final matchingOption = options.firstWhere(
                  (opt) => opt.toLowerCase() == valueToSet.toLowerCase(),
                  orElse: () => "",
                );
                if (matchingOption.isNotEmpty) {
                  valueToSet = matchingOption;
                }
              }

              selectedValues[matchingField.fieldName!] = valueToSet;
              log("Mapped ${matchingField.fieldName} = $valueToSet");
            }
          });
        });
        log("Prefilled custom fields: $selectedValues");
      } else {
        log(
          "No custom fields to prefill or fields not loaded yet. CustomFields: ${customFields?.keys}, Fields count: ${fields.length}",
        );
      }
    } catch (e) {
      log("Failed to load user details: $e");
    }
  }

  Widget _buildToggleHeader(String title, bool isSelected, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
        decoration: BoxDecoration(
          color: isSelected
              ? appColor(context).primary.withValues(alpha: 0.1)
              : appColor(context).primary.withValues(alpha: 0.05),
          borderRadius: BorderRadius.circular(15),
          border: Border.all(
            color: isSelected
                ? appColor(context).primary
                : appColor(context).textFiledBorder.withValues(alpha: 0.5),
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              title,
              style: appCss.dmSansBold16.textColor(appColor(context).darkText),
            ),
            Icon(
              isSelected ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
              color: appColor(context).darkText,
            ),
          ],
        ),
      ),
    );
  }

  // Update the button onTap method:
  Future<void> _onNextTapped() async {
    // Validate form
    if (firstNameController.text.trim().isEmpty) {
      AppToast.showError('Please enter first name');
      return;
    }

    if (lastNameController.text.trim().isEmpty) {
      AppToast.showError('Please enter last name');
      return;
    }
    await AuthApi(
      serviceLocator<ApiManager>(),
    ).updateUserFieldValue(selectedValues);

    log(
      "message-=-=-=-=-=-=-=$selectedAvatarPath, $selectedCountryCode, $selectedCountry, $selectedValues",
    );
    // Trigger the update profile event
    context.read<AuthBloc>().add(
      UpdateProfileRequested(
        firstName: firstNameController.text.trim(),
        lastName: lastNameController.text.trim(),
        avatarPath: selectedAvatarPath == null ? null : selectedAvatarPath,
        phone: phoneController.text.trim().isNotEmpty
            ? phoneController.text.trim()
            : null,
        countryCode: selectedCountryCode,
        country: selectedCountry,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<AuthBloc, AuthState>(
      listener: (context, state) {
        if (state is AuthSuccess) {
          AppToast.showMessage(state.message);
          Navigator.pop(context);
        } else if (state is AuthFailure) {
          AppToast.showError(state.error);
        }
      },
      child: WillPopScope(
        onWillPop: () async {
          serviceLocator<DashboardBloc>().add(RefreshChats());
          return true;
        },
        child: Scaffold(
          resizeToAvoidBottomInset: false,
          body: Container(
            height: double.infinity,
            width: double.infinity,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  appColor(context).commonBgColor,
                  appColor(context).white,
                  appColor(context).white,
                ],
              ),
            ),
            child: SafeArea(
              child: Column(
                children: [
                  Expanded(
                    child: SingleChildScrollView(
                      padding: EdgeInsets.only(
                        bottom: MediaQuery.of(context).viewInsets.bottom,
                      ),
                      child: Stack(
                        alignment: AlignmentGeometry.topCenter,
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
                          Column(
                            children: [
                              CommonCardContainer(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      "Edit Profile",
                                      style: appCss.dmSansExtraBold18.textColor(
                                        appColor(context).darkText,
                                      ),
                                    ),
                                    VSpace(Sizes.s20),
                                    _buildToggleHeader(
                                      "Personal Information",
                                      _isPersonalExpanded,
                                      () => setState(
                                        () => _isPersonalExpanded =
                                            !_isPersonalExpanded,
                                      ),
                                    ),
                                    if (_isPersonalExpanded) ...[
                                      VSpace(Sizes.s10),
                                      Center(child: _buildAvatarSection()),
                                      VSpace(Sizes.s25),
                                      Column(
                                        mainAxisAlignment:
                                            MainAxisAlignment.spaceBetween,
                                        mainAxisSize: MainAxisSize.min,
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Row(
                                            children: [
                                              Expanded(
                                                child: Text(
                                                  appFonts.firstName,
                                                  style: appCss.dmSansSemiBold16
                                                      .textColor(
                                                        appColor(
                                                          context,
                                                        ).darkText,
                                                      ),
                                                ),
                                              ),
                                              HSpace(Sizes.s20),
                                              Expanded(
                                                child: Text(
                                                  appFonts.lastName,
                                                  style: appCss.dmSansSemiBold16
                                                      .textColor(
                                                        appColor(
                                                          context,
                                                        ).darkText,
                                                      ),
                                                ),
                                              ),
                                            ],
                                          ),
                                          Row(
                                            children: [
                                              Expanded(
                                                child: isDark(context)
                                                    ? GlassTextFieldCommon(
                                                        validator: (name) =>
                                                            Validation()
                                                                .nameValidation(
                                                                  context,
                                                                  name,
                                                                ),
                                                        controller:
                                                            firstNameController,
                                                        hintText: language(
                                                          context,
                                                          appFonts.firstName,
                                                        ),
                                                        keyboardType:
                                                            TextInputType.name,
                                                        focusNode:
                                                            firstNameFocus,
                                                      ).paddingDirectional(
                                                        top: Sizes.s8,
                                                        bottom: Sizes.s7,
                                                      )
                                                    : TextFieldCommon(
                                                        validator: (name) =>
                                                            Validation()
                                                                .nameValidation(
                                                                  context,
                                                                  name,
                                                                ),
                                                        controller:
                                                            firstNameController,
                                                        hintText: language(
                                                          context,
                                                          appFonts.firstName,
                                                        ),
                                                        keyboardType:
                                                            TextInputType.name,
                                                        focusNode:
                                                            firstNameFocus,
                                                      ).paddingDirectional(
                                                        top: Sizes.s8,
                                                        bottom: Sizes.s7,
                                                      ),
                                              ),
                                              HSpace(Sizes.s20),
                                              Expanded(
                                                child:
                                                    Theme.of(
                                                          context,
                                                        ).brightness ==
                                                        Brightness.dark
                                                    ? GlassTextFieldCommon(
                                                        validator: (name) =>
                                                            Validation()
                                                                .nameValidation(
                                                                  context,
                                                                  name,
                                                                ),
                                                        controller:
                                                            lastNameController,
                                                        hintText: language(
                                                          context,
                                                          appFonts.lastName,
                                                        ),
                                                        keyboardType:
                                                            TextInputType.name,
                                                        focusNode:
                                                            lastNameFocus,
                                                      ).paddingDirectional(
                                                        top: Sizes.s8,
                                                        bottom: Sizes.s7,
                                                      )
                                                    : TextFieldCommon(
                                                        validator: (name) =>
                                                            Validation()
                                                                .nameValidation(
                                                                  context,
                                                                  name,
                                                                ),
                                                        controller:
                                                            lastNameController,
                                                        hintText: language(
                                                          context,
                                                          appFonts.lastName,
                                                        ),
                                                        keyboardType:
                                                            TextInputType.name,
                                                        focusNode:
                                                            lastNameFocus,
                                                      ).paddingDirectional(
                                                        top: Sizes.s8,
                                                        bottom: Sizes.s7,
                                                      ),
                                              ),
                                            ],
                                          ),
                                        ],
                                      ),
                                    ],
                                    VSpace(Sizes.s15),
                                    _buildToggleHeader(
                                      "Contact Information",
                                      _isContactExpanded,
                                      () => setState(
                                        () => _isContactExpanded =
                                            !_isContactExpanded,
                                      ),
                                    ),
                                    if (_isContactExpanded) ...[
                                      VSpace(Sizes.s10),
                                      Text(
                                        appFonts.email,
                                        style: appCss.dmSansSemiBold16
                                            .textColor(
                                              appColor(context).darkText,
                                            ),
                                      ).paddingDirectional(
                                        top: Sizes.s10,
                                        bottom: Sizes.s8,
                                      ),
                                      Theme.of(context).brightness ==
                                              Brightness.dark
                                          ? GlassTextFieldCommon(
                                              readOnly: true,
                                              isEnable: true,
                                              controller: emailController,
                                              hintText: language(
                                                context,
                                                appFonts.email,
                                              ),
                                              keyboardType:
                                                  TextInputType.emailAddress,
                                            ).paddingDirectional(
                                              top: Sizes.s8,
                                              bottom: Sizes.s7,
                                            )
                                          : TextFieldCommon(
                                              readOnly: true,
                                              controller: emailController,
                                              hintText: language(
                                                context,
                                                appFonts.email,
                                              ),
                                              keyboardType:
                                                  TextInputType.emailAddress,
                                            ).paddingDirectional(
                                              top: Sizes.s8,
                                              bottom: Sizes.s7,
                                            ),
                                      Text(
                                        appFonts.phone,
                                        style: appCss.dmSansSemiBold16
                                            .textColor(
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
                                        initialSelection: selectedCountryCode,
                                        onChanged: (CountryCodeCustom? code) {
                                          if (code != null) {
                                            setState(() {
                                              selectedCountryCode =
                                                  code.dialCode;
                                              selectedCountry = code.name;
                                            });
                                            context.read<AuthBloc>().add(
                                              DialCodeChanged(code.dialCode!),
                                            );
                                          }
                                        },
                                      ),
                                      VSpace(Sizes.s10),
                                    ],
                                    if (fields.isNotEmpty) ...[
                                      VSpace(Sizes.s15),
                                      _buildToggleHeader(
                                        "More Info",
                                        _isMoreInfoExpanded,
                                        () => setState(
                                          () => _isMoreInfoExpanded =
                                              !_isMoreInfoExpanded,
                                        ),
                                      ),
                                      if (_isMoreInfoExpanded) ...[
                                        ...fields.map((field) {
                                          final options = field.value
                                              ?.split(',')
                                              .map((e) => e.trim())
                                              .where((e) => e.isNotEmpty)
                                              .toList();

                                          final title =
                                              field.description!.isNotEmpty
                                              ? field.description
                                              : field.fieldName;

                                          String? currentValue =
                                              selectedValues[field.fieldName];

                                          return Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              VSpace(Sizes.s15),
                                              Text(
                                                title!,
                                                style: appCss.dmSansMedium14
                                                    .textColor(
                                                      appColor(
                                                        context,
                                                      ).darkText,
                                                    ),
                                              ),
                                              VSpace(Sizes.s8),
                                              Container(
                                                decoration: BoxDecoration(
                                                  borderRadius:
                                                      BorderRadius.circular(30),
                                                  border: BoxBorder.all(
                                                    color: appColor(
                                                      context,
                                                    ).textFiledBorder,
                                                  ),
                                                ),
                                                child: DropdownButtonFormField<String>(
                                                  hint: Text("Select Value")
                                                      .paddingDirectional(
                                                        horizontal: Sizes.s10,
                                                      ),
                                                  icon:
                                                      SvgPicture.asset(
                                                        svgAssets.arrowDown,
                                                      ).paddingDirectional(
                                                        horizontal: Sizes.s10,
                                                      ),
                                                  value:
                                                      (currentValue != null &&
                                                          options!.contains(
                                                            currentValue,
                                                          ))
                                                      ? currentValue
                                                      : null,
                                                  isExpanded: true,
                                                  decoration: InputDecoration(
                                                    contentPadding:
                                                        EdgeInsets.fromLTRB(
                                                          0,
                                                          5,
                                                          0,
                                                          5,
                                                        ),
                                                    border: OutlineInputBorder(
                                                      borderRadius:
                                                          BorderRadius.circular(
                                                            30,
                                                          ),
                                                    ),
                                                    enabled: false,
                                                    fillColor: appColor(
                                                      context,
                                                    ).white,
                                                    filled: true,
                                                  ),
                                                  items: options
                                                      ?.map(
                                                        (v) => DropdownMenuItem(
                                                          value: v,
                                                          child: Text(v)
                                                              .paddingDirectional(
                                                                horizontal:
                                                                    Sizes.s10,
                                                              ),
                                                        ),
                                                      )
                                                      .toList(),
                                                  onChanged: (val) {
                                                    log("selected value $val");
                                                    setState(() {
                                                      selectedValues[field
                                                                  .fieldName ??
                                                              ''] =
                                                          val;
                                                    });
                                                  },
                                                ),
                                              ),
                                            ],
                                          );
                                        }),
                                      ],
                                    ],
                                    VSpace(Sizes.s20),
                                  ],
                                ),
                              ),
                            ],
                          ).padding(top: Sizes.s165),
                        ],
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 20,
                      vertical: 10,
                    ),
                    child: BlocBuilder<AuthBloc, AuthState>(
                      builder: (context, state) {
                        return ButtonCommon(
                          title: language(context, appFonts.update),
                          isLoading: state is AuthLoading,
                          onTap: _onNextTapped,
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
