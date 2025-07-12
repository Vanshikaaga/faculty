import React, { useState, useRef, useEffect } from 'react';
import { JSX } from 'react/jsx-runtime';
import { Camera, Users, UserPlus, Search, RefreshCw, Activity, AlertCircle, CheckCircle, X, Play, Square, Clock, UserCheck, UserX } from 'lucide-react';

const API_BASE_URL = 'http://localhost:5001/api';

const FaceRecognitionApp = () => {
  const [activeTab, setActiveTab] = useState('register');
  const [students, setStudents] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [captureProgress, setCaptureProgress] = useState(0);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
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
  const [sessionStats, setSessionStats] = useState({
    totalStudents: 5,
    present: 0,
    absent: 5,
    attendanceRate: 0
  });
 const courses = [
    'Computer Science 101',
    'Mathematics 201',
    'Physics 301',
    'Chemistry 401',
    'English Literature 501'
  ];

  useEffect(() => {
    fetchStudents();
    fetchSystemHealth();
  }, []);

useEffect(() => {
  console.log('Auto capturing state changed:', isAutoCapturing);
}, [isAutoCapturing]);
  const showError = (message: React.SetStateAction<string>) => {
    setError(message);
    setTimeout(() => setError(''), 5001);
  };
useEffect(() => {
  if (overlayCanvasRef.current) {
    setOverlayCanvas(overlayCanvasRef.current);
  }
}, []);
  const showSuccess = (message: React.SetStateAction<string>) => {
    setSuccess(message);
    setTimeout(() => setSuccess(''), 5001);
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


  const drawFaceBoxes = (faces: any[]) => {
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
  faces.forEach((face: { x: any; y: any; width: any; height: any; name: any; confidence: any; }) => {
      const { x, y, width, height, name, confidence } = face;
      
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, width, height);

      const text = `${name} (${(confidence * 100).toFixed(1)}%)`;
      ctx.font = '16px Arial';
      const textWidth = ctx.measureText(text).width;
      
      ctx.fillStyle = 'rgba(16, 185, 129, 0.9)';
      ctx.fillRect(x, y - 30, textWidth + 10, 25);
      
      ctx.fillStyle = 'white';
      ctx.fillText(text, x + 5, y - 10);
    });
  
};
const clearFaceBoxes = () => {
  if (overlayCanvasRef.current) {
    const ctx = overlayCanvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
  }
};
const startRecording = () => {
    if (!selectedCourse) {
      showError('Please select a course first');
      return;
    }
    setIsRecording(true);
    startCamera();
    startAutoRecognition();
  };

  const stopRecording = () => {
    setIsRecording(false);
    stopCamera();
    stopAutoRecognition();
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
        data.faces.forEach((face: { rollNo: any; name: any; confidence: any; }) => {
            const existingRecord = attendanceRecords.find(r => r.rollNo === face.rollNo);
            if (!existingRecord) {
              const newRecord = {
                name: face.name,
                rollNo: face.rollNo || 'Unknown',
                status: 'Present',
                confidence: face.confidence,
                time: new Date().toLocaleTimeString()
              };
              setAttendanceRecords(prev => [...prev, newRecord]);
              
              // Update session stats
              setSessionStats(prev => ({
                ...prev,
                present: prev.present + 1,
                absent: Math.max(0, prev.absent - 1),
                attendanceRate: Math.round(((prev.present + 1) / prev.totalStudents) * 100)
              }));
            }
          });
      }
    } catch (err) {
      console.error('Auto recognition error:', err);
    }
  }, 1000); // Check every second

  setRecognitionInterval(interval);
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

  const stopCamera = () => {
  if (stream) {
    stream.getTracks().forEach((track: { stop: () => any; }) => track.stop());
    setStream(null);
  }
  setIsCameraOn(false);
  stopAutoCapture();
  stopAutoRecognition(); // Add this line
  clearFaceBoxes(); // Add this line
};

 const renderAttendanceTab = () => (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <select 
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">Select Course</option>
              {courses.map(course => (
                <option key={course} value={course}>{course}</option>
              ))}
            </select>
          </div>
          
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={!selectedCourse}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              isRecording 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            {isRecording ? (
              <>
                <Square className="w-4 h-4" />
                Stop Recording
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Start Recording
              </>
            )}
          </button>
        </div>
      </div>

      {/* Real-time Attendance Section */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Real-time Attendance</h2>
        <p className="text-gray-600 mb-6">Students detected and their attendance status</p>
        
        {/* Attendance Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-600">Student Name</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Roll Number</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Confidence</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Time</th>
              </tr>
            </thead>
            <tbody>
              {attendanceRecords.length > 0 ? (
                attendanceRecords.map((record, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-3 px-4">{record.name}</td>
                    <td className="py-3 px-4">{record.rollNo}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                        Present
                      </span>
                    </td>
                    <td className="py-3 px-4">{(record.confidence * 100).toFixed(1)}%</td>
                    <td className="py-3 px-4">{record.time}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500">
                    No attendance records yet. Start recording to begin.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Camera and Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Camera Feed */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Camera className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-800">Camera Feed</h3>
          </div>
          <p className="text-gray-600 mb-4">Live camera feed for facial recognition</p>
          
          <div className="relative">
            <div className="bg-gray-900 rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
              {isCameraOn ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <canvas
                    ref={overlayCanvasRef}
                    className="absolute top-0 left-0 w-full h-full pointer-events-none"
                  />
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                  <Camera className="w-16 h-16 mb-4" />
                  <p className="text-lg font-medium">Camera Inactive</p>
                  <p className="text-sm">Select a course and start recording</p>
                </div>
              )}
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </div>
          
          {/* Controls */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <select 
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Select Course</option>
                {courses.map(course => (
                  <option key={course} value={course}>{course}</option>
                ))}
              </select>
            </div>
            
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={!selectedCourse}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                isRecording 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50'
              }`}
            >
              {isRecording ? (
                <>
                  <Square className="w-4 h-4" />
                  Stop Recording
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Start Recording
                </>
              )}
            </button>
          </div>
        </div>

        {/* Session Stats */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Session Stats</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-600" />
                  <span className="text-sm text-gray-600">Total Students</span>
                </div>
                <span className="text-lg font-semibold text-gray-800">{sessionStats.totalStudents}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm text-gray-600">Present</span>
                </div>
                <span className="text-lg font-semibold text-emerald-600">{sessionStats.present}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserX className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-gray-600">Absent</span>
                </div>
                <span className="text-lg font-semibold text-red-500">{sessionStats.absent}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-gray-600">Attendance Rate</span>
                </div>
                <span className="text-lg font-semibold text-blue-600">{sessionStats.attendanceRate}%</span>
              </div>
            </div>
          </div>

          {/* Recognition Status */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Recognition Status</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status</span>
                <span className={`text-sm font-medium ${isRecording ? 'text-emerald-600' : 'text-gray-500'}`}>
                  {isRecording ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Model</span>
                <span className="text-sm font-medium text-gray-800">SVM + PCA</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Processing</span>
                <span className="text-sm font-medium text-gray-800">Real-time</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );


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

  const renderTabButton = (tabId: React.SetStateAction<string>, icon: string | number | boolean | JSX.Element | Iterable<React.ReactNode>, label: string | number | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode>) => (
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
    <div className="bg-white rounded-2xl shadow-md p-8">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6 border-b pb-2">
        Register Student
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Left Side - Form */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Student Name
            </label>
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Enter student name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Roll Number
            </label>
            <input
              type="text"
              value={rollNo}
              onChange={(e) => setRollNo(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Enter roll number"
            />
          </div>

          {registrationProgress && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  Registration Progress
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${(registrationProgress.sampleCount / 50) * 100}%`,
                  }}
                ></div>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-sm text-blue-700">
                  {registrationProgress.sampleCount}/50 samples collected
                </p>
                <span className="text-sm font-medium text-blue-800">
                  {Math.round(
                    (registrationProgress.sampleCount / 50) * 100
                  )}
                  %
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right Side - Camera */}
        <div className="space-y-6">
          <div className="relative border rounded-xl overflow-hidden bg-gray-100 shadow-sm">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-64 object-cover"
            />
            <canvas ref={canvasRef} style={{ display: "none" }} />

            {!isCameraOn && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-200 rounded-md">
                <Camera className="w-12 h-12 text-gray-400" />
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <button
              onClick={isCameraOn ? stopCamera : startCamera}
              disabled={isAutoCapturing}
              className={`flex-1 py-2 px-4 rounded-md transition-colors text-white ${
                isCameraOn
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {isCameraOn ? "Stop Camera" : "Start Camera"}
            </button>

            {!isAutoCapturing ? (
              <button
                onClick={startAutoCapture}
                disabled={loading || !isCameraOn}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md disabled:opacity-50 transition-colors"
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
        </div>
      </div>
    </div>
  </div>
);

 const renderRecognitionTab = () => {
  const uniquePresentStudents = [...new Set(detectedFaces.map(face => face.name))];
  const presentCount = uniquePresentStudents.length;
  const totalStudents = students.length;
  const absentCount = totalStudents - presentCount;
  const attendanceRate = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Camera + Stats Row */}
        {/* Nested tab buttons under Attendance */}
         <div className="flex justify-center gap-2 my-6 flex-wrap">
        {renderTabButton('recognize', <Search className="w-4 h-4" />, 'Recognize Face')}
        {renderTabButton('students', <Users className="w-4 h-4" />, 'View Students')}
        {renderTabButton('system', <Activity className="w-4 h-4" />, 'System Status')}
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Camera Feed */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Camera className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-800">Camera Feed</h3>
          </div>
          <p className="text-gray-600 mb-4">Live camera feed for facial recognition</p>

          <div className="relative bg-gray-900 rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <canvas
              ref={overlayCanvasRef}
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
            />
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <div className="flex items-center justify-between mt-4">
            <button
              onClick={isCameraOn ? stopCamera : startCamera}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isCameraOn
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isCameraOn ? 'Stop Camera' : 'Start Camera'}
            </button>

            <button
              onClick={recognizeFace}
              disabled={loading || !isCameraOn || isAutoRecognizing}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
            >
              {loading ? 'Recognizing...' : 'Manual Recognition (Single Shot)'}
            </button>
          </div>
        </div>

        {/* Stats Panel */}
        <div className="space-y-6">
          {/* Session Stats */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Session Stats</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-600" />
                  <span className="text-sm text-gray-600">Total Students</span>
                </div>
                <span className="text-lg font-semibold text-gray-800">{totalStudents}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm text-gray-600">Present</span>
                </div>
                <span className="text-lg font-semibold text-emerald-600">{presentCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserX className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-gray-600">Absent</span>
                </div>
                <span className="text-lg font-semibold text-red-500">{absentCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-gray-600">Attendance Rate</span>
                </div>
                <span className="text-lg font-semibold text-blue-600">{attendanceRate}%</span>
              </div>
            </div>
          </div>

          {/* Recognition Info */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Recognition Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status</span>
                <span className={`text-sm font-medium ${isAutoRecognizing ? 'text-emerald-600' : 'text-gray-500'}`}>
                  {isAutoRecognizing ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Model</span>
                <span className="text-sm font-medium text-gray-800">SVM + PCA</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Processing</span>
                <span className="text-sm font-medium text-gray-800">Real-time</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls: Select course and start recognition */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <select 
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Course</option>
              {courses.map(course => (
                <option key={course} value={course}>{course}</option>
              ))}
            </select>
          </div>

          <button
            onClick={isAutoRecognizing ? stopAutoRecognition : startAutoRecognition}
            disabled={!selectedCourse}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              isAutoRecognizing 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            {isAutoRecognizing ? (
              <>
                <Square className="w-4 h-4" />
                Stop Recognition
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Start Recognition
              </>
            )}
          </button>
        </div>
      </div>

      {/* Detected Faces Table */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Detected Faces</h2>
        <p className="text-gray-600 mb-6">Students detected in real-time</p>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-600">Student Name</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Confidence</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Position</th>
              </tr>
            </thead>
            <tbody>
              {detectedFaces.length > 0 ? (
                detectedFaces.map((face, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-3 px-4">{face.name}</td>
                    <td className="py-3 px-4">{(face.confidence * 100).toFixed(1)}%</td>
                    <td className="py-3 px-4">({face.x}, {face.y})</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="py-12 text-center text-gray-500">
                    {isAutoRecognizing ? 'Scanning for faces...' : 'No faces detected'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};



  const renderStudentsTab = () => (
    <div className="space-y-6">
          {/* Tab Navigation */}
    <div className="flex justify-center gap-2 my-6 flex-wrap">
      {renderTabButton('recognize', <Search className="w-4 h-4" />, 'Recognize Face')}
      {renderTabButton('students', <Users className="w-4 h-4" />, 'View Students')}
      {renderTabButton('system', <Activity className="w-4 h-4" />, 'System Status')}
    </div>

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
          {/* Tab Navigation */}
    <div className="flex justify-center gap-2 my-6 flex-wrap">
      {renderTabButton('recognize', <Search className="w-4 h-4" />, 'Recognize Face')}
      {renderTabButton('students', <Users className="w-4 h-4" />, 'View Students')}
      {renderTabButton('system', <Activity className="w-4 h-4" />, 'System Status')}
    </div>

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

  // return (
  //   <div className="min-h-screen bg-gray-100">
  //     <div className="container mx-auto px-4 py-8">
  //       <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
  //         Face Recognition System
  //       </h1>
        
  //       {/* Error and Success Messages */}
  //       {error && (
  //         <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
  //           <div className="flex items-center space-x-2">
  //             <AlertCircle className="w-5 h-5 text-red-600" />
  //             <span className="text-red-800">{error}</span>
  //           </div>
  //         </div>
  //       )}
        
  //       {success && (
  //         <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
  //           <div className="flex items-center space-x-2">
  //             <CheckCircle className="w-5 h-5 text-green-600" />
  //             <span className="text-green-800">{success}</span>
  //           </div>
  //         </div>
  //       )}
        
  //       {/* Navigation Tabs */}
  //             <div className="flex flex-wrap gap-2 mb-8 justify-center">
  //       {renderTabButton('attendance', <UserCheck className="w-4 h-4" />, 'Attendance')}
  //       {renderTabButton('register', <UserPlus className="w-4 h-4" />, 'Register Student')}
  //       {renderTabButton('recognize', <Search className="w-4 h-4" />, 'Recognize Face')}
  //       {renderTabButton('students', <Users className="w-4 h-4" />, 'View Students')}
  //       {renderTabButton('system', <Activity className="w-4 h-4" />, 'System Status')}
  //     </div>

        
  //       {/* Tab Content */}
  //       {activeTab === 'attendance' && renderAttendanceTab()}
  //       {activeTab === 'register' && renderRegistrationTab()}
  //       {activeTab === 'recognize' && renderRecognitionTab()}
  //       {activeTab === 'students' && renderStudentsTab()}
  //       {activeTab === 'system' && renderSystemTab()}
  //     </div>
  //   </div>
  // );
  
 const renderNavigation = () => (
  <div className="w-full flex justify-end px-4 mt-4">
    <div className="relative bg-gray-100 rounded-full p-1 flex space-x-1 transition-all">
      {/* Sliding indicator */}
      <div
        className={`absolute top-1 bottom-1 w-1/2 rounded-full bg-white shadow transition-transform duration-300 ease-in-out transform ${
          activeTab === 'register' ? 'translate-x-full' : 'translate-x-0'
        }`}
      ></div>

      {/* Attendance Group Tab */}
      <button
        onClick={() => setActiveTab('recognize')}
        className={`relative z-10 w-28 text-sm font-medium rounded-full px-4 py-2 transition-colors duration-200 ${
          ['attendance', 'recognize', 'students', 'system'].includes(activeTab)
            ? 'text-blue-600'
            : 'text-gray-600 hover:text-blue-600'
        }`}
      >
        Attendance
      </button>

      {/* Register Tab */}
      <button
        onClick={() => setActiveTab('register')}
        className={`relative z-10 w-28 text-sm font-medium rounded-full px-4 py-2 transition-colors duration-200 ${
          activeTab === 'register'
            ? 'text-blue-600'
            : 'text-gray-600 hover:text-blue-600'
        }`}
      >
        Register
      </button>
    </div>
  </div>
);


  // return (
  //   <div className="min-h-screen bg-gray-50">
  //     {renderNavigation()}
      
  //     <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
  //       {/* Error and Success Messages */}
  //       {error && (
  //         <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
  //           <div className="flex items-center gap-2">
  //             <AlertCircle className="w-5 h-5 text-red-600" />
  //             <span className="text-red-800">{error}</span>
  //           </div>
  //       {success && (
  //         <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-lg p-4">
  //           <div className="flex items-center gap-2">
  //             <CheckCircle className="w-5 h-5 text-emerald-600" />
  //             <span className="text-emerald-800">{success}</span>
  //           </div>
  //         </div>
  //       )}
        
  //       {/* Tab Content */}
  //       {activeTab === 'attendance' && renderAttendanceTab()}
  //       {activeTab === 'register' && renderRegistrationTab()}
  //     </div>
  //   </div>
  // );
  return (
  <div className="min-h-screen bg-gray-50">
    {renderNavigation()}

    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Error and Success Messages */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <span className="text-emerald-800">{success}</span>
          </div>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'attendance' && (
        <>
          {/* Nested tab buttons under Attendance */}
          <div className="flex flex-wrap gap-2 mb-8 justify-center">
           
            {renderTabButton('recognize', <Search className="w-4 h-4" />, 'Recognize Face')}
            {renderTabButton('students', <Users className="w-4 h-4" />, 'View Students')}
            {renderTabButton('system', <Activity className="w-4 h-4" />, 'System Status')}
          </div>

          {renderAttendanceTab()}
        </>
      )}

      {activeTab === 'register' && renderRegistrationTab()}
      {activeTab === 'recognize' && renderRecognitionTab()}
      {activeTab === 'students' && renderStudentsTab()}
      {activeTab === 'system' && renderSystemTab()}
    </div>
  </div>
);


};


export default FaceRecognitionApp;