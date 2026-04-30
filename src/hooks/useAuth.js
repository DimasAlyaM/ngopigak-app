import { useCallback } from 'react';
import { useAppStore } from '../context/useAppStore.js';
import { api } from '../store.js';

export function useAuth() {
  const { currentUser, setCurrentUser } = useAppStore();

  const login = useCallback(async (name, pin) => {
    if (!name || pin.length !== 4) {
      alert("Masukkan nama dan 4 digit PIN.");
      return { success: false, message: "Invalid input" };
    }

    try {
      const res = await api.login(name, pin);
      if (res.success) {
        setCurrentUser(res.user);
        return { success: true };
      } else {
        alert(res.message);
        return { success: false, message: res.message };
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan saat login.");
      return { success: false, message: err.message };
    }
  }, [setCurrentUser]);

  const logout = useCallback(() => {
    setCurrentUser(null);
  }, [setCurrentUser]);

  const saveProfile = useCallback(async (userId, newName) => {
    try {
      await api.updateProfile(userId, newName);
      setCurrentUser({ id: userId, username: newName });
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan profil.");
    }
  }, [setCurrentUser]);

  return { login, logout, saveProfile, currentUser };
}
