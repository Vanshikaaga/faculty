import React, { useState, useRef, useEffect } from 'react';
import { Camera, Users, UserPlus, Search, RefreshCw, Activity, AlertCircle, CheckCircle, X } from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000/api';

const FaceRecognitionApp = () => {
  const [activeTab, setActiveTab] = useState('register');
  const [students, setStudents] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [captureProgress, setCaptureProgress] = useState(0);

  // Registration states
  const [studentName, setStudentName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [registrationProgress, setRegistrationProgress] = useState(null);
  const [isAutoCapturing, setIsAutoCapturing] = useState(false);
  const [captureInterval, setCaptureInterval] = useState(null);
  const [countdown, setCountdown] = useState(0);
  
  // Recognition states
  const [recognitionResult, setRecognitionResult] = useState(null);
  
  // Camera states
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [stream, setStream] = useState(null);
const isAutoCapturingRef = useRef(false);
const [isAutoRecognizing, setIsAutoRecognizing] = useState(false);
const [recognitionInterval, setRecognitionInterval] = useState(null);
const [detectedFaces, setDetectedFaces] = useState([]);
const [overlayCanvas, setOverlayCanvas] = useState(null);
const overlayCanvasRef = useRef(null);
const isAutoRecognizingRef = useRef(false);
  // Fetch students and system health on component mount
  useEffect(() => {
    fetchStudents();
    fetchSystemHealth();
  }, []);
useEffect(() => {
  console.log('Auto capturing state changed:', isAutoCapturing);
}, [isAutoCapturing]);
  const showError = (message) => {
    setError(message);
    setTimeout(() => setError(''), 5000);
  };
useEffect(() => {
  if (overlayCanvasRef.current) {
    setOverlayCanvas(overlayCanvasRef.current);
  }
}, []);
  const showSuccess = (message) => {
    setSuccess(message);
    setTimeout(() => setSuccess(''), 5000);
  };

  const fetchStudents = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/students`);
      const data = await response.json();
      if (response.ok) {
        setStudents(data.students);
      } else {
        showError(data.error || 'Failed to fetch students');
      }
    } catch (err) {
      showError('Failed to connect to server');
    }
  };

  const fetchSystemHealth = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      const data = await response.json();
      if (response.ok) {
        setSystemHealth(data);
      }
    } catch (err) {
      console.error('Failed to fetch system health:', err);
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsCameraOn(true);
    } catch (err) {
      showError('Failed to access camera');
    }
  };


  const drawFaceBoxes = (faces) => {
  if (!overlayCanvasRef.current || !videoRef.current) return;

  const canvas = overlayCanvasRef.current;
  const video = videoRef.current;
  const ctx = canvas.getContext('2d');

  // Set canvas size to match video
  canvas.width = video.videoWidth || video.clientWidth;
  canvas.height = video.videoHeight || video.clientHeight;

  // Clear previous drawings
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw boxes for each detected face
  faces.forEach(face => {
    const { x, y, width, height, name, confidence } = face;
    
    // Draw green rectangle
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, width, height);

    // Draw name and confidence background
    const text = `${name} (${(confidence * 100).toFixed(1)}%)`;
    ctx.font = '16px Arial';
    const textWidth = ctx.measureText(text).width;
    
    // Background rectangle for text
    ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
    ctx.fillRect(x, y - 30, textWidth + 10, 25);
    
    // Draw text
    ctx.fillStyle = 'black';
    ctx.fillText(text, x + 5, y - 10);
  });
};
const clearFaceBoxes = () => {
  if (overlayCanvasRef.current) {
    const ctx = overlayCanvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
  }
};
const startAutoRecognition = () => {
  if (!isCameraOn) {
    showError('Please start the camera first');
    return;
  }

  setIsAutoRecognizing(true);
  isAutoRecognizingRef.current = true;
  setDetectedFaces([]);

  const interval = setInterval(async () => {
    if (!isAutoRecognizingRef.current) {
      clearInterval(interval);
      return;
    }

    try {
      const imageData = captureImage();
      if (!imageData) return;

      const response = await fetch(`${API_BASE_URL}/recognize_multiple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData })
      });

      const data = await response.json();
      
      if (response.ok && data.faces) {
        setDetectedFaces(data.faces);
        drawFaceBoxes(data.faces);
      }
    } catch (err) {
      console.error('Auto recognition error:', err);
    }
  }, 1000); // Check every second

  setRecognitionInterval(interval);
};

  const stopCamera = () => {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    setStream(null);
  }
  setIsCameraOn(false);
  stopAutoCapture();
  stopAutoRecognition(); // Add this line
  clearFaceBoxes(); // Add this line
};
const stopAutoCapture = () => {
  if (captureInterval) {
    clearInterval(captureInterval);
    setCaptureInterval(null);  // ✅ Reset the interval state
  }
  setIsAutoCapturing(false);
  isAutoCapturingRef.current = false;
  setCountdown(0);
  setCaptureProgress(0);
  console.log('Auto capture stopped.');
};

const stopAutoRecognition = () => {
  if (recognitionInterval) {
    clearInterval(recognitionInterval);
    setRecognitionInterval(null);
  }
  setIsAutoRecognizing(false);
  isAutoRecognizingRef.current = false;
  setDetectedFaces([]);
  clearFaceBoxes();
};

 const startAutoCapture = async () => {
  console.log('Starting auto capture...');
  
  if (!studentName.trim() || !rollNo.trim()) {
    showError('Please enter both name and roll number');
    return;
  }

  if (!isCameraOn) {
    showError('Please start the camera first');
    return;
  }

  if (!videoRef.current || videoRef.current.readyState < 2) {
    showError('Camera is not ready yet. Please wait a moment and try again.');
    return;
  }

  console.log('Auto capture conditions met, starting countdown...');
  setIsAutoCapturing(true);
  isAutoCapturingRef.current = true;
  setCountdown(3);

  const countdownTimer = setInterval(() => {
    setCountdown(prev => {
      console.log('Countdown:', prev);
      if (prev <= 1) {
        clearInterval(countdownTimer);
        setTimeout(() => startCapturing(), 100);
        return 0;
      }
      return prev - 1;
    });
  }, 1000);
};
const startCapturing = () => {
  console.log('Starting actual capture process...');

  // ✅ Prevent starting multiple intervals
  if (captureInterval) {
    console.warn('Capture is already in progress. Skipping duplicate start.');
    return;
  }

  // ✅ Stop if already completed
  if (registrationProgress?.isComplete) {
    console.log('Registration already complete. Stopping further capture.');
    stopAutoCapture();
    return;
  }

  const interval = setInterval(async () => {
    console.log('Attempting to capture image...', { isAutoCapturingRef: isAutoCapturingRef.current });

    if (!isAutoCapturingRef.current) {
      console.log('Auto capturing stopped, clearing interval');
      clearInterval(interval);
      setCaptureInterval(null);
      return;
    }

    try {
      const imageData = captureImage();
      if (!imageData) {
        console.error('Failed to capture image - no data');
        showError('Failed to capture image');
        stopAutoCapture();
        return;
      }

      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageData,
          name: studentName,
          rollNo: rollNo
        })
      });

      const data = await response.json();

      if (response.ok) {
        setRegistrationProgress({
          sampleCount: data.sampleCount,
          isComplete: data.registrationComplete
        });

        setCaptureProgress((data.sampleCount / 50) * 100);

        if (data.registrationComplete) {
          showSuccess(`Registration complete for ${studentName}! 50 samples captured.`);
          setStudentName('');
          setRollNo('');
          setRegistrationProgress(null);
          setCaptureProgress(0);
          stopAutoCapture();
          fetchStudents();
        }
      } else {
        console.error('Server error:', data.error);
        showError(data.error || 'Registration failed');
        stopAutoCapture();  // ✅ Stop on error to prevent flooding
      }
    } catch (err) {
      console.error('Capture error:', err);
      showError('Failed to register student: ' + err.message);
      stopAutoCapture();
    }
  }, 800); // 🔄 Increased interval from 500ms to 800ms

  setCaptureInterval(interval);
  console.log('Capture interval set');
};


 

const captureImage = () => {
  console.log('Capturing image...');
  
  if (!videoRef.current || !canvasRef.current) {
    console.error('Video or canvas ref missing');
    return null;
  }
  
  const canvas = canvasRef.current;
  const video = videoRef.current;
  
  // Check if video is ready
  if (video.readyState < 2) {
    console.error('Video not ready');
    return null;
  }
  
  const context = canvas.getContext('2d');
  
  // Set canvas size
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  
  // Draw the video frame
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  // Convert to base64
  const imageData = canvas.toDataURL('image/jpeg', 0.8);
  console.log('Image data length:', imageData.length);
  
  return imageData;
};
const testCapture = () => {
  console.log('Testing capture...');
  const imageData = captureImage();
  if (imageData) {
    console.log('Test capture successful');
    showSuccess('Test capture successful!');
    
    // Show a preview of the captured image
    const img = new Image();
    img.onload = () => {
      console.log('Image loaded successfully:', img.width, 'x', img.height);
    };
    img.src = imageData;
  } else {
    console.error('Test capture failed');
    showError('Test capture failed');
  }
};
  const registerStudent = async () => {
    if (!studentName.trim() || !rollNo.trim()) {
      showError('Please enter both name and roll number');
      return;
    }

    if (!isCameraOn) {
      showError('Please start the camera first');
      return;
    }

    setLoading(true);
    try {
      const imageData = captureImage();
      if (!imageData) {
        showError('Failed to capture image');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageData,
          name: studentName,
          rollNo: rollNo
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setRegistrationProgress({
          sampleCount: data.sampleCount,
          isComplete: data.registrationComplete
        });
        
        if (data.registrationComplete) {
          showSuccess(`Registration complete for ${studentName}!`);
          setStudentName('');
          setRollNo('');
          setRegistrationProgress(null);
          fetchStudents();
        } else {
          showSuccess(`Sample ${data.sampleCount}/50 captured for ${studentName}`);
        }
      } else {
        showError(data.error || 'Registration failed');
      }
    } catch (err) {
      showError('Failed to register student');
    } finally {
      setLoading(false);
    }
  };

  const recognizeFace = async () => {
    if (!isCameraOn) {
      showError('Please start the camera first');
      return;
    }

    setLoading(true);
    setRecognitionResult(null);
    
    try {
      const imageData = captureImage();
      if (!imageData) {
        showError('Failed to capture image');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/recognize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData })
      });

      const data = await response.json();
      
      if (response.ok) {
        setRecognitionResult({
          name: data.prediction,
          confidence: data.confidence,
          timestamp: data.timestamp
        });
        showSuccess('Face recognized successfully!');
      } else {
        showError(data.error || 'Face recognition failed');
      }
    } catch (err) {
      showError('Failed to recognize face');
    } finally {
      setLoading(false);
    }
  };

  const retrainModel = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/retrain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      
      if (response.ok) {
        showSuccess('Model retrained successfully!');
        fetchSystemHealth();
      } else {
        showError(data.error || 'Model retraining failed');
      }
    } catch (err) {
      showError('Failed to retrain model');
    } finally {
      setLoading(false);
    }
  };

  const resetSystem = async () => {
    if (!window.confirm('Are you sure you want to reset the entire system? This will delete all data.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      
      if (response.ok) {
        showSuccess('System reset successfully!');
        setStudents([]);
        setSystemHealth(null);
        setRegistrationProgress(null);
        setRecognitionResult(null);
        fetchSystemHealth();
      } else {
        showError(data.error || 'System reset failed');
      }
    } catch (err) {
      showError('Failed to reset system');
    } finally {
      setLoading(false);
    }
  };

  const renderTabButton = (tabId, icon, label) => (
    <button
      onClick={() => setActiveTab(tabId)}
      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
        activeTab === tabId
          ? 'bg-blue-600 text-white'
          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  const renderRegistrationTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Register New Student</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Student Name
              </label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter student name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Roll Number
              </label>
              <input
                type="text"
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter roll number"
              />
            </div>

          {registrationProgress && (
  <div className="bg-blue-50 p-4 rounded-md">
    <div className="flex items-center space-x-2 mb-2">
      <CheckCircle className="w-5 h-5 text-blue-600" />
      <span className="text-sm font-medium text-blue-800">
        Registration Progress
      </span>
    </div>
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
        style={{ width: `${(registrationProgress.sampleCount / 50) * 100}%` }}
      ></div>
    </div>
    <div className="flex justify-between items-center mt-2">
      <p className="text-sm text-blue-700">
        {registrationProgress.sampleCount}/50 samples collected
        {isAutoCapturing && (
          <span className="ml-2 text-blue-600 font-medium">
            (Auto capturing...)
          </span>
        )}
      </p>
      <span className="text-sm font-medium text-blue-800">
        {Math.round((registrationProgress.sampleCount / 50) * 100)}%
      </span>
    </div>
  </div>
)}
            
            {/* Instructions */}
            <div className="bg-yellow-50 p-4 rounded-md">
              <h4 className="text-sm font-medium text-yellow-800 mb-2">Instructions:</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Enter student name and roll number</li>
                <li>• Start the camera and ensure your face is visible</li>
                <li>• Click "Start Auto Registration" to automatically capture 50 photos</li>
                <li>• Move your head slightly during capture for better variety</li>
                <li>• The process takes about 25 seconds to complete</li>
              </ul>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="relative">
              <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-64 bg-gray-200 rounded-md object-cover"
              onLoadedData={() => {
                console.log('Video data loaded');
              }}
              onCanPlay={() => {
                console.log('Video can play');
              }}
            />

              <canvas ref={canvasRef} style={{ display: 'none' }} />
              
              {!isCameraOn && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-200 rounded-md">
                  <Camera className="w-12 h-12 text-gray-400" />
                </div>
              )}
              
              {/* Auto capture overlay */}
             {/* Auto capture overlay */}
{isAutoCapturing && (
  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-md">
    <div className="text-center">
      {countdown > 0 ? (
        <div className="text-white">
          <div className="text-6xl font-bold mb-2">{countdown}</div>
          <div className="text-lg">Get ready...</div>
        </div>
      ) : (
        <div className="text-white">
          <div className="animate-pulse mb-4">
            <Camera className="w-12 h-12 mx-auto mb-2" />
            <div className="text-lg">Auto Capturing...</div>
          </div>
          {/* Progress Bar */}
          <div className="w-64 mx-auto">
            <div className="bg-gray-200 bg-opacity-30 rounded-full h-2 mb-2">
              <div
                className="bg-white h-2 rounded-full transition-all duration-300"
                style={{ width: `${captureProgress}%` }}
              ></div>
            </div>
            <div className="text-sm text-gray-200">
              {Math.round(captureProgress)}% Complete
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
)}
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={isCameraOn ? stopCamera : startCamera}
                disabled={isAutoCapturing}
                className={`flex-1 py-2 px-4 rounded-md transition-colors disabled:opacity-50 ${
                  isCameraOn
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {isCameraOn ? 'Stop Camera' : 'Start Camera'}
              </button>
              
              {!isAutoCapturing ? (
                <button
                  onClick={startAutoCapture}
                  disabled={loading || !isCameraOn}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Start Auto Registration
                </button>
              ) : (
                <button
                  onClick={stopAutoCapture}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-md transition-colors"
                >
                  Stop Auto Capture
                </button>
              )}
            </div>
            
            {/* Manual capture option */}
            <div className="mt-2">
              <button
                onClick={registerStudent}
                disabled={loading || !isCameraOn || isAutoCapturing}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                {loading ? 'Capturing...' : 'Manual Capture (Single Photo)'}
              </button>
            </div>
            <div className="mt-2">
  <button
    onClick={testCapture}
    disabled={!isCameraOn}
    className="w-full bg-gray-400 hover:bg-gray-500 text-white py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
  >
    Test Capture (Debug)
  </button>
</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRecognitionTab = () => (
  <div className="space-y-6">
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Real-time Face Recognition</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-64 bg-gray-200 rounded-md object-cover"
            />
            
            {/* Overlay canvas for face boxes */}
            <canvas
              ref={overlayCanvasRef}
              className="absolute top-0 left-0 w-full h-64 pointer-events-none"
              style={{ zIndex: 10 }}
            />
            
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            
            {!isCameraOn && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-200 rounded-md">
                <Camera className="w-12 h-12 text-gray-400" />
              </div>
            )}
            
            {/* Auto recognition indicator */}
            {isAutoRecognizing && (
              <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-md text-sm">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  <span>Auto Recognition</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={isCameraOn ? stopCamera : startCamera}
              className={`flex-1 py-2 px-4 rounded-md transition-colors ${
                isCameraOn
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isCameraOn ? 'Stop Camera' : 'Start Camera'}
            </button>
            
            {!isAutoRecognizing ? (
              <button
                onClick={startAutoRecognition}
                disabled={!isCameraOn}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Start Auto Recognition
              </button>
            ) : (
              <button
                onClick={stopAutoRecognition}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-md transition-colors"
              >
                Stop Auto Recognition
              </button>
            )}
          </div>
          
          {/* Manual recognition button */}
          <button
            onClick={recognizeFace}
            disabled={loading || !isCameraOn || isAutoRecognizing}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Recognizing...' : 'Manual Recognition (Single Shot)'}
          </button>
        </div>
        
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Detected Faces</h3>
          
          {detectedFaces.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {detectedFaces.map((face, index) => (
                <div key={index} className="bg-green-50 p-3 rounded-md border border-green-200">
                  <div className="flex items-center space-x-2 mb-1">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="font-medium text-green-800">{face.name}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>Confidence: {(face.confidence * 100).toFixed(1)}%</p>
                    <p>Position: ({face.x}, {face.y})</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 p-4 rounded-md text-center">
              <Search className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">
                {isAutoRecognizing ? 'Scanning for faces...' : 'No faces detected'}
              </p>
            </div>
          )}
          
          {/* Instructions */}
          <div className="bg-blue-50 p-4 rounded-md">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Instructions:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Start the camera first</li>
              <li>• Click "Start Auto Recognition" for real-time detection</li>
              <li>• Green boxes will appear around detected faces</li>
              <li>• Multiple faces can be recognized simultaneously</li>
              <li>• Names and confidence scores are displayed</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
);
  const renderStudentsTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Registered Students</h2>
          <button
            onClick={fetchStudents}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
        
        {students.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">No students registered yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-4 py-2 text-left">Name</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Roll No</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Samples</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Status</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Created</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2">{student.name}</td>
                    <td className="border border-gray-300 px-4 py-2">{student.rollNo}</td>
                    <td className="border border-gray-300 px-4 py-2">{student.sampleCount}/50</td>
                    <td className="border border-gray-300 px-4 py-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        student.registrationComplete
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {student.registrationComplete ? 'Complete' : 'In Progress'}
                      </span>
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {new Date(student.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  const renderSystemTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">System Status</h2>
        
        {systemHealth && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Students</span>
              </div>
              <p className="text-2xl font-bold text-blue-900">{systemHealth.students_count}</p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <Camera className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-800">Samples</span>
              </div>
              <p className="text-2xl font-bold text-green-900">{systemHealth.total_samples}</p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-800">Model</span>
              </div>
              <p className="text-sm font-bold text-purple-900">
                {systemHealth.model_trained ? 'Trained' : 'Not Trained'}
              </p>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">Status</span>
              </div>
              <p className="text-sm font-bold text-yellow-900">{systemHealth.status}</p>
            </div>
          </div>
        )}
        
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">System Actions</h3>
          
          <div className="flex flex-wrap gap-4">
            <button
              onClick={retrainModel}
              disabled={loading}
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retrain Model</span>
            </button>
            
            <button
              onClick={resetSystem}
              disabled={loading}
              className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <X className="w-4 h-4" />
              <span>Reset System</span>
            </button>
            
            <button
              onClick={fetchSystemHealth}
              disabled={loading}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Activity className="w-4 h-4" />
              <span>Refresh Status</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
          Face Recognition System
        </h1>
        
        {/* Error and Success Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}
        
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-800">{success}</span>
            </div>
          </div>
        )}
        
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          {renderTabButton('register', <UserPlus className="w-4 h-4" />, 'Register Student')}
          {renderTabButton('recognize', <Search className="w-4 h-4" />, 'Recognize Face')}
          {renderTabButton('students', <Users className="w-4 h-4" />, 'View Students')}
          {renderTabButton('system', <Activity className="w-4 h-4" />, 'System Status')}
        </div>
        
        {/* Tab Content */}
        {activeTab === 'register' && renderRegistrationTab()}
        {activeTab === 'recognize' && renderRecognitionTab()}
        {activeTab === 'students' && renderStudentsTab()}
        {activeTab === 'system' && renderSystemTab()}
      </div>
    </div>
  );
};

export default FaceRecognitionApp;