// Mock Student Database for Attendance Analysis
const initialStudents = [
  {
    id: "STU001",
    name: "Rahul Kumar",
    department: "Computer Science (CSE)",
    semester: "Semester 4",
    totalWorkingDays: 90,
    presentDays: 78,
    absentDays: 12,
    upcomingWorkingDays: 25,
    subjects: [
      { name: "Data Structures", present: 22, total: 24 },
      { name: "Operating Systems", present: 18, total: 22 },
      { name: "Database Systems", present: 20, total: 22 },
      { name: "Computer Networks", present: 18, total: 22 }
    ],
    // Historical weekly attendance (present days out of 5 class days per week for the last 6 weeks)
    history: [5, 4, 4, 5, 3, 4]
  },
  {
    id: "STU002",
    name: "Sarah Jenkins",
    department: "Electronics (ECE)",
    semester: "Semester 6",
    totalWorkingDays: 90,
    presentDays: 61,
    absentDays: 29,
    upcomingWorkingDays: 25,
    subjects: [
      { name: "Microprocessors", present: 13, total: 22 },
      { name: "Digital Signal Processing", present: 16, total: 23 },
      { name: "VLSI Design", present: 14, total: 22 },
      { name: "Communication Systems", present: 18, total: 23 }
    ],
    // High-risk recent absences (downward trend)
    history: [4, 4, 3, 2, 1, 2]
  },
  {
    id: "STU003",
    name: "Amit Patel",
    department: "Mechanical (ME)",
    semester: "Semester 2",
    totalWorkingDays: 90,
    presentDays: 65,
    absentDays: 25,
    upcomingWorkingDays: 25,
    subjects: [
      { name: "Engineering Mechanics", present: 16, total: 22 },
      { name: "Thermodynamics", present: 15, total: 22 },
      { name: "Material Science", present: 17, total: 23 },
      { name: "Machine Drawing", present: 17, total: 23 }
    ],
    // Improving recent pattern
    history: [2, 3, 3, 4, 5, 5]
  },
  {
    id: "STU004",
    name: "Priya Sharma",
    department: "Computer Science (CSE)",
    semester: "Semester 4",
    totalWorkingDays: 90,
    presentDays: 88,
    absentDays: 2,
    upcomingWorkingDays: 25,
    subjects: [
      { name: "Data Structures", present: 24, total: 24 },
      { name: "Operating Systems", present: 22, total: 22 },
      { name: "Database Systems", present: 21, total: 22 },
      { name: "Computer Networks", present: 21, total: 22 }
    ],
    // Very stable, near-perfect
    history: [5, 5, 5, 5, 5, 5]
  },
  {
    id: "STU005",
    name: "John Doe",
    department: "Information Technology (IT)",
    semester: "Semester 8",
    totalWorkingDays: 90,
    presentDays: 52,
    absentDays: 38,
    upcomingWorkingDays: 25,
    subjects: [
      { name: "Cloud Computing", present: 12, total: 23 },
      { name: "Information Security", present: 14, total: 22 },
      { name: "Big Data Analytics", present: 13, total: 23 },
      { name: "Distributed Systems", present: 13, total: 22 }
    ],
    // Extremely unstable, missing a lot recently
    history: [3, 2, 2, 1, 1, 0]
  },
  {
    id: "STU006",
    name: "Michael Chang",
    department: "Electrical (EEE)",
    semester: "Semester 6",
    totalWorkingDays: 90,
    presentDays: 64,
    absentDays: 26,
    upcomingWorkingDays: 25,
    subjects: [
      { name: "Power Systems", present: 16, total: 22 },
      { name: "Control Systems", present: 15, total: 23 },
      { name: "Electrical Machines", present: 16, total: 22 },
      { name: "Power Electronics", present: 17, total: 23 }
    ],
    // Stable but borderline
    history: [3, 4, 3, 4, 3, 4]
  }
];
