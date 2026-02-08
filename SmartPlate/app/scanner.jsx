import React, { useState, useRef, useContext, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
  ActivityIndicator,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { AuthContext } from '../src/context/AuthContext';
import { scanFood } from '../src/services/api';

const STATES = { IDLE: 'IDLE', PREVIEW: 'PREVIEW', LOADING: 'LOADING', RESULTS: 'RESULTS', ERROR: 'ERROR' };

export default function ScannerScreen() {
  const { userToken, logout } = useContext(AuthContext);
  const [screenState, setScreenState] = useState(STATES.IDLE);
  const [imageUri, setImageUri] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [mimeType, setMimeType] = useState('image/jpeg');
  const [results, setResults] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const cameraRef = useRef(null);

  // Camera permissions (mobile only)
  const [permission, requestPermission] = useCameraPermissions();
  const isWeb = Platform.OS === 'web';

  // Reset to idle
  const resetScanner = () => {
    setScreenState(STATES.IDLE);
    setImageUri(null);
    setImageBase64(null);
    setResults(null);
    setErrorMsg('');
  };

  // Take photo with camera (mobile)
  const takePhoto = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.7 });
      setImageUri(photo.uri);
      setImageBase64(photo.base64);
      setMimeType('image/jpeg');
      setScreenState(STATES.PREVIEW);
    } catch (e) {
      setErrorMsg('Failed to take photo.');
      setScreenState(STATES.ERROR);
    }
  };

  // Pick image from gallery
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        base64: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      setImageUri(asset.uri);
      // expo-image-picker returns base64 when requested
      if (asset.base64) {
        setImageBase64(asset.base64);
      } else if (!isWeb && asset.uri) {
        // Fallback: read file as base64 on native
        const b64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        setImageBase64(b64);
      }
      const ext = asset.uri.split('.').pop()?.toLowerCase();
      setMimeType(ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg');
      setScreenState(STATES.PREVIEW);
    } catch (e) {
      setErrorMsg('Failed to pick image.');
      setScreenState(STATES.ERROR);
    }
  };

  // Send to backend for analysis
  const analyzeFood = async () => {
    if (!imageBase64) {
      setErrorMsg('No image data available.');
      setScreenState(STATES.ERROR);
      return;
    }
    setScreenState(STATES.LOADING);
    try {
      const response = await scanFood(imageBase64, mimeType);
      setResults(response.data);
      setScreenState(STATES.RESULTS);
    } catch (e) {
      const detail = e.response?.data?.detail || 'Analysis failed. Please try again.';
      setErrorMsg(detail);
      setScreenState(STATES.ERROR);
    }
  };

  // ─── IDLE STATE ──────────────────────────────────────
  if (screenState === STATES.IDLE) {
    // Web: no camera, just gallery
    if (isWeb) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>SmartPlate Scanner</Text>
          <Text style={styles.subtitle}>Upload a food photo to get nutritional info</Text>
          <Pressable style={styles.primaryBtn} onPress={pickImage}>
            <Text style={styles.primaryBtnText}>Choose Photo</Text>
          </Pressable>
          {userToken ? (
            <Pressable style={styles.logoutBtn} onPress={logout}>
              <Text style={styles.logoutText}>Log Out</Text>
            </Pressable>
          ) : (
            <Text style={styles.guestLabel}>Browsing as Guest</Text>
          )}
        </View>
      );
    }

    // Mobile: camera viewfinder
    if (!permission) {
      return <View style={styles.container}><ActivityIndicator size="large" color="#4CAF50" /></View>;
    }
    if (!permission.granted) {
      return (
        <View style={styles.container}>
          <Text style={styles.subtitle}>Camera access is needed to scan food</Text>
          <Pressable style={styles.primaryBtn} onPress={requestPermission}>
            <Text style={styles.primaryBtnText}>Grant Camera Access</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={styles.camera} facing="back">
          <View style={styles.cameraOverlay}>
            <View style={styles.cameraTopBar}>
              <Text style={styles.cameraTitle}>Point at your food</Text>
            </View>
            <View style={styles.cameraBottomBar}>
              <Pressable style={styles.galleryBtn} onPress={pickImage}>
                <Text style={styles.galleryBtnText}>Gallery</Text>
              </Pressable>
              <Pressable style={styles.captureBtn} onPress={takePhoto}>
                <View style={styles.captureBtnInner} />
              </Pressable>
              <View style={{ width: 70 }} />
            </View>
          </View>
        </CameraView>
        {userToken ? (
          <Pressable style={styles.cameraLogoutBtn} onPress={logout}>
            <Text style={styles.logoutText}>Log Out</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  // ─── PREVIEW STATE ───────────────────────────────────
  if (screenState === STATES.PREVIEW) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Preview</Text>
        {imageUri && <Image source={{ uri: imageUri }} style={styles.previewImage} />}
        <View style={styles.row}>
          <Pressable style={styles.secondaryBtn} onPress={resetScanner}>
            <Text style={styles.secondaryBtnText}>Retake</Text>
          </Pressable>
          <Pressable style={styles.primaryBtn} onPress={analyzeFood}>
            <Text style={styles.primaryBtnText}>Analyze Food</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ─── LOADING STATE ───────────────────────────────────
  if (screenState === STATES.LOADING) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={[styles.subtitle, { marginTop: 20 }]}>Analyzing your food...</Text>
      </View>
    );
  }

  // ─── RESULTS STATE ───────────────────────────────────
  if (screenState === STATES.RESULTS && results) {
    return (
      <ScrollView contentContainerStyle={styles.resultsContainer}>
        {imageUri && <Image source={{ uri: imageUri }} style={styles.resultImage} />}

        <View style={styles.card}>
          <Text style={styles.dishName}>{results.dish_name}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{Math.round(results.calories)}</Text>
              <Text style={styles.statLabel}>kcal</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{Math.round(results.kilojoules)}</Text>
              <Text style={styles.statLabel}>kJ</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{results.confidence}</Text>
              <Text style={styles.statLabel}>confidence</Text>
            </View>
          </View>

          {results.ingredients && results.ingredients.length > 0 && (
            <View style={styles.ingredientsSection}>
              <Text style={styles.ingredientsTitle}>Ingredients</Text>
              {results.ingredients.map((item, index) => (
                <View key={index} style={styles.ingredientRow}>
                  <Text style={styles.ingredientName}>{item.name}</Text>
                  <Text style={styles.ingredientCal}>{Math.round(item.calories)} kcal</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <Pressable style={styles.primaryBtn} onPress={resetScanner}>
          <Text style={styles.primaryBtnText}>Scan Another</Text>
        </Pressable>
      </ScrollView>
    );
  }

  // ─── ERROR STATE ─────────────────────────────────────
  return (
    <View style={styles.container}>
      <Text style={styles.errorIcon}>!</Text>
      <Text style={styles.errorText}>{errorMsg}</Text>
      <Pressable style={styles.primaryBtn} onPress={resetScanner}>
        <Text style={styles.primaryBtnText}>Try Again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // Layout
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#fff',
  },
  resultsContainer: {
    alignItems: 'center',
    padding: 20,
    paddingBottom: 40,
    backgroundColor: '#fff',
  },

  // Typography
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 10, color: '#222' },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 30, textAlign: 'center' },

  // Buttons
  primaryBtn: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 12,
    marginTop: 16,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondaryBtn: {
    borderWidth: 2,
    borderColor: '#999',
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 12,
    marginTop: 16,
  },
  secondaryBtnText: { color: '#666', fontWeight: '600', fontSize: 16 },
  row: { flexDirection: 'row', gap: 16, marginTop: 10 },

  // Auth
  logoutBtn: {
    borderWidth: 2,
    borderColor: '#ff4444',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginTop: 40,
  },
  logoutText: { color: '#ff4444', fontWeight: '600', fontSize: 14 },
  guestLabel: { color: '#999', fontSize: 14, marginTop: 40 },

  // Camera
  cameraContainer: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cameraTopBar: {
    paddingTop: 60,
    alignItems: 'center',
  },
  cameraTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  cameraBottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingBottom: 50,
  },
  captureBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureBtnInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#fff',
  },
  galleryBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  galleryBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  cameraLogoutBtn: {
    position: 'absolute',
    top: 55,
    right: 20,
    borderWidth: 1,
    borderColor: '#ff4444',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },

  // Preview
  previewImage: {
    width: 300,
    height: 300,
    borderRadius: 16,
    marginBottom: 10,
  },

  // Results
  resultImage: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    marginBottom: 10,
  },
  dishName: { fontSize: 24, fontWeight: 'bold', color: '#222', marginBottom: 16, textAlign: 'center' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  statBox: { alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: 'bold', color: '#4CAF50' },
  statLabel: { fontSize: 13, color: '#888', marginTop: 2 },
  ingredientsSection: { borderTopWidth: 1, borderTopColor: '#e0e0e0', paddingTop: 16 },
  ingredientsTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 12 },
  ingredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  ingredientName: { fontSize: 15, color: '#444' },
  ingredientCal: { fontSize: 15, color: '#4CAF50', fontWeight: '600' },

  // Error
  errorIcon: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ff4444',
    backgroundColor: '#ffe0e0',
    width: 72,
    height: 72,
    borderRadius: 36,
    textAlign: 'center',
    lineHeight: 72,
    marginBottom: 20,
    overflow: 'hidden',
  },
  errorText: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 10, paddingHorizontal: 20 },
});
