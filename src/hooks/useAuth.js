import { useEffect, useState } from 'react';
import {
    GoogleAuthProvider,
    onAuthStateChanged,
    signInWithPopup,
    signOut,
} from 'firebase/auth';
import { auth } from '../config/firebase';

export function useAuth() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const loginWithGoogle = async () => {
        try {
            setError(null);
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            setUser(result.user);
            return result.user;
        } catch (err) {
            setError(err.message);
            console.error('Login failed:', err);
            throw err;
        }
    };

    const logout = async () => {
        try {
            setError(null);
            await signOut(auth);
            setUser(null);
        } catch (err) {
            setError(err.message);
            console.error('Logout failed:', err);
            throw err;
        }
    };

    return {
        user,
        loading,
        error,
        loginWithGoogle,
        logout,
        isAuthenticated: !!user,
    };
}