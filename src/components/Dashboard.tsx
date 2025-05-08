import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { useNavigate, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import type { Assessment, AssessmentResult } from '../types';
import { isAdmin } from '../utils/auth';

const Dashboard = () => {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [results, setResults] = useState<Record<string, AssessmentResult>>({});
  const [loading, setLoading] = useState(true);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [error, setError] = useState<string>('');
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = location;

  useEffect(() => {
    const checkAdminStatus = async () => {
      const user = auth.currentUser;
      if (user) {
        const admin = await isAdmin(user.uid);
        setIsUserAdmin(admin);
      }
    };

    checkAdminStatus();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!auth.currentUser) {
        navigate('/login');
        return;
      }

      try {
        // Fetch assessments with ordering by creation date
        const assessmentsQuery = query(
          collection(db, 'assessments'),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(assessmentsQuery);
        
        console.log('Fetched assessments count:', querySnapshot.size);
        
        const assessmentList = querySnapshot.docs.map(doc => {
          const data = doc.data();
          console.log('Assessment data:', { id: doc.id, ...data });
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt.toDate(),
          } as Assessment;
        });
        
        console.log('Processed assessments:', assessmentList);
        setAssessments(assessmentList);

        // Fetch results for current user
        const resultsQuery = query(
          collection(db, 'assessmentResults'),
          where('userId', '==', auth.currentUser.uid)
        );
        const resultsSnapshot = await getDocs(resultsQuery);
        const resultsMap: Record<string, AssessmentResult> = {};
        resultsSnapshot.docs.forEach(doc => {
          const result = {
            id: doc.id,
            ...doc.data(),
            completedAt: doc.data().completedAt.toDate(),
          } as AssessmentResult;
          resultsMap[result.assessmentId] = result;
        });
        setResults(resultsMap);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load assessments');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="rounded-md bg-red-50 p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <button
            onClick={handleLogout}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <svg
              className="h-5 w-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {assessments.map((assessment) => {
            const result = results[assessment.id];
            return (
              <div key={assessment.id} className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900">
                    {assessment.title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {assessment.questions.length} questions
                  </p>
                  <div className="mt-4">
                    {result ? (
                      <div className="flex space-x-4">
                        <button
                          onClick={() => navigate(`/assessment/${assessment.id}`)}
                          className="btn-primary"
                        >
                          Retake Assessment
                        </button>
                        <button
                          onClick={() => navigate(`/assessment/${assessment.id}/result`)}
                          className="btn-secondary"
                        >
                          View Result
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => navigate(`/assessment/${assessment.id}`)}
                        className="btn-primary w-full"
                      >
                        Start Assessment
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default Dashboard; 