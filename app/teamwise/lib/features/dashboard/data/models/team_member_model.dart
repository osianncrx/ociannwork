// Team Members Screen Model
class TeamMemberModel {
  final String id;
  final String name;
  final String email;
  final String? avatarUrl;
  final String? phone;
  final String role;
  final String status;
  final String displayName;
  final DateTime? joinedAt;

  TeamMemberModel({
    required this.id,
    required this.name,
    required this.email,
    this.avatarUrl,
    this.phone,
    required this.role,
    required this.status,
    required this.displayName,
    this.joinedAt,
  });

  factory TeamMemberModel.fromJson(Map<String, dynamic> json) {
    return TeamMemberModel(
      id: json['id'].toString(),
      name: json['name'] ?? '',
      email: json['email'] ?? '',
      avatarUrl: json['avatar'],
      phone: json['phone'],
      role: json['team_role'] ?? 'member',
      status: json['status'] ?? 'inactive',
      displayName: json['display_name'] ?? json['name'] ?? '',
      joinedAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'])
          : null,
    );
  }
}



// Contact/Directory Screen Model
class ContactModel {
  final String id;
  final String name;
  final String? email;
  final String? phone;
  final String? avatarUrl;
  final bool isTeamMember;
  final String? department;

  ContactModel({
    required this.id,
    required this.name,
    this.email,
    this.phone,
    this.avatarUrl,
    this.isTeamMember = false,
    this.department,
  });

  factory ContactModel.fromJson(Map<String, dynamic> json) {
    return ContactModel(
      id: json['id'].toString(),
      name: json['name'] ?? json['contact_name'] ?? '',
      email: json['email'],
      phone: json['phone'],
      avatarUrl: json['avatar'],
      isTeamMember: json['is_team_member'] ?? false,
      department: json['department'],
    );
  }
}
