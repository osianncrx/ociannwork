import 'dart:developer';
import 'package:teamwise/features/auth/data/datasources/auth_api.dart';

import '../../../../config.dart';
import '../../../../core/network/api_manger.dart';
import '../../data/models/custom_fields.dart';

class CustomFieldsScreen extends StatefulWidget {
  const CustomFieldsScreen({super.key});

  @override
  State<CustomFieldsScreen> createState() => _CustomFieldsScreenState();
}

class _CustomFieldsScreenState extends State<CustomFieldsScreen> {
  List<CustomFieldModel> fields = [];
  final Map<String, String?> selectedValues = {};
  bool isLoading = true;
  bool isSaving = false;

  @override
  void initState() {
    super.initState();
    _fetchFields();
  }

  Future<void> _fetchFields() async {
    try {
      fields = await AuthApi(serviceLocator<ApiManager>()).getAllFields();
    } catch (e) {
      AppToast.showError("Failed to load fields");
    } finally {
      setState(() => isLoading = false);
    }
  }

  Future<void> _submit() async {
    setState(() => isSaving = true);
    try {
      await AuthApi(
        serviceLocator<ApiManager>(),
      ).updateUserFieldValue(selectedValues);
      // AppToast.showMessage("Profile updated successfully!");
      Navigator.pushNamedAndRemoveUntil(
        context,
        routeName.dashboard,
        (r) => false,
      );
    } catch (e) {
      AppToast.showError("Something went wrong!");
    } finally {
      setState(() => isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : _buildBody(context),
    );
  }

  Widget _buildBody(BuildContext context) {
    return Container(
      height: double.infinity,
      width: double.infinity,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [appColor(context).commonBgColor, appColor(context).white],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ),
      ),
      child: SafeArea(
        child: Column(
          children: [
            Stack(
              alignment: AlignmentGeometry.topCenter,
              children: [
                Container(
                  width: Sizes.s300,
                  height: Sizes.s470,
                  decoration: BoxDecoration(
                    image: DecorationImage(
                      image: AssetImage(imageAssets.createChannelBg),
                      alignment: Alignment.topCenter,
                    ),
                  ),
                ),
                SingleChildScrollView(
                  child: CommonCardContainer(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          appFonts.requiredDetailsFor,
                          style: appCss.dmSansExtraBold18.textColor(
                            appColor(context).darkText,
                          ),
                        ),
                        Text(
                          appFonts.personalizeYourTeam,
                          style: appCss.dmSansRegular14.textColor(
                            appColor(context).lightText,
                          ),
                        ).paddingDirectional(top: Sizes.s3, bottom: Sizes.s10),

                        // 🔽 Build dropdowns dynamically
                        ...fields.map((field) {
                          final options = field.value
                              ?.split(',')
                              .map((e) => e.trim())
                              .where((e) => e.isNotEmpty)
                              .toList();
                          final title = field.description!.isNotEmpty
                              ? field.description
                              : field.fieldName;

                          return Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              VSpace(Sizes.s15),
                              Text(
                                title!,
                                style: appCss.dmSansMedium14.textColor(
                                  appColor(context).darkText,
                                ),
                              ),
                              VSpace(Sizes.s8),
                              DropdownButtonFormField<String>(
                                hint: Text(
                                  "Select Value",
                                ).paddingDirectional(horizontal: Sizes.s10),
                                icon: SvgPicture.asset(
                                  svgAssets.arrowDown,
                                ).paddingDirectional(horizontal: Sizes.s10),
                                value: selectedValues[field.fieldName],
                                isExpanded: true,
                                decoration: InputDecoration(
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(30),
                                  ),
                                  enabled: false,
                                  fillColor: appColor(context).white,
                                  filled: true,
                                ),

                                items: options
                                    ?.map(
                                      (v) => DropdownMenuItem(
                                        value: v,
                                        child: Text(v).paddingDirectional(
                                          horizontal: Sizes.s10,
                                        ),
                                      ),
                                    )
                                    .toList(),
                                onChanged: (val) {
                                  setState(() {
                                    selectedValues[field.fieldName ?? ''] = val;
                                  });
                                  log("Selected ${field.fieldName}: $val");
                                },
                              ),
                            ],
                          );
                        }),

                        const SizedBox(height: 32),
                        ButtonCommon(
                          title: language(context, appFonts.next),
                          isLoading: isSaving,
                          onTap: isSaving ? null : _submit,
                        ),
                      ],
                    ),
                  ),
                ).paddingDirectional(top: Sizes.s100),
              ],
            ),
            Spacer(),
            remindMeLater(context),
          ],
        ),
      ),
    );
  }
}
