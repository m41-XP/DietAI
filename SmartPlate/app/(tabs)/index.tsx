import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { setPendingScan } from '../../src/stores/resultStore';
import { colors, typography, spacing, radii } from '../../src/theme';

const STATES = {
  IDLE: 'IDLE',
  PREVIEW: 'PREVIEW',
  ERROR: 'ERROR',
};

export default function ScannerScreen() {
  const router = useRouter();
  const [screenState, setScreenState] = useState(STATES.IDLE);
  const [errorMsg, setErrorMsg] = useState('');
  const [pendingData, setPending] = useState<{ b64: string; mime: string; uri: string } | null>(null);

  const resetScanner = () => {
    setScreenState(STATES.IDLE);
    setErrorMsg('');
    setPending(null);
  };

  const goToPreview = (b64: string, mime: string, uri: string) => {
    setPending({ b64, mime, uri });
    setScreenState(STATES.PREVIEW);
  };

  const handleAnalyze = () => {
    if (!pendingData) return;
    setPendingScan({ imageBase64: pendingData.b64, mimeType: pendingData.mime, imageUri: pendingData.uri });
    router.push('/scan-result');
    resetScanner();
  };

  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({ quality: 0.7, base64: true });
      if (result.canceled) return;
      const asset = result.assets[0];
      let b64 = asset.base64;
      if (!b64 && asset.uri) {
        b64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
      }
      const ext = asset.uri.split('.').pop()?.toLowerCase();
      const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      goToPreview(b64!, mime, asset.uri);
    } catch {
      setErrorMsg('Failed to open camera.');
      setScreenState(STATES.ERROR);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, base64: true });
      if (result.canceled) return;
      const asset = result.assets[0];
      let b64 = asset.base64;
      if (!b64 && asset.uri) {
        b64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
      }
      const ext = asset.uri.split('.').pop()?.toLowerCase();
      const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      goToPreview(b64!, mime, asset.uri);
    } catch {
      setErrorMsg('Failed to pick image.');
      setScreenState(STATES.ERROR);
    }
  };

  // ── IDLE ──────────────────────────────────────────────────────────────────
  if (screenState === STATES.IDLE) {
    return (
      <View style={styles.screen}>
        <StatusBar barStyle="dark-content" />

        {/* Scanner graphic */}
        <View style={styles.scannerCard}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
          <View style={styles.cameraIconCircle}>
            <Ionicons name="camera-outline" size={36} color={colors.white} />
          </View>
          <Text style={styles.scannerHint}>Select an image to analyze</Text>
        </View>

        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.screenTitle}>Food Scanner</Text>
          <Text style={styles.screenSubtitle}>
            Snap your meal for instant nutrition info
          </Text>
        </View>

        {/* Buttons */}
        <View style={styles.btnStack}>
          <Pressable style={styles.primaryBtn} onPress={takePhoto}>
            <Ionicons name="camera-outline" size={20} color={colors.white} />
            <Text style={styles.primaryBtnText}>Take Photo</Text>
          </Pressable>
          <Pressable style={styles.outlineBtn} onPress={pickImage}>
            <Ionicons name="images-outline" size={20} color={colors.textPrimary} />
            <Text style={styles.outlineBtnText}>Choose from Gallery</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── PREVIEW ───────────────────────────────────────────────────────────────
  if (screenState === STATES.PREVIEW && pendingData) {
    return (
      <View style={styles.centeredScreen}>
        <Text style={styles.screenTitle}>Preview</Text>
        <Text style={styles.screenSubtitle}>Looks good? Tap Analyze to get nutrition info.</Text>
        <Image source={{ uri: pendingData.uri }} style={styles.previewImage} resizeMode="cover" />
        <View style={styles.btnRow}>
          <Pressable style={styles.outlineBtnFlex} onPress={resetScanner}>
            <Ionicons name="refresh-outline" size={18} color={colors.textPrimary} />
            <Text style={styles.outlineBtnText}>Retake</Text>
          </Pressable>
          <Pressable style={[styles.primaryBtn, { flex: 1 }]} onPress={handleAnalyze}>
            <Ionicons name="sparkles-outline" size={18} color={colors.white} />
            <Text style={styles.primaryBtnText}>Analyze</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── ERROR ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.centeredScreen}>
      <View style={styles.errorIconBox}>
        <Ionicons name="alert-circle-outline" size={40} color={colors.error} />
      </View>
      <Text style={styles.screenTitle}>Something went wrong</Text>
      <Text style={styles.screenSubtitle}>{errorMsg}</Text>
      <Pressable style={[styles.primaryBtn, { width: '100%' }]} onPress={resetScanner}>
        <Ionicons name="refresh-outline" size={18} color={colors.white} />
        <Text style={styles.primaryBtnText}>Try Again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    backgroundColor: colors.background,
    gap: spacing.lg,
  },

  scannerCard: {
    width: '100%',
    height: 220,
    backgroundColor: colors.backgroundAlt,
    borderRadius: radii.xl,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    position: 'relative',
  },

  corner: { position: 'absolute', width: 24, height: 24, borderColor: colors.primary },
  cornerTL: { top: 18, left: 18, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 4 },
  cornerTR: { top: 18, right: 18, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 4 },
  cornerBL: { bottom: 18, left: 18, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 18, right: 18, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 4 },

  cameraIconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 14, elevation: 6,
  },
  scannerHint: { fontSize: 14, color: colors.textMuted, fontWeight: '500' },

  titleSection: { width: '100%', alignItems: 'center', gap: spacing.xs },

  btnStack: { width: '100%', gap: spacing.md },

  centeredScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.background,
    gap: spacing.sm,
  },

  screenTitle: { ...typography.h1, textAlign: 'center', marginBottom: spacing.xs },
  screenSubtitle: { ...typography.body, textAlign: 'center', lineHeight: 22 },

  btnRow: { flexDirection: 'row', gap: spacing.md, width: '100%', marginTop: spacing.md },

  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: radii.pill,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 3,
  },
  primaryBtnText: { ...typography.button },

  outlineBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: radii.pill,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  outlineBtnFlex: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: radii.pill,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  outlineBtnText: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },

  previewImage: {
    width: '100%', height: 280,
    borderRadius: radii.xl,
    marginVertical: spacing.md,
  },

  errorIconBox: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#FFF0F0',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.md,
  },
});
