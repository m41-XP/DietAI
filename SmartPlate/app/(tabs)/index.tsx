import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
  StatusBar,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { setPendingScan } from '../../src/stores/resultStore';
import { colors, typography, spacing, radii } from '../../src/theme';
import { AuthContext } from '../../src/context/AuthContext';
import { useAuthSheet } from '../../src/context/AuthSheetContext';
import {
  SCAN_LIMIT,
  GUEST_SCAN_KEY,
  getGuestCount,
  incrementGuestCount,
} from '../../src/utils/guestLimits';

const STATES = {
  IDLE: 'IDLE',
  PREVIEW: 'PREVIEW',
  ERROR: 'ERROR',
};

export default function ScannerScreen() {
  const router = useRouter();
  const { userToken } = useContext(AuthContext);
  const { openRegister, openLogin } = useAuthSheet();
  const [screenState, setScreenState] = useState(STATES.IDLE);
  const [errorMsg, setErrorMsg] = useState('');
  const [pendingData, setPending] = useState<{ b64: string; mime: string; uri: string } | null>(null);
  const [scansUsed, setScansUsed] = useState(0);
  const [limitModal, setLimitModal] = useState(false);

  // Load guest scan count on mount / when auth changes
  useEffect(() => {
    if (userToken) { setScansUsed(0); return; }
    getGuestCount(GUEST_SCAN_KEY).then(setScansUsed);
  }, [userToken]);

  const resetScanner = () => {
    setScreenState(STATES.IDLE);
    setErrorMsg('');
    setPending(null);
  };

  const goToPreview = (b64: string, mime: string, uri: string) => {
    setPending({ b64, mime, uri });
    setScreenState(STATES.PREVIEW);
  };

  const handleAnalyze = async () => {
    if (!pendingData) return;
    // Increment guest count before navigating
    if (!userToken) {
      const newCount = await incrementGuestCount(GUEST_SCAN_KEY);
      setScansUsed(newCount);
    }
    setPendingScan({ imageBase64: pendingData.b64, mimeType: pendingData.mime, imageUri: pendingData.uri });
    router.push('/scan-result');
    resetScanner();
  };

  const checkLimitAndOpen = (opener: () => void) => {
    if (!userToken && scansUsed >= SCAN_LIMIT) {
      setLimitModal(true);
      return;
    }
    opener();
  };

  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({ quality: 0.7, base64: true, cameraType: ImagePicker.CameraType.back });
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

  const scansLeft = Math.max(0, SCAN_LIMIT - scansUsed);
  const isGuest = !userToken;

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
          {/* Guest usage badge */}
          {isGuest && (
            <View style={[styles.usageBadge, scansLeft === 0 && styles.usageBadgeEmpty]}>
              <Ionicons
                name={scansLeft > 0 ? 'scan-outline' : 'lock-closed-outline'}
                size={14}
                color={scansLeft > 0 ? colors.primary : colors.error}
              />
              <Text style={[styles.usageBadgeText, scansLeft === 0 && styles.usageBadgeTextEmpty]}>
                {scansLeft > 0
                  ? `${scansLeft} free scan${scansLeft !== 1 ? 's' : ''} remaining`
                  : 'No free scans left — sign up to continue'}
              </Text>
            </View>
          )}
        </View>

        {/* Buttons */}
        <View style={styles.btnStack}>
          <Pressable style={styles.primaryBtn} onPress={() => checkLimitAndOpen(takePhoto)}>
            <Ionicons name="camera-outline" size={20} color={colors.white} />
            <Text style={styles.primaryBtnText}>Take Photo</Text>
          </Pressable>
          <Pressable style={styles.outlineBtn} onPress={() => checkLimitAndOpen(pickImage)}>
            <Ionicons name="images-outline" size={20} color={colors.textPrimary} />
            <Text style={styles.outlineBtnText}>Choose from Gallery</Text>
          </Pressable>
        </View>

        {/* Limit reached modal */}
        <Modal visible={limitModal} transparent animationType="fade" onRequestClose={() => setLimitModal(false)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setLimitModal(false)} />
          <View style={styles.limitModalWrap}>
            <View style={styles.limitModal}>
              <View style={styles.limitIconCircle}>
                <Ionicons name="lock-closed" size={28} color={colors.primary} />
              </View>
              <Text style={styles.limitTitle}>You've used all {SCAN_LIMIT} free scans</Text>
              <Text style={styles.limitSubtitle}>
                Create a free account to keep scanning and unlock your full nutrition history.
              </Text>
              <Pressable
                style={styles.limitPrimaryBtn}
                onPress={() => { setLimitModal(false); openRegister(); }}
              >
                <Text style={styles.limitPrimaryBtnText}>Create Free Account</Text>
              </Pressable>
              <Pressable
                style={styles.limitSecondaryBtn}
                onPress={() => { setLimitModal(false); openLogin(); }}
              >
                <Text style={styles.limitSecondaryBtnText}>Sign In</Text>
              </Pressable>
              <Pressable onPress={() => setLimitModal(false)} style={styles.limitCloseBtn}>
                <Text style={styles.limitCloseBtnText}>Maybe later</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
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

  usageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radii.pill,
    marginTop: spacing.xs,
  },
  usageBadgeEmpty: { backgroundColor: '#FFF0F0' },
  usageBadgeText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  usageBadgeTextEmpty: { color: colors.error },

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

  // Limit modal
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  limitModalWrap: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingHorizontal: spacing.lg,
    paddingBottom: 40,
  },
  limitModal: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  limitIconCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.xs,
  },
  limitTitle: { ...typography.h1, textAlign: 'center', fontSize: 20 },
  limitSubtitle: { ...typography.body, textAlign: 'center', color: colors.textSecondary, lineHeight: 22 },
  limitPrimaryBtn: {
    width: '100%',
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: radii.pill,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  limitPrimaryBtnText: { ...typography.button },
  limitSecondaryBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: radii.pill,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  limitSecondaryBtnText: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  limitCloseBtn: { paddingVertical: spacing.sm },
  limitCloseBtnText: { fontSize: 14, color: colors.textMuted },
});
