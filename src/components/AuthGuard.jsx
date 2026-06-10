import { useAuth } from '../hooks/useAuth';

export default function AuthGuard({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen text-gray-600">
                Loading...
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return children;
}