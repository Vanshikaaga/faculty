import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Users, Target } from 'lucide-react';
import GradePredictionForm from '@/components/GradePredictionForm';
import { fetchAllGrades } from '@/services/gradeAnalyticsService';

const courses = [
  { id: 'CSE201', name: 'CSE201 - Data Structures', matchers: [/^CSE[- ]?201/i] },
  { id: 'CSE401', name: 'CSE401 - Software Engineering', matchers: [/^CSE[- ]?401/i] },
];

const GradeAnalytics = () => {
  const [grades, setGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState('CSE201');

  useEffect(() => {
    setLoading(true);
    fetchAllGrades()
      .then(data => {
        setGrades(data);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to fetch grades');
        setLoading(false);
      });
  }, []);

  // Add grade record handler
  const addGradeRecord = (newRecord: any) => {
    setGrades(prev => [...prev, newRecord]);
  };

  // Refresh grades from database
  const refreshGrades = async () => {
    setLoading(true);
    try {
      const data = await fetchAllGrades();
      setGrades(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch grades');
    } finally {
      setLoading(false);
    }
  };

  // Course filtering logic
  const courseObj = courses.find(c => c.id === selectedCourse);
  const filteredGrades = grades.filter(g => {
    if (!g.course || !courseObj) return false;
    return courseObj.matchers.some(matcher => matcher.test(g.course));
  });

  // Stats
  const total = filteredGrades.length;
  const classAverage = total ? (filteredGrades.reduce((sum, g) => sum + (g.cumulativeGPA || 0), 0) / total).toFixed(2) : '-';

  const stats = [
    {
      title: 'Class Average',
      value: classAverage,
      description: 'Current semester',
      icon: Target,
      color: 'bg-blue-500',
      trend: '',
      trendUp: true,
    },
    {
      title: 'Total Students',
      value: total.toString(),
      description: 'Enrolled students',
      icon: Users,
      color: 'bg-green-500',
      trend: '',
      trendUp: true,
    },
  ];

  // Grade Distribution
  const gradeCounts: Record<string, number> = {};
  filteredGrades.forEach(g => {
    gradeCounts[g.grade] = (gradeCounts[g.grade] || 0) + 1;
  });
  const gradeDistributionData = Object.entries(gradeCounts).map(([grade, count]) => ({
    grade,
    count,
    percentage: total ? Math.round((count / total) * 100) : 0,
  }));
  const pieChartData = gradeDistributionData.map(item => ({
    name: item.grade,
    value: item.count,
    percentage: item.percentage,
  }));
  const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#6B7280'];

  // Performance Trends (T1, T2, T3, TA)
  const exams = [
    { key: 'test1', label: 'T1' },
    { key: 'test2', label: 'T2' },
    { key: 'test3', label: 'T3' },
    { key: 'adherenceToDeadlines', label: 'TA' },
  ];
  const performanceTrendData = exams.map(exam => {
    const values = filteredGrades.map(g => g[exam.key]).filter(v => typeof v === 'number');
    const average = values.length ? (values.reduce((a, b) => a + b, 0) / values.length) : 0;
    const highest = values.length ? Math.max(...values) : 0;
    const lowest = values.length ? Math.min(...values) : 0;
    return {
      exam: exam.label,
      average: Number(average.toFixed(2)),
      highest,
      lowest,
    };
  });

  // Student Performance Table
  const studentPerformance = filteredGrades.map(g => ({
    name: g.name,
    rollNo: g.rollNo,
    t1: g.test1,
    t2: g.test2,
    t3: g.test3,
    ta: g.adherenceToDeadlines,
    prevGPA: g.prevSemesterGPA,
    cumulativeGPA: g.cumulativeGPA,
    trend: g.prevSemesterGPA < g.cumulativeGPA ? 'up' : 'down',
  }));

  if (loading) return <div className="p-8 text-center">Loading grade analytics...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Grade Analytics</h1>
          <p className="text-gray-600 mt-2">Comprehensive analysis of student performance and grade prediction</p>
        </div>
        <Select value={selectedCourse} onValueChange={setSelectedCourse}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select Course" />
          </SelectTrigger>
          <SelectContent>
            {courses.map((course) => (
              <SelectItem key={course.id} value={course.id}>
                {course.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  <div className="flex items-center mt-2">
                    {stat.trendUp ? (
                      <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                    )}
                    <p className={`text-sm ${stat.trendUp ? 'text-green-600' : 'text-red-600'}`}>{stat.trend}</p>
                  </div>
                </div>
                <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance Trends</TabsTrigger>
          <TabsTrigger value="students">Student Details</TabsTrigger>
          <TabsTrigger value="prediction">Grade Prediction</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Grade Distribution Chart */}
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle>Grade Distribution</CardTitle>
                <CardDescription>Current grade distribution for selected course</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={gradeDistributionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="grade" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Grade Distribution Pie Chart */}
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle>Grade Percentage</CardTitle>
                <CardDescription>Percentage breakdown of grades for selected course</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name}: ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
              <CardDescription>Average, highest, and lowest scores for each assessment in selected course</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={performanceTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="exam" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="average" stroke="#3B82F6" strokeWidth={3} name="Class Average" />
                  <Line type="monotone" dataKey="highest" stroke="#10B981" strokeWidth={2} name="Highest Score" />
                  <Line type="monotone" dataKey="lowest" stroke="#EF4444" strokeWidth={2} name="Lowest Score" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students" className="space-y-6">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Individual Student Performance</CardTitle>
              <CardDescription>Detailed breakdown of each student's performance in selected course</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Name</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Roll No</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">T1</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">T2</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">T3</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">TA</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Prev Sem GPA</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Cumulative GPA</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentPerformance.map((student, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-gray-900">{student.name}</td>
                        <td className="py-3 px-4 text-gray-600">{student.rollNo}</td>
                        <td className="py-3 px-4 text-gray-600">{student.t1}</td>
                        <td className="py-3 px-4 text-gray-600">{student.t2}</td>
                        <td className="py-3 px-4 text-gray-600">{student.t3}</td>
                        <td className="py-3 px-4 text-gray-600">{student.ta}</td>
                        <td className="py-3 px-4 text-gray-600">{student.prevGPA}</td>
                        <td className="py-3 px-4 font-semibold text-gray-900">{student.cumulativeGPA}</td>
                        <td className="py-3 px-4">
                          <Badge
                            variant="secondary"
                            className={
                              student.trend === 'up'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }
                          >
                            {student.trend === 'up' ? '↗ Rising' : '↘ Declining'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prediction" className="space-y-6">
          <GradePredictionForm
            selectedCourse={courseObj?.name || ''}
            addGradeRecord={addGradeRecord}
            refreshGrades={refreshGrades}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GradeAnalytics;
