import 'dart:developer';
import 'package:intl/intl.dart';
import '../../config.dart';

class Validation {
  RegExp digitRegex = RegExp(
    r'^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$',
  );
  RegExp emailRegex = RegExp(
    r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$',
  );

  RegExp regex = RegExp(r'(^(?:[+0]9)?[0-9]{6,15}$)');
  RegExp passRegex = RegExp(
    "^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@\$%^&*-]).{8,}\$",
  );
  RegExp zipRegex = RegExp("^d{5}(?:[-s]d{4})?\$");

  // Zip Code Validation
  zipCodeValidation(context, zipCode) {
    if (zipCode.isEmpty) {
      return language(context, "appFonts.enterZip");
    }
    return null;
  }

  validateMobile(value) {
    String patttern = r'(^(?:[+0]9)?[0-9]{10,12}$)';
    RegExp regExp = RegExp(patttern);
    if (value.isEmpty) {
      return false;
    } else if (!regExp.hasMatch(value)) {
      return false;
    }
    return null;
  }

  // City validation
  cityValidation(context, name) {
    if (name.isEmpty) {
      return language(context, "appFonts.pleaseCity");
    }
    return null;
  }

  // Email Validation
  emailValidation(context, email) {
    if (email.isEmpty) {
      return language(context, appFonts.pleaseEnterEmail);
    } else if (!emailRegex.hasMatch(email)) {
      return language(context, appFonts.pleaseEnterValidEmail);
    }
    return null;
  }

  // Password Validation
  passValidation(context, password) {
    if (password.isEmpty) {
      return language(context, appFonts.enterPass);
    }
    // if(password.length<8){
    //   return language(context, "Please enter 8 character password");
    // }
    //)
    // if (!passRegex.hasMatch(password)) {
    //   return language(context, appFonts.pleaseEnterPassword);
    // }

    return null;
  }

  //confirm Password Validation

  confirmPassValidation(context, password, pass) {
    if (password.isEmpty) {
      return language(context, appFonts.enterPass);
    }
    // if(password.length<8){
    //   return language(context, "Please enter 8 character password");
    // }

    if (password != pass) {
      return language(context, appFonts.notMatch);
    }
    return null;
  }

  // name validation
  teamNameValidation(context, name) {
    if (name.isEmpty) {
      return language(context, appFonts.pleaseEnterValidTeamName);
    }
    return null;
  }

  //service name validation
  nameValidation(context, name) {
    if (name.isEmpty) {
      return language(context, "Please Enter Name ");
    }
    return null;
  }

  // phone validation
  phoneValidation(context, phone) {
    if (phone.isEmpty) {
      return language(context, appFonts.pleaseEnterNumber);
    }
    if (!regex.hasMatch(phone)) {
      return language(context, appFonts.pleaseEnterValidNumber);
    }

    return null;
  }

  // Otp Validation
  otpValidation(context, value) {
    if (value!.isEmpty) {
      return language(context, appFonts.enterOtp);
    }
    if (!regex.hasMatch(value)) {
      return language(context, appFonts.enterValidOtp);
    }
    return null;
  }

  // Common field validation
  commonValidation(context, value) {
    if (value!.isEmpty) {
      return language(context, "appFonts.pleaseEnterValue");
    }
  }

  // dynamic field validation
  dynamicTextValidation(context, value, text) {
    log("VCC :$value");
    if (value!.isEmpty) {
      return language(context, text);
    }
  }

  // country state  field validation
  countryStateValidation(context, value, text) {
    if (value == null) {
      return language(context, text);
    }
  }

  //focus node change
  fieldFocusChange(
    BuildContext context,
    FocusNode currentFocus,
    FocusNode nextFocus,
  ) {
    currentFocus.unfocus();
    FocusScope.of(context).requestFocus(nextFocus);
  }

  String formatTimeFromApi(String utcString) {
    final DateTime utcTime = DateTime.parse(utcString); // reads Z = UTC
    final DateTime localTime = utcTime
        .toLocal(); // converts to IST automatically

    return DateFormat('hh:mm a').format(localTime);
  }
}
