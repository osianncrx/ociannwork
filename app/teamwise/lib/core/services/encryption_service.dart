import 'dart:convert';
import 'dart:math';
import 'dart:typed_data';
import 'package:crypto/crypto.dart';
import 'package:encrypt/encrypt.dart' as encrypt;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:pointycastle/export.dart' as pc;
import 'package:asn1lib/asn1lib.dart';

class EncryptionService {
  static final EncryptionService _instance = EncryptionService._internal();
  factory EncryptionService() => _instance;
  EncryptionService._internal();

  final _storage = const FlutterSecureStorage();

  static const String _privateKeyKey = 'e2e_private_key';
  static const String _publicKeyKey = 'e2e_public_key';

  /// Generates a new 2048-bit RSA key pair in SPKI/PKCS8 formats
  Future<Map<String, String>> generateKeyPair() async {
    final keyGen = pc.KeyGenerator('RSA');
    final secureRandom = _getSecureRandom();

    keyGen.init(
      pc.ParametersWithRandom(
        pc.RSAKeyGeneratorParameters(BigInt.parse('65537'), 2048, 64),
        secureRandom,
      ),
    );

    final pair = keyGen.generateKeyPair();
    final myPublic = pair.publicKey as pc.RSAPublicKey;
    final myPrivate = pair.privateKey as pc.RSAPrivateKey;

    final publicKeySpki = _encodePublicKeyToSpki(myPublic);
    final privateKeyPkcs8 = _encodePrivateKeyToPkcs8(myPrivate);

    await _storage.write(key: _privateKeyKey, value: privateKeyPkcs8);
    await _storage.write(key: _publicKeyKey, value: publicKeySpki);

    return {'publicKey': publicKeySpki, 'privateKey': privateKeyPkcs8};
  }

  Future<String?> getPublicKey() async {
    return await _storage.read(key: _publicKeyKey);
  }

  Future<String?> getPrivateKey() async {
    return await _storage.read(key: _privateKeyKey);
  }

  /// Derives an AES key from a public key string (matching frontend logic)
  String deriveAESKey(String publicKey) {
    return sha256.convert(utf8.encode(publicKey)).toString();
  }

  /// Encrypts a message using CryptoJS-compatible AES (Salted__ format)
  String encryptMessage(String message, String passphrase) {
    try {
      final salt = Uint8List.fromList(
        List.generate(8, (_) => Random.secure().nextInt(256)),
      );

      // Derive Key and IV using OpenSSL-compatible KDF (EVP_BytesToKey)
      final derivedHash = _evpBytesToKey(passphrase, salt, 32 + 16);
      final key = encrypt.Key(derivedHash.sublist(0, 32));
      final iv = encrypt.IV(derivedHash.sublist(32, 48));

      final encrypter = encrypt.Encrypter(
        encrypt.AES(key, mode: encrypt.AESMode.cbc),
      );
      final encrypted = encrypter.encrypt(message, iv: iv);

      // Format: Salted__ + salt + ciphertext
      final saltedPrefix = utf8.encode("Salted__");
      final combined = Uint8List.fromList([
        ...saltedPrefix,
        ...salt,
        ...encrypted.bytes,
      ]);

      return base64.encode(combined);
    } catch (e) {
      return message;
    }
  }

  /// Decrypts a CryptoJS-compatible AES string
  String decryptMessage(String encryptedBase64, String passphrase) {
    try {
      final combined = base64.decode(encryptedBase64);
      if (combined.length < 16) return encryptedBase64;

      final prefixBytes = combined.sublist(0, 8);
      final prefix = utf8.decode(prefixBytes, allowMalformed: true);
      if (prefix != "Salted__") return encryptedBase64;

      final salt = combined.sublist(8, 16);
      final ciphertext = combined.sublist(16);

      // Derive Key and IV
      final derivedHash = _evpBytesToKey(passphrase, salt, 32 + 16);
      final key = encrypt.Key(derivedHash.sublist(0, 32));
      final iv = encrypt.IV(derivedHash.sublist(32, 48));

      final encrypter = encrypt.Encrypter(
        encrypt.AES(key, mode: encrypt.AESMode.cbc),
      );
      return encrypter.decrypt(encrypt.Encrypted(ciphertext), iv: iv);
    } catch (e) {
      return encryptedBase64;
    }
  }

  /// OpenSSL-compatible Key Derivation Function (EVP_BytesToKey)
  /// for CryptoJS compatibility (default MD5, no iterations)
  Uint8List _evpBytesToKey(
    String passphrase,
    Uint8List salt,
    int desiredLength,
  ) {
    var data = utf8.encode(passphrase);
    var key = <int>[];
    var block = <int>[];

    while (key.length < desiredLength) {
      block = md5.convert([...block, ...data, ...salt]).bytes;
      key.addAll(block);
    }

    return Uint8List.fromList(key.sublist(0, desiredLength));
  }

  pc.SecureRandom _getSecureRandom() {
    final secureRandom = pc.FortunaRandom();
    final seedSource = Random.secure();
    final seeds = List.generate(32, (_) => seedSource.nextInt(256));
    secureRandom.seed(pc.KeyParameter(Uint8List.fromList(seeds)));
    return secureRandom;
  }

  /// Encodes RSAPublicKey to SPKI format (X.509)
  String _encodePublicKeyToSpki(pc.RSAPublicKey key) {
    var topLevel = ASN1Sequence();

    var algorithmIdentifier = ASN1Sequence();
    algorithmIdentifier.add(
      ASN1ObjectIdentifier.fromComponentString('1.2.840.113549.1.1.1'),
    ); // rsaEncryption
    algorithmIdentifier.add(ASN1Null());
    topLevel.add(algorithmIdentifier);

    var publicKeySequence = ASN1Sequence();
    publicKeySequence.add(ASN1Integer(key.modulus!));
    publicKeySequence.add(ASN1Integer(key.publicExponent!));

    var publicKeyBitString = ASN1BitString(
      Uint8List.fromList(publicKeySequence.encodedBytes),
    );
    topLevel.add(publicKeyBitString);

    return base64.encode(topLevel.encodedBytes);
  }

  /// Encodes RSAPrivateKey to PKCS#8 format
  String _encodePrivateKeyToPkcs8(pc.RSAPrivateKey key) {
    var topLevel = ASN1Sequence();
    topLevel.add(ASN1Integer(BigInt.zero)); // version

    var algorithmIdentifier = ASN1Sequence();
    algorithmIdentifier.add(
      ASN1ObjectIdentifier.fromComponentString('1.2.840.113549.1.1.1'),
    );
    algorithmIdentifier.add(ASN1Null());
    topLevel.add(algorithmIdentifier);

    var privateKeySequence = ASN1Sequence();
    privateKeySequence.add(ASN1Integer(BigInt.zero)); // version
    privateKeySequence.add(ASN1Integer(key.modulus!));
    privateKeySequence.add(ASN1Integer(key.publicExponent!));
    privateKeySequence.add(ASN1Integer(key.privateExponent!));
    privateKeySequence.add(ASN1Integer(key.p!));
    privateKeySequence.add(ASN1Integer(key.q!));
    privateKeySequence.add(
      ASN1Integer(key.privateExponent! % (key.p! - BigInt.one)),
    ); // exp1
    privateKeySequence.add(
      ASN1Integer(key.privateExponent! % (key.q! - BigInt.one)),
    ); // exp2
    privateKeySequence.add(ASN1Integer(key.q!.modInverse(key.p!))); // coeff

    var privateKeyOctetString = ASN1OctetString(
      Uint8List.fromList(privateKeySequence.encodedBytes),
    );
    topLevel.add(privateKeyOctetString);

    return base64.encode(topLevel.encodedBytes);
  }
}
