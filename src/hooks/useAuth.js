import { useAppStore } from '../context/useAppStore.js';
import { api } from '../store.js';

export function useAuth() {
  const { currentUser, setCurrentUser } = useAppStore();

  const login = async (name, pin) => {
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
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const saveProfile = async (userId, newName) => {
    try {
      await api.updateProfile(userId, newName);
      // Wait a tick then fetch the new user object if needed,
      // or optimistically update local store.
      // But we just update the auth object:
      setCurrentUser({ id: userId, username: newName });
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan profil.");
    }
  };

  return { login, logout, saveProfile, currentUser };
}
