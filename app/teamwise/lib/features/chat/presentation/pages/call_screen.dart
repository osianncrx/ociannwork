import 'dart:async';
import 'dart:developer';
import 'package:flutter/material.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:teamwise/common/index.dart';
import 'package:teamwise/config.dart';

import '../../../../common/widgets/app_toast.dart';
import '../../../../core/network/api_manger.dart';
import '../../data/datasources/chat_Api.dart';
import '../widgets/WebRTCCallService.dart';

class VideoCallScreen extends StatefulWidget {
  final String participantName;
  final String participantId;
  final CallType callType;
  final bool isIncoming;
  final String chatType;

  const VideoCallScreen({
    super.key,
    required this.participantName,
    required this.participantId,
    required this.callType,
    this.isIncoming = false,
    required this.chatType,
  });

  @override
  State<VideoCallScreen> createState() => _VideoCallScreenState();
}

class _VideoCallScreenState extends State<VideoCallScreen> {
  final WebRTCCallService _callService = WebRTCCallService();
  final RTCVideoRenderer _localRenderer = RTCVideoRenderer();

  // Store renderers for each participant
  final Map<String, RTCVideoRenderer> _participantRenderers = {};

  StreamSubscription? _callStateSubscription;
  StreamSubscription? _localStreamSubscription;
  StreamSubscription? _remoteStreamSubscription;
  StreamSubscription? _audioSubscription;
  StreamSubscription? _videoSubscription;
  StreamSubscription? _participantsSubscription;

  bool _isInitialized = false;
  CallState _callState = CallState.idle;
  bool _isAudioEnabled = true;
  bool _isVideoEnabled = true;
  bool _isSpeakerOn = false;
  Duration _callDuration = Duration.zero;
  Timer? _callTimer;
  bool _hasAcceptedIncoming = false;
  String? _myUserId;
  bool _isE2EEnabled = false;

  Map<String, CallParticipant> _participants = {};

  @override
  void initState() {
    super.initState();
    _initializeRenderers();
  }

  String _getCallStatusText() {
    switch (_callState) {
      case CallState.idle:
        return 'Initializing...';
      case CallState.outgoing:
        return _isE2EEnabled ? 'Calling Encrypted...' : 'Calling...';
      case CallState.incoming:
        final callTypeText = CallType.video == 'video' ? 'video' : 'audio';
        return _isE2EEnabled
            ? 'Incoming Encrypted $callTypeText call...'
            : 'Incoming $callTypeText call...';
      case CallState.connecting:
        return 'Connecting...';
      case CallState.connected:
        return _isE2EEnabled ? 'Connected (Encrypted)' : 'Connected';
      case CallState.ended:
        return 'Call ended';
      default:
        return '';
    }
  }

  Future<void> _initializeRenderers() async {
    try {
      log('🎬 ===== INITIALIZING CALL SCREEN =====');
      log('Participant: ${widget.participantName}');
      log('Call Type: ${widget.callType}');
      log('Is Incoming: ${widget.isIncoming}');

      await _localRenderer.initialize();
      log('✅ Local renderer initialized');

      _setupSubscriptions();

      setState(() {
        _isInitialized = true;
        _callState = _callService.callState;
        _isAudioEnabled = _callService.isAudioEnabled;
        _isVideoEnabled = _callService.isVideoEnabled;
        _participants = Map.from(_callService.participants);
      });

      try {
        final prefs = await SharedPreferences.getInstance();
        _myUserId = prefs.getString('userId');
        if (mounted) setState(() {});
      } catch (_) {}

      // Check E2E encryption status
      try {
        final chatApi = ChatApi(
          serviceLocator<AuthBloc>(),
          serviceLocator<ApiManager>(),
        );
        _isE2EEnabled = await chatApi.getE2EStatus();
        log('🔐 E2E Encryption Enabled: $_isE2EEnabled');
        if (mounted) setState(() {});
      } catch (e) {
        log('⚠️ Error fetching E2E status: $e');
      }

      log('✅ Call screen initialization complete');
    } catch (e) {
      log('❌ Error initializing call screen: $e');
      _showErrorAndExit('Failed to initialize call screen');
    }
  }

  void _setupSubscriptions() {
    _callStateSubscription = _callService.callStateStream.listen((state) {
      log('📊 Call state changed: $state');
      setState(() {
        _callState = state;
      });

      if (state == CallState.connected) {
        _hasAcceptedIncoming = true;
        _startCallTimer();
      } else if (state == CallState.ended) {
        _stopCallTimer();
        _handleCallEnded();
      }
    });

    _localStreamSubscription = _callService.localStreamStream.listen((stream) {
      if (stream != null) {
        setState(() => _localRenderer.srcObject = stream);
      } else {
        setState(() => _localRenderer.srcObject = null);
      }
    });

    _remoteStreamSubscription = _callService.remoteStreamStream.listen((
      stream,
    ) {
      if (stream != null) {
        log('📥 Remote stream received');
        setState(() {});
      }
    });

    _audioSubscription = _callService.audioEnabledStream.listen((enabled) {
      log('🔊 Audio enabled: $enabled');
      setState(() => _isAudioEnabled = enabled);
    });

    _videoSubscription = _callService.videoEnabledStream.listen((enabled) {
      log('📹 Video enabled: $enabled');
      setState(() => _isVideoEnabled = enabled);
    });

    // IMPORTANT: Listen to participants stream
    _participantsSubscription = _callService.participantsStream.listen((
      participants,
    ) async {
      log('👥 Participants updated: ${participants.length}');

      // Clean up renderers for participants who left
      final leftParticipants = _participantRenderers.keys
          .where((id) => !participants.containsKey(id))
          .toList();

      for (final id in leftParticipants) {
        final renderer = _participantRenderers[id];
        if (renderer != null) {
          try {
            // Nullify srcObject first to detach stream
            renderer.srcObject = null;
            await renderer.dispose();
          } catch (e) {
            log('⚠️ Error disposing renderer for $id: $e');
          }
          _participantRenderers.remove(id);
        }
      }

      // Initialize renderers for new participants (if they have streams)
      for (final entry in participants.entries) {
        if (entry.value.stream != null &&
            !_participantRenderers.containsKey(entry.key)) {
          final renderer = RTCVideoRenderer();
          await renderer.initialize();
          renderer.srcObject = entry.value.stream;
          _participantRenderers[entry.key] = renderer;
        }
      }

      setState(() {
        _participants = Map.from(participants);
      });
    });
  }

  void _startCallTimer() {
    _callTimer?.cancel();
    _callTimer = Timer.periodic(Duration(seconds: 1), (timer) {
      if (mounted) {
        setState(() {
          _callDuration = Duration(seconds: timer.tick);
        });
      }
    });
  }

  void _stopCallTimer() {
    _callTimer?.cancel();
  }

  void _handleCallEnded() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        Navigator.of(context).maybePop();
      }
    });
  }

  void _showErrorAndExit(String message) {
    if (mounted) {
      AppToast.showMessage(message);
      Navigator.of(context).pop();
    }
  }

  String _formatDuration(Duration duration) {
    String twoDigits(int n) => n.toString().padLeft(2, '0');
    final minutes = twoDigits(duration.inMinutes.remainder(60));
    final seconds = twoDigits(duration.inSeconds.remainder(60));
    return '$minutes:$seconds';
  }

  @override
  void dispose() {
    log('🔄 Disposing call screen...');
    _callTimer?.cancel();
    _callStateSubscription?.cancel();
    _localStreamSubscription?.cancel();
    _remoteStreamSubscription?.cancel();
    _audioSubscription?.cancel();
    _videoSubscription?.cancel();
    _participantsSubscription?.cancel();

    _localRenderer.srcObject = null;
    try {
      _localRenderer.dispose();
    } catch (e) {
      log('⚠️ Error disposing local renderer: $e');
    }

    // Dispose all participant renderers
    for (final renderer in _participantRenderers.values) {
      try {
        renderer.srcObject = null;
        renderer.dispose();
      } catch (e) {
        log('⚠️ Error disposing participant renderer: $e');
      }
    }
    _participantRenderers.clear();

    log('✅ Call screen disposed');
    super.dispose();
  }

  // Accept incoming call
  Future<void> _onAcceptIncoming() async {
    log('🎯 Accepting incoming call...');
    try {
      await _callService.acceptCall();
      setState(() {
        _hasAcceptedIncoming = true;
      });
    } catch (e) {
      log('❌ Error accepting call: $e');
      AppToast.showError('Failed to accept call');
    }
  }

  // Decline incoming call
  void _onDeclineIncoming() {
    log('⛔ Declining incoming call');
    try {
      _callService.declineCall();
    } catch (e) {
      log('❌ Error declining call: $e');
    } finally {
      // WidgetsBinding.instance.addPostFrameCallback((_) {
      //   if (mounted) Navigator.of(context).maybePop();
      // });
    }
  }

  // Build audio call UI
  Widget _buildAudioCallUI() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            height: Sizes.s100,
            width: Sizes.s100,
            decoration: BoxDecoration(
              color: appColor(context).primary,
              borderRadius: BorderRadius.circular(Sizes.s20),
            ),
            child: Text(
              widget.participantName.isNotEmpty
                  ? widget.participantName[0].toUpperCase()
                  : 'U',
              style: TextStyle(
                fontSize: 48,
                color: Colors.white,
                fontWeight: FontWeight.bold,
              ),
            ).center(),
          ),
          SizedBox(height: 24),
          Text(
            widget.participantName,
            style: TextStyle(
              color: Colors.white,
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),
          SizedBox(height: 8),

          Text(
            _callState == CallState.connected
                ? _formatDuration(_callDuration)
                : _getCallStatusText(),
            style: TextStyle(color: Colors.white70, fontSize: 16),
          ),
        ],
      ),
    );
  }

  // Build video call UI
  Widget _buildVideoCallUI() {
    final remoteParticipants = _participants.entries
        .where((e) => e.value.userId != _myUserId)
        .map((e) => e.value)
        .toList();

    final hasRemoteVideo =
        remoteParticipants.isNotEmpty &&
        remoteParticipants.first.isVideoEnabled &&
        _participantRenderers[remoteParticipants.first.userId]?.srcObject !=
            null;

    return Stack(
      children: [
        // Remote participant full screen
        if (hasRemoteVideo && remoteParticipants.isNotEmpty)
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: RTCVideoView(
              _participantRenderers[remoteParticipants.first.userId]!,
              objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover,
              mirror: false,
            ),
          )
        else
          Container(
            color: Colors.grey[900],
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircleAvatar(
                    radius: 60,
                    backgroundColor: Colors.blue[700],
                    child: Text(
                      remoteParticipants.isNotEmpty
                          ? remoteParticipants.first.name[0].toUpperCase()
                          : widget.participantName[0].toUpperCase(),
                      style: TextStyle(
                        fontSize: 48,
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  SizedBox(height: 16),
                  Text(
                    remoteParticipants.isNotEmpty
                        ? remoteParticipants.first.name
                        : widget.participantName,
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ),

        // Local video preview (top-right corner)
        Positioned(
          top: 80,
          right: 12,
          child: Container(
            width: 100,
            height: 140,
            decoration: BoxDecoration(
              border: Border.all(color: Colors.white, width: 2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: _localRenderer.srcObject != null && _isVideoEnabled
                ? ClipRRect(
                    borderRadius: BorderRadius.circular(10),
                    child: RTCVideoView(
                      _localRenderer,
                      objectFit:
                          RTCVideoViewObjectFit.RTCVideoViewObjectFitCover,
                      mirror: true,
                    ),
                  )
                : Container(
                    width: 100,
                    height: 140,
                    color: Colors.grey[900],
                    child: Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          CircleAvatar(
                            radius: 30,
                            backgroundColor: Colors.blue[700],
                            child: Text(
                              remoteParticipants.isNotEmpty
                                  ? remoteParticipants.first.name[0]
                                        .toUpperCase()
                                  : widget.participantName[0].toUpperCase(),
                              style: TextStyle(
                                fontSize: 20,
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
          ),
        ),

        // Other participants grid (if more than 1)
        if (remoteParticipants.length > 2)
          Positioned(
            bottom: 80,
            left: 12,
            right: 12 + 100 + 12,
            child: SizedBox(
              height: 140,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                itemCount: remoteParticipants.length - 1,
                itemBuilder: (context, index) {
                  final participant = remoteParticipants[index + 1];
                  final renderer = _participantRenderers[participant.userId];
                  final hasVideo =
                      participant.isVideoEnabled && renderer?.srcObject != null;

                  return Container(
                    width: 100,
                    margin: EdgeInsets.only(right: 8),
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.white24, width: 1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: hasVideo
                        ? ClipRRect(
                            borderRadius: BorderRadius.circular(11),
                            child: RTCVideoView(
                              renderer!,
                              objectFit: RTCVideoViewObjectFit
                                  .RTCVideoViewObjectFitCover,
                              mirror: false,
                            ),
                          )
                        : Container(
                            decoration: BoxDecoration(
                              color: Colors.grey[800],
                              borderRadius: BorderRadius.circular(11),
                            ),
                            child: Center(
                              child: CircleAvatar(
                                radius: 20,
                                backgroundColor: Colors.blue[600],
                                child: Text(
                                  participant.name[0].toUpperCase(),
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 12,
                                  ),
                                ),
                              ),
                            ),
                          ),
                  );
                },
              ),
            ),
          ),
      ],
    );
  }

  // Build top bar
  Widget _buildTopBar() {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        // gradient: LinearGradient(
        //   begin: Alignment.topCenter,
        //   end: Alignment.bottomCenter,
        //   colors: [Colors.black.withValues(alpha: 0.6), Colors.transparent],
        // ),
      ),
      child: Row(
        children: [
          GestureDetector(
            onTap: () async {
              // Navigator.pop(context);
              await _callService.endCall();
            },
            child: Icon(Icons.arrow_back, color: Colors.white, size: 24),
          ),
          HSpace(Sizes.s20),
          if (widget.isIncoming &&
              !_hasAcceptedIncoming &&
              _callState != CallState.connected)
            Text(
              '${widget.participantName} is calling...',
              style: TextStyle(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.w500,
              ),
            ),
        ],
      ),
    );
  }

  // Build floating button with proper color based on state
  Widget _buildFloatingButton({
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 60,
        height: 60,
        decoration: BoxDecoration(
          color: color,
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
              color: color.withOpacity(0.3),
              blurRadius: 3,
              offset: Offset(0, 2),
            ),
          ],
        ),
        child: Icon(icon, color: Colors.white, size: 24),
      ),
    );
  }

  // Build bottom controls
  Widget _buildBottomControls() {
    final showControls =
        !widget.isIncoming ||
        _hasAcceptedIncoming ||
        _callState == CallState.connected;

    // Determine mic button color based on audio state
    final micColor = _isAudioEnabled
        ? Colors.white.withValues(alpha: 0.3)
        : Colors.red;

    // Determine video button color based on video state
    final videoColor = _isVideoEnabled
        ? Colors.white.withValues(alpha: 0.3)
        : Colors.red;

    return Positioned(
      bottom: 0,
      left: 0,
      right: 0,
      child: Container(
        padding: EdgeInsets.symmetric(vertical: 24, horizontal: 24),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.only(
            topLeft: Radius.circular(Sizes.s20),
            topRight: Radius.circular(Sizes.s20),
          ),
          color: Color(0xffFFFFFF).withOpacity(0.1),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Action buttons
            if (showControls)
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  if (widget.callType == CallType.video)
                    _buildFloatingButton(
                      icon: Icons.cameraswitch,

                      color: Colors.white.withValues(alpha: 0.3),
                      onTap: () => _callService.switchCamera(),
                    ),
                  // Mute/Unmute - ✅ FIXED: Shows correct color based on audio state
                  _buildFloatingButton(
                    icon: _isAudioEnabled ? Icons.mic : Icons.mic_off,
                    color: micColor,
                    onTap: () {
                      log(
                        '🔊 Toggling audio: $_isAudioEnabled -> ${!_isAudioEnabled}',
                      );
                      _callService.toggleAudio();
                    },
                  ),

                  // End call (largest)
                  GestureDetector(
                    onTap: () async {
                      await _callService.endCall();
                      // if (mounted) Navigator.of(context).pop();
                    },
                    child: Container(
                      width: 70,
                      height: 70,
                      decoration: BoxDecoration(
                        color: Colors.red,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: Colors.red.withOpacity(0.4),
                            blurRadius: 12,
                            offset: Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Icon(
                        Icons.call_end,
                        color: Colors.white,
                        size: 32,
                      ),
                    ),
                  ),

                  // Video toggle (for video calls) - ✅ FIXED: Shows correct color based on video state
                  if (widget.callType == CallType.video)
                    _buildFloatingButton(
                      icon: _isVideoEnabled
                          ? Icons.videocam
                          : Icons.videocam_off,
                      color: videoColor,
                      onTap: () {
                        log(
                          '📹 Toggling video: $_isVideoEnabled -> ${!_isVideoEnabled}',
                        );
                        _callService.toggleVideo();
                      },
                    ),
                ],
              ),

            // Incoming call buttons
            if (widget.isIncoming && !_hasAcceptedIncoming)
              Padding(
                padding: EdgeInsets.only(top: 24),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    GestureDetector(
                      onTap: _onDeclineIncoming,
                      child: Container(
                        width: 60,
                        height: 60,
                        decoration: BoxDecoration(
                          color: Colors.red,
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          Icons.call_end,
                          color: Colors.white,
                          size: 28,
                        ),
                      ),
                    ),
                    GestureDetector(
                      onTap: _onAcceptIncoming,
                      child: Container(
                        width: 60,
                        height: 60,
                        decoration: BoxDecoration(
                          color: Colors.green,
                          shape: BoxShape.circle,
                        ),
                        child: Icon(Icons.call, color: Colors.white, size: 28),
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (!_isInitialized) {
      return Scaffold(
        backgroundColor: Colors.black,
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(color: Colors.white),
              SizedBox(height: 16),
              Text(
                'Initializing call...',
                style: TextStyle(color: Colors.white, fontSize: 16),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          color: Color(0XFF172146),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.08),
              blurRadius: 5,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Stack(
          children: [
            // Incoming controls
            // if (widget.isIncoming &&
            //     !_hasAcceptedIncoming &&
            //     _callState != CallState.connected)
            //   _buildIncomingControls(),

            // Main content based on call type
            widget.callType == CallType.audio
                ? _buildAudioCallUI()
                : _buildVideoCallUI(),

            // Top bar with call info
            _buildTopBar().paddingDirectional(top: Sizes.s50),

            VSpace(Sizes.s20),

            // Bottom controls
            _buildBottomControls(),
          ],
        ),
      ),
    );
  }
}
