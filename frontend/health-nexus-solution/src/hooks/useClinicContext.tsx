import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: number;
  name: string;
  username: string;
  password: string;
  role: string;
}

interface ClinicContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  users: User[];
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

export const ClinicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    // Try to get user from localStorage on initial load
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        // Ensure the user has all required fields
        if (parsedUser && parsedUser.id && parsedUser.name && parsedUser.email && parsedUser.role) {
          return parsedUser;
        }
      } catch (error) {
        console.error('Error parsing saved user:', error);
      }
    }
    return null;
  });

  const [users, setUsers] = useState<User[]>([]);

  // Update localStorage when currentUser changes
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('user');
    }
  }, [currentUser]);

  const value = {
    currentUser,
    setCurrentUser,
    users
  };

  return (
    <ClinicContext.Provider value={value}>
      {children}
    </ClinicContext.Provider>
  );
};

export const useClinic = () => {
  const context = useContext(ClinicContext);
  if (context === undefined) {
    throw new Error('useClinic must be used within a ClinicProvider');
  }
  return context;
}; 