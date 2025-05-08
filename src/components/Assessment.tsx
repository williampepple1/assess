import { useState, useEffect } from 'react';
import { doc, getDoc, collection, addDoc, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import type { Assessment, AssessmentResult } from '../types';

const AssessmentPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isTimeUp, setIsTimeUp] = useState(false);

  useEffect(() => {
    const fetchAssessment = async () => {
      if (!id) {
        console.error('No assessment ID provided');
        navigate('/dashboard');
        return;
      }

      if (!auth.currentUser) {
        console.error('No authenticated user');
        navigate('/login');
        return;
      }
      
      try {
        console.log('Fetching assessment with ID:', id);
        const docRef = doc(db, 'assessments', id);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
          console.error('Assessment not found in database');
          setError('Assessment not found');
          setTimeout(() => navigate('/dashboard'), 2000);
          return;
        }

        const data = {
          id: docSnap.id,
          ...docSnap.data(),
          createdAt: docSnap.data().createdAt.toDate(),
        } as Assessment;

        console.log('Assessment data loaded:', data);
        setAssessment(data);
        setUserAnswers(new Array(data.questions.length).fill(''));

        // Check if this is a retake after we have the assessment data
        const isRetake = location.state?.isRetake;
        if (isRetake) {
          console.log('Handling retake for assessment:', id);
          try {
            const resultsQuery = query(
              collection(db, 'assessmentResults'),
              where('assessmentId', '==', id),
              where('userId', '==', auth.currentUser.uid)
            );
            const resultsSnapshot = await getDocs(resultsQuery);
            console.log('Found previous results:', resultsSnapshot.size);
            
            const deletePromises = resultsSnapshot.docs.map(doc => deleteDoc(doc.ref));
            await Promise.all(deletePromises);
            console.log('Previous results deleted successfully');
          } catch (deleteError) {
            console.error('Error deleting previous results:', deleteError);
          }
        }
      } catch (error) {
        console.error('Error in fetchAssessment:', error);
        setError('Unable to load the assessment at this time');
      } finally {
        setLoading(false);
      }
    };

    fetchAssessment();
  }, [id, navigate, location.state]);

  // Timer effect
  useEffect(() => {
    if (!assessment || showFeedback) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsTimeUp(true);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentQuestion, showFeedback, assessment]);

  // Reset timer when moving to next question
  useEffect(() => {
    setTimeLeft(30);
    setIsTimeUp(false);
  }, [currentQuestion]);

  const handleTimeUp = () => {
    if (!assessment) return;

    // Save empty answer for time up
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestion] = '';
    setUserAnswers(newAnswers);

    setIsCorrect(false);
    setShowFeedback(true);

    // Move to next question after showing feedback
    setTimeout(() => {
      if (currentQuestion < assessment.questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
      } else {
        // Assessment completed
        saveResult(score);
        navigate(`/assessment/${id}/result`);
      }
    }, 1500);
  };

  useEffect(() => {
    if (assessment?.questions[currentQuestion]) {
      const question = assessment.questions[currentQuestion];
      const filteredOptions = question.options.filter(option => option !== question.correctAnswer);
      const options = [question.correctAnswer, ...filteredOptions];
      setShuffledOptions(shuffleArray([...options]));
      setSelectedAnswer('');
      setShowFeedback(false);
    }
  }, [currentQuestion, assessment]);

  const shuffleArray = (array: string[]) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  const saveResult = async (finalScore: number) => {
    if (!assessment || !auth.currentUser) return;

    try {
      const result: Omit<AssessmentResult, 'id'> = {
        assessmentId: assessment.id,
        userId: auth.currentUser.uid,
        score: finalScore,
        totalQuestions: assessment.questions.length,
        completedAt: new Date(),
        answers: userAnswers
      };

      await addDoc(collection(db, 'assessmentResults'), result);
    } catch (error) {
      console.error('Error saving result:', error);
    }
  };

  const handleAnswer = () => {
    if (!assessment) return;

    const question = assessment.questions[currentQuestion];
    const correct = selectedAnswer === question.correctAnswer;
    setIsCorrect(correct);
    setShowFeedback(true);

    // Save the user's answer
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestion] = selectedAnswer;
    setUserAnswers(newAnswers);

    if (correct) {
      setScore(score + 1);
    }

    // Wait for feedback to be shown before moving to next question
    setTimeout(async () => {
      if (currentQuestion < assessment.questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
      } else {
        // Assessment completed
        const finalScore = correct ? score + 1 : score;
        await saveResult(finalScore);
        navigate(`/assessment/${id}/result`);
      }
    }, 1500);
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

  if (!assessment) {
    return null;
  }

  const question = assessment.questions[currentQuestion];
  const progress = ((currentQuestion) / assessment.questions.length) * 100;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="card">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {location.state?.isRetake ? 'Retaking Assessment' : 'Question'} {currentQuestion + 1} of {assessment.questions.length}
            </h2>
            <div className="flex items-center space-x-4">
              <div className={`text-lg font-medium ${timeLeft <= 10 ? 'text-red-600' : 'text-gray-900'}`}>
                Time Left: {timeLeft}s
              </div>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        <div className="space-y-6">
          <p className="text-lg text-gray-900">{question.question}</p>
          
          <div className="space-y-3">
            {shuffledOptions.map((option, index) => (
              <button
                key={index}
                onClick={() => !showFeedback && setSelectedAnswer(option)}
                disabled={showFeedback}
                className={`w-full p-4 text-left rounded-lg border transition-colors duration-200 ${
                  showFeedback
                    ? option === question.correctAnswer
                      ? 'border-green-500 bg-green-50'
                      : selectedAnswer === option
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200'
                    : selectedAnswer === option
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-primary-300'
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          {showFeedback && (
            <div className={`rounded-md p-4 ${
              isCorrect ? 'bg-green-50' : 'bg-red-50'
            }`}>
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className={`h-5 w-5 ${
                      isCorrect ? 'text-green-400' : 'text-red-400'
                    }`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    {isCorrect ? (
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    ) : (
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    )}
                  </svg>
                </div>
                <div className="ml-3">
                  <p className={`text-sm font-medium ${
                    isCorrect ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {isTimeUp 
                      ? `Time's up! The correct answer is: ${question.correctAnswer}`
                      : isCorrect 
                        ? 'Correct!' 
                        : `Incorrect. The correct answer is: ${question.correctAnswer}`}
                  </p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleAnswer}
            disabled={!selectedAnswer || showFeedback}
            className={`btn-primary w-full ${
              (!selectedAnswer || showFeedback) ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {currentQuestion < assessment.questions.length - 1 ? 'Next Question' : 'Finish Assessment'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssessmentPage; 