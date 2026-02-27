// Simple module-level store for passing large result objects between screens
// (avoids URL params which can't handle base64 image data)

let _pendingScan = null;   // image data waiting to be analyzed
let _scanResult = null;    // completed scan result
let _pendingChef = null;   // ingredients + cuisine waiting to be generated
let _chefResult = null;    // completed chef result

export const setPendingScan = (data) => { _pendingScan = data; };
export const getPendingScan = () => _pendingScan;
export const clearPendingScan = () => { _pendingScan = null; };

export const setScanResult = (result) => { _scanResult = result; };
export const getScanResult = () => _scanResult;
export const clearScanResult = () => { _scanResult = null; };

export const setPendingChef = (data) => { _pendingChef = data; };
export const getPendingChef = () => _pendingChef;
export const clearPendingChef = () => { _pendingChef = null; };

export const setChefResult = (result) => { _chefResult = result; };
export const getChefResult = () => _chefResult;
export const clearChefResult = () => { _chefResult = null; };
