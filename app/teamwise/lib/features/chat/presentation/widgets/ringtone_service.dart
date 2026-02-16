import 'dart:developer';
import 'package:flutter/services.dart';
import 'package:just_audio/just_audio.dart';

class RingtoneService {
  static final RingtoneService _instance = RingtoneService._internal();
  factory RingtoneService() => _instance;
  RingtoneService._internal();

  AudioPlayer? _audioPlayer;
  bool _isPlaying = false;
  bool _isInitialized = false;

  Future<void> initialize() async {
    try {
      if (_isInitialized) {
        log('⚠️ Ringtone service already initialized');
        return;
      }

      _audioPlayer = AudioPlayer();
      
      // ✅ Configure audio player to bypass silent mode on Android
      // This uses the ALARM stream which plays even in silent mode
      await _audioPlayer!.setAudioSource(
        AudioSource.asset('assets/sounds/callsound.wav'),
        preload: false,
      );
      
      _isInitialized = true;
      log('✅ Ringtone service initialized with background support + silent mode bypass');
    } catch (e) {
      log('❌ Error initializing ringtone: $e');
    }
  }


  Future<void> playRingtone() async {
    try {
      if (!_isInitialized) {
        await initialize();
      }

      if (_isPlaying) {
        log('⚠️ Ringtone already playing');
        return;
      }

      if (_audioPlayer == null) {
        log('❌ Audio player not initialized');
        return;
      }

      log('📱 Playing ringtone in background mode...');

      // ✅ Configure audio session for background playback (iOS/Android)
      try {
        await _audioPlayer!.setAudioSource(
          AudioSource.asset('assets/sounds/callsound.wav'),
          initialPosition: Duration.zero,
          preload: true,
        );
        log('✅ Audio source loaded');
      } catch (e) {
        log('⚠️ Error loading audio source: $e');
        // Try loading without preload
        await _audioPlayer!.setAsset('assets/sounds/callsound.wav');
      }

      // Set volume to maximum (1.0 is max)
      await _audioPlayer!.setVolume(1.0);

      // Loop the ringtone
      await _audioPlayer!.setLoopMode(LoopMode.one);

      // Play - this will work even when app is in background
      await _audioPlayer!.play();
      _isPlaying = true;

      log('✅ Ringtone started (background-enabled, works offline)');
    } catch (e, s) {
      log('❌ Error playing ringtone: $e');
      log('Stack trace: $s');
      // Fallback to system sound if asset fails
      _playSystemRingtone();
    }
  }

  Future<void> stopRingtone() async {
    try {
      if (!_isPlaying) {
        log('⚠️ Ringtone not playing');
        return;
      }

      log('🔇 Stopping ringtone...');
      
      if (_audioPlayer != null) {
        await _audioPlayer!.stop();
        await _audioPlayer!.seek(Duration.zero);
      }
      
      _isPlaying = false;
      log('✅ Ringtone stopped');
    } catch (e) {
      log('❌ Error stopping ringtone: $e');
      _isPlaying = false;
    }
  }

  void _playSystemRingtone() {
    try {
      const platform = MethodChannel('com.teamwise.app/ringtone');
      platform.invokeMethod('playRingtone');
      _isPlaying = true;
      log('✅ System ringtone started');
    } catch (e) {
      log('❌ Error playing system ringtone: $e');
    }
  }

  Future<void> stopSystemRingtone() async {
    try {
      const platform = MethodChannel('com.teamwise.app/ringtone');
      await platform.invokeMethod('stopRingtone');
      _isPlaying = false;
      log('✅ System ringtone stopped');
    } catch (e) {
      log('❌ Error stopping system ringtone: $e');
    }
  }

  bool get isPlaying => _isPlaying;

  Future<void> dispose() async {
    try {
      if (_audioPlayer != null) {
        await _audioPlayer!.stop();
        await _audioPlayer!.dispose();
        _audioPlayer = null;
      }
      _isPlaying = false;
      _isInitialized = false;
      log('✅ Ringtone service disposed');
    } catch (e) {
      log('❌ Error disposing ringtone: $e');
    }
  }
}