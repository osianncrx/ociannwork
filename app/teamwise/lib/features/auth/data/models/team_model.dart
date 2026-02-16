class TeamModel {
  final int id;
  final String name;
  final int memberCount;
  final String status;

  TeamModel({
    required this.id,
    required this.name,
    required this.memberCount,
    required this.status,
  });

  factory TeamModel.fromJson(Map<String, dynamic> json) => TeamModel(
    id: json['id'],
    name: json['name'],
    memberCount: json['memberCount'],
    status: json['status'],
  );
}
