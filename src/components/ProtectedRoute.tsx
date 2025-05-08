import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../config/firebase';
import { isAdmin } from '../utils/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const user = auth.currentUser;
      
      if (!user) {
        navigate('/login');
        return;
      }

      if (requireAdmin) {
        const admin = await isAdmin(user.uid);
        if (!admin) {
          navigate('/dashboard');
          return;
        }
      }

      setLoading(false);
    };

    checkAuth();
  }, [navigate, requireAdmin]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute; 