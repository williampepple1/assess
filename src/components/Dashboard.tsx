import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import type { Assessment } from '../types';

const Dashboard = () => {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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