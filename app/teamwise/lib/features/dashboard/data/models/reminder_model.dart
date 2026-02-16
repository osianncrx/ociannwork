// ignore_for_file: unnecessary_this, unnecessary_question_mark

class RemindersModel {
  String? message;
  List<ReminderData>? data;

  RemindersModel({this.message, this.data});

  RemindersModel.fromJson(Map<String, dynamic> json) {
    message = json['message'];
    if (json['data'] != null) {
      data = <ReminderData>[];
      json['data'].forEach((v) {
        data!.add(ReminderData.fromJson(v));
      });
    }
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = <String, dynamic>{};
    data['message'] = this.message;
    if (this.data != null) {
      data['data'] = this.data!.map((v) => v.toJson()).toList();
    }
    return data;
  }
}

class ReminderData {
  int? id;
  int? teamId;
  int? userId;
  int? recipientId;
  int? channelId;
  dynamic? messageId;
  String? remindAt;
  String? note;
  bool? isSent;
  String? createdAt;
  String? updatedAt;
  dynamic? deletedAt;
  User? user;
  User? recipient;
  Channel? channel;
  dynamic? message;

  ReminderData({
    this.id,
    this.teamId,
    this.userId,
    this.recipientId,
    this.channelId,
    this.messageId,
    this.remindAt,
    this.note,
    this.isSent,
    this.createdAt,
    this.updatedAt,
    this.deletedAt,
    this.user,
    this.recipient,
    this.channel,
    this.message,
  });

  ReminderData.fromJson(Map<String, dynamic> json) {
    id = json['id'];
    teamId = json['team_id'];
    userId = json['user_id'];
    recipientId = json['recipient_id'];
    channelId = json['channel_id'];
    messageId = json['message_id'];
    remindAt = json['remind_at'];
    note = json['note'];
    isSent = json['is_sent'];
    createdAt = json['created_at'];
    updatedAt = json['updated_at'];
    deletedAt = json['deleted_at'];
    user = json['user'] != null ? User.fromJson(json['user']) : null;
    recipient = json['recipient'] != null
        ? User.fromJson(json['recipient'])
        : null;
    channel = json['channel'] != null
        ? Channel.fromJson(json['channel'])
        : null;
    message = json['message'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = <String, dynamic>{};
    data['id'] = this.id;
    data['team_id'] = this.teamId;
    data['user_id'] = this.userId;
    data['recipient_id'] = this.recipientId;
    data['channel_id'] = this.channelId;
    data['message_id'] = this.messageId;
    data['remind_at'] = this.remindAt;
    data['note'] = this.note;
    data['is_sent'] = this.isSent;
    data['created_at'] = this.createdAt;
    data['updated_at'] = this.updatedAt;
    data['deleted_at'] = this.deletedAt;
    if (this.user != null) {
      data['user'] = this.user!.toJson();
    }
    if (this.recipient != null) {
      data['recipient'] = this.recipient!.toJson();
    }
    if (this.channel != null) {
      data['channel'] = this.channel!.toJson();
    }
    data['message'] = this.message;
    return data;
  }
}

class User {
  int? id;
  String? name;
  String? email;
  String? avatar;

  User({this.id, this.name, this.email, this.avatar});

  User.fromJson(Map<String, dynamic> json) {
    id = json['id'];
    name = json['name'];
    email = json['email'];
    avatar = json['avatar'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = <String, dynamic>{};
    data['id'] = this.id;
    data['name'] = this.name;
    data['email'] = this.email;
    data['avatar'] = this.avatar;
    return data;
  }
}

class Channel {
  int? id;
  String? name;
  String? type;

  Channel({this.id, this.name, this.type});

  Channel.fromJson(Map<String, dynamic> json) {
    id = json['id'];
    name = json['name'];
    type = json['type'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = <String, dynamic>{};
    data['id'] = this.id;
    data['name'] = this.name;
    data['type'] = this.type;
    return data;
  }
}
