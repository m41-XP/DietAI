import re

with open('app/(tabs)/index.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports and STATES
content = content.replace(
"""import React, { useState, useContext, useEffect } from 'react';
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
import { setPendingScan } from '../../src/stores/resultStore';""",
"""import React, { useState, useContext, useEffect, useRef } from 'react';
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
import { CameraView, useCameraPermissions } from 'expo-camera';
import { setPendingScan } from '../../src/stores/resultStore';"""
)

content = content.replace(
"""const STATES = {
  IDLE: 'IDLE',
  PREVIEW: 'PREVIEW',
  ERROR: 'ERROR',
};""",
"""const STATES = {
  IDLE: 'IDLE',
  CAMERA: 'CAMERA',
  PREVIEW: 'PREVIEW',
  ERROR: 'ERROR',
};"""
)

# 2. Hooks and takePhoto
content = content.replace(
"""  const [limitModal, setLimitModal] = useState(false);

  // Load guest scan count on mount / when auth changes""",
"""  const [limitModal, setLimitModal] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);

  // Load guest scan count on mount / when auth changes"""
)

content = content.replace(
"""  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({ 
        quality: 0.4, 
        cameraType: ImagePicker.CameraType.back 
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      
      // Extract base64 safely via FileSystem to reduce memory spikes
      const b64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' });
      
      const ext = asset.uri.split('.').pop()?.toLowerCase();
      const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      goToPreview(b64, mime, asset.uri);
    } catch {
      setErrorMsg('Failed to open camera.');
      setScreenState(STATES.ERROR);
    }
  };""",
"""  const takePhoto = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        setErrorMsg('Camera permission is required to scan foods.');
        setScreenState(STATES.ERROR);
        return;
      }
    }
    setScreenState(STATES.CAMERA);
  };

  const handleCapture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.4 });
        if (!photo) return;
        
        const b64 = await FileSystem.readAsStringAsync(photo.uri, { encoding: 'base64' });
        const ext = photo.uri.split('.').pop()?.toLowerCase() || 'jpg';
        const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
        goToPreview(b64, mime, photo.uri);
      } catch (err) {
        setErrorMsg('Failed to capture photo.');
        setScreenState(STATES.ERROR);
      }
    }
  };"""
)

# 3. CAMERA state UI
content = content.replace(
"""  // ── PREVIEW ───────────────────────────────────────────────────────────────""",
"""  // ── CAMERA ────────────────────────────────────────────────────────────────
  if (screenState === STATES.CAMERA) {
    return (
      <View style={{ flex: 1, backgroundColor: 'black' }}>
        <StatusBar hidden />
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFillObject} facing="back">
          <View style={styles.cameraOverlay}>
            <View style={styles.cameraHeader}>
              <Pressable style={styles.cameraCloseBtn} onPress={resetScanner}>
                <Ionicons name="close" size={28} color={colors.white} />
              </Pressable>
            </View>
            <View style={styles.cameraFooter}>
              <Pressable style={styles.captureBtn} onPress={handleCapture}>
                <View style={styles.captureBtnInner} />
              </Pressable>
            </View>
          </View>
        </CameraView>
      </View>
    );
  }

  // ── PREVIEW ───────────────────────────────────────────────────────────────"""
)

# 4. Styles
content = content.replace(
"""  limitCloseBtnText: { fontSize: 14, color: colors.textMuted },
});""",
"""  limitCloseBtnText: { fontSize: 14, color: colors.textMuted },

  // Camera
  cameraOverlay: { flex: 1, justifyContent: 'space-between', padding: spacing.xl, paddingTop: 60 },
  cameraHeader: { alignItems: 'flex-start' },
  cameraCloseBtn: { padding: spacing.sm, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: radii.pill },
  cameraFooter: { alignItems: 'center', marginBottom: 20 },
  captureBtn: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: colors.white, justifyContent: 'center', alignItems: 'center' },
  captureBtnInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.white },
});"""
)

with open('app/(tabs)/index.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
