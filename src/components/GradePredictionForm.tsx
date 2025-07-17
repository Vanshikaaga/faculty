

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GraduationCap, TrendingUp, TrendingDown, Clock, BookOpen, Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  PredictionFormData, 
  PredictionResult, 
  LearningTrend,
  detectInputAnomalies, 
  analyzeLearningTrend, 
  predictGrade,
  detectAnomaly,
  saveGradeRecord,
  GradeRecord
} from '@/services/gradePredictionService';

interface GradePredictionFormProps {
  selectedCourse: string;
  addGradeRecord: (record: any) => void;
  refreshGrades?: () => void;
}

const GradePredictionForm: React.FC<GradePredictionFormProps> = ({ selectedCourse, addGradeRecord, refreshGrades }) => {
  const [formData, setFormData] = useState<PredictionFormData & { name?: string }>({
    name: '',
    studentId: '',
    previousSemesterGPA: '',
    numberOfBacklogs: '',
    cumulativeGPA: '',
    t1Marks: '',
    t2Marks: '',
    t3Marks: '',
    attendancePercentage: '',
    taMarks: '',
    adherenceToDeadlines: [3]
  });

  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [anomalies, setAnomalies] = useState<string[]>([]);
  const [learningTrend, setLearningTrend] = useState<LearningTrend | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [isAnomaly, setIsAnomaly] = useState<boolean | null>(null);
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    let validatedValue = value;
    // Validation for numeric fields
    if (["t1Marks", "t2Marks", "t3Marks", "taMarks", "attendancePercentage", "previousSemesterGPA", "cumulativeGPA"].includes(field)) {
      const num = Number(value);
      if (field === "t1Marks" && num > 20) validatedValue = "20";
      if (field === "t2Marks" && num > 20) validatedValue = "20";
      if (field === "t3Marks" && num > 35) validatedValue = "35";
      if (field === "taMarks" && num > 25) validatedValue = "25";
      if (field === "attendancePercentage" && num > 100) validatedValue = "100";
      if ((field === "previousSemesterGPA" || field === "cumulativeGPA") && num > 10) validatedValue = "10";
      if (num < 0) validatedValue = "0";
    }
    setFormData(prev => ({
      ...prev,
      [field]: validatedValue
    }));
  };

  const handleSliderChange = (value: number[]) => {
    setFormData(prev => ({
      ...prev,
      adherenceToDeadlines: value
    }));
  };

  const getAdherenceText = (value: number) => {
    const levels = [
      "Not at all adhering",
      "Rarely adheres",
      "Sometimes adheres", 
      "Usually punctual",
      "Very punctual"
    ];
    return levels[value - 1] || "Sometimes adheres";
  };

  const handlePredict = async () => {
    setIsLoading(true);
    setShowResults(true);
    console.log('Starting prediction with data:', formData);

    // Detect anomalies (heuristic)
    const foundAnomalies = detectInputAnomalies(formData);
    setAnomalies(foundAnomalies);

    // Analyze learning trend
    const trend = analyzeLearningTrend(formData);
    setLearningTrend(trend);

    if (foundAnomalies.length > 0) {
      toast({
        title: "Data Anomalies Detected",
        description: `${foundAnomalies.length} potential inconsistencies found. Please review your input.`,
        variant: "destructive",
      });
    }

    try {
      // Call backend anomaly detection
      const anomalyResult = await detectAnomaly(formData);
      setIsAnomaly(anomalyResult.anomaly);

      // Use the correct signature for predictGrade (with callbacks)
      await predictGrade({
        formData,
        setIsLoading,
        setPrediction: async (result) => {
          setPrediction(result);
          setShowResults(true);

          // Create grade record for database
          const gradeRecord: GradeRecord = {
            name: formData.name || '',
            rollNo: formData.studentId,
            backlogs: Number(formData.numberOfBacklogs),
            prevSemesterGPA: Number(formData.previousSemesterGPA),
            cumulativeGPA: Number(formData.cumulativeGPA),
            test1: Number(formData.t1Marks),
            test2: Number(formData.t2Marks),
            test3: Number(formData.t3Marks),
            attendancePercent: Number(formData.attendancePercentage),
            adherenceToDeadlines: Number(formData.taMarks),
            grade: result.predicted_grade,
            course: selectedCourse,
          };

          // Save to database
          const saveSuccess = await saveGradeRecord(gradeRecord);
          
          if (saveSuccess) {
            toast({
              title: "Record Saved",
              description: "Grade prediction record has been saved to the database.",
            });
            // Don't refresh immediately - let user read the results first
            // Refresh will happen when user navigates away and comes back
          } else {
            toast({
              title: "Save Warning",
              description: "Grade prediction completed but failed to save to database. Please check if the database server is running.",
              variant: "destructive",
            });
          }

          // Add new record to analytics (for immediate display)
          addGradeRecord(gradeRecord);
        },
        toast,
        setAnomalies,
      });
    } catch (error) {
      console.error('Prediction error:', error);
      toast({
        title: "Prediction Failed",
        description: "Unable to process prediction. Please try again.",
        variant: "destructive",
      });
    } finally {
      // Ensure loading state is stopped in all cases
      setIsLoading(false);
    }
  };

  const isFormValid = () => {
    return Object.entries(formData).every(([key, value]) => {
      if (key === 'adherenceToDeadlines') return true;
      return value !== '';
    });
  };

  const getGradeColor = (grade: string) => {
    const colors = {
      'A+': 'from-green-500 to-emerald-500',
      'A': 'from-green-400 to-green-500',
      'B+': 'from-blue-400 to-blue-500',
      'B': 'from-blue-300 to-blue-400',
      'C+': 'from-yellow-400 to-yellow-500',
      'C': 'from-yellow-300 to-yellow-400',
      'D+': 'from-orange-400 to-orange-500',
      'D': 'from-red-400 to-red-500',
      'F': 'from-red-500 to-red-600'
    };
    return colors[grade as keyof typeof colors] || 'from-gray-400 to-gray-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <GraduationCap className="h-12 w-12 text-indigo-600 mr-3" />
          <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Grade Prediction System
          </h2>
        </div>
        <p className="text-gray-600 text-lg">
          Predict your semester grade using advanced ML algorithms
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Name Field */}
        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-t-lg">
            <CardTitle className="flex items-center">
              <BookOpen className="h-5 w-5 mr-2" />
              Student Name
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Enter your name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
        {/* Student Information */}
        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-t-lg">
            <CardTitle className="flex items-center">
              <BookOpen className="h-5 w-5 mr-2" />
              Student Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div>
              <Label htmlFor="studentId">Student ID</Label>
              <Input
                id="studentId"
                placeholder="Enter your student ID"
                value={formData.studentId}
                onChange={(e) => handleInputChange('studentId', e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="numberOfBacklogs">Number of Backlogs</Label>
              <Input
                id="numberOfBacklogs"
                type="number"
                min="0"
                placeholder="Enter number of backlogs"
                value={formData.numberOfBacklogs}
                onChange={(e) => handleInputChange('numberOfBacklogs', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* GPA Information */}
        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-t-lg">
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              GPA Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div>
              <Label htmlFor="previousSemesterGPA">Previous Semester GPA (out of 10)</Label>
              <Input
                id="previousSemesterGPA"
                type="number"
                min="0"
                max="10"
                step="0.01"
                placeholder="e.g., 8.5"
                value={formData.previousSemesterGPA}
                onChange={(e) => handleInputChange('previousSemesterGPA', e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="cumulativeGPA">Cumulative GPA (out of 10)</Label>
              <Input
                id="cumulativeGPA"
                type="number"
                min="0"
                max="10"
                step="0.01"
                placeholder="e.g., 7.8"
                value={formData.cumulativeGPA}
                onChange={(e) => handleInputChange('cumulativeGPA', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Test Marks */}
        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-t-lg">
            <CardTitle>Test Marks</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="t1Marks">T1 Marks (out of 20)</Label>
                <Input
                  id="t1Marks"
                  type="number"
                  min="0"
                  max="20"
                  placeholder="e.g., 18"
                  value={formData.t1Marks}
                  onChange={(e) => handleInputChange('t1Marks', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="t2Marks">T2 Marks (out of 20)</Label>
                <Input
                  id="t2Marks"
                  type="number"
                  min="0"
                  max="20"
                  placeholder="e.g., 17"
                  value={formData.t2Marks}
                  onChange={(e) => handleInputChange('t2Marks', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="t3Marks">T3 Marks (out of 35)</Label>
                <Input
                  id="t3Marks"
                  type="number"
                  min="0"
                  max="35"
                  placeholder="e.g., 30"
                  value={formData.t3Marks}
                  onChange={(e) => handleInputChange('t3Marks', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-t-lg">
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div>
              <Label htmlFor="attendancePercentage">Attendance Percentage</Label>
              <Input
                id="attendancePercentage"
                type="number"
                min="0"
                max="100"
                placeholder="e.g., 85"
                value={formData.attendancePercentage}
                onChange={(e) => handleInputChange('attendancePercentage', e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="taMarks">TA Marks (out of 25)</Label>
              <Input
                id="taMarks"
                type="number"
                min="0"
                max="25"
                placeholder="e.g., 22"
                value={formData.taMarks}
                onChange={(e) => handleInputChange('taMarks', e.target.value)}
              />
            </div>
            
            <div className="space-y-3">
              <Label>Adherence to Deadlines</Label>
              <div className="px-2">
                <Slider
                  value={formData.adherenceToDeadlines}
                  onValueChange={handleSliderChange}
                  max={5}
                  min={1}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>1</span>
                  <span>2</span>
                  <span>3</span>
                  <span>4</span>
                  <span>5</span>
                </div>
                <div className="text-center mt-2">
                  <span className="text-sm font-medium text-indigo-600">
                    {getAdherenceText(formData.adherenceToDeadlines[0])} ({formData.adherenceToDeadlines[0]}/5)
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Prediction Button */}
      <div className="text-center space-y-4">
        <Button
          onClick={handlePredict}
          disabled={!isFormValid() || isLoading}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-3 text-lg font-semibold rounded-lg shadow-lg transform transition-all duration-200 hover:scale-105 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            'Predict Grade'
          )}
        </Button>
        
        {/* Manual refresh button - only show if refreshGrades function is available */}
        {refreshGrades && (
          <div className="mt-4">
            <Button
              onClick={refreshGrades}
              variant="outline"
              className="text-sm px-4 py-2"
            >
              Refresh Analytics Data
            </Button>
            <p className="text-xs text-gray-500 mt-2">
              Click to update charts and tables with latest data from database
            </p>
          </div>
        )}
      </div>

      {/* Results Section */}
      {showResults && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Learning Trend Analysis */}
          {learningTrend && (
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center">
                  {learningTrend.type === 'rising' && <TrendingUp className="h-5 w-5 mr-2 text-green-600" />}
                  {learningTrend.type === 'declining' && <TrendingDown className="h-5 w-5 mr-2 text-red-600" />}
                  {learningTrend.type === 'stable' && <Clock className="h-5 w-5 mr-2 text-blue-600" />}
                  Learning Trend Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`p-4 rounded-lg ${learningTrend.color}`}>
                  <div className="flex items-center mb-2">
                    <span className="text-2xl mr-2">{learningTrend.icon}</span>
                    <span className="font-semibold capitalize">{learningTrend.type} Trend</span>
                  </div>
                  <p className="text-sm">{learningTrend.description}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Anomaly Detection (Model) */}
          {isAnomaly !== null && (
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2 text-orange-600" />
                  Model-based Anomaly Detection
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isAnomaly ? (
                  <Alert variant="destructive">
                    <AlertDescription className="text-sm">
                      🚨 This record is flagged as an <b>anomaly</b> by the detection model.<br />
                      {anomalies.length > 0 ? (
                        <>
                          <br />Reason(s):
                          <ul className="list-disc ml-4">
                            {anomalies.map((anomaly, idx) => (
                              <li key={idx}>{anomaly}</li>
                            ))}
                          </ul>
                        </>
                      ) : (
                        <> Please check thoroughly!                          </>
                      )}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert>
                    <AlertDescription className="text-green-700">
                      ✅ This record is <b>not</b> flagged as an anomaly by the detection model.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          

          {/* Anomaly Detection (Heuristic) 
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-orange-600" />
                Data Consistency Check
              </CardTitle>
            </CardHeader>
            <CardContent>
              {anomalies.length > 0 ? (
                <div className="space-y-2">
                  {anomalies.map((anomaly, idx) => (
                    <Alert key={idx} variant="destructive">
                      <AlertDescription className="text-sm">
                        {anomaly}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              ) : (
                <Alert>
                  <AlertDescription className="text-green-700">
                    ✅ No anomalies detected in your input data.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
          */}
        </div>
      )}
      

      {/* Prediction Result */}
      {prediction && (
        <Card className="shadow-lg border-0">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">
                Prediction Result
              </h3>
              <div className="space-y-4">
                <div className={`inline-block px-8 py-4 rounded-full bg-gradient-to-r ${getGradeColor(prediction.predicted_grade)} text-white text-3xl font-bold shadow-lg`}>
                  Grade: {prediction.predicted_grade}
                </div>
                <div className="text-lg text-gray-700">
                  <span className="font-semibold">Confidence:</span> {prediction.confidence}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GradePredictionForm;
