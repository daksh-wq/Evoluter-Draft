import React, { createContext, useContext } from 'react';
import { useAuth as useAuthHook } from '../hooks';

/**
 * AuthContext
 * Provides authentication state and methods to all child components
 */
const AuthContext = createContext(null);

export const useAuthContext = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuthContext must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const auth = useAuthHook();

    return (
        <AuthContext.Provider value={auth}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
