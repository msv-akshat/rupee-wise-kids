
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

const Profile = () => {
  const { currentUser, userRole } = useAuth();

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Profile</h1>
      <div className="bg-card p-6 rounded-lg">
        <p><strong>Name:</strong> {currentUser?.displayName}</p>
        <p><strong>Email:</strong> {currentUser?.email}</p>
        <p><strong>Role:</strong> {userRole}</p>
      </div>
    </div>
  );
};

export default Profile;
