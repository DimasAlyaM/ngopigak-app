/**
 * Notification utility for NgopiGakApp
 */
import { api } from '../store.js';

export function notify(store, to, type, message) {
  const session = store.session;
  if (!session) return;
  api.notify(session.id, to, type, message);
  session.notifications.push({
    id: Date.now().toString() + Math.random(),
    to, type, message,
    read: false,
    createdAt: new Date().toISOString(),
  });
}
