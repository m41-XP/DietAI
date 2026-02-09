import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { scanFood } from '../../src/services/api';
import { colors, typography, spacing, radii } from '../../src/theme';

const STATES = { IDLE: 'IDLE', PREVIEW: 'PREVIEW', LOADING: 'LOADING', RESULTS: 'RESULTS', ERROR: 'ERROR' };

export default function ScannerScreen() {
  const [screenState, setScreenState] = useState(STATES.IDLE);
  const [imageUri, setImageUri] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [mimeType, setMimeType] = useState('image/jpeg');
  const [results, setResults] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const cameraRef = useRef(null);

  const [permission, requestPermission] = useCameraPermissions();
  const isWeb = Platform.OS === 'web';

  const resetScanner = () => {
    setScreenState(STATES.IDLE);
    setImageUri(null);
    setImageBase64(null);
    setResults(null);
    setErrorMsg('');
  };

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

  const launchCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.7,
        base64: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      setImageUri(asset.uri);
      if (asset.base64) {
        setImageBase64(asset.base64);
      } else if (!isWeb && asset.uri) {
        const b64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        setImageBase64(b64);
      }
      const ext = asset.uri.split('.').pop()?.toLowerCase();
      setMimeType(ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg');
      setScreenState(STATES.PREVIEW);
    } catch (e) {
      setErrorMsg('Failed to open camera.');
      setScreenState(STATES.ERROR);
    }
  };

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
      if (asset.base64) {
        setImageBase64(asset.base64);
      } else if (!isWeb && asset.uri) {
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
    if (isWeb) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>SmartPlate Scanner</Text>
          <Text style={styles.subtitle}>Take a photo of your meal to get nutritional info</Text>
          <Pressable style={styles.primaryBtn} onPress={launchCamera}>
            <Text style={styles.primaryBtnText}>Take Photo</Text>
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={pickImage}>
            <Text style={styles.secondaryBtnText}>Choose from Gallery</Text>
          </Pressable>
        </View>
      );
    }

    if (!permission) {
      return <View style={styles.container}><ActivityIndicator size="large" color={colors.primary} /></View>;
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
        <ActivityIndicator size="large" color={colors.primary} />
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
      <View style={styles.errorIconBox}>
        <Text style={styles.errorIcon}>!</Text>
      </View>
      <Text style={styles.errorText}>{errorMsg}</Text>
      <Pressable style={styles.primaryBtn} onPress={resetScanner}>
        <Text style={styles.primaryBtnText}>Try Again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  resultsContainer: {
    alignItems: 'center',
    padding: spacing.lg,
    paddingBottom: 40,
    backgroundColor: colors.background,
  },
  title: {
    ...typography.h1,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 36,
    borderRadius: radii.pill,
    marginTop: spacing.md,
  },
  primaryBtnText: {
    ...typography.button,
  },
  secondaryBtn: {
    borderWidth: 2,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: radii.pill,
    marginTop: spacing.md,
  },
  secondaryBtnText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },

  // Camera
  cameraContainer: { flex: 1, backgroundColor: colors.black },
  camera: { flex: 1 },
  cameraOverlay: { flex: 1, justifyContent: 'space-between' },
  cameraTopBar: { paddingTop: 60, alignItems: 'center' },
  cameraTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: radii.pill,
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
    borderColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureBtnInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.white,
  },
  galleryBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radii.pill,
  },
  galleryBtnText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 14,
  },

  // Preview
  previewImage: {
    width: 300,
    height: 300,
    borderRadius: radii.lg,
    marginBottom: spacing.sm,
  },

  // Results
  resultImage: {
    width: '100%',
    height: 220,
    borderRadius: radii.lg,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    width: '100%',
    marginBottom: spacing.sm,
  },
  dishName: {
    ...typography.h1,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.lg,
  },
  statBox: { alignItems: 'center' },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  ingredientsSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  ingredientsTitle: {
    ...typography.h2,
    marginBottom: spacing.md,
  },
  ingredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  ingredientName: {
    fontSize: 15,
    color: colors.textPrimary,
  },
  ingredientCal: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: '600',
  },

  // Error
  errorIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFE0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  errorIcon: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.error,
  },
  errorText: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
});
