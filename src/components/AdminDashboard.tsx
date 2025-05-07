import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { parse } from 'papaparse';

interface Question {
  question: string;
  correctAnswer: string;
  options: string[];
}

const AdminDashboard = () => {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [assessments, setAssessments] = useState<Question[]>([]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      setError('');
      setSuccess('');
    }
  };

  const processCSV = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const { data } = parse(text, { header: false });

        const questions: Question[] = data.map((row: any) => {
          if (row.length !== 5) {
            throw new Error('Each row must have exactly 5 columns');
          }

          const [question, correctAnswer, ...otherOptions] = row;
          const options = [correctAnswer, ...otherOptions].sort(() => Math.random() - 0.5);

          return {
            question,
            correctAnswer,
            options,
          };
        });

        // Save to Firestore
        const assessmentRef = await addDoc(collection(db, 'assessments'), {
          questions,
          createdAt: new Date(),
        });

        setAssessments(questions);
        setSuccess(`Assessment created successfully with ID: ${assessmentRef.id}`);
        setFile(null);
      } catch (error) {
        setError('Error processing CSV file. Please ensure it has 5 columns per row.');
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Admin Dashboard
        </h1>

        <div className="mb-6">
          <input
            accept=".csv"
            className="hidden"
            id="csv-file-upload"
            type="file"
            onChange={handleFileUpload}
          />
          <div className="flex space-x-4">
            <label
              htmlFor="csv-file-upload"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer"
            >
              <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload CSV
            </label>
            {file && (
              <button
                onClick={processCSV}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Process CSV
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 border-l-4 border-green-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">{success}</p>
              </div>
            </div>
          </div>
        )}

        {assessments.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Preview of Uploaded Assessment
            </h2>
            <div className="space-y-4">
              {assessments.map((q, index) => (
                <div key={index} className="border-b border-gray-200 last:border-0 pb-4 last:pb-0">
                  <h3 className="text-md font-medium text-gray-900">
                    Question {index + 1}: {q.question}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Options: {q.options.join(', ')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard; 