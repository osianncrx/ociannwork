import 'dart:ui';

import '../../config.dart';

class TextFieldCommon extends StatelessWidget {
  final String hintText;
  final FormFieldValidator<String>? validator;
  final TextEditingController? controller;
  final Widget? suffixIcon;
  final String? prefixIcon;
  final Color? fillColor, borderColor;
  final Color? prefixColor;
  final bool obscureText;
  final double? vertical, radius, hPadding;
  final InputBorder? border;
  final TextInputType? keyboardType;
  final FocusNode? focusNode;
  final ValueChanged<String>? onChanged;
  final int? maxLength, minLines, maxLines;
  final ValueChanged<String>? onFieldSubmitted;
  final String? counterText;
  final TextStyle? hintStyle, style;
  final bool isNumber, isEnable, readOnly;
  final GestureTapCallback? onTap, prefixTap;
  final TextCapitalization textCapitalization;
  final TextInputAction? textInputAction;
  final List<TextInputFormatter>? inputFormatters;
  final EdgeInsets? scrollPadding;
  const TextFieldCommon({
    super.key,
    required this.hintText,
    this.validator,
    this.controller,
    this.suffixIcon,
    this.prefixIcon,
    this.fillColor,
    this.prefixColor,
    this.obscureText = false,
    this.vertical,
    this.radius,
    this.readOnly = false,
    this.hPadding,
    this.keyboardType,
    this.focusNode,
    this.onChanged,
    this.onFieldSubmitted,
    this.maxLength,
    this.minLines,
    this.maxLines,
    this.counterText,
    this.borderColor,
    this.hintStyle,
    this.style,
    this.isNumber = false,
    this.isEnable = true,
    this.onTap,
    this.prefixTap,
    this.textCapitalization = TextCapitalization.none,
    this.textInputAction,
    this.inputFormatters,
    this.border,
    this.scrollPadding,
  });

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => CommonBloc(validator: validator),
      child: _TextFieldCommonBody(this),
    );
  }
}

class _TextFieldCommonBody extends StatefulWidget {
  final TextFieldCommon w;
  const _TextFieldCommonBody(this.w);

  @override
  State<_TextFieldCommonBody> createState() => _TextFieldCommonBodyState();
}

class _TextFieldCommonBodyState extends State<_TextFieldCommonBody> {
  late final TextEditingController _ctrl;
  late final FocusNode _fNode;
  late final CommonBloc _bloc;

  // VoidCallback? _focusListener;
  // VoidCallback? _textListener;
  VoidCallback get _focusListener => () {
    if (!_bloc.isClosed) {
      _bloc.add(CommonFocusChanged(_fNode.hasFocus));
    }
  };

  VoidCallback get _textListener => () {
    final text = _ctrl.text;
    if (!_bloc.isClosed) {
      _bloc.add(CommonTextChanged(text));
    }
    widget.w.onChanged?.call(text);
  };

  @override
  void initState() {
    super.initState();
    _bloc = context.read<CommonBloc>();
    _ctrl = widget.w.controller ?? TextEditingController();
    _fNode = widget.w.focusNode ?? FocusNode();

    _fNode.addListener(_focusListener);
    _ctrl.addListener(_textListener);
  }

  @override
  void dispose() {
    if (_focusListener != null) {
      _fNode.removeListener(_focusListener!);
    }
    if (_textListener != null) {
      _ctrl.removeListener(_textListener!);
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = widget.w;

    return BlocBuilder<CommonBloc, CommonState>(
      builder: (context, fieldState) {
        return Theme(
          data: ThemeData(canvasColor: appColor(context).white),
          child: BlocSelector<LanguageBloc, LanguageState, String>(
            selector: (state) => state.locale.languageCode,
            builder: (context, localeCode) {
              final isRTL = localeCode == 'ar';
              return TextFormField(
                scrollPadding: c.scrollPadding ?? EdgeInsets.all(20),
                readOnly: c.readOnly,
                controller: _ctrl,
                focusNode: _fNode,
                obscureText: c.obscureText,
                enabled: c.isEnable,
                maxLength: c.maxLength,
                maxLines: c.maxLines,
                minLines: c.minLines,
                keyboardType: c.keyboardType,
                textInputAction: c.textInputAction,
                textCapitalization: c.textCapitalization,
                inputFormatters: c.inputFormatters,
                onTap: c.onTap,
                onFieldSubmitted: c.onFieldSubmitted,
                style:
                    c.style ??
                    appCss.dmSansMedium14.textColor(
                      appColor(context).drawerHeaderColor,
                    ),
                cursorColor: appColor(context).darkText,
                decoration: InputDecoration(
                  enabledBorder: OutlineInputBorder(
                    borderSide: BorderSide(
                      color:
                          c.borderColor ??
                          (isDark(context)
                              ? appColor(context).gray.withValues(alpha: 0.2)
                              : appColor(context).textFiledBorder),
                    ),
                    borderRadius: BorderRadius.circular(
                      c.radius ?? AppRadius.r30,
                    ),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderSide: BorderSide(
                      color: c.borderColor ?? appColor(context).primary,
                    ),
                    borderRadius: BorderRadius.circular(
                      c.radius ?? AppRadius.r30,
                    ),
                  ),
                  errorBorder: OutlineInputBorder(
                    borderSide: BorderSide(color: Colors.red),
                    borderRadius: BorderRadius.circular(
                      c.radius ?? AppRadius.r30,
                    ),
                  ),
                  focusedErrorBorder: OutlineInputBorder(
                    borderSide: BorderSide(color: Colors.redAccent, width: 2),
                    borderRadius: BorderRadius.circular(
                      c.radius ?? AppRadius.r30,
                    ),
                  ),

                  hintText: language(context, c.hintText),
                  hintStyle:
                      c.hintStyle ??
                      appCss.dmSansMedium14.textColor(
                        appColor(context).lightText,
                      ),
                  fillColor: c.fillColor ?? appColor(context).white,
                  filled: true,
                  counterText: c.counterText,
                  errorText: fieldState.error,
                  contentPadding: c.isNumber
                      ? EdgeInsets.only(
                          left: isRTL ? Insets.i15 : Sizes.s15,
                          right: isRTL ? Insets.i40 : Insets.i15,
                          top: Insets.i15,
                          bottom: Insets.i15,
                        )
                      : EdgeInsets.symmetric(
                          horizontal: c.hPadding ?? Insets.i12,
                          vertical: c.vertical ?? Insets.i12,
                        ),
                  suffixIcon: c.suffixIcon,
                  prefixIcon: c.isNumber
                      ? null
                      : (c.prefixIcon != null
                            ? SvgPicture.asset(
                                    c.prefixIcon!,
                                    colorFilter: ColorFilter.mode(
                                      c.prefixColor ??
                                          (isDark(context)
                                              ? appColor(context).lightText
                                              : appColor(context).darkText),
                                      BlendMode.srcIn,
                                    ),
                                  )
                                  .inkWell(onTap: c.prefixTap)
                                  .paddingDirectional(horizontal: Sizes.s13)
                            : null),
                  border:
                      c.border ??
                      OutlineInputBorder(
                        borderRadius: BorderRadius.circular(
                          c.radius ?? AppRadius.r30,
                        ),
                        borderSide: BorderSide(
                          color: appColor(context).textFiledBorder,
                        ),
                      ),
                  errorMaxLines: 2,
                ),
              );
            },
          ),
        );
      },
    );
  }
}

class GlassTextFieldCommon extends StatelessWidget {
  final String hintText;
  final FormFieldValidator<String>? validator;
  final TextEditingController? controller;
  final Widget? suffixIcon;
  final String? prefixIcon;
  final Color? fillColor, borderColor;
  final Color? prefixColor;
  final bool obscureText;
  final double? vertical, radius, hPadding;
  final InputBorder? border;
  final TextInputType? keyboardType;
  final FocusNode? focusNode;
  final ValueChanged<String>? onChanged;
  final int? maxLength, minLines, maxLines;
  final ValueChanged<String>? onFieldSubmitted;
  final String? counterText;
  final TextStyle? hintStyle, style;
  final bool isNumber, isEnable, readOnly;
  final GestureTapCallback? onTap, prefixTap;
  final TextCapitalization textCapitalization;
  final TextInputAction? textInputAction;
  final List<TextInputFormatter>? inputFormatters;
  final EdgeInsets? scrollPadding;
  const GlassTextFieldCommon({
    super.key,
    required this.hintText,
    this.validator,
    this.controller,
    this.suffixIcon,
    this.prefixIcon,
    this.fillColor,
    this.prefixColor,
    this.obscureText = false,
    this.vertical,
    this.radius,
    this.readOnly = false,
    this.hPadding,
    this.keyboardType,
    this.focusNode,
    this.onChanged,
    this.onFieldSubmitted,
    this.maxLength,
    this.minLines,
    this.maxLines,
    this.counterText,
    this.borderColor,
    this.hintStyle,
    this.style,
    this.isNumber = false,
    this.isEnable = true,
    this.onTap,
    this.prefixTap,
    this.textCapitalization = TextCapitalization.none,
    this.textInputAction,
    this.inputFormatters,
    this.border,
    this.scrollPadding,
  });

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => CommonBloc(validator: validator),
      child: _GlassTextFieldCommonBody(this),
    );
  }
}

class _GlassTextFieldCommonBody extends StatefulWidget {
  final GlassTextFieldCommon w;
  const _GlassTextFieldCommonBody(this.w);

  @override
  State<_GlassTextFieldCommonBody> createState() =>
      _GlassTextFieldCommonBodyState();
}

class _GlassTextFieldCommonBodyState extends State<_GlassTextFieldCommonBody> {
  late final TextEditingController _ctrl;
  late final FocusNode _fNode;
  late final CommonBloc _bloc;

  // VoidCallback? _focusListener;
  // VoidCallback? _textListener;
  VoidCallback get _focusListener => () {
    if (!_bloc.isClosed) {
      _bloc.add(CommonFocusChanged(_fNode.hasFocus));
    }
  };

  VoidCallback get _textListener => () {
    final text = _ctrl.text;
    if (!_bloc.isClosed) {
      _bloc.add(CommonTextChanged(text));
    }
    widget.w.onChanged?.call(text);
  };

  @override
  void initState() {
    super.initState();
    _bloc = context.read<CommonBloc>();
    _ctrl = widget.w.controller ?? TextEditingController();
    _fNode = widget.w.focusNode ?? FocusNode();

    _fNode.addListener(_focusListener);
    _ctrl.addListener(_textListener);
  }

  @override
  void dispose() {
    if (_focusListener != null) {
      _fNode.removeListener(_focusListener!);
    }
    if (_textListener != null) {
      _ctrl.removeListener(_textListener!);
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = widget.w;

    return BlocBuilder<CommonBloc, CommonState>(
      builder: (context, fieldState) {
        return Theme(
          data: ThemeData(canvasColor: appColor(context).white),
          child: BlocSelector<LanguageBloc, LanguageState, String>(
            selector: (state) => state.locale.languageCode,
            builder: (context, localeCode) {
              final isRTL = localeCode == 'ar';
              return Center(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(20),
                  child: BackdropFilter(
                    filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                    child: Container(
                      /*   padding: const EdgeInsets.symmetric(horizontal: 16), */
                      decoration: BoxDecoration(
                        color: appColor(context).gray.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(30),
                        /* border: Border.all(
                          color: Colors.white.withOpacity(0.2),
                        ), */
                      ),
                      child: TextFormField(
                        scrollPadding: c.scrollPadding ?? EdgeInsets.all(20),
                        readOnly: c.readOnly,
                        controller: _ctrl,
                        focusNode: _fNode,
                        obscureText: c.obscureText,
                        enabled: c.isEnable,
                        maxLength: c.maxLength,
                        maxLines: c.maxLines,
                        minLines: c.minLines,
                        keyboardType: c.keyboardType,
                        textInputAction: c.textInputAction,
                        textCapitalization: c.textCapitalization,
                        inputFormatters: c.inputFormatters,
                        onTap: c.onTap,
                        onFieldSubmitted: c.onFieldSubmitted,
                        style:
                            c.style ??
                            appCss.dmSansMedium14.textColor(
                              appColor(context).drawerHeaderColor,
                            ),
                        cursorColor: appColor(context).darkText,
                        decoration: InputDecoration(
                          enabledBorder: OutlineInputBorder(
                            borderSide: BorderSide(
                              color:
                                  c.borderColor ??
                                  appColor(context).gray.withValues(alpha: 0.5),
                            ),
                            borderRadius: BorderRadius.circular(
                              c.radius ?? AppRadius.r30,
                            ),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderSide: BorderSide(
                              color: c.borderColor ?? appColor(context).primary,
                            ),
                            borderRadius: BorderRadius.circular(
                              c.radius ?? AppRadius.r30,
                            ),
                          ),
                          errorBorder: OutlineInputBorder(
                            borderSide: BorderSide(color: Colors.red),
                            borderRadius: BorderRadius.circular(
                              c.radius ?? AppRadius.r30,
                            ),
                          ),
                          focusedErrorBorder: OutlineInputBorder(
                            borderSide: BorderSide(
                              color: Colors.redAccent,
                              width: 2,
                            ),
                            borderRadius: BorderRadius.circular(
                              c.radius ?? AppRadius.r30,
                            ),
                          ),

                          hintText: language(context, c.hintText),
                          hintStyle:
                              c.hintStyle ??
                              appCss.dmSansMedium14.textColor(
                                appColor(context).lightText,
                              ),
                          fillColor: c.fillColor ?? appColor(context).white,
                          /*       filled: true, */
                          counterText: c.counterText,
                          errorText: fieldState.error,
                          contentPadding: c.isNumber
                              ? EdgeInsets.only(
                                  left: isRTL ? Insets.i15 : Sizes.s15,
                                  right: isRTL ? Insets.i40 : Insets.i15,
                                  top: Insets.i15,
                                  bottom: Insets.i15,
                                )
                              : EdgeInsets.symmetric(
                                  horizontal: c.hPadding ?? Insets.i12,
                                  vertical: c.vertical ?? Insets.i12,
                                ),
                          suffixIcon: c.suffixIcon,
                          prefixIcon: c.isNumber
                              ? null
                              : (c.prefixIcon != null
                                    ? SvgPicture.asset(
                                            c.prefixIcon!,
                                            colorFilter: ColorFilter.mode(
                                              c.prefixColor ??
                                                  (Theme.of(
                                                            context,
                                                          ).brightness ==
                                                          Brightness.dark
                                                      ? appColor(
                                                          context,
                                                        ).lightText
                                                      : appColor(
                                                          context,
                                                        ).darkText),
                                              BlendMode.srcIn,
                                            ),
                                          )
                                          .inkWell(onTap: c.prefixTap)
                                          .paddingDirectional(
                                            horizontal: Sizes.s13,
                                          )
                                    : null),
                          border:
                              c.border ??
                              OutlineInputBorder(
                                borderRadius: BorderRadius.circular(
                                  c.radius ?? AppRadius.r30,
                                ),
                                borderSide: BorderSide(
                                  color: appColor(context).textFiledBorder,
                                ),
                              ),
                          errorMaxLines: 2,
                        ),
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        );
      },
    );
  }
}
