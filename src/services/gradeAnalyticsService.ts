export async function fetchAllGrades() {
    const response = await fetch('http://localhost:5005/api/grades/all');
    if (!response.ok) {
      throw new Error('Failed to fetch grades');
    }
    return response.json();
  }