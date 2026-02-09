const PREFS_KEY = "suvidha_user_prefs";
const USER_PREFS_MAP_KEY = "suvidha_user_prefs_map";

export interface UserPreferences {
  language: string;
  fontSize: "normal" | "large" | "extra-large";
  highContrast: boolean;
  userId?: string;
  userName?: string;
  faceRegistered?: boolean;
}

const defaultPrefs: UserPreferences = {
  language: "English",
  fontSize: "normal",
  highContrast: false,
};

export function loadPreferences(): UserPreferences {
  try {
    const stored = localStorage.getItem(PREFS_KEY);
    if (stored) {
      return { ...defaultPrefs, ...JSON.parse(stored) };
    }
  } catch {}
  return { ...defaultPrefs };
}

export function savePreferences(prefs: Partial<UserPreferences>) {
  const current = loadPreferences();
  const updated = { ...current, ...prefs };
  localStorage.setItem(PREFS_KEY, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent("prefs-changed", { detail: updated }));

  if (updated.userId) {
    saveUserPreferences(updated.userId, updated);
  }

  return updated;
}

export function clearPreferences() {
  localStorage.removeItem(PREFS_KEY);
}

function getUserPrefsMap(): Record<string, UserPreferences> {
  try {
    const stored = localStorage.getItem(USER_PREFS_MAP_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return {};
}

function saveUserPreferences(userId: string, prefs: UserPreferences) {
  const map = getUserPrefsMap();
  map[userId] = prefs;
  localStorage.setItem(USER_PREFS_MAP_KEY, JSON.stringify(map));
}

export function loadUserPreferences(userId: string): UserPreferences | null {
  const map = getUserPrefsMap();
  return map[userId] || null;
}

const FACES_KEY = "suvidha_registered_faces";

export interface RegisteredFace {
  userId: string;
  userName: string;
  faceDescriptor: string;
  language: string;
  fontSize: "normal" | "large" | "extra-large";
  highContrast: boolean;
  registeredAt: string;
}

export function getRegisteredFaces(): RegisteredFace[] {
  try {
    const stored = localStorage.getItem(FACES_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

export function registerFace(face: RegisteredFace) {
  const faces = getRegisteredFaces();
  const existingIndex = faces.findIndex(f => f.userId === face.userId);
  if (existingIndex >= 0) {
    faces[existingIndex] = face;
  } else {
    faces.push(face);
  }
  localStorage.setItem(FACES_KEY, JSON.stringify(faces));
}

export function findFaceMatch(userId?: string): RegisteredFace | null {
  const faces = getRegisteredFaces();
  if (faces.length === 0) return null;

  if (userId) {
    return faces.find(f => f.userId === userId) || null;
  }

  const currentPrefs = loadPreferences();
  if (currentPrefs.userId) {
    const match = faces.find(f => f.userId === currentPrefs.userId);
    if (match) return match;
  }

  return faces[faces.length - 1];
}

export function updateFacePreferences(userId: string, prefs: Partial<RegisteredFace>) {
  const faces = getRegisteredFaces();
  const index = faces.findIndex(f => f.userId === userId);
  if (index >= 0) {
    faces[index] = { ...faces[index], ...prefs };
    localStorage.setItem(FACES_KEY, JSON.stringify(faces));
  }
}
