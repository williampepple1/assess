import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useParams, useNavigate } from 'react-router-dom';
import type { Assessment, Question } from '../types';

const Assessment = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);

  useEffect(() => {
    const fetchAssessment = async () => {
      if (!id) return;
      
      try {
        const docRef = doc(db, 'assessments', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data() as Assessment;
          setAssessment(data);
        } else {
          console.error('No such assessment exists!');
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Error fetching assessment:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAssessment();
  }, [id, navigate]);

  useEffect(() => {
    if (assessment?.questions[currentQuestion]) {
      const question = assessment.questions[currentQuestion];
      const options = [question.correctAnswer, ...question.options];
      setShuffledOptions(shuffleArray([...options]));
    }
  }, [currentQuestion, assessment]);

  const shuffleArray = (array: string[]) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  const handleAnswer = () => {
    if (!assessment) return;

    const question = assessment.questions[currentQuestion];
    if (selectedAnswer === question.correctAnswer) {
      setScore(score + 1);
    }

    if (currentQuestion < assessment.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer('');
    } else {
      // Assessment completed
      navigate('/dashboard', { 
        state: { 
          score, 
          total: assessment.questions.length 
        } 
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Assessment not found</h2>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-primary mt-4"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const question = assessment.questions[currentQuestion];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="card">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Question {currentQuestion + 1} of {assessment.questions.length}
            </h2>
            <span className="text-sm text-gray-500">
              Score: {score}/{currentQuestion}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestion) / assessment.questions.length) * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="space-y-6">
          <p className="text-lg text-gray-900">{question.question}</p>
          
          <div className="space-y-3">
            {shuffledOptions.map((option, index) => (
              <button
                key={index}
                onClick={() => setSelectedAnswer(option)}
                className={`w-full p-4 text-left rounded-lg border transition-colors duration-200 ${
                  selectedAnswer === option
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-primary-300'
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          <button
            onClick={handleAnswer}
            disabled={!selectedAnswer}
            className={`btn-primary w-full ${
              !selectedAnswer ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {currentQuestion < assessment.questions.length - 1 ? 'Next Question' : 'Finish Assessment'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Assessment; 