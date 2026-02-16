class CustomFieldModel {
  final int? id;
  final int? teamId;
  final String? fieldName;
  final String? description;
  final String? value;
  final bool? isUserAddValue;
  final bool? isMandatory;
  final bool? isUserEditable;

  CustomFieldModel({
    this.id,
    this.teamId,
    this.fieldName,
    this.description,
    this.value,
    this.isUserAddValue,
    this.isMandatory,
    this.isUserEditable,
  });

  factory CustomFieldModel.fromJson(Map<String, dynamic>? json) {
    if (json == null) return CustomFieldModel();

    return CustomFieldModel(
      id: json['id'] as int?,
      teamId: json['team_id'] as int?,
      fieldName: json['field_name'] as String?,
      description: json['description'] as String? ?? '',
      value: json['value'] as String? ?? '',
      isUserAddValue: json['is_user_add_value'] as bool? ?? false,
      isMandatory: json['is_mandatory'] as bool? ?? false,
      isUserEditable: json['is_user_editable'] as bool? ?? false,
    );
  }
}
