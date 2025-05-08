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
        const user = auth.currentUser;
        if (user) {
          const resultsQuery = query(
            collection(db, 'assessmentResults'),
            where('userId', '==', user.uid)
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
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setAssessments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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
          {isUserAdmin && (
            <button
              onClick={() => navigate('/admin')}
              className="btn-secondary"
            >
              Admin Dashboard
            </button>
          )}
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
              {isUserAdmin ? 'Get started by creating a new assessment.' : 'No assessments available at the moment.'}
            </p>
            {isUserAdmin && (
              <div className="mt-6">
                <button
                  onClick={() => navigate('/admin')}
                  className="btn-primary"
                >
                  Create Assessment
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {assessments.map((assessment) => {
              const result = results[assessment.id];
              return (
                <div
                  key={assessment.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-medium text-gray-900">
                        {assessment.title}
                      </h2>
                      <p className="text-sm text-gray-500">
                        Created on {format(assessment.createdAt, 'PPP')} • {assessment.questions.length} questions
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => navigate(`/assessment/${assessment.id}`)}
                        className="btn-primary"
                      >
                        Start Assessment
                      </button>
                      {result && (
                        <button
                          onClick={() => navigate(`/assessment/${assessment.id}/result`)}
                          className="btn-secondary"
                        >
                          View Result
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard; 