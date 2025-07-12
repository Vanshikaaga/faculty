
// Grade prediction service with anomaly detection and trend analysis

// Params for predictGrade function
export interface PredictGradeParams {
  formData: PredictionFormData;
  setIsLoading?: (loading: boolean) => void;
  setPrediction?: (result: PredictionResult) => void;
  toast?: (options: any) => void;
  setAnomalies?: (anomalies: string[]) => void;
}
export interface PredictionFormData {
  studentId: string;
  previousSemesterGPA: string;
  numberOfBacklogs: string;
  cumulativeGPA: string;
  t1Marks: string;
  t2Marks: string;
  t3Marks: string;
  attendancePercentage: string;
  taMarks: string;
  adherenceToDeadlines: number[];
}

export interface PredictionResult {
  predicted_grade: string;
  confidence: number;
  grade_probabilities?: { [key: string]: number };
}

export interface LearningTrend {
  type: 'rising' | 'declining' | 'stable';
  description: string;
  color: string;
  icon: string;
}

// Detect anomalies in the input form data
export const detectInputAnomalies = (formData: PredictionFormData): string[] => {
  const anomalies: string[] = [];
  let prev_gpa = parseFloat(formData.previousSemesterGPA) || 0;
  let cum_gpa = parseFloat(formData.cumulativeGPA) || 0;
  let t1 = parseFloat(formData.t1Marks) || 0;
  let t2 = parseFloat(formData.t2Marks) || 0;
  let t3 = parseFloat(formData.t3Marks) || 0;
  let ta = parseFloat(formData.taMarks) || 0;
  let att = parseFloat(formData.attendancePercentage) || 0;
  let backlogs = parseInt(formData.numberOfBacklogs) || 0;
  let adherence = Array.isArray(formData.adherenceToDeadlines)
    ? Number(formData.adherenceToDeadlines[0])
    : Number(formData.adherenceToDeadlines) || 3;
  let total_score = t1 + t2 + t3 + ta;

  if (cum_gpa >= 8.5 && att <= 35) {
    anomalies.push("High GPA but very low attendance: This is unusual and may indicate data inconsistency.");
  }
  if (adherence === 1 && ta === 25) {
    anomalies.push("Zero adherence to deadlines but full TA marks: This is contradictory.");
  }
  if (
    !isNaN(t1) && !isNaN(t2) && !isNaN(t3) && !isNaN(backlogs) &&
    t1 >= 16 && t2 >= 16 && t3 >= 29 && backlogs >= 2
  ) {
    anomalies.push("High test scores but many backlogs: This is rare and may need review.");
  }
  if (cum_gpa <= 4.0 && att >= 90) {
    anomalies.push("Low GPA but very high attendance: This is uncommon.");
  }
  if (prev_gpa >= 8 && cum_gpa <= 5.0) {
    anomalies.push("Sudden drop in GPA from previous semester to cumulative.");
  }
  if (total_score <= 35 && cum_gpa >= 8.5) {
    anomalies.push("Very low total score but high GPA: This is inconsistent.");
  }
  if (total_score >= 85 && cum_gpa <= 4.0) {
    anomalies.push("Very high total score but low GPA: This is inconsistent.");
  }
  if (adherence === 1 && att === 0 && ta === 25) {
    anomalies.push("Zero attendance and adherence but full TA marks: Contradictory.");
  }
  if (t1 === 0 && t2 === 0 && t3 === 0 && ta === 0 && cum_gpa >= 7.0) {
    anomalies.push("Zero marks but high GPA: This is highly unlikely.");
  }
  if (backlogs === 0 && cum_gpa <= 4.0) {
    anomalies.push("No backlogs but very low GPA: Unusual academic record.");
  }
  if (backlogs >= 3 && cum_gpa >= 8.5) {
    anomalies.push("Many backlogs but high GPA: This is rare.");
  }
  if (
    !isNaN(t1) && !isNaN(t2) && !isNaN(t3) && !isNaN(ta) && !isNaN(cum_gpa) &&
    t1 >= 18 && t2 >= 17 && t3 >= 30 && ta >= 24 && cum_gpa <= 4.0
  ) {
    anomalies.push("Good marks but low GPA: This is inconsistent.");
  }
  if (
    !isNaN(t1) && !isNaN(t2) && !isNaN(t3) && !isNaN(ta) && !isNaN(cum_gpa) &&
    t1 <= 7 && t2 <= 7 && t3 <= 10 && ta <= 2 && cum_gpa >= 8.5
  ) {
    anomalies.push("Low marks but high GPA: This is inconsistent.");
  }
  return anomalies;
};

// Analyze learning trends based on GPA comparison
export const analyzeLearningTrend = (formData: PredictionFormData): LearningTrend => {
  const prevGPA = parseFloat(formData.previousSemesterGPA) || 0;
  const cumGPA = parseFloat(formData.cumulativeGPA) || 0;
  const gpaDifference = cumGPA - prevGPA;

  if (gpaDifference > 0.5) {
    return {
      type: 'rising',
      description: `Strong upward trend: GPA improved by ${gpaDifference.toFixed(2)} points`,
      color: 'text-green-600 bg-green-50',
      icon: '📈'
    };
  } else if (gpaDifference > 0.1) {
    return {
      type: 'rising',
      description: `Gradual improvement: GPA increased by ${gpaDifference.toFixed(2)} points`,
      color: 'text-green-600 bg-green-50',
      icon: '📊'
    };
  } else if (gpaDifference < -0.5) {
    return {
      type: 'declining',
      description: `Concerning decline: GPA dropped by ${Math.abs(gpaDifference).toFixed(2)} points`,
      color: 'text-red-600 bg-red-50',
      icon: '📉'
    };
  } else if (gpaDifference < -0.1) {
    return {
      type: 'declining',
      description: `Slight decline: GPA decreased by ${Math.abs(gpaDifference).toFixed(2)} points`,
      color: 'text-orange-600 bg-orange-50',
      icon: '📊'
    };
  } else {
    return {
      type: 'stable',
      description: `Consistent performance: GPA maintained around ${cumGPA.toFixed(2)}`,
      color: 'text-blue-600 bg-blue-50',
      icon: '📊'
    };
  }
};


export const predictGrade = async ({
  formData,
  setIsLoading = () => {},
  setPrediction = () => {},
  toast = () => {},
  setAnomalies = () => {},
}: PredictGradeParams) => {
  setIsLoading(true);
  console.log('Starting prediction with data:', formData);

  const foundAnomalies = detectInputAnomalies(formData);
  setAnomalies(foundAnomalies);
//
 // if (foundAnomalies.length > 0) {
  //  toast({
   //   title: "Possible Data Anomalies Detected",
    //  description: foundAnomalies.join(' '),
    //  variant: "destructive",
   // });
   // setIsLoading(false);
   // return;
 // }
  //

  try {
    const requestData = {
      previousSemesterGPA: formData.previousSemesterGPA,
      numberOfBacklogs: formData.numberOfBacklogs,
      cumulativeGPA: formData.cumulativeGPA,
      t1Marks: formData.t1Marks,
      t2Marks: formData.t2Marks,
      t3Marks: formData.t3Marks,
      attendancePercentage: formData.attendancePercentage,
      taMarks: formData.taMarks,
      adherenceToDeadlines: formData.adherenceToDeadlines[0],
    };

    console.log('Sending request to API:', requestData);

   const response = await fetch('/predict', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    console.log('Prediction result:', result);

    setPrediction(result);

    toast({
      title: "Prediction Complete!",
      description: `Your predicted grade is ${result.predicted_grade} with ${result.confidence}% confidence.`,
    });
  } catch (error: any) {
    console.error('Prediction error:', error);

    let errorMessage = "Failed to get prediction.";
    if (error.message?.includes('Failed to fetch')) {
      errorMessage = "Cannot connect to the prediction server. Please make sure the Python backend is running on localhost:5000.";
    } else if (error.message) {
      errorMessage = `Prediction error: ${error.message}`;
    }

    toast({
      title: "Prediction Failed",
      description: errorMessage,
      variant: "destructive",
    });
  } finally {
    setIsLoading(false);
  }
};


// Mock prediction service (replace with actual API call to Python backend)
export const mockpredictGrade = async (formData: PredictionFormData): Promise<PredictionResult> => {
  // This would be replaced with actual API call to Python Flask/FastAPI backend
  console.log('Predicting grade with XGBoost model for data:', formData);
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Mock prediction based on simple scoring logic for demonstration
  const t1 = parseFloat(formData.t1Marks) || 0;
  const t2 = parseFloat(formData.t2Marks) || 0;
  const t3 = parseFloat(formData.t3Marks) || 0;
  const ta = parseFloat(formData.taMarks) || 0;
  const attendance = parseFloat(formData.attendancePercentage) || 0;
  const cumGPA = parseFloat(formData.cumulativeGPA) || 0;
  const backlogs = parseInt(formData.numberOfBacklogs) || 0;
  
  const totalScore = t1 + t2 + t3 + ta;
  const weightedScore = (totalScore * 0.6) + (attendance * 0.2) + (cumGPA * 8 * 0.2);
  
  // Adjust for backlogs
  const adjustedScore = weightedScore - (backlogs * 5);
  
  let predictedGrade = 'F';
  let confidence = 85;
  
  if (adjustedScore >= 85) predictedGrade = 'A+';
  else if (adjustedScore >= 80) predictedGrade = 'A';
  else if (adjustedScore >= 75) predictedGrade = 'B+';
  else if (adjustedScore >= 70) predictedGrade = 'B';
  else if (adjustedScore >= 65) predictedGrade = 'C+';
  else if (adjustedScore >= 60) predictedGrade = 'C';
  else if (adjustedScore >= 55) predictedGrade = 'D+';
  else if (adjustedScore >= 50) predictedGrade = 'D';
  
  return {
    predicted_grade: predictedGrade,
    confidence: confidence
  };
};