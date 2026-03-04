import AsyncStorage from '@react-native-async-storage/async-storage';

export const SCAN_LIMIT = 3;
export const CHEF_LIMIT = 2;

export const GUEST_SCAN_KEY = 'guestScanCount';
export const GUEST_CHEF_KEY = 'guestChefCount';

export const getGuestCount = async (key) => {
  const val = await AsyncStorage.getItem(key);
  return parseInt(val || '0', 10);
};

export const incrementGuestCount = async (key) => {
  const n = (await getGuestCount(key)) + 1;
  await AsyncStorage.setItem(key, String(n));
  return n;
};

export const clearGuestCounts = async () => {
  await AsyncStorage.multiRemove([GUEST_SCAN_KEY, GUEST_CHEF_KEY]);
};
