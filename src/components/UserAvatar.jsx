import React from 'react';

/**
 * UserAvatar Component
 * Renders a pixel-art avatar based on the username.
 */
function UserAvatar({ username, size = 32 }) {
  const avatarUrl = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(username)}`;
  return (
    <div className="user-avatar-wrapper" style={{ width: size, height: size }}>
      <img src={avatarUrl} alt={username} />
    </div>
  );
}

export default UserAvatar;
