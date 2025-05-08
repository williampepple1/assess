import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useNavigate, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import type { Assessment } from '../types';

const Dashboard = () => {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = location;

  useEffect(() => {
    const fetchAssessments = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'assessments'));
        const assessmentList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt.toDate(),
        })) as Assessment[];
        
        setAssessments(assessmentList);
      } catch (error) {
        console.error('Error fetching assessments:', error);
        setError('Failed to load assessments. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchAssessments();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {state?.score !== undefined && (
        <div className="mb-6 rounded-md bg-green-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-green-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                Assessment Completed!
              </h3>
              <div className="mt-2 text-sm text-green-700">
                <p>
                  Your score: {state.score} out of {state.total} ({((state.score / state.total) * 100).toFixed(1)}%)
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Available Assessments
          </h1>
          <button
            onClick={() => navigate('/admin')}
            className="btn-secondary"
          >
            Admin Dashboard
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4">
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
        )}

        {assessments.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No assessments</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a new assessment.
            </p>
            <div className="mt-6">
              <button
                onClick={() => navigate('/admin')}
                className="btn-primary"
              >
                Create Assessment
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {assessments.map((assessment, index) => (
              <div
                key={assessment.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors duration-200"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-medium text-gray-900">
                      Assessment {index + 1}
                    </h2>
                    <p className="text-sm text-gray-500">
                      Created on {format(assessment.createdAt, 'PPP')} • {assessment.questions.length} questions
                    </p>
                  </div>
                  <button
                    onClick={() => navigate(`/assessment/${assessment.id}`)}
                    className="btn-primary"
                  >
                    Start Assessment
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard; 