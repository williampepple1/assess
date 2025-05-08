import { useState, useEffect } from 'react';
import { doc, getDoc, collection, getDocs, query, where, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import type { Assessment, AssessmentResult } from '../types';

const AssessmentResultPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [isRetaking, setIsRetaking] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!id || !auth.currentUser) {
        navigate('/login');
        return;
      }

      try {
        // Fetch result first
        const resultsQuery = query(
          collection(db, 'assessmentResults'),
          where('assessmentId', '==', id),
          where('userId', '==', auth.currentUser.uid)
        );
        const resultsSnapshot = await getDocs(resultsQuery);
        
        // If no result found, user hasn't completed the assessment
        if (resultsSnapshot.empty) {
          navigate(`/assessment/${id}`);
          return;
        }

        const resultDoc = resultsSnapshot.docs[0];
        const resultData = {
          id: resultDoc.id,
          ...resultDoc.data(),
          completedAt: resultDoc.data().completedAt.toDate(),
        } as AssessmentResult;
        setResult(resultData);

        // Fetch assessment
        const assessmentDoc = await getDoc(doc(db, 'assessments', id));
        if (!assessmentDoc.exists()) {
          setError('Assessment not found');
          return;
        }
        const assessmentData = {
          id: assessmentDoc.id,
          ...assessmentDoc.data(),
          createdAt: assessmentDoc.data().createdAt.toDate(),
        } as Assessment;
        setAssessment(assessmentData);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load assessment results');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, navigate]);

  const handleRetake = () => {
    if (!id || !auth.currentUser) return;
    
    // Navigate to assessment page with a retake flag
    navigate(`/assessment/${id}`, { state: { isRetake: true } });
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
            onClick={() => navigate('/dashboard')}
            className="btn-primary"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!assessment || !result) {
    return null;
  }

  const scorePercentage = (result.score / result.totalQuestions) * 100;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Assessment Results
          </h1>
          <div className="flex gap-4">
            <button
              onClick={handleRetake}
              disabled={isRetaking}
              className={`btn-primary ${isRetaking ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isRetaking ? 'Starting Retake...' : 'Retake Assessment'}
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-secondary"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {assessment.title}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Score</p>
                <p className="text-2xl font-bold text-gray-900">
                  {result.score} / {result.totalQuestions}
                </p>
                <p className="text-sm text-gray-500">
                  {scorePercentage.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Completed On</p>
                <p className="text-lg font-medium text-gray-900">
                  {format(result.completedAt, 'PPP')}
                </p>
                <p className="text-sm text-gray-500">
                  {format(result.completedAt, 'p')}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Question Review
            </h3>
            <div className="space-y-6">
              {assessment.questions.map((question, index) => (
                <div key={index} className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
                  <div className="flex items-start mb-4">
                    <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-primary-100 text-primary-800 font-medium">
                      {index + 1}
                    </span>
                    <div className="ml-4">
                      <p className="text-lg font-medium text-gray-900">{question.question}</p>
                    </div>
                  </div>
                  
                  <div className="ml-12 space-y-2">
                    {question.options.map((option, optionIndex) => (
                      <div
                        key={optionIndex}
                        className={`p-3 rounded-lg border ${
                          option === question.correctAnswer
                            ? 'border-green-500 bg-green-50'
                            : option === result.answers?.[index]
                            ? 'border-red-500 bg-red-50'
                            : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-center">
                          {option === question.correctAnswer && (
                            <svg className="h-5 w-5 text-green-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                          {option === result.answers?.[index] && option !== question.correctAnswer && (
                            <svg className="h-5 w-5 text-red-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                          )}
                          <span className="text-gray-900">{option}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssessmentResultPage; 