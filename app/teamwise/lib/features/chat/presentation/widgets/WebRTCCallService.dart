// WebRTCCallService.dart - UPDATED
import 'dart:async';
import 'dart:developer';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:flutter/material.dart';
import 'package:teamwise/core/utils/onesignal_service.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:teamwise/features/chat/presentation/widgets/ringtone_service.dart';
import '../../socket_service.dart';
import '../pages/call_screen.dart';

enum CallState { idle, outgoing, connecting, incoming, connected, ended }
enum CallType { audio, video }

class WebRTCCallService {
  static final WebRTCCallService _instance = WebRTCCallService._internal();
  factory WebRTCCallService() => _instance;
  WebRTCCallService._internal();

  final SocketService socketService = SocketService();

  RTCPeerConnection? _peerConnection;
  MediaStream? _localStream;
  MediaStream? _remoteStream;

  final _callStateController = StreamController<CallState>.broadcast();
  final _localStreamController = StreamController<MediaStream?>.broadcast();
  final _remoteStreamController = StreamController<MediaStream?>.broadcast();
  final _audioEnabledController = StreamController<bool>.broadcast();
  final _videoEnabledController = StreamController<bool>.broadcast();
  final _speakerEnabledController = StreamController<bool>.broadcast();

  Stream<CallState> get callStateStream => _callStateController.stream;
  Stream<MediaStream?> get localStreamStream => _localStreamController.stream;
  Stream<MediaStream?> get remoteStreamStream => _remoteStreamController.stream;
  Stream<bool> get audioEnabledStream => _audioEnabledController.stream;
  Stream<bool> get videoEnabledStream => _videoEnabledController.stream;
  Stream<bool> get speakerEnabledStream => _speakerEnabledController.stream;
  // Multi-participant fields
  final Map<String, RTCPeerConnection> _peerConnections = {};
  final Map<String, List<RTCIceCandidate>> _pendingIceCandidatesByUser = {};
  Completer<void>? _pcInitCompleter;


  CallState callState = CallState.idle;
  String? _currentCallId;
  bool _audioEnabled = true;
  bool _videoEnabled = true;
  bool _speakerOn = false;
  String? _recipientId;
  CallType? _callType;
  Map<String, dynamic>? _incomingCallData;
  String _currentChatType = 'dm';
  String? _currentChatId;

  Timer? _callTimeoutTimer;
  static const int CALL_TIMEOUT_SECONDS = 30;

  bool _isInitiator = false;
  final Map<String, CallParticipant> _participants = {};
  final _participantsController = StreamController<Map<String, CallParticipant>>.broadcast();
  Stream<Map<String, CallParticipant>> get participantsStream => _participantsController.stream;

  final List<RTCIceCandidate> _pendingCandidates = [];
  bool _isSettingRemoteDescription = false;

  final Map<String, dynamic> _configuration = {
    'iceServers': [
      {'urls': 'stun:stun.l.google.com:19302'},
      {'urls': 'stun:stun1.l.google.com:19302'},
      {'urls': 'stun:stun2.l.google.com:19302'},
      {'urls': 'stun:stun3.l.google.com:19302'},
      {'urls': 'stun:stun4.l.google.com:19302'},
      {'urls': 'stun:stun.services.mozilla.com:3478'},
      {'urls': 'stun:stun.stunprotocol.org:3478'},
    ],
    'sdpSemantics': 'unified-plan',
    'bundlePolicy': 'max-bundle',
    'rtcpMuxPolicy': 'require',
    'iceCandidatePoolSize': 10,
    'iceTransportPolicy': 'all',
  };

  final Map<String, dynamic> _mediaConstraints = {
    'mandatory': {
      'OfferToReceiveAudio': true,
      'OfferToReceiveVideo': true,
    },
    'optional': [],
  };

  MediaStream? get localStream => _localStream;
  MediaStream? get remoteStream => _remoteStream;
  bool get isAudioEnabled => _audioEnabled;
  bool get isVideoEnabled => _videoEnabled;
  String? get currentCallId => _currentCallId;
  String? get recipientId => _recipientId;
  CallType? get callType => _callType;
  Map<String, CallParticipant> get participants => Map.unmodifiable(_participants);
  bool _callUIScreenShown = false;
  final RingtoneService _ringtoneService = RingtoneService();

  void initialize() {
    callState = CallState.idle;
    _ringtoneService.initialize(); // ✅ Initialize ringtone for background playback

    _setupSocketListeners();
  }

  void _setupSocketListeners() {
    log('🔌 Setting up socket listeners...');

    socketService.onSocketEvent('incoming-call', _handleIncomingCall);

    // Debug wrapper for call-accepted
    socketService.onSocketEvent('call-accepted', (data) {
      log('');
      log('╔═══════════════════════════════════════════════════╗');
      log('║  🔔 CALL-ACCEPTED EVENT RECEIVED!!!               ║');
      log('╚═══════════════════════════════════════════════════╝');
      log('Raw data: $data');
      log('Current state: $callState');
      log('Is initiator: $_isInitiator');
      log('Call ID: $_currentCallId');
      log('Recipient ID: $_recipientId');
      log('Peer connection exists: ${_peerConnection != null}');
      log('Local stream exists: ${_localStream != null}');
      log('═══════════════════════════════════════════════════');
      log('');
      _handleCallAccepted(data);
    });

    socketService.onSocketEvent('call-declined', _handleCallDeclined);
    socketService.onSocketEvent('call-ended', _handleCallEnded);
    socketService.onSocketEvent('call-busy', _handleCallBusy);
    socketService.onSocketEvent('webrtc-offer', _handleWebRTCOffer);
    socketService.onSocketEvent('webrtc-answer', _handleWebRTCAnswer);
    socketService.onSocketEvent('ice-candidate', _handleIceCandidate);
    socketService.onSocketEvent('participant-left', _handleParticipantLeft);
    socketService.onSocketEvent('call-participants-sync', _handleParticipantsSync);

    socketService.socket?.onAny((event, data) {
      if (event.contains('call') || event.contains('webrtc') || event.contains('ice')) {
        log('');
        log('🔔🔔🔔 IMPORTANT SOCKET EVENT: $event');
        log('   Data: $data');
        log('');
      } else {
        log('🔔 Socket event: $event');
      }
    });

    log('✅ Socket listeners configured');
  }

  Future<bool> requestAndCheckPermissions(CallType callType) async {
    try {
      log('🔒 Requesting permissions for ${callType.name} call...');
      List<Permission> permissions = [Permission.microphone];
      if (callType == CallType.video) {
        permissions.add(Permission.camera);
      }
      Map<Permission, PermissionStatus> statuses = await permissions.request();
      log('Permission results:');
      for (var entry in statuses.entries) {
        log('  ${entry.key}: ${entry.value}');
      }
      bool allGranted = statuses.values.every((status) => status == PermissionStatus.granted);
      if (allGranted) {
        log('✅ All permissions granted');
        return true;
      } else {
        log('❌ Some permissions denied');
        bool hasPermanentlyDenied = statuses.values.any((status) => status == PermissionStatus.permanentlyDenied);
        if (hasPermanentlyDenied) {
          throw Exception('Some permissions are permanently denied. Please enable them in device settings.');
        } else {
          throw Exception('Permissions are required for ${callType.name} calls. Please grant access.');
        }
      }
    } catch (e) {
      log('❌ Permission request failed: $e');
      rethrow;
    }
  }

  Future<void> _initializeMedia() async {
    log("🎬 Initializing media for ${_callType?.name} call...");
    try {
      await _cleanupMedia();

      final Map<String, dynamic> constraints = {
        'audio': {
          'echoCancellation': true,
          'noiseSuppression': true,
          'autoGainControl': true,
        },
        'video': _callType == CallType.video
            ? {
          'facingMode': 'user',
          'width': {'ideal': 640},
          'height': {'ideal': 480},
        }
            : false,
      };

      try {
        _localStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (e) {
        log('⚠️ Detailed constraints failed, trying simple constraints: $e');
        final simpleConstraints = {
          'audio': true,
          'video': _callType == CallType.video ? true : false,
        };
        _localStream = await navigator.mediaDevices.getUserMedia(simpleConstraints);
      }

      for (var track in _localStream!.getTracks()) {
        track.enabled = true;
        log('✅ Enabled ${track.kind} track: ${track.id}');
      }

      _localStreamController.add(_localStream);
      log('✅ Local stream acquired with ${_localStream!.getTracks().length} tracks');
    } catch (e) {
      log('❌ Error initializing media: $e');
      rethrow;
    }
  }

  Future<void> switchCamera() async {
    try {
      if (localStream == null) {
        print('switchCamera: no local stream available');
        return;
      }

      final videoTracks = localStream!.getVideoTracks();
      if (videoTracks.isEmpty) {
        print('switchCamera: no video tracks found');
        return;
      }

      final track = videoTracks.first;
      await Helper.switchCamera(track);
      print('switchCamera: camera switched');
    } catch (e, s) {
      print('switchCamera error: $e\n$s');
      rethrow;
    }
  }

  Future<void> _createPeerConnection() async {
    try {
      log('🔗 ===== CREATING PEER CONNECTION =====');
      if (_peerConnection != null) {
        log('ℹ️ Peer connection already exists - skipping create');
        return;
      }
      if (_pcInitCompleter != null) {
        await _pcInitCompleter!.future;
        return;
      }

      _pcInitCompleter = Completer<void>();

      _peerConnection = await createPeerConnection(_configuration);
      log('✅ Peer connection created');

      if (_localStream != null) {
        log('📤 Adding local tracks...');
        for (var track in _localStream!.getTracks()) {
          try {
            await _peerConnection!.addTrack(track, _localStream!);
            log('✅ Added ${track.kind} track');
          } catch (e) {
            log('⚠️ addTrack failed for ${track.kind}: $e');
          }
        }
      }

      _peerConnection!.onTrack = (RTCTrackEvent event) {
        log('📥 ===== REMOTE TRACK RECEIVED =====');
        log('Track: ${event.track.kind}, ID: ${event.track.id}');
        if (event.streams.isNotEmpty) {
          _remoteStream = event.streams.first;
          if (event.track.kind == 'video') {
            event.track.enabled = true;
          }
          _remoteStreamController.add(_remoteStream);
          log('✅ Remote stream updated');
          try {
            final remoteUserId = _recipientId;
            if (remoteUserId != null && _participants.containsKey(remoteUserId)) {
              final existing = _participants[remoteUserId]!;
              _participants[remoteUserId] = existing.copyWith(stream: _remoteStream);
              _participantsController.add(Map.from(_participants));
              log('✅ Bound remote stream to participant $remoteUserId');
            }
          } catch (_) {}
        }
      };

      _peerConnection!.onConnectionState = (RTCPeerConnectionState state) {
        log('🔗 Connection state: $state');
        switch (state) {
          case RTCPeerConnectionState.RTCPeerConnectionStateConnected:
            log('✅ PEER CONNECTION ESTABLISHED');
            _updateCallState(CallState.connected);
            Timer(Duration(milliseconds: 300), _verifyAndEnableAllVideoTracks);
            break;
          case RTCPeerConnectionState.RTCPeerConnectionStateConnecting:
            log('🔄 Connecting...');
            if (callState != CallState.connecting) {
              _updateCallState(CallState.connecting);
            }
            break;
          case RTCPeerConnectionState.RTCPeerConnectionStateFailed:
            log('❌ Connection failed');
            _handleConnectionFailure();
            break;
          default:
            log('ℹ️ Connection state: $state');
        }
      };

      _peerConnection!.onIceCandidate = (RTCIceCandidate? candidate) async {
        if (candidate == null) {
          log('🧊 ICE gathering complete');
          return;
        }
        log('🧊 Local ICE candidate generated');
        if (_currentCallId != null && _recipientId != null) {
          SharedPreferences pref = await SharedPreferences.getInstance();
          final currentUserId = pref.getString("userId");
          socketService.emit('ice-candidate', {
            'callId': _currentCallId,
            'targetUserId': _recipientId,
            'fromUserId': currentUserId,
            'candidate': {
              'candidate': candidate.candidate,
              'sdpMid': candidate.sdpMid,
              'sdpMLineIndex': candidate.sdpMLineIndex,
            },
          });
          log('✅ ICE candidate sent to $_recipientId');
        }
      };

      _peerConnection!.onIceConnectionState = (RTCIceConnectionState state) {
        log('🧊 ICE state: $state');
      };

      log('✅ Peer connection setup complete');
      if (_pcInitCompleter != null && !_pcInitCompleter!.isCompleted) {
        _pcInitCompleter!.complete();
      }
      _pcInitCompleter = null;
    } catch (e, stackTrace) {
      log('❌ Error creating peer connection: $e');
      log('Stack: $stackTrace');
      if (_pcInitCompleter != null && !_pcInitCompleter!.isCompleted) {
        _pcInitCompleter!.complete();
      }
      _pcInitCompleter = null;
      rethrow;
    }
  }

  void _verifyAndEnableAllVideoTracks() {
    log('🔍 ===== VIDEO TRACK VERIFICATION =====');
    if (_localStream != null) {
      final localVideoTracks = _localStream!.getVideoTracks();
      for (var track in localVideoTracks) {
        if (!track.enabled) {
          track.enabled = true;
          log('✅ Re-enabled local video track');
        }
      }
      _localStreamController.add(_localStream);
    }
    if (_remoteStream != null) {
      final remoteVideoTracks = _remoteStream!.getVideoTracks();
      for (var track in remoteVideoTracks) {
        if (!track.enabled) {
          track.enabled = true;
          log('✅ Re-enabled remote video track');
        }
      }
      _remoteStreamController.add(_remoteStream);
    }
  }

  Future<bool> startCall({
    required String recipientId,
    required String recipientName,
    required CallType callType,
    required String chatType,
  }) async {
    try {
      if (callState != CallState.idle) {
        log('❌ Cannot start call: already in state $callState');
        return false;
      }


      log('');
      log('═══════════════════════════════════════════');
      log('📞 ===== STARTING CALL (INITIATOR) =====');
      log('═══════════════════════════════════════════');
      log('Recipient: $recipientName ($recipientId)');
      log('Type: ${callType.name}');
      log('');

      bool hasPermissions = await requestAndCheckPermissions(callType);
      if (!hasPermissions) {
        log('❌ Permissions denied');
        return false;
      }

      _recipientId = recipientId;
      _callType = callType;
      _currentChatType = chatType;
      _currentChatId = recipientId;
      _currentCallId = 'call_${DateTime.now().millisecondsSinceEpoch}';
      _isInitiator = true;
      _pendingCandidates.clear();

      log('✅ CRITICAL STATE SET: _isInitiator = TRUE, Call ID: $_currentCallId, Recipient: $_recipientId');

      await _initializeMedia();
      if (_currentChatType == 'dm') {
        await _createPeerConnection();
        if (_peerConnection == null) {
          log('❌ Failed to create peer connection');
          await cleanup();
          return false;
        }

        log('✅ Peer connection created successfully');
      }

      try {
        SharedPreferences pref = await SharedPreferences.getInstance();
        final currentUserId = pref.getString("userId");
        final currentUserName = pref.getString("userName");
        if (currentUserId != null) {
          _participants[currentUserId] = CallParticipant(
            userId: currentUserId,
            socketId: socketService.socket?.id ?? '',
            name: currentUserName ?? 'You',
            isAudioEnabled: _audioEnabled,
            isVideoEnabled: callType == CallType.video ? _videoEnabled : false,
            stream: _localStream,
          );
          _participantsController.add(Map.from(_participants));
        }
      } catch (_) {}

      _updateCallState(CallState.outgoing);
      _setCallTimeout();

      SharedPreferences preferences = await SharedPreferences.getInstance();
      var currentUserId = preferences.getString('userId');
      var currentUserName = preferences.getString('userName');
      var teamId = preferences.getInt('teamId');

      log('📡 Sending initiate-call event...');
      socketService.emit('initiate-call', {
        'callId': _currentCallId,
        'chatId': recipientId,
        'chatType': chatType,
        'callType': callType == CallType.video ? 'video' : 'audio',
        'chatName': recipientName,
        'initiator': {
          'userId': currentUserId,
          'name': currentUserName,
          'team_id': teamId,
          'avatar': null,
          'isAudioEnabled': _audioEnabled,
          'isVideoEnabled': callType == CallType.video ? _videoEnabled : false,
        },
      });

      log('✅ ===== CALL STARTED (INITIATOR) =====');
      log('Waiting for call-accepted event...');
      return true;
    } catch (e) {
      log('❌ Error starting call: $e');
      _updateCallState(CallState.idle);
      await cleanup();
      return false;
    }
  }


  Future<RTCPeerConnection?> _createPeerConnectionFor(String userId) async {
    try {
      log('🔗 Creating peer connection for user $userId');

      // If already exists return it
      if (_peerConnections.containsKey(userId)) {
        log('ℹ️ PeerConnection for $userId already exists');
        return _peerConnections[userId];
      }

      final pc = await createPeerConnection(_configuration);

      // Add local tracks (if present)
      if (_localStream != null) {
        log('📤 Adding local tracks to PC for $userId');
        for (var track in _localStream!.getTracks()) {
          await pc.addTrack(track, _localStream!);
          log('✅ Added ${track.kind} track to PC for $userId');
        }
      } else {
        log('⚠️ No local stream to add to PC for $userId');
      }

      // onTrack -> update remote stream and notify UI if desired
      pc.onTrack = (RTCTrackEvent event) {
        log('📥 Remote track from $userId: ${event.track.kind}, id: ${event.track.id}');
        if (event.streams.isNotEmpty) {
          final stream = event.streams.first;
          // We keep a single _remoteStream for UI usage; you can adapt to keep per-user streams if needed
          _remoteStream = stream;
          _remoteStreamController.add(_remoteStream);
          log('✅ Remote stream updated for $userId');
          if (_participants.containsKey(userId)) {
            final p = _participants[userId]!;
            _participants[userId] = p.copyWith(stream: stream);
            _participantsController.add(Map.from(_participants));
            log('✅ Bound remote stream to participant $userId');
          }
        }
      };

      // onIceCandidate -> send candidate targeted to remote user
      pc.onIceCandidate = (RTCIceCandidate? candidate) async {
        if (candidate == null) {
          log('🧊 ICE gathering complete for $userId');
          return;
        }
        log('🧊 Local ICE candidate for $userId generated');

        if (_currentCallId != null) {
          SharedPreferences pref = await SharedPreferences.getInstance();
          final currentUserId = pref.getString("userId");
          socketService.emit('ice-candidate', {
            'callId': _currentCallId,
            'targetUserId': userId,
            'fromUserId': currentUserId,
            'candidate': {
              'candidate': candidate.candidate,
              'sdpMid': candidate.sdpMid,
              'sdpMLineIndex': candidate.sdpMLineIndex,
            },
          });
          log('✅ ICE candidate sent to $userId');
        }
      };

      // connection state handling: cleanup on failure/disconnect
      pc.onConnectionState = (RTCPeerConnectionState state) {
        log('🔗 [$userId] PC state: $state');
        if (state == RTCPeerConnectionState.RTCPeerConnectionStateConnected) {
          _updateCallState(CallState.connected);
          _verifyAndEnableAllVideoTracks();
        }
        if (state == RTCPeerConnectionState.RTCPeerConnectionStateFailed ||
            state == RTCPeerConnectionState.RTCPeerConnectionStateDisconnected ||
            state == RTCPeerConnectionState.RTCPeerConnectionStateClosed) {
          log('❌ [$userId] PC failed/disconnected/closed -> cleaning up');
          try {
            pc.close();
          } catch (_) {}
          _peerConnections.remove(userId);
          _pendingIceCandidatesByUser.remove(userId);
          if (_participants.containsKey(userId)) {
            _participants.remove(userId);
            _participantsController.add(Map.from(_participants));
          }
        }
      };

      _peerConnections[userId] = pc;

      return pc;
    } catch (e, st) {
      log('❌ Error creating PC for $userId: $e');
      log('Stack: $st');
      return null;
    }
  }
  Future<void> _createAndSendOfferTo(String targetUserId) async {
    try {
      log('📤 Creating offer for $targetUserId');

      // Ensure peer connection exists
      final pc = await _createPeerConnectionFor(targetUserId);
      if (pc == null) {
        log('❌ Could not create PC for $targetUserId');
        return;
      }

      // create offer
      final offer = await pc.createOffer(_mediaConstraints);
      log('✅ Offer created for $targetUserId (sdp length: ${offer.sdp?.length ?? 0})');

      // set local description
      await pc.setLocalDescription(offer);
      log('✅ Local description set for $targetUserId; signalingState: ${pc.signalingState}');

      if (_currentCallId == null) {
        log('❌ No currentCallId, aborting offer send');
        return;
      }

      final me = (await SharedPreferences.getInstance()).getString('userId');

      // Emit targeted offer
      socketService.emit('webrtc-offer', {
        'callId': _currentCallId,
        'targetUserId': targetUserId,
        'fromUserId': me,
        'offer': offer.toMap(),
      });

      log('✅ Offer sent to $targetUserId');
    } catch (e, st) {
      log('❌ Error creating/sending offer to $targetUserId: $e');
      log('Stack: $st');
    }
  }

  void _handleConnectionFailure() {
    log('🔄 Connection failure detected');
    // Do not auto-end; allow ICE/state to recover and per-user PCs to renegotiate
    // You can add backoff/retry logic here if needed
  }

  Future<void> acceptCall() async {
    if (_currentCallId == null || callState != CallState.incoming) {
      log('❌ Cannot accept call - Invalid state');
      return;
    }

    try {
      await _ringtoneService.stopRingtone();

      log('📞 ===== ACCEPTING CALL =====');
      log('Call ID: $_currentCallId');

      if (_callType == null) {
        log('❌ Unknown call type');
        return;
      }

      bool hasPermissions = await requestAndCheckPermissions(_callType!);
      if (!hasPermissions) {
        throw Exception('Permissions required');
      }

      _isInitiator = false;
      _pendingCandidates.clear();
      _updateCallState(CallState.connecting);

      await _initializeMedia();
      await _createPeerConnection();

      SharedPreferences pref = await SharedPreferences.getInstance();
      final currentUserId = pref.getString("userId");
      final currentUserName = pref.getString("userName");

      if (currentUserId != null) {
        _participants[currentUserId] = CallParticipant(
          userId: currentUserId,
          socketId: socketService.socket?.id ?? '',
          name: currentUserName ?? 'You',
          isAudioEnabled: _audioEnabled,
          isVideoEnabled: _callType == CallType.video ? _videoEnabled : false,
          stream: _localStream,
        );
        _participantsController.add(Map.from(_participants));
      }

      final acceptData = {
        'callId': _currentCallId,
        'user': {
          'userId': currentUserId,
          'socketId': socketService.socket?.id ?? '',
          'name': currentUserName,
          'isAudioEnabled': _audioEnabled,
          'isVideoEnabled': _callType == CallType.video ? _videoEnabled : false,
        },
      };

      log('📡 Emitting accept-call event...');
      log('Accept data: $acceptData');
      socketService.emit('accept-call', acceptData);
      log('✅ Accept-call emitted');
      log('Waiting for offer from initiator (we will process incoming webrtc-offer event).');
    } catch (e, stackTrace) {
      log('❌ Error accepting call: $e');
      log('Stack trace: $stackTrace');
      _updateCallState(CallState.ended);
      await cleanup();
      rethrow;
    }
  }

  Future<void> declineCall() async {
    if (_currentCallId == null) return;
    socketService.emit('decline-call', {'callId': _currentCallId});
    await _ringtoneService.stopRingtone();

    _updateCallState(CallState.ended);
    await cleanup();
  }

  Future<void> endCall() async {
    log('📞 Ending call...');
    // ✅ STOP RINGTONE WHEN ENDING
    await _ringtoneService.stopRingtone();

    if (_currentCallId != null) {
      socketService.emit('end-call', {'callId': _currentCallId});
    }
    _updateCallState(CallState.ended);
    await Future.delayed(Duration(milliseconds: 500));
    await cleanup();
  }

  Future<void> toggleAudio() async {
    if (_localStream != null) {
      final audioTracks = _localStream!.getAudioTracks();
      if (audioTracks.isNotEmpty) {
        audioTracks[0].enabled = !audioTracks[0].enabled;
        _audioEnabled = audioTracks[0].enabled;
        _audioEnabledController.add(_audioEnabled);
        if (_currentCallId != null) {
          socketService.emit('toggle-audio', {
            'callId': _currentCallId,
            'isAudioEnabled': _audioEnabled,
          });
        }
        log('🎵 Audio ${_audioEnabled ? "enabled" : "disabled"}');
      }
    }
  }

  Future<void> toggleVideo() async {
    if (_localStream != null && _callType == CallType.video) {
      final videoTracks = _localStream!.getVideoTracks();
      if (videoTracks.isNotEmpty) {
        videoTracks[0].enabled = !videoTracks[0].enabled;
        _videoEnabled = videoTracks[0].enabled;
        _videoEnabledController.add(_videoEnabled);
        if (_currentCallId != null) {
          socketService.emit('toggle-video', {
            'callId': _currentCallId,
            'isVideoEnabled': _videoEnabled,
          });
        }
        log('🎥 Video ${_videoEnabled ? "enabled" : "disabled"}');
      }
    }
  }

// In WebRTCCallService class

  Future<void> toggleSpeaker() async {
    try {
      _speakerOn = !_speakerOn;
      await Helper.setSpeakerphoneOn(_speakerOn);
      _speakerEnabledController.add(_speakerOn);
      log('🔊 Speaker toggled: $_speakerOn');
    } catch (e) {
      log('❌ Error toggling speaker: $e');
    }
  }

  void _updateCallState(CallState newState) {
    callState = newState;
    _callStateController.add(newState);
    log('📊 State: $newState');
  }

  Future<void> cleanup() async {
    _clearCallTimeout();
    _pendingCandidates.clear();
    _pendingIceCandidatesByUser.clear();

    await _cleanupMedia();

    // Close all per-user peer connections
    for (var pc in _peerConnections.values) {
      try {
        await pc.close();
      } catch (_) {}
    }
    _peerConnections.clear();

    // Also close any old single peerConnection if you still use it
    try {
      await _peerConnection?.close();
    } catch (_) {}
    _peerConnection = null;

    _currentCallId = null;
    _recipientId = null;
    _incomingCallData = null;
    _participants.clear();
    _participantsController.add({});
    _isInitiator = false;
    _isSettingRemoteDescription = false;
    _callUIScreenShown = false;
    
    // ✅ IMPORTANT: Reset state to idle so new calls can be started
    _updateCallState(CallState.idle);
    
    log('✅ Cleanup complete (multi-peer) - Ready for new calls');
  }

  Future<void> _cleanupMedia() async {
    if (_localStream != null) {
      _localStream!.getTracks().forEach((track) => track.stop());
      try {
        await _localStream!.dispose();
      } catch (_) {}
      _localStream = null;
      _localStreamController.add(null);
    }
    if (_remoteStream != null) {
      _remoteStream!.getTracks().forEach((track) => track.stop());
      try {
        await _remoteStream!.dispose();
      } catch (_) {}
      _remoteStream = null;
      _remoteStreamController.add(null);
    }
  }

  void _setCallTimeout() {
    _clearCallTimeout();
    _callTimeoutTimer = Timer(Duration(seconds: CALL_TIMEOUT_SECONDS), () {
      log('⏰ Call timeout');
      if (callState == CallState.outgoing) endCall();
    });
  }

  void _clearCallTimeout() {
    _callTimeoutTimer?.cancel();
    _callTimeoutTimer = null;
  }

  // ===== SOCKET EVENT HANDLERS =====

  void _handleIncomingCall(Map<String, dynamic> data) async {
    log('');
    log('╔═══════════════════════════════════════════════════╗');
    log('║  📞 INCOMING CALL EVENT                           ║');
    log('╚═══════════════════════════════════════════════════╝');
    log('Data: $data');
    log('Current state: $callState');
    log('Current is initiator: $_isInitiator');
    log('Current call ID: $_currentCallId');

    if (_isInitiator && _currentCallId == data['callId']) {
      log('⚠️ WARNING: We initiated this call, ignoring incoming-call event!');
      return;
    }

    if (callState == CallState.outgoing) {
      log('⚠️ WARNING: We are calling out, ignoring incoming-call event!');
      return;
    }

    log('Processing as legitimate incoming call...');
    _incomingCallData = data;
    _currentCallId = data['callId'];
    _recipientId = data['initiator']?['userId']?.toString();
    _callType = data['callType'] == 'video' ? CallType.video : CallType.audio;
    _currentChatType = (data['chatType'] ?? data['chat_type'])?.toString() ?? 'dm';
    _currentChatId = (data['chatId'] ?? data['chat_id'])?.toString();
    _isInitiator = false;
    _pendingCandidates.clear();

    final initiator = data['initiator'];
    if (initiator != null) {
      _participants[_recipientId!] = CallParticipant(
        userId: initiator['userId']?.toString() ?? _recipientId!,
        socketId: '',
        name: initiator['name']?.toString() ?? 'Unknown',
        isAudioEnabled: initiator['isAudioEnabled'] ?? true,
        isVideoEnabled: initiator['isVideoEnabled'] ?? false,
      );
    }

    _updateCallState(CallState.incoming);
    _participantsController.add(Map.from(_participants));
    
    // ✅ Play ringtone (works in background - OneSignal handles notifications)
    await _ringtoneService.playRingtone();

    log('✅ Incoming call processed');
    log('   Call ID: $_currentCallId');
    log('   From: $_recipientId');
    log('   Type: $_callType');
    log('═══════════════════════════════════════════════════');

    final callTypeStr = data['callType']?.toString() ?? 'audio';
    final chatType = (data['chatType'] ?? data['chat_type'])?.toString() ?? 'dm';
    final callerName = data['initiator']?['name']?.toString() ?? 'Unknown';
    final callerId = data['initiator']?['userId']?.toString() ?? _recipientId ?? '';

    // ✅ Only show call screen if call is still incoming (not declined/ended)
    if (!_callUIScreenShown && callState == CallState.incoming) {
      _callUIScreenShown = true;
      final nav = OneSignalService().navigatorKey.currentState;
      Future.microtask(() {
        // ✅ Double-check state before showing UI (prevent race condition)
        if (callState != CallState.incoming) {
          log('⚠️ Call state changed before showing UI - not showing screen');
          return;
        }
        
        nav?.popUntil((route) => route.isFirst);
        nav?.push(
          MaterialPageRoute(
            fullscreenDialog: true,
            builder: (context) => VideoCallScreen(
              participantId: callerId,
              participantName: callerName,
              callType: callTypeStr == 'video' ? CallType.video : CallType.audio,
              chatType: chatType,
              isIncoming: true,
            ),
          ),
        );
      });
    } else if (callState != CallState.incoming) {
      log('⚠️ Call already declined/ended - not showing call screen');
    }
  }

  void _handleCallAccepted(Map<String, dynamic> data) {
    log('Call accepted event handling (initiator side)');
    if (!_isInitiator) {
      log('⚠️ Not initiator, ignoring call-accepted');
      return;
    }
    if (callState != CallState.outgoing && callState != CallState.connecting) {
      log('⚠️ Wrong state ($callState), ignoring call-accepted');
      return;
    }
    if (data['callId'] != _currentCallId) {
      log('⚠️ Different call ID, ignoring');
      return;
    }

    _clearCallTimeout();
    log('✅ Timeout cleared');

    final userId = data['userId']?.toString();
    final user = data['user'];

    if (userId != null && user != null) {
      if (!_participants.containsKey(userId)) {
        _participants[userId] = CallParticipant(
          userId: user['userId']?.toString() ?? userId,
          socketId: user['socketId']?.toString() ?? '',
          name: user['name']?.toString() ?? 'Unknown',
          isAudioEnabled: user['isAudioEnabled'] ?? true,
          isVideoEnabled: user['isVideoEnabled'] ?? false,
        );
        _participantsController.add(Map.from(_participants));
        log('✅ Participant added: ${user['name']}');
      }
    }

    if (callState == CallState.outgoing) {
      _updateCallState(CallState.connecting);
    }

    if (userId != null) {
      if (_peerConnection == null) {
        _createPeerConnection().then((_) async {
          if (_peerConnection == null) {
            return;
          }
          await _createAndSendOffer();
        });
      } else {
        _createAndSendOffer();
      }
    }
  }

  Future<void> _createAndSendOffer() async {
    try {
      log('📤 ===== CREATING OFFER =====');

      if (_peerConnection == null) {
        log('❌ No peer connection!');
        return;
      }

      final signalingState = _peerConnection!.signalingState;
      log('Current signaling state: $signalingState');

      if (signalingState != RTCSignalingState.RTCSignalingStateStable) {
        log('⚠️ Warning: Not in stable state, but proceeding...');
      }

      log('Creating offer with constraints: $_mediaConstraints');
      final offer = await _peerConnection!.createOffer(_mediaConstraints);
      log('✅ Offer created successfully (type: ${offer.type}, sdp length: ${offer.sdp?.length ?? 0})');

      log('Setting local description...');
      await _peerConnection!.setLocalDescription(offer);
      log('✅ Local description set');
      log('   New signaling state: ${_peerConnection!.signalingState}');

      if (_recipientId == null || _currentCallId == null) {
        log('❌ Cannot send offer: missing recipient or call ID');
        return;
      }

      log('📡 Sending offer via socket to $_recipientId (call: $_currentCallId)');
      final me = (await SharedPreferences.getInstance()).getString('userId');
      socketService.emit('webrtc-offer', {
        'callId': _currentCallId,
        'targetUserId': _recipientId,
        'fromUserId': me,
        'offer': offer.toMap(),
      });

      log('✅ ===== OFFER SENT SUCCESSFULLY =====');
      log('Waiting for answer from receiver...');
    } catch (e, stackTrace) {
      log('❌ ===== ERROR CREATING OFFER =====');
      log('Error: $e');
      log('Stack trace: $stackTrace');

      if (_peerConnection != null && callState == CallState.connecting) {
        log('🔄 Retrying offer creation in 500ms...');
        await Future.delayed(Duration(milliseconds: 500));
        if (_peerConnection != null && callState == CallState.connecting) {
          await _createAndSendOffer();
        }
      }
    }
  }

  void _handleCallDeclined(Map<String, dynamic> data) async {
    log('Call declined');
    // ✅ Stop ringtone when call is declined
    await _ringtoneService.stopRingtone();
    
    _updateCallState(CallState.ended);
    cleanup();
  }

  Future<void> _handleCallEnded(Map<String, dynamic> data) async {
    log('Call ended');
    await _ringtoneService.stopRingtone();

    _updateCallState(CallState.ended);
    cleanup();
  }

  void _handleCallBusy(Map<String, dynamic> data) async {
    log('Call busy');
    // ✅ Stop ringtone when call is busy
    await _ringtoneService.stopRingtone();
    
    _updateCallState(CallState.ended);
    cleanup();
  }

  Future<void> _handleWebRTCOffer(Map<String, dynamic> data) async {
    try {
      log('📨 ===== WEBRTC OFFER RECEIVED =====');

      SharedPreferences pref = await SharedPreferences.getInstance();
      final currentUserId = pref.getString("userId");
      final targetUserId = data['targetUserId']?.toString();
      final fromUserId = data['fromUserId']?.toString();

      log('Current user: $currentUserId');
      log('Target user: $targetUserId');
      log('From user: $fromUserId');
      log('Is initiator: $_isInitiator');
      log('Call state: $callState');
      log('Peer connection exists: ${_peerConnection != null}');

      if (_recipientId == null && !_isInitiator && fromUserId != null) {
        _recipientId = fromUserId;
      }

      if (targetUserId != null && targetUserId != currentUserId) {
        log('⚠️ Offer not for this user - ignoring');
        return;
      }

      if (fromUserId != null && fromUserId == currentUserId) {
        log('⚠️ Ignoring self-offer');
        return;
      }

      if (_isInitiator) {
        log('⚠️ Initiator received offer - ignoring to prevent conflict');
        return;
      }

      if (_peerConnection == null) {
        log('❌ No peer connection available - creating one');
        // Create peer connection now so we can set remote description
        await _createPeerConnection();
        if (_peerConnection == null) {
          log('❌ Failed to create peer connection - aborting');
          return;
        }
      }

      final offer = data['offer'];
      if (offer == null) {
        log('❌ Offer data missing');
        return;
      }

      final incomingSdp = offer['sdp'] as String?;
      final incomingType = offer['type'] as String? ?? 'offer';
      if (incomingSdp == null) {
        log('❌ Offer SDP missing - aborting');
        return;
      }

      // If offer belongs to different callId, ignore
      final callId = data['callId'];
      if (_currentCallId != null && callId != _currentCallId) {
        log('⚠️ Offer for different call ($callId) - current: $_currentCallId - ignoring');
        return;
      }

      // Check existing remote description - if identical SDP, treat as duplicate
      try {
        final existingRemote = await _peerConnection!.getRemoteDescription();
        if (existingRemote != null && existingRemote.sdp == incomingSdp) {
          log('⚠️ Duplicate offer (identical SDP) - skipping');
          return;
        }
      } catch (e) {
        log('ℹ️ getRemoteDescription threw: $e (continuing to set new remote)');
      }

      // Prevent concurrent setRemoteDescription races
      if (_isSettingRemoteDescription) {
        log('🕒 Another remoteDescription is being applied - queuing/ignoring this offer');
        // Option: queue offers for later; for now ignore duplicates arriving during processing
        return;
      }

      try {
        _isSettingRemoteDescription = true;
        log('📥 Setting remote description...');
        await _peerConnection!.setRemoteDescription(
          RTCSessionDescription(incomingSdp, incomingType),
        );
        log('✅ Remote description set successfully');
        log('   New signaling state: ${_peerConnection!.signalingState}');
      } finally {
        _isSettingRemoteDescription = false;
      }

      // Apply pending ICE candidates
      if (_pendingCandidates.isNotEmpty) {
        log('🧊 Applying ${_pendingCandidates.length} pending ICE candidates...');
        final pending = List<RTCIceCandidate>.from(_pendingCandidates);
        _pendingCandidates.clear();
        for (var c in pending) {
          try {
            await _peerConnection!.addCandidate(c);
            log('   ✅ Candidate applied');
          } catch (e) {
            log('   ⚠️ Failed to apply candidate: $e');
          }
        }
      }

      // Ensure remoteDescription exists and localDescription is null before creating answer
      final currentRemote = await _peerConnection!.getRemoteDescription();

      // SAFER: avoid direct getLocalDescription() native crash — wrap in try/catch
      RTCSessionDescription? currentLocal;
      try {
        currentLocal = await _peerConnection!.getLocalDescription();
      } catch (e) {
        // flutter_webrtc native may throw if localDescription is null; treat as null
        log('⚠️ getLocalDescription threw, assuming null: $e');
        currentLocal = null;
      }

      if (currentRemote == null) {
        log('❌ Remote description null after set - aborting answer creation');
        return;
      }

      if (currentLocal != null) {
        log('⚠️ Local description already exists (already answered?) - skipping answer creation');
        return;
      }


      log('📤 Creating answer...');
      final answer = await _peerConnection!.createAnswer(_mediaConstraints);
      log('✅ Answer created (sdp length: ${answer.sdp?.length ?? 0})');

      // Double-check signaling state before setLocal
      final sigStateBeforeSet = _peerConnection!.signalingState;
      log('Signaling state before setLocalDescription: $sigStateBeforeSet');

      // setLocalDescription should now succeed because remoteDescription is applied
      await _peerConnection!.setLocalDescription(answer);
      log('✅ Local description set');
      log('   New signaling state: ${_peerConnection!.signalingState}');

      // Send answer back
      // SharedPreferences pref = await SharedPreferences.getInstance();
      final currentUser = pref.getString("userId");
      log('📡 Sending answer to: $fromUserId');
      socketService.emit('webrtc-answer', {
        'callId': _currentCallId,
        'targetUserId': fromUserId,
        'fromUserId': currentUser,
        'answer': answer.toMap(),
      });

      log('✅ ===== ANSWER SENT SUCCESSFULLY =====');
    } catch (e, stackTrace) {
      log('❌ ===== ERROR HANDLING OFFER =====');
      log('Error: $e');
      log('Stack: $stackTrace');
      log('═══════════════════════════════════════');
    }
  }
/*
  Future<void> _handleWebRTCOffer(Map<String, dynamic> data) async {
    try {
      log('📨 ===== WEBRTC OFFER RECEIVED =====');

      final callId = data['callId']?.toString();
      final fromUserId = data['fromUserId']?.toString();
      final targetUserId = data['targetUserId']?.toString();
      final offer = data['offer'];

      // Only handle offers for current call
      if (callId != _currentCallId) {
        log('⚠️ Offer for different call ($callId) - ignoring');
        return;
      }

      final pref = await SharedPreferences.getInstance();
      final me = pref.getString("userId");

      // Offer must be targeted to us
      if (targetUserId != null && targetUserId != me) {
        log('⚠️ Offer not for this user (target: $targetUserId, me: $me) - ignoring');
        return;
      }

      if (fromUserId == me) {
        log('⚠️ Ignoring self-offer');
        return;
      }

      if (offer == null) {
        log('❌ Offer payload missing');
        return;
      }

      // Ensure peer connection exists for this remote
      final pc = await _createPeerConnectionFor(fromUserId!);
      if (pc == null) {
        log('❌ Failed to create peer connection for $fromUserId');
        return;
      }

      // Avoid concurrent setRemoteDescription races
      if (_isSettingRemoteDescription) {
        log('🕒 Another remote description is being set - ignoring this offer for now');
        return;
      }

      _isSettingRemoteDescription = true;
      try {
        await pc.setRemoteDescription(RTCSessionDescription(offer['sdp'], offer['type']));
        log('✅ Remote description set for $fromUserId');
      } finally {
        _isSettingRemoteDescription = false;
      }

      // Apply any queued ICE for this user
      final pending = _pendingIceCandidatesByUser[fromUserId] ?? [];
      if (pending.isNotEmpty) {
        log('🧊 Applying ${pending.length} pending ICE candidates for $fromUserId');
        final List<RTCIceCandidate> toApply = List.from(pending);
        _pendingIceCandidatesByUser.remove(fromUserId);
        for (var c in toApply) {
          try {
            await pc.addCandidate(c);
            log('   ✅ Candidate applied for $fromUserId');
          } catch (e) {
            log('   ⚠️ Failed to apply candidate for $fromUserId: $e');
          }
        }
      }

      // Create and send answer
      final answer = await pc.createAnswer(_mediaConstraints);
      await pc.setLocalDescription(answer);
      log('✅ Local description (answer) set for $fromUserId');

      final myId = (await SharedPreferences.getInstance()).getString('userId');
      socketService.emit('webrtc-answer', {
        'callId': _currentCallId,
        'targetUserId': fromUserId,
        'fromUserId': myId,
        'answer': answer.toMap(),
      });
      log('✅ Answer sent to $fromUserId');
    } catch (e, st) {
      log('❌ Error handling offer: $e');
      log('Stack: $st');
    }
  }
*/

  Future<void> _handleWebRTCAnswer(Map<String, dynamic> data) async {
    try {
      log('📨 ===== ANSWER RECEIVED =====');

      SharedPreferences pref = await SharedPreferences.getInstance();
      final currentUserId = pref.getString("userId");
      final targetUserId = data['targetUserId']?.toString();
      final fromUserId = data['fromUserId']?.toString();

      if (targetUserId != null && targetUserId != currentUserId) {
        log('⚠️ Not for us - ignoring');
        return;
      }

      if (fromUserId != null && fromUserId == currentUserId) {
        log('⚠️ Our own answer - ignoring');
        return;
      }

      if (!_isInitiator) {
        log('⚠️ Non-initiator got answer - ignoring');
        return;
      }

      if (_peerConnection == null) {
        log('❌ No peer connection');
        return;
      }

      final currentSignalingState = _peerConnection!.signalingState;
      log('Signaling state: $currentSignalingState');

      if (currentSignalingState != RTCSignalingState.RTCSignalingStateHaveLocalOffer) {
        log('⚠️ Not in have-local-offer state');
        return;
      }

      final answer = data['answer'];
      if (answer == null) {
        log('❌ No answer data');
        return;
      }

      log('📥 Setting remote description (answer)...');
      _isSettingRemoteDescription = true;

      try {
        await _peerConnection!.setRemoteDescription(
          RTCSessionDescription(answer['sdp'], answer['type']),
        );
        _isSettingRemoteDescription = false;
        log('✅ Remote description set');

        if (_pendingCandidates.isNotEmpty) {
          log('🧊 Applying ${_pendingCandidates.length} pending candidates');
          for (var candidate in _pendingCandidates) {
            try {
              await _peerConnection!.addCandidate(candidate);
            } catch (e) {
              log('⚠️ Failed to apply: $e');
            }
          }
          _pendingCandidates.clear();
        }

        log('✅ ===== ANSWER PROCESSED =====');
      } catch (e) {
        _isSettingRemoteDescription = false;
        log('❌ Failed to set remote description: $e');
      }
    } catch (e, stackTrace) {
      log('❌ Error handling answer: $e');
      log('Stack: $stackTrace');
      _isSettingRemoteDescription = false;
    }
  }
/*  Future<void> _handleWebRTCAnswer(Map<String, dynamic> data) async {
    try {
      log('📨 ===== ANSWER RECEIVED =====');

      final callId = data['callId']?.toString();
      final fromUserId = data['fromUserId']?.toString();
      final targetUserId = data['targetUserId']?.toString();
      final answer = data['answer'];

      if (callId != _currentCallId) {
        log('⚠️ Answer for different call - ignoring');
        return;
      }

      final pref = await SharedPreferences.getInstance();
      final me = pref.getString("userId");

      if (targetUserId != null && targetUserId != me) {
        log('⚠️ Answer not intended for us - ignoring');
        return;
      }

      if (fromUserId == me) {
        log('⚠️ Ignoring our own answer');
        return;
      }

      if (!_isInitiator) {
        log('⚠️ Received answer but not initiator - ignoring');
        return;
      }

      final pc = _peerConnections[fromUserId];
      if (pc == null) {
        log('❌ No PC for $fromUserId to apply answer');
        return;
      }

      if (answer == null) {
        log('❌ Answer payload missing');
        return;
      }

      _isSettingRemoteDescription = true;
      try {
        await pc.setRemoteDescription(RTCSessionDescription(answer['sdp'], answer['type']));
        log('✅ Remote description (answer) set for $fromUserId');

        // Apply queued ICEs for this user
        final pending = _pendingIceCandidatesByUser[fromUserId] ?? [];
        if (pending.isNotEmpty) {
          for (var c in List<RTCIceCandidate>.from(pending)) {
            try {
              await pc.addCandidate(c);
            } catch (e) {
              log('⚠️ Failed to add pending candidate for $fromUserId: $e');
            }
          }
          _pendingIceCandidatesByUser.remove(fromUserId);
        }
      } finally {
        _isSettingRemoteDescription = false;
      }

      log('✅ ===== ANSWER PROCESSED FOR $fromUserId =====');
    } catch (e, st) {
      log('❌ Error handling answer: $e');
      log('Stack: $st');
      _isSettingRemoteDescription = false;
    }
  }*/

  Future<void> _handleIceCandidate(Map<String, dynamic> data) async {
    try {
      log('🧊 ===== ICE CANDIDATE RECEIVED =====');

      final candidateData = data['candidate'];
      final fromUserId = data['fromUserId']?.toString();
      final callId = data['callId'];

      if (callId != _currentCallId) {
        log('⚠️ Different call - ignoring');
        return;
      }

      if (candidateData == null) {
        log('❌ No candidate data');
        return;
      }

      SharedPreferences pref = await SharedPreferences.getInstance();
      final currentUserId = pref.getString("userId");

      if (fromUserId != null && fromUserId == currentUserId) {
        log('⚠️ Our own candidate - ignoring');
        return;
      }

      final candidate = RTCIceCandidate(
        candidateData['candidate'],
        candidateData['sdpMid'],
        candidateData['sdpMLineIndex'],
      );

      final remoteDesc = await _peerConnection?.getRemoteDescription();
      final canAddNow = _peerConnection != null &&
          remoteDesc != null &&
          !_isSettingRemoteDescription;

      if (canAddNow) {
        log('✅ Adding ICE candidate immediately');
        try {
          await _peerConnection!.addCandidate(candidate);
          log('✅ Candidate added');
        } catch (e) {
          log('❌ Failed: $e');
          _pendingCandidates.add(candidate);
        }
      } else {
        _pendingCandidates.add(candidate);
        log('🕒 Queued (total: ${_pendingCandidates.length})');
      }
    } catch (e, stackTrace) {
      log('❌ Error handling ICE: $e');
      log('Stack: $stackTrace');
    }
  }
/*
  Future<void> _handleIceCandidate(Map<String, dynamic> data) async {
    try {
      log('🧊 ===== ICE CANDIDATE RECEIVED =====');

      final candidateData = data['candidate'];
      final fromUserId = data['fromUserId']?.toString();
      final callId = data['callId']?.toString();

      if (callId != _currentCallId) {
        log('⚠️ Candidate for other call - ignoring');
        return;
      }

      if (candidateData == null) {
        log('❌ No candidate data');
        return;
      }

      final pref = await SharedPreferences.getInstance();
      final currentUserId = pref.getString("userId");
      if (fromUserId != null && fromUserId == currentUserId) {
        log('⚠️ Our own candidate - ignoring');
        return;
      }

      final candidate = RTCIceCandidate(
        candidateData['candidate'],
        candidateData['sdpMid'],
        candidateData['sdpMLineIndex'],
      );

      final pc = _peerConnections[fromUserId];
      final remoteDesc = pc != null ? await pc.getRemoteDescription() : null;
      final canAddNow = pc != null && remoteDesc != null && !_isSettingRemoteDescription;

      if (canAddNow) {
        try {
          await pc!.addCandidate(candidate);
          log('✅ Candidate added to PC of $fromUserId');
        } catch (e) {
          log('⚠️ Failed to add candidate immediately: $e, queueing');
          _pendingIceCandidatesByUser.putIfAbsent(fromUserId!, () => []).add(candidate);
        }
      } else {
        _pendingIceCandidatesByUser.putIfAbsent(fromUserId!, () => []).add(candidate);
        log('🕒 Queued candidate for $fromUserId (total: ${_pendingIceCandidatesByUser[fromUserId]?.length})');
      }
    } catch (e, st) {
      log('❌ Error handling ICE candidate: $e');
      log('Stack: $st');
    }
  }
*/

/*
  void _handleParticipantLeft(Map<String, dynamic> data) {
    log('Participant left: $data');
  }
*/

  void _handleParticipantLeft(Map<String, dynamic> data) {
    final userId = data['userId']?.toString();
    log('Participant left event: $data');
    if (userId != null) {
      final pc = _peerConnections.remove(userId);
      if (pc != null) {
        try {
          pc.close();
        } catch (_) {}
      }
      _pendingIceCandidatesByUser.remove(userId);
      if (_participants.containsKey(userId)) {
        _participants.remove(userId);
        _participantsController.add(Map.from(_participants));
      }
      log('✅ Cleaned up PC and data for leaving participant $userId');
    }
  }

  Map<String, dynamic>? _lastParticipantsSync;
  DateTime? _lastParticipantsSyncTime;

/*
  Future<void> _handleParticipantsSync(Map<String, dynamic> data) async {
    final now = DateTime.now();
    if (_lastParticipantsSync != null &&
        _lastParticipantsSyncTime != null &&
        now.difference(_lastParticipantsSyncTime!).inMilliseconds < 1000 &&
        _areParticipantsSyncIdentical(_lastParticipantsSync!, data)) {
      return;
    }

    log('📋 Participants sync');

    _lastParticipantsSync = Map.from(data);
    _lastParticipantsSyncTime = now;

    final callId = data['callId'];
    final participants = data['participants'] as List?;

    if (_currentCallId == callId && participants != null) {
      final newParticipantIds = participants
          .map((p) => p['userId']?.toString())
          .where((id) => id != null)
          .toSet();

      SharedPreferences pref = await SharedPreferences.getInstance();
      final currentUserId = pref.getString("userId");
      newParticipantIds.add(currentUserId!);

      final selfParticipant = _participants[currentUserId];
      _participants.clear();

      if (selfParticipant != null) {
        _participants[currentUserId] = selfParticipant;
      }

      for (final participant in participants) {
        final userId = participant['userId']?.toString();
        if (userId != null && userId != currentUserId) {
          _participants[userId] = CallParticipant(
            userId: userId,
            socketId: participant['socketId']?.toString() ?? '',
            name: participant['name']?.toString() ?? 'Unknown',
            isAudioEnabled: participant['isAudioEnabled'] ?? true,
            isVideoEnabled: participant['isVideoEnabled'] ?? false,
          );
        }
      }

      _participantsController.add(Map.from(_participants));
      log('✅ Participants updated');
    }
  }
*/
  Future<void> _handleParticipantsSync(Map<String, dynamic> data) async {
    final now = DateTime.now();
    if (_lastParticipantsSync != null &&
        _lastParticipantsSyncTime != null &&
        now.difference(_lastParticipantsSyncTime!).inMilliseconds < 1000 &&
        _areParticipantsSyncIdentical(_lastParticipantsSync!, data)) {
      return;
    }

    log('📋 ===== PARTICIPANTS SYNC =====');
    log('Raw data: $data');

    _lastParticipantsSync = Map.from(data);
    _lastParticipantsSyncTime = now;

    final callId = data['callId'];
    final participants = data['participants'] as List?;

    log('Call ID: $callId');
    log('Current call ID: $_currentCallId');
    log('Participants count: ${participants?.length ?? 0}');

    if (_currentCallId == callId && participants != null) {
      SharedPreferences pref = await SharedPreferences.getInstance();
      final currentUserId = pref.getString("userId");
      final currentUserName = pref.getString("userName");

      log('Current user: $currentUserId ($currentUserName)');

      // Clear and rebuild participants map
      _participants.clear();

      // IMPORTANT: Add self first
      _participants[currentUserId!] = CallParticipant(
        userId: currentUserId,
        socketId: socketService.socket?.id ?? '',
        name: currentUserName ?? 'You',
        isAudioEnabled: _audioEnabled,
        isVideoEnabled: _callType == CallType.video ? _videoEnabled : false,
        stream: _localStream,
      );
      log('✅ Added self to participants: $currentUserName');

      // Add other participants
      for (final participant in participants) {
        final userId = participant['userId']?.toString();
        if (userId != null && userId != currentUserId) {
          final name = participant['name']?.toString() ?? 'Unknown';
          _participants[userId] = CallParticipant(
            userId: userId,
            socketId: participant['socketId']?.toString() ?? '',
            name: name,
            isAudioEnabled: participant['isAudioEnabled'] ?? true,
            isVideoEnabled: participant['isVideoEnabled'] ?? false,
          );
          log('✅ Added participant: $name ($userId)');
        }
      }

      log('📊 Total participants: ${_participants.length}');
      for (var entry in _participants.entries) {
        log('  - ${entry.value.name} (${entry.key})${entry.key == currentUserId ? " [ME]" : ""}');
      }

      _participantsController.add(Map.from(_participants));
      log('✅ Participants stream updated');

      // Create peer connections for initiator
      try {
        if (_isInitiator) {
          log('🔗 Initiator creating peer connections for new participants...');
          final participantIds = _participants.keys.toList();
          for (final userId in participantIds) {
            if (userId == currentUserId) continue; // <-- USE CACHED ID
            if (!_peerConnections.containsKey(userId)) {
              log('  Creating PC for: $userId');
              await _createPeerConnectionFor(userId);
              await Future.delayed(Duration(milliseconds: 50));
              await _createAndSendOfferTo(userId);
            }
          }
        }
      } catch (e, st) {
        log('❌ Error creating offers: $e');
        log('Stack: $st');
      }
    }
    log('═══════════════════════════════');
  }
  bool _areParticipantsSyncIdentical(Map<String, dynamic> s1, Map<String, dynamic> s2) {
    if (s1['callId'] != s2['callId']) return false;
    final p1 = s1['participants'] as List?;
    final p2 = s2['participants'] as List?;
    if (p1?.length != p2?.length) return false;
    if (p1 == null || p2 == null) return p1 == p2;
    final ids1 = p1.map((p) => p['userId']?.toString()).toSet();
    final ids2 = p2.map((p) => p['userId']?.toString()).toSet();
    return ids1.containsAll(ids2) && ids2.containsAll(ids1);
  }

  void dispose() {
    cleanup();
    _ringtoneService.dispose(); // ✅ Dispose ringtone service

    _callStateController.close();
    _localStreamController.close();
    _remoteStreamController.close();
    _audioEnabledController.close();
    _videoEnabledController.close();
    _speakerEnabledController.close();
    _participantsController.close();
  }
}

class CallParticipant {
  final String userId;
  final String socketId;
  final String name;
  final String? avatar;
  final bool isAudioEnabled;
  final bool isVideoEnabled;
  final MediaStream? stream;

  const CallParticipant({
    required this.userId,
    required this.socketId,
    required this.name,
    this.avatar,
    required this.isAudioEnabled,
    required this.isVideoEnabled,
    this.stream,
  });

  CallParticipant copyWith({
    String? userId,
    String? socketId,
    String? name,
    String? avatar,
    bool? isAudioEnabled,
    bool? isVideoEnabled,
    MediaStream? stream,
  }) {
    return CallParticipant(
      userId: userId ?? this.userId,
      socketId: socketId ?? this.socketId,
      name: name ?? this.name,
      avatar: avatar ?? this.avatar,
      isAudioEnabled: isAudioEnabled ?? this.isAudioEnabled,
      isVideoEnabled: isVideoEnabled ?? this.isVideoEnabled,
      stream: stream ?? this.stream,
    );
  }
}